#!/usr/bin/env node
/* Candidate queue for upcoming releases worth considering for the catalog.
   Produces a list for a human to approve. It adds nothing on its own —
   deciding whether a title clears the bar is an editorial judgement (the
   closer-bar cases: lioness, paradise, F1, Ride or Die) and a script has no
   business making it.

   How it decides what to surface, honestly: TMDB has no "Black-led" field and
   inventing one would be guessing. So the signal is the catalog itself — a
   title is a candidate when its cast or director already appears somewhere in
   our 1,281 titles. Nine years of curation is the definition of the beat, so
   "shares talent with what we already cover" is a real signal rather than a
   demographic assumption. It will surface some titles that do not belong;
   that is fine, a person is reading the list. It will also miss a debut with
   no returning names — which is exactly why this supplements a human sweep
   instead of replacing one.

   Usage: node scripts/release-watch.cjs [--days 60] [--pages 5]             */
const fs = require('fs'), path = require('path');
const { ROOT, TMDB_KEY, films, soon, get, norm, today, plusDays } = require('./lib.cjs');

const arg = (flag, dflt) => {
  const i = process.argv.indexOf(flag);
  return i > 0 ? parseInt(process.argv[i + 1], 10) : dflt;
};
const DAYS = arg('--days', 60), PAGES = arg('--pages', 5);
const STRLOG = { 3: 'DIR ', 2: 'LEAD', 1: 'supp' };

const api = p => 'https://api.themoviedb.org/3' + p +
  (p.indexOf('?') < 0 ? '?' : '&') + 'api_key=' + TMDB_KEY;

