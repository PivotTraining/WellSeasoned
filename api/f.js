// Per-film pages — the site's real organic-search surface and, for most
// first-time visitors, the first thing they ever see of Well Seasoned.
//
// Hash routes (#/film/x) never reach a server, so without these a crawler
// hitting the homepage saw exactly one URL for a 1,290-title catalog.
//
// It does NOT auto-redirect: an immediate redirect makes Google treat this as
// a pointer to the hash URL (which is not independently indexable) rather than
// indexing this page's own content.
//
// The page carries the LIVE Kitchen and Table numbers. That is the whole
// premise of the site, and leaving it off made the most-indexed surface we
// have read as a synopsis anyone could copy from TMDB — thin to a crawler and
// unconvincing to a human. Both numbers print their real n, and an unscored
// side says so plainly instead of showing a zero that looks like a verdict.
import films from './films.json' with { type: 'json' };
import ogCards from './og-cards.json' with { type: 'json' };
import { SITE, esc, shell, crumbs, crumbLd } from './_shell.js';

const SUPABASE_URL = 'https://iherwgeuxwpapjreoofq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Owy8s8-j6LzxYhDmpCo53w_7ehrsGuh';

async function sb(path) {
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/' + path,
      { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } });
    if (!r.ok) return [];
    const j = await r.json();
    return Array.isArray(j) ? j : [];
  } catch (e) { return []; }
}
const band = (n) => (n >= 75 ? 'good' : n >= 50 ? 'mid' : 'low');

function verdictCard(lab, score, sub, emptyMsg) {
  return '<div class="vcard"><span class="vlab">' + esc(lab) + '</span>' +
    (score == null
      ? '<div class="vnum none">' + esc(emptyMsg) + '</div>'
      : '<div class="vnum ' + band(score) + '">' + score + '<span style="font-size:.5em">%</span></div>') +
    '<div class="vsub">' + esc(sub) + '</div></div>';
}

/* Sideways links into the catalog. Pages with no outbound internal links get
   crawled shallowly and pass no authority on, and a visitor who lands on one
   film from search otherwise has nowhere to go but out. */
const STOP = { the: 1, of: 1, and: 1, a: 1 };
const words = (g) => String(g || '').toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2 && !STOP[w]);

/* Sideways links into the catalog. Pages with no outbound internal links get
   crawled shallowly and pass no authority on, and a visitor who lands on one
   film from search otherwise has nowhere to go but out — so this always
   returns something, and the heading says which kind of match it made. */
function related(id, f) {
  const tags = f.g || [];
  const fw = words(f.gn);
  const scored = [];
  for (const k in films) {
    if (k === id) continue;
    const o = films[k];
    /* never mix "our films" with scope:'all' titles — a sideways link should
       stay inside the same shelf the visitor is already on */
    if (!!o.s !== !!f.s) continue;
    let n = 0;
    if (o.g) for (const t of o.g) if (tags.indexOf(t) >= 0) n++;
    const sameGenre = f.gn && o.gn === f.gn;
    /* Genre-word overlap catches the one-off genres. 16 titles in the catalog
       have a genre no other film shares ("Southern Gothic"), so an exact match
       alone left those pages with no related row at all. */
    let gw = 0;
    if (!sameGenre && fw.length) { const ow = words(o.gn); for (const w of fw) if (ow.indexOf(w) >= 0) gw++; }
    if (!n && !sameGenre && !gw) continue;
    scored.push({ id: k, f: o, score: n * 10 + (sameGenre ? 5 : 0) + gw * 2,
      dy: Math.abs((o.y || 0) - (f.y || 0)) });
  }
  scored.sort((a, b) => b.score - a.score || a.dy - b.dy);
  if (scored.length >= 3) return { kind: 'like', rows: scored.slice(0, 6) };
  /* Nothing close enough. Rather than print an empty section or a row of three,
     fall back to the nearest titles of the same kind and say so in the heading
     instead of calling them similar. */
  const near = [];
  for (const k in films) {
    if (k === id) continue;
    const o = films[k];
    if (!!o.s !== !!f.s || !!o.tv !== !!f.tv) continue;
    near.push({ id: k, f: o, dy: Math.abs((o.y || 0) - (f.y || 0)) });
  }
  near.sort((a, b) => a.dy - b.dy);
  return { kind: 'near', rows: near.slice(0, 6) };
}

