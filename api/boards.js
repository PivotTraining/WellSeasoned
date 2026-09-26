// Crawlable board pages — the site's actual differentiation, made indexable.
//
// Every board here answers a question no competitor can: Rotten Tomatoes and
// Letterboxd own "[film] review" on twenty years of domain authority and that
// fight is not winnable head-on. What they cannot answer is where verified
// critics and this audience DISAGREE, which Black films are free on Tubi right
// now, or which ones you should not put on with your mother in the room.
// Those boards already existed in the app — but only as hash routes
// (#/gap, #/kids, ...), which never reach a server, so none of it was
// indexable. This makes each one a real URL with real content.
//
// Same contract as api/f.js: no noindex, no auto-redirect (an instant redirect
// makes Google treat the page as a pointer to an unindexable hash URL rather
// than indexing this content), a canonical, breadcrumbs, ItemList structured
// data, and a clear CTA into the live app.
//
// NOTHING FAKE: boards that rank on scores fetch the live public views and
// print the real n on both sides. A board with no qualifying rows says so
// rather than padding itself out.
import films from './films.json' with { type: 'json' };
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
/* The Table score, computed exactly as the app computes it, so a board can
   never disagree with the film page it links to. */
function tableScore(v) {
  const t = (v.for_count || 0) + (v.against_count || 0);
  return t ? Math.round(((v.for_count || 0) / t) * 100) : null;
}
const ours = (f) => !f.s;                       // scope:'all' titles are not "our films"
const has = (f, tag) => (f.g || []).indexOf(tag) >= 0;
const on = (f, svc) => (f.w || []).indexOf(svc) >= 0;

const BOARDS = {
  'the-gap': {
    title: 'Where the critics and the culture disagree',
    lede: 'Every film we carry two verdicts on, ranked by the distance between them. The Kitchen is verified critics of the culture. The Table is the audience that bought the ticket. Nobody else publishes both numbers separately, so nobody else can publish this.',
    desc: 'Black films where verified critics and the audience split — ranked by the size of the gap, with the number of verdicts behind each side.',
    async rows() {
      const [votes, kitchen] = await Promise.all([
        sb('vote_counts?select=film_slug,for_count,against_count'),
        sb('kitchen_scores?select=film_slug,k,critics'),
      ]);
      const K = {};
      kitchen.forEach((k) => { K[k.film_slug] = k; });
      const out = [];
      votes.forEach((v) => {
        const f = films[v.film_slug], k = K[v.film_slug];
        if (!f || !k || k.k == null) return;
        const t = tableScore(v);
        if (t == null) return;
        const tn = (v.for_count || 0) + (v.against_count || 0);
        out.push({ id: v.film_slug, f, gap: Math.abs(k.k - t),
          note: 'Kitchen ' + k.k + '% (' + k.critics + ' critic' + (k.critics === 1 ? '' : 's') +
                ') vs Table ' + t + '% (' + tn + ' verdict' + (tn === 1 ? '' : 's') + ')' });
      });
      return out.sort((a, b) => b.gap - a.gap).slice(0, 60);
    },
    /* Said plainly on the page, because most of these Kitchen scores rest on
       a single critic and a board that hid that would be dressing up thin
       data as authority. */
    caveat: 'The Kitchen is young. Most scores here rest on one or two critics, and every row prints its own n so you can weigh it yourself.',
  },
  'unchallenged': {
    title: 'Films resting on a single verdict',
    lede: 'One person has ruled on each of these and nobody has argued back. A verdict nobody contests is not a verdict — it is a memory. These are the ties worth breaking.',
    desc: 'Black films and series carrying exactly one audience verdict on Well Seasoned — the open arguments nobody has answered yet.',
    async rows() {
      const votes = await sb('vote_counts?select=film_slug,for_count,against_count');
      const out = [];
      votes.forEach((v) => {
        const f = films[v.film_slug];
        const t = (v.for_count || 0) + (v.against_count || 0);
        if (!f || t !== 1) return;
        out.push({ id: v.film_slug, f, gap: (v.against_count ? 1 : 0),
          note: (v.against_count ? 'One person sent it back.' : 'One person called it seasoned.') + ' Nobody has answered.' });
      });
      /* the lone SEND-IT-BACK calls lead — an unanswered pan is the better argument */
      return out.sort((a, b) => b.gap - a.gap).slice(0, 60);
    },
  },
  'free-on-tubi': {
    title: 'Black films free on Tubi right now',
    lede: 'No subscription, no rental, no free trial. Every title here streams free with ads on Tubi, and every one of them is in our catalog because it belongs to the culture — not because an algorithm filed it that way.',
    desc: 'Black films and series streaming free on Tubi right now — a hand-verified list from the Well Seasoned catalog.',
    async rows() {
      return Object.keys(films).filter((id) => on(films[id], 'Tubi') && ours(films[id]))
        .map((id) => ({ id, f: films[id], note: 'Free with ads on Tubi' }))
        .sort((a, b) => (b.f.y || 0) - (a.f.y || 0));
    },
  },
  'black-family-movies': {
    title: 'Black family movies, by real age rating',
    lede: 'Family films and animation from the catalog. Every title opens with its real certification pulled live from TMDB — G, PG, PG-13 and up — not a guess, and never a made-up score. If a rating cannot be resolved we show no badge at all rather than invent one.',
    desc: 'Black family films and animation, each with its real age certification — a parent-facing shelf from Well Seasoned.',
    async rows() {
      return Object.keys(films).filter((id) => {
        const f = films[id];
        return ours(f) && (has(f, 'Family') || has(f, 'Animation'));
      }).map((id) => ({ id, f: films[id], note: films[id].tv ? 'Series' : 'Film' }))
        .sort((a, b) => (b.f.y || 0) - (a.f.y || 0));
    },
  },
  'dont-watch-with-mama': {
    title: "Don't watch these with your mother",
    lede: 'Not a rating board and not an algorithm — the room votes on what a film is actually full of, and a title only lands here when enough people have flagged it for both language and sex. Nothing is assigned. It has to be earned.',
    desc: 'Black films the audience has flagged as too much to watch with family in the room — voted, never assigned.',
    async rows() {
      const taps = await sb('mini_tag_counts?select=film_slug,tag,count');
      const by = {};
      taps.forEach((t) => { (by[t.film_slug] = by[t.film_slug] || {})[t.tag] = t.count; });
      const QUORUM = 3;
      return Object.keys(by).filter((id) => {
        const f = films[id], c = by[id];
        return f && (c.cuss || 0) >= QUORUM && (c.sex || 0) >= QUORUM;
      }).map((id) => ({ id, f: films[id],
        note: by[id].cuss + ' flagged the language, ' + by[id].sex + ' flagged the sex' }))
        .sort((a, b) => (by[b.id].cuss + by[b.id].sex) - (by[a.id].cuss + by[a.id].sex));
    },
    caveat: 'These badges are earned by real votes from real viewers. An empty board means the room has not called it yet, not that nothing qualifies.',
  },
};

