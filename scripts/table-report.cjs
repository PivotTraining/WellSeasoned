#!/usr/bin/env node
/* Numbers for the next Table Report (the recurring Balcony data piece).
   A one-off data story is one visit. A column people expect is a reason to
   come back, and the only way that survives is if the figures are one command
   away instead of a manual query every time.

   Reads only public views. Every number printed is a real count; nothing is
   projected, smoothed or rounded up. If a figure is not readable it prints as
   a dash rather than a zero, because a zero here would end up in prose.

   Usage: node scripts/table-report.cjs                                      */
const fs = require('fs'), path = require('path');
const { ROOT, films, get, today } = require('./lib.cjs');
const SB = 'https://iherwgeuxwpapjreoofq.supabase.co/rest/v1/';
const KEY = process.env.SUPABASE_KEY || 'sb_publishable_Owy8s8-j6LzxYhDmpCo53w_7ehrsGuh';
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

/* Minimum verdicts before a film's percentage is allowed to be quoted in
   prose. Below this a split is noise: at n=3 a single vote swings it 33
   points. The published piece must always state the n alongside the number. */
const MIN_N = 4;

(async () => {
  const F = {}; films().forEach(f => F[f.id] = f);
  const vc = await get(SB + 'vote_counts?select=*&limit=1000', H);
  const rows = ((vc.json) || []).filter(r => F[r.film_slug]).map(r => {
    const tot = r.for_count + r.against_count;
    return { id: r.film_slug, title: F[r.film_slug].title, year: F[r.film_slug].year,
             for: r.for_count, against: r.against_count, tot: tot,
             pct: tot ? Math.round(r.for_count / tot * 100) : null };
  });

  const total = rows.reduce((n, r) => n + r.tot, 0);
  const solo  = rows.filter(r => r.tot === 1).length;
  const meaty = rows.filter(r => r.tot >= MIN_N).sort((a, b) => b.tot - a.tot);
  const turned = meaty.filter(r => r.pct < 50).sort((a, b) => a.pct - b.pct);
  const split  = meaty.filter(r => r.pct >= 50 && r.pct < 70)
                      .sort((a, b) => Math.abs(a.pct - 50) - Math.abs(b.pct - 50));

  const L = [];
  L.push('# Table Report figures — ' + today(), '');
  L.push('_All counts read live from vote_counts. Quote the n beside any percentage._', '');
  L.push('- Verdicts cast: **' + total + '**');
  L.push('- Films carrying a verdict: **' + rows.length + '** of ' + films().length +
         ' (' + (films().length - rows.length) + ' still unruled)');
  L.push('- Films resting on a single verdict: **' + solo + '**');
  L.push('- Films with ' + MIN_N + '+ verdicts (quotable): **' + meaty.length + '**', '');

  L.push('## Most-voted (top 12)', '', '| Film | Verdicts | For |', '| --- | ---: | ---: |');
  meaty.slice(0, 12).forEach(r => L.push('| ' + r.title + ' | ' + r.tot + ' | ' + r.pct + '% |'));
  L.push('');

  L.push('## Films the room turned on (below 50%, n>=' + MIN_N + ')', '');
  if (!turned.length) L.push('None. Every film with real sample is above water.', '');
  else { L.push('| Film | For/Against | % |', '| --- | :---: | ---: |');
         turned.forEach(r => L.push('| ' + r.title + ' | ' + r.for + '/' + r.against + ' | ' + r.pct + '% |')); L.push(''); }

  L.push('## Genuinely split (50-69%, n>=' + MIN_N + ')', '');
  if (!split.length) L.push('None.', '');
  else { L.push('| Film | For/Against | % |', '| --- | :---: | ---: |');
         split.slice(0, 10).forEach(r => L.push('| ' + r.title + ' | ' + r.for + '/' + r.against + ' | ' + r.pct + '% |')); L.push(''); }

  L.push('## Angle check', '',
    'The story is almost never the top of the board, which is the canon agreeing ' +
    'with itself. It is whatever sits in the two tables above: the films still ' +
    'in question. If those tables are empty or unchanged since last edition, ' +
    'skip the report rather than padding it.', '');

  fs.writeFileSync(path.join(ROOT, 'table-report.md'), L.join('\n'));
  console.log(L.join('\n'));
})();
