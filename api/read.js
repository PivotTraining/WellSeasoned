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

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Short edge cache: an owner editing a piece right after publishing
  // shouldn't have to wait a full day for the page to catch up.
  res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=86400');
  res.status(200).send('<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>' + esc(title) + '</title>' +
    '<meta name="description" content="' + esc(desc) + '">' +
    '<link rel="canonical" href="' + esc(pageUrl) + '">' +
    '<meta property="og:type" content="article">' +
    '<meta property="og:site_name" content="Well Seasoned">' +
    '<meta property="og:url" content="' + esc(pageUrl) + '">' +
    '<meta property="og:title" content="' + esc(a.title) + '">' +
    '<meta property="og:description" content="' + esc(desc) + '">' +
    '<meta property="og:image" content="' + esc(img) + '">' +
    (a.author ? '<meta property="article:author" content="' + esc(a.author) + '">' : '') +
    '<meta name="twitter:card" content="summary_large_image">' +
    '<meta name="twitter:title" content="' + esc(a.title) + '">' +
    '<meta name="twitter:description" content="' + esc(desc) + '">' +
    '<meta name="twitter:image" content="' + esc(img) + '">' +
    '<script type="application/ld+json">' + JSON.stringify(breadcrumbLd) + '</script>' +
    '<script type="application/ld+json">' + JSON.stringify(articleLd) + '</script>' +
    '<style>' +
      'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#161210;color:#F6ECD7;margin:0;padding:0 20px 60px;max-width:680px;margin-left:auto;margin-right:auto}' +
      'a{color:#F4B733}' +
      'nav.crumbs{display:flex;flex-wrap:wrap;gap:6px;font-size:12.5px;color:rgba(246,236,215,.55);padding:22px 0 18px}' +
      'nav.crumbs a{color:rgba(246,236,215,.75);text-decoration:none}' +
      'nav.crumbs a:hover{color:#F4B733}' +
      'img.hero{width:100%;max-height:340px;object-fit:cover;border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,.5);display:block;margin:0 0 20px}' +
      '.kind{font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#F4B733}' +
      'h1{font-family:Georgia,serif;font-size:32px;margin:8px 0 6px;line-height:1.12}' +
      '.meta{color:rgba(246,236,215,.55);font-size:14px;margin-bottom:22px}' +
      '.copy p{font-size:17px;line-height:1.68;color:rgba(246,236,215,.92);margin:0 0 18px}' +
      '.copy blockquote{font-family:Georgia,serif;font-size:22px;line-height:1.3;margin:26px 0;padding-left:18px;border-left:3px solid #BE3B18;color:#F6ECD7}' +
      '.cta{display:inline-block;margin-top:12px;background:#E49B0B;color:#20160B;font-weight:800;padding:13px 26px;border-radius:999px;text-decoration:none;font-size:15px}' +
    '</style>' +
    '</head><body>' +
    '<nav class="crumbs" aria-label="Breadcrumb">' +
      '<a href="' + esc(site) + '/">Well Seasoned</a><span>/</span>' +
      '<a href="' + esc(site) + '/#/word">The Balcony</a><span>/</span>' +
      '<span>' + esc(a.title) + '</span>' +
    '</nav>' +
    (a.hero_image ? '<img class="hero" src="' + esc(a.hero_image) + '" alt="' + esc(a.title) + '">' : '') +
    '<div class="kind">' + esc(kindLabel) + (a.subject ? ' · ' + esc(a.subject) : '') + '</div>' +
    '<h1>' + esc(a.title) + '</h1>' +
    '<div class="meta">' + (a.author ? 'By ' + esc(a.author) : 'Well Seasoned') + '</div>' +
    '<div class="copy">' + bodyToHtml(a.body) + '</div>' +
    '<a class="cta" href="' + esc(hashUrl) + '">Read on Well Seasoned →</a>' +
    '</body></html>');
}