(async () => {
  const F = films();

  /* Everyone the catalog credits, counted — not just a membership set.
     A plain set was far too loose: the catalog carries closer-bar titles
     (F1, Wicked, The Odyssey) whose full casts are mostly not our beat, so
     Brad Pitt and Nicole Kidman were "known" off a single co-starring credit
     and their next films came back as strong candidates. Frequency separates
     the two — someone the catalog credits repeatedly is genuinely on the
     beat; a one-off co-star is not. Only scope:'ours' titles feed the count,
     since scope:'all' entries are there precisely because they are NOT ours. */
  const freq = {}, dirs = {};
  F.filter(f => f.scope !== 'all').forEach(f => {
    (f.cast || []).concat(f.castFull || []).forEach(c => {
      const k = norm(c); if (k) freq[k] = (freq[k] || 0) + 1;
    });
    String(f.dir || '').split(',').forEach(d => {
      const k = norm(d); if (k) { dirs[k] = (dirs[k] || 0) + 1; freq[k] = (freq[k] || 0) + 1; }
    });
  });
  /* Two credits is the bar for cast. One is enough for a director — directing
     even a single title in this catalog is a much stronger statement of the
     beat than appearing in one cast list. */
  const knownCast = n => (freq[norm(n)] || 0) >= 2;
  const knownDir  = n => (dirs[norm(n)] || 0) >= 1 || (freq[norm(n)] || 0) >= 2;

  /* What we already have, by title+year — never title alone. Remakes and
     revivals legitimately coexist (Shaft '71/'00/'19), and a title-only
     check once deleted seven real films. */
  const have = new Set();
  F.forEach(f => have.add(norm(f.title) + '|' + f.year));
  const haveTitle = new Set(F.map(f => norm(f.title)));
  const soonIds = new Set(soon().map(c => String(c.id).replace(/^cs-/, '')));

  const from = today(), to = plusDays(DAYS);
  console.log('Window: ' + from + ' -> ' + to + '  (' + DAYS + ' days)');

  const found = [];
  for (const kind of ['movie', 'tv']) {
    for (let page = 1; page <= PAGES; page++) {
      const q = kind === 'movie'
        ? api('/discover/movie?sort_by=popularity.desc&region=US' +
              '&primary_release_date.gte=' + from + '&primary_release_date.lte=' + to +
              '&page=' + page)
        : api('/discover/tv?sort_by=popularity.desc' +
              '&first_air_date.gte=' + from + '&first_air_date.lte=' + to +
              '&page=' + page);
      const r = await get(q);
      const rows = (r.json && r.json.results) || [];
      if (!rows.length) break;
      for (const row of rows) found.push({ kind: kind, row: row });
    }
  }
  console.log('Upcoming titles pulled from TMDB: ' + found.length);

  const cands = [];
  for (const { kind, row } of found) {
    const title = row.title || row.name || '';
    const date = (row.release_date || row.first_air_date || '').slice(0, 10);
    const year = date ? +date.slice(0, 4) : 0;
    if (!title || !date) continue;
    if (soonIds.has(String(row.id))) continue;
    if (have.has(norm(title) + '|' + year)) continue;

    const cr = await get(api('/' + kind + '/' + row.id + '/credits'));
    const cast = ((cr.json && cr.json.cast) || []).slice(0, 12);
    const crew = ((cr.json && cr.json.crew) || [])
      .filter(c => c.job === 'Director' || c.job === 'Creator');

    /* Weight the match by how central the person is. A returning DIRECTOR, or
       a name we cover in the top three billed positions, is a real signal.
       The tenth-billed character actor is noise — Ryan Reynolds appearing in
       our catalog somewhere does not make his next film ours. Both still get
       listed, but the strong ones sort to the top so the list is readable
       from the first row down. */
    const hits = [];
    let strength = 0;
    crew.forEach(p => {
      if (knownDir(p.name)) { hits.push(p.name + ' (dir)'); strength = Math.max(strength, 3); }
    });
    cast.forEach((p, i) => {
      if (!knownCast(p.name)) return;
      hits.push(p.name + ' \u00d7' + freq[norm(p.name)] + (i < 3 ? ' (lead)' : ''));
      strength = Math.max(strength, i < 3 ? 2 : 1);
    });
    if (!hits.length) continue;

    cands.push({
      kind, id: row.id, title, date, strength,
      why: hits.filter((v, i, a) => a.indexOf(v) === i).slice(0, 5),
      dir: (crew[0] || {}).name || '',
      near: haveTitle.has(norm(title))
    });
    console.log('  [%s] %s  %s  %s  [%s]', STRLOG[strength], date, kind.padEnd(5),
      title.slice(0, 34).padEnd(34), hits.join(', ').slice(0, 46));
  }

  /* Strongest signal first, then soonest. */
  cands.sort((a, b) => b.strength - a.strength || (a.date < b.date ? -1 : 1));
  const STR = { 3: 'director', 2: 'lead', 1: 'supporting' };

  const L = ['# Release watch — ' + today(), '',
    '_Generated by scripts/release-watch.cjs, covering ' + from + ' to ' + to +
    '. Candidates only — nothing here is in the catalog and nothing is added ' +
    'automatically. Each one still needs the usual check: is it genuinely ours, ' +
    'or a closer-bar call, and is every field real._', ''];

  L.push('## Candidates (' + cands.length + ')', '');
  if (!cands.length) {
    L.push('Nothing upcoming in this window shares talent with the catalog.', '');
  } else {
    L.push('| Release | Type | Title | Signal | Already-covered names | TMDB |',
           '| --- | --- | --- | --- | --- | --- |');
    cands.forEach(c => L.push('| ' + c.date + ' | ' + c.kind + ' | **' + c.title + '**' +
      (c.near ? ' ⚠︎' : '') + ' | ' + STR[c.strength] + ' | ' + c.why.join(', ') +
      ' | `' + c.kind + '/' + c.id + '` |'));
    L.push('');
    L.push('⚠︎ marks a title whose name already exists in the catalog at a ' +
      'different year. That is usually legitimate — remakes and revivals ' +
      'coexist and identity is title+year — but check it is not a duplicate ' +
      'of something we carry.', '');
  }

  fs.writeFileSync(path.join(ROOT, 'release-watch.md'), L.join('\n'));
  console.log('\nFINDINGS=' + cands.length + '  -> release-watch.md');
})();
