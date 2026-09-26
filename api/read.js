// Per-article pages (Vercel serverless function) — same fix as api/f.js
// (2026-07-09 SEO pass): this used to be `noindex` + an instant
// `location.replace` bounce, which is the exact anti-pattern that made
// /f/<id> unindexable before it was fixed — an immediate redirect tells
// Google to treat the page as a pointer to the hash route (not
// independently indexable) instead of indexing its own content. The Balcony
// carries genuine long-form editorial (features, interviews, editorials);
// as a noindex redirect, none of it could ever surface in search. Fixed the
// same way /f/<id> was: real substantive body content (the actual published
// article, not just a title card), Article structured data, a canonical
// link, breadcrumbs, and a clear "Read on Well Seasoned" CTA into the full
// app instead of a zero-friction bounce.
import { SITE, esc as _esc, shell, crumbs, crumbLd } from './_shell.js';

const SUPABASE_URL = 'https://iherwgeuxwpapjreoofq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Owy8s8-j6LzxYhDmpCo53w_7ehrsGuh';

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Minimal markdown-ish → HTML for the crawlable page — doesn't need the
// client's full mdToHtml (pull-quotes, links, etc.), just real readable text
// so search engines see the actual essay, not a stub.
function bodyToHtml(body) {
  var blocks = String(body || '').split(/\n\s*\n/);
  return blocks.map(function (b) {
    b = b.trim();
    if (!b) return '';
    if (b.slice(0, 2) === '> ') {
      return '<blockquote>' + esc(b.slice(2)) + '</blockquote>';
    }
    return '<p>' + esc(b).replace(/\n/g, '<br>') + '</p>';
  }).join('');
}

var KIND_LABEL = { article: 'Feature', interview: 'Interview', editorial: 'Editorial' };

export default async function handler(req, res) {
  const site = 'https://itswellseasoned.com';
  const slug = String((req.query || {}).slug || '');
  if (!slug) { res.writeHead(302, { Location: site }); return res.end(); }

  let a = null;
  try {
    const r = await fetch(
      SUPABASE_URL + '/rest/v1/articles?slug=eq.' + encodeURIComponent(slug) +
      '&published=eq.true&select=title,dek,body,author,hero_image,kind,subject,created_at&limit=1',
      { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } }
    );
    if (r.ok) { const rows = await r.json(); a = Array.isArray(rows) && rows[0]; }
  } catch (e) { /* fall through to generic redirect below */ }

  const hashUrl = site + '/#/read/' + encodeURIComponent(slug);
  if (!a) { res.writeHead(302, { Location: hashUrl }); return res.end(); }

  const title = a.title + ' — The Balcony — Well Seasoned';
  const desc = a.dek || 'A read from The Balcony — features, editorials, and interviews from Well Seasoned.';
  const img = a.hero_image || site + '/og.png';
  const pageUrl = site + '/read/' + encodeURIComponent(slug);
  const kindLabel = KIND_LABEL[a.kind] || 'Feature';

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Well Seasoned', item: site + '/' },
      { '@type': 'ListItem', position: 2, name: 'The Balcony', item: site + '/#/word' },
      { '@type': 'ListItem', position: 3, name: a.title, item: pageUrl },
    ],
  };
  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: a.dek || undefined,
    image: img,
    author: a.author ? { '@type': 'Person', name: a.author } : undefined,
    publisher: { '@type': 'Organization', name: 'Well Seasoned', logo: { '@type': 'ImageObject', url: site + '/brand/icon-512.png' } },
    datePublished: a.created_at || undefined,
    mainEntityOfPage: pageUrl,
  };

  /* The Balcony is a dark magazine inside the app (body[data-view="read"]),
     so the crawlable version keeps that identity rather than flipping to the
     cream shell — the click through from here should not change the lights.
     Same chrome, re-toned. */
  const dark =
    'body{background:#161210;color:var(--on-dark)}' +
    'a{color:var(--gold-soft)}' +
    'header.site,footer.site{background:#1D1714;border-color:rgba(246,236,215,.14)}' +
    'header.site a.brand{color:var(--on-dark)}' +
    '.btag,nav.crumbs{color:rgba(246,236,215,.55)}' +
    'header.site nav a,nav.crumbs a,footer.site .links a{color:rgba(246,236,215,.78)}' +
    'header.site nav a:hover,nav.crumbs a:hover,footer.site .links a:hover{color:var(--gold-soft)}' +
    'footer.site .fine{color:rgba(246,236,215,.5)}' +
    'img.hero{width:100%;max-height:360px;object-fit:cover;border-radius:var(--r-lg);display:block;margin:4px 0 20px;box-shadow:0 18px 40px -18px rgba(0,0,0,.7)}' +
    '.kind{font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:.17em;text-transform:uppercase;color:var(--gold-soft)}' +
    'h1{font-family:var(--serif);font-weight:400;font-size:clamp(30px,5vw,46px);line-height:1.06;margin:10px 0 8px;letter-spacing:-.4px}' +
    '.dek{font-size:17px;line-height:1.55;color:rgba(246,236,215,.8);margin:0 0 12px;max-width:60ch}' +
    '.byline{font-family:var(--mono);font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;color:rgba(246,236,215,.55);margin-bottom:24px}' +
    '.copy p{font-size:17.5px;line-height:1.72;color:rgba(246,236,215,.92);margin:0 0 19px}' +
    '.copy blockquote{font-family:var(--serif);font-size:25px;line-height:1.28;margin:28px 0;padding-left:18px;border-left:3px solid var(--paprika);color:var(--on-dark)}' +
    '.cta{box-shadow:none}';

  const path = [
    { name: 'Well Seasoned', href: SITE + '/' },
    { name: 'The Balcony', href: SITE + '/#/word' },
    { name: a.title, self: pageUrl },
  ];
  const body = crumbs(path) +
    (a.hero_image ? '<img class="hero" src="' + esc(a.hero_image) + '" alt="' + esc(a.title) + '">' : '') +
    '<div class="kind">' + esc(kindLabel) + (a.subject ? ' · ' + esc(a.subject) : '') + '</div>' +
    '<h1>' + esc(a.title) + '</h1>' +
    (a.dek ? '<p class="dek">' + esc(a.dek) + '</p>' : '') +
    '<div class="byline">' + (a.author ? 'By ' + esc(a.author) : 'Well Seasoned') + '</div>' +
    '<div class="copy">' + bodyToHtml(a.body) + '</div>' +
    '<a class="cta" href="' + esc(hashUrl) + '">Read on Well Seasoned →</a>';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Short edge cache: an owner editing a piece right after publishing
  // shouldn't have to wait a full day for the page to catch up.
  res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=86400');
  res.status(200).send(shell({
    title, desc, url: pageUrl, image: img, ogType: 'article',
    head: a.author ? '<meta property="article:author" content="' + esc(a.author) + '">' : '',
    ld: [articleLd, crumbLd(path)], body, css: dark,
  }));
}
