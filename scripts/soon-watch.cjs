#!/usr/bin/env node
/* Weekly freshness check on COMING_SOON. Release dates move constantly and
   nothing else on the site catches it — By Any Means sat dated a day wrong
   until I happened to look. Trailers land the same way: a title added before
   its campaign started has trailer:null forever unless someone re-checks.

   Report only. It never edits index.html: a date change wants a human eye
   (a slipped date sometimes means the film moved, sometimes means TMDB got a
   festival date confused with a wide release), and a trailer id must be
   oEmbed-verified against an official channel before it goes anywhere near
   the site. This produces the queue; a person clears it.

   The id-namespace trap: a COMING_SOON id is cs-<tmdbid>, but movie and TV
   ids share no namespace — /movie/241882 is an unrelated 2014 Indian film
   while /tv/241882 is Ride or Die. So we fetch BOTH and keep whichever one's
   title actually matches ours. Guessing the endpoint is how you wire a 2014
   film's trailer to a 2026 series.

   Usage: node scripts/soon-watch.cjs [--limit N]                            */
const fs = require('fs'), path = require('path');
const { ROOT, TMDB_KEY, soon, get, norm, today } = require('./lib.cjs');

const LIMIT = (() => {
  const i = process.argv.indexOf('--limit');
  return i > 0 ? parseInt(process.argv[i + 1], 10) : 0;
})();

const api = p => 'https://api.themoviedb.org/3' + p +
  (p.indexOf('?') < 0 ? '?' : '&') + 'api_key=' + TMDB_KEY;

/* Resolve a cs-<id> to the right TMDB record by checking the title, not by
   assuming which endpoint it lives on. */
async function resolve(entry) {
  const id = String(entry.id).replace(/^cs-/, '');
  const [mv, tv] = await Promise.all([
    get(api('/movie/' + id)), get(api('/tv/' + id))
  ]);
  const want = norm(entry.title);
  const m = mv.json && norm(mv.json.title) === want ? { kind: 'movie', d: mv.json } : null;
  const t = tv.json && norm(tv.json.name) === want ? { kind: 'tv', d: tv.json } : null;
  return m || t || null;
}

/* The date TMDB considers authoritative for a US audience. For a movie that
   is the US theatrical/digital release, not the earliest festival screening
   anywhere on earth — those differ by months and the festival one is wrong
   for a "when can I watch this" page. */
async function usDate(kind, id, fallback) {
  if (kind === 'tv') return fallback || '';
  const r = await get(api('/movie/' + id + '/release_dates'));
  const us = ((r.json && r.json.results) || []).filter(x => x.iso_3166_1 === 'US')[0];
  if (!us) return fallback || '';
  const wanted = (us.release_dates || []).filter(x => x.type === 3 || x.type === 4);
  const pick = (wanted[0] || us.release_dates[0] || {}).release_date;
  return pick ? pick.slice(0, 10) : (fallback || '');
}

async function trailerFor(kind, id) {
  const r = await get(api('/' + kind + '/' + id + '/videos'));
  const vids = ((r.json && r.json.results) || [])
    .filter(v => v.site === 'YouTube' && v.type === 'Trailer');
  const off = vids.filter(v => v.official)[0] || vids[0];
  return off ? { key: off.key, name: off.name } : null;
}

(async () => {
  const all = soon().filter(c => c.date >= today());
  const list = LIMIT ? all.slice(0, LIMIT) : all;
  console.log('Upcoming titles to check: ' + list.length +
    (LIMIT ? ' (of ' + all.length + ', --limit)' : ''));

  const dates = [], trailers = [], unresolved = [];

  for (const c of list) {
    const hit = await resolve(c);
    if (!hit) { unresolved.push(c.id + '  ' + c.title); continue; }

    const fresh = await usDate(hit.kind, String(c.id).replace(/^cs-/, ''),
      hit.kind === 'tv' ? hit.d.first_air_date : hit.d.release_date);
    if (fresh && fresh !== c.date) {
      const moved = Math.round((new Date(fresh) - new Date(c.date)) / 86400000);
      dates.push({ id: c.id, title: c.title, was: c.date, now: fresh, moved: moved });
      console.log('  DATE  %s  %s -> %s (%s%s d)', c.title.slice(0, 34).padEnd(34),
        c.date, fresh, moved > 0 ? '+' : '', moved);
    }

    if (!c.trailer) {
      const t = await trailerFor(hit.kind, String(c.id).replace(/^cs-/, ''));
      if (t) {
        trailers.push({ id: c.id, title: c.title, key: t.key, name: t.name });
        console.log('  TRLR  %s  %s  "%s"', c.title.slice(0, 34).padEnd(34), t.key, t.name);
      }
    }
  }

  const lines = ['# Coming Soon watch', '', '_Generated ' + today() +
    ' by scripts/soon-watch.cjs. Report only — nothing here is applied ' +
    'automatically._', ''];

  lines.push('## Release dates that moved (' + dates.length + ')', '');
  if (!dates.length) lines.push('None. Every upcoming date matches TMDB.', '');
  dates.forEach(d => lines.push('- `' + d.id + '` **' + d.title + '** — we say ' +
    d.was + ', TMDB says ' + d.now + ' (' + (d.moved > 0 ? '+' : '') + d.moved +
    ' days). Check the trades before changing it; TMDB sometimes carries a ' +
    'festival date as the release.'));
  if (dates.length) lines.push('');

  lines.push('## Trailers now available (' + trailers.length + ')', '');
  if (!trailers.length) lines.push('None. Every upcoming title either has a trailer or TMDB still has nothing.', '');
  trailers.forEach(t => lines.push('- `' + t.id + '` **' + t.title + '** — candidate `' +
    t.key + '` ("' + t.name + '"). **Verify the channel via oEmbed before ' +
    'wiring it** — TMDB indexes re-uploads, and an unofficial upload can be ' +
    'pulled at any time.'));
  if (trailers.length) lines.push('');

  if (unresolved.length) {
    lines.push('## Could not resolve (' + unresolved.length + ')', '',
      'The id matched neither a movie nor a series with this title. Either the ' +
      'title changed on TMDB or the id is wrong.', '');
    unresolved.forEach(u => lines.push('- ' + u));
    lines.push('');
  }

  fs.writeFileSync(path.join(ROOT, 'soon-watch.md'), lines.join('\n'));
  const n = dates.length + trailers.length + unresolved.length;
  console.log('\nFINDINGS=' + n + '  -> soon-watch.md');
})();
