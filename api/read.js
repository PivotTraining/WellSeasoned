// Per-article share previews (Vercel serverless function) — same trick as
// api/f.js and api/apply.js: hash routes (#/read/x) never reach a server, so
// crawlers scraping a shared Word link only ever saw the generic homepage OG
// card (title/logo), never the piece's own headline or photo. /read/<slug> is
// the shareable form: crawlers get the article's real title/dek/hero_image
// fetched live from Supabase (articles are edited anytime through Curate, so
// unlike films there's no static build artifact to read from), humans get
// bounced straight to the hash route the SPA already understands.
const SUPABASE_URL = 'https://iherwgeuxwpapjreoofq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Owy8s8-j6LzxYhDmpCo53w_7ehrsGuh';

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export default async function handler(req, res) {
  const site = 'https://itswellseasoned.com';
  const slug = String((req.query || {}).slug || '');
  if (!slug) { res.writeHead(302, { Location: site }); return res.end(); }

  let a = null;
  try {
    const r = await fetch(
      SUPABASE_URL + '/rest/v1/articles?slug=eq.' + encodeURIComponent(slug) +
      '&published=eq.true&select=title,dek,author,hero_image&limit=1',
      { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } }
    );
    if (r.ok) { const rows = await r.json(); a = Array.isArray(rows) && rows[0]; }
  } catch (e) { /* fall through to generic redirect below */ }

  const hashUrl = site + '/#/read/' + encodeURIComponent(slug);
  if (!a) { res.writeHead(302, { Location: hashUrl }); return res.end(); }

  const title = a.title + ' — Well Seasoned';
  const desc = a.dek || 'A read from Well Seasoned — reviews, essays, and lists in our voice.';
  const img = a.hero_image || site + '/og.png';
  const pageUrl = site + '/read/' + encodeURIComponent(slug);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Short edge cache: an owner editing a piece right after publishing
  // shouldn't have to wait a full day for the share card to catch up.
  res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=86400');
  res.status(200).send('<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<title>' + esc(title) + '</title>' +
    '<meta name="description" content="' + esc(desc) + '">' +
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
    '<meta name="robots" content="noindex">' + // canonical content lives on the SPA
    '<script>location.replace(' + JSON.stringify(hashUrl) + ');</script>' +
    '</head><body>' +
    '<p><a href="' + esc(hashUrl) + '">' + esc(a.title) + ' on Well Seasoned</a></p>' +
    '</body></html>');
}