export default async function handler(req, res) {
  const id = String((req.query || {}).id || '');
  const f = films[id];
  if (!f) { res.writeHead(302, { Location: SITE }); return res.end(); }

  const [votes, kitchen] = await Promise.all([
    sb('vote_counts?film_slug=eq.' + encodeURIComponent(id) + '&select=for_count,against_count'),
    sb('kitchen_scores?film_slug=eq.' + encodeURIComponent(id) + '&select=k,critics'),
  ]);
  const v = votes[0] || null, kk = kitchen[0] || null;
  const tTotal = v ? (v.for_count || 0) + (v.against_count || 0) : 0;
  const tScore = tTotal ? Math.round(((v.for_count || 0) / tTotal) * 100) : null;
  const kScore = kk && kk.k != null ? kk.k : null;

  const kind = f.tv ? 'series' : 'film';
  const title = f.t + (f.y ? ' (' + f.y + ')' : '') + ' — Well Seasoned';
  /* Lead the meta description with the real verdict when we have one: it is
     the differentiator, and it is what a search snippet should show. */
  const scoreBit = (kScore != null || tScore != null)
    ? 'The Table says ' + (tScore != null ? tScore + '%' : 'not yet') +
      (kScore != null ? ', The Kitchen ' + kScore + '%' : '') + '. '
    : '';
  const desc = scoreBit + (f.d || ('Two verdicts on ' + f.t + '.'));

  const hasCard = !!ogCards[id];
  const img = hasCard ? SITE + '/og/' + encodeURIComponent(id) + '.jpg' : (f.p || SITE + '/og.png');
  const pageUrl = SITE + '/f/' + encodeURIComponent(id);
  const hashUrl = SITE + '/#/film/' + encodeURIComponent(id);

  const ld = {
    '@context': 'https://schema.org', '@type': f.tv ? 'TVSeries' : 'Movie',
    name: f.t, image: img, description: f.d || undefined,
    datePublished: f.y ? String(f.y) : undefined, url: pageUrl,
  };
  /* aggregateRating only when a real audience score exists — never fabricated,
     and never emitted off a single verdict dressed up as a rating. */
  if (tScore != null && tTotal > 0) {
    ld.aggregateRating = { '@type': 'AggregateRating', ratingValue: (tScore / 20).toFixed(1),
      bestRating: '5', worstRating: '0', ratingCount: tTotal };
  }
  const path = [
    { name: 'Well Seasoned', href: SITE + '/' },
    { name: 'Browse', href: SITE + '/#/browse' },
    { name: f.t, self: pageUrl },
  ];

  const rel = related(id, f);
  const relRows = rel.rows, relLike = rel.kind === 'like';
  const body =
    crumbs(path) +
    '<div class="filmtop">' +
      (f.p ? '<img class="poster" src="' + esc(f.p) + '" alt="' + esc(f.t) + ' poster">' : '') +
      '<div class="info">' +
        '<h1>' + esc(f.t) + '</h1>' +
        '<p class="meta">' + (f.y || '') + (f.tv ? ' · Series' : ' · Film') + '</p>' +
        '<div class="verdicts">' +
          verdictCard('The Kitchen', kScore,
            kScore != null
              ? (kk.critics + ' verified critic' + (kk.critics === 1 ? '' : 's'))
              : 'Verified critics of the culture',
            'No critic has scored it') +
          verdictCard('The Table', tScore,
            tScore != null
              ? (tTotal + ' verdict' + (tTotal === 1 ? '' : 's') + ' from the room')
              : 'The community that bought the ticket',
            'Be the first to call it') +
        '</div>' +
        ((f.w && f.w.length) ? '<div class="chips">' +
          f.w.map((w) => '<span class="chip">' + esc(w === 'Rent' ? 'Rent or buy' : w) + '</span>').join('') +
          '</div>' : '') +
      '</div>' +
    '</div>' +
    '<p class="syn">' + esc(f.d || '') + '</p>' +
    '<a class="cta" href="' + esc(hashUrl) + '">' +
      (tScore == null ? 'Cast the first verdict on ' + esc(f.t) : 'Cast your verdict on ' + esc(f.t)) +
    ' →</a>' +
    (relRows.length
      ? '<section class="more"><h2>' + (relLike ? 'More like this' : 'More from the catalog') + '</h2>' +
        '<p class="sub">' + (relLike ? 'Same corner of the catalog.'
          : 'Nothing else is quite like it. These are the closest ' + (f.tv ? 'series' : 'films') + ' we carry.') +
        '</p><ul class="list">' +
        relRows.map((r) => '<li class="row">' +
          (r.f.p ? '<img src="' + esc(r.f.p) + '" alt="" loading="lazy">' : '<span class="noart"></span>') +
          '<span class="body"><a href="' + SITE + '/f/' + encodeURIComponent(r.id) + '">' + esc(r.f.t) + '</a>' +
          '<span class="meta">' + (r.f.y || '') + (r.f.tv ? ' · Series' : '') + '</span></span></li>').join('') +
        '</ul></section>'
      : '');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  /* An hour, not a day: the verdicts on the page are live, and a cached page
     still showing "be the first" after someone voted would misreport the room. */
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(shell({
    title, desc, url: pageUrl, image: img, imageSized: hasCard,
    imageAlt: hasCard ? f.t + (f.y ? ' (' + f.y + ')' : '') + ' on Well Seasoned' : '',
    ogType: 'video.movie', ld: [ld, crumbLd(path)], body,
  }));
}