export const BOARD_SLUGS = Object.keys(BOARDS);

function page({ slug, b, rows }) {
  const url = SITE + '/boards/' + slug;
  const title = b.title + ' — Well Seasoned';
  const path = [
    { name: 'Well Seasoned', href: SITE + '/' },
    { name: 'Boards', href: SITE + '/boards' },
    { name: b.title, self: url },
  ];
  const ld = {
    '@context': 'https://schema.org', '@type': 'ItemList', name: b.title,
    description: b.desc, url, numberOfItems: rows.length,
    itemListElement: rows.slice(0, 40).map((r, i) => ({
      '@type': 'ListItem', position: i + 1, name: r.f.t,
      url: SITE + '/f/' + encodeURIComponent(r.id),
    })),
  };
  const items = rows.length
    ? rows.map((r) => '<li class="row">' +
        (r.f.p ? '<img src="' + esc(r.f.p) + '" alt="' + esc(r.f.t) + ' poster" loading="lazy">' : '<span class="noart"></span>') +
        '<span class="body"><a href="' + esc(SITE + '/f/' + encodeURIComponent(r.id)) + '">' + esc(r.f.t) + '</a>' +
        '<span class="meta">' + (r.f.y || '') + (r.f.tv ? ' · Series' : '') + '</span>' +
        '<span class="note">' + esc(r.note) + '</span></span></li>').join('')
    : '<li class="empty">Nothing has qualified for this board yet. That is the honest state of it — we would rather show you an empty board than pad one.</li>';

  const body = crumbs(path) +
    '<h1>' + esc(b.title) + '</h1>' +
    '<p class="lede">' + esc(b.lede) + '</p>' +
    (b.caveat ? '<p class="caveat">' + esc(b.caveat) + '</p>' : '') +
    '<p class="count">' + (rows.length ? rows.length + (rows.length === 1 ? ' title' : ' titles') : 'No titles yet') + '</p>' +
    '<ul class="list">' + items + '</ul>' +
    '<a class="cta" href="' + SITE + '/">Cast your own verdict on Well Seasoned →</a>' +
    '<section class="more"><h2>Other boards</h2><ul class="list">' +
      BOARD_SLUGS.filter((x) => x !== slug).map((x) =>
        '<li class="row"><span class="body"><a href="' + SITE + '/boards/' + x + '">' + esc(BOARDS[x].title) + '</a>' +
        '<span class="note">' + esc(BOARDS[x].desc) + '</span></span></li>').join('') +
    '</ul></section>';

  return shell({ title, desc: b.desc, url, ld: [ld, crumbLd(path)], body, hideFooterLink: '/boards/' + slug });
}

function indexPage() {
  const url = SITE + '/boards';
  const desc = 'Boards you will not find anywhere else: where verified critics and the audience split, what is free on Tubi right now, and what the room says you cannot watch with your mother.';
  const path = [
    { name: 'Well Seasoned', href: SITE + '/' },
    { name: 'Boards', self: url },
  ];
  const body = crumbs(path) +
    '<h1>Boards</h1>' +
    '<p class="lede">Ways into the catalog that only work because we keep two separate scores and let the room tag what a film is actually full of.</p>' +
    '<ul class="list">' + BOARD_SLUGS.map((x) =>
      '<li class="row"><span class="body"><a href="' + SITE + '/boards/' + x + '">' + esc(BOARDS[x].title) + '</a>' +
      '<span class="note">' + esc(BOARDS[x].desc) + '</span></span></li>').join('') +
    '</ul>' +
    '<a class="cta" href="' + SITE + '/">Open Well Seasoned →</a>';
  return shell({ title: 'Boards — Well Seasoned', desc, url,
    ld: [crumbLd(path)], body, hideFooterLink: '/boards' });
}

export default async function handler(req, res) {
  const slug = String((req.query || {}).slug || '').toLowerCase();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (!slug) {
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).send(indexPage());
  }
  const b = BOARDS[slug];
  if (!b) { res.writeHead(302, { Location: SITE + '/boards' }); return res.end(); }
  let rows = [];
  try { rows = await b.rows(); } catch (e) { rows = []; }
  /* Shorter cache than /f/: these rank on live votes, so a board that took a
     week to reflect a new verdict would be lying about what the room said. */
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(page({ slug, b, rows }));
}
