// Per-film pages — the site's real organic-search surface.
// Hash routes (#/film/x) never reach a server, so a crawler hitting the
// homepage only ever saw one URL for the entire 1000+-title catalog: zero
// indexable film pages, on a site whose whole value is per-film reviews.
// /f/<slug> fixes that: a real, crawlable, indexable page per film (poster,
// synopsis, year, director — the same baked catalog the app renders, never
// invented), with Movie/TVSeries structured data for search-result rich
// results. It does NOT auto-redirect — an immediate redirect would cause
// Google to treat this page as a pointer to the hash URL (which isn't
// independently indexable) instead of indexing this page's own content, so
// humans get a clear "Open in Well Seasoned" CTA into the full app instead
// of an instant bounce.
import films from './films.json' with { type: 'json' };
import ogCards from './og-cards.json' with { type: 'json' };

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export default function handler(req, res) {
  const id = String((req.query || {}).id || '');
  const f = films[id];
  const site = 'https://itswellseasoned.com';
  if (!f) { res.writeHead(302, { Location: site }); return res.end(); }

  const title = f.t + (f.y ? ' (' + f.y + ')' : '') + ' — Well Seasoned';
  const desc = f.d
    ? f.d + (f.d.length >= 200 ? '…' : '')
    : 'Two verdicts on ' + f.t + '. The Kitchen is verified critics of the culture. The Table is the community that bought the ticket.';
  /* Link-preview image. Threads/X/Facebook/iMessage all render og:image in a
     ~1.91:1 LANDSCAPE card, so handing them the raw 2:3 TMDB poster meant
     every preview got centre-cropped to the poster's middle band — faces
     sliced off, title treatment cut in half. Prefer a purpose-built 1200x630
     card (scripts/gen-og-card.cjs) when one has been generated for this
     title; otherwise fall back to the poster, which still beats nothing.
     Only declare width/height for the real card — claiming 1200x630 for a
     portrait poster would make platforms letterbox or mis-crop it. */
  const hasCard = !!ogCards[id];
  const img = hasCard
    ? site + '/og/' + encodeURIComponent(id) + '.jpg'
    : (f.p || site + '/og.png');
  const hashUrl = site + '/#/film/' + encodeURIComponent(id);
  const pageUrl = site + '/f/' + encodeURIComponent(id);
  const kind = f.tv ? 'series' : 'film';

  const ld = {
    '@context': 'https://schema.org',
    '@type': f.tv ? 'TVSeries' : 'Movie',
    name: f.t,
    image: img,
    description: f.d || undefined,
    datePublished: f.y ? String(f.y) : undefined,
    url: pageUrl,
  };
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Well Seasoned', item: site + '/' },
      { '@type': 'ListItem', position: 2, name: 'Browse', item: site + '/#/browse' },
      { '@type': 'ListItem', position: 3, name: f.t, item: pageUrl },
    ],
  };

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  res.status(200).send('<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>' + esc(title) + '</title>' +
    '<meta name="description" content="' + esc(desc) + '">' +
    '<link rel="canonical" href="' + esc(pageUrl) + '">' +
    '<meta property="og:type" content="video.movie">' +
    '<meta property="og:site_name" content="Well Seasoned">' +
    '<meta property="og:url" content="' + esc(pageUrl) + '">' +
    '<meta property="og:title" content="' + esc(title) + '">' +
    '<meta property="og:description" content="' + esc(desc) + '">' +
    '<meta property="og:image" content="' + esc(img) + '">' +
    (hasCard ? '<meta property="og:image:width" content="1200">' +
               '<meta property="og:image:height" content="630">' +
               '<meta property="og:image:type" content="image/jpeg">' +
               '<meta property="og:image:alt" content="' + esc(f.t + (f.y ? ' (' + f.y + ')' : '') + ' on Well Seasoned') + '">' : '') +
    '<meta name="twitter:card" content="summary_large_image">' +
    '<meta name="twitter:title" content="' + esc(title) + '">' +
    '<meta name="twitter:description" content="' + esc(desc) + '">' +
    '<meta name="twitter:image" content="' + esc(img) + '">' +
    '<script type="application/ld+json">' + JSON.stringify(ld) + '</script>' +
    '<script type="application/ld+json">' + JSON.stringify(breadcrumbLd) + '</script>' +
    '<style>' +
      'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0c0602;color:#F6ECD7;margin:0;padding:22px 20px 60px;max-width:640px;margin-left:auto;margin-right:auto}' +
      'a{color:#F4B733}' +
      'nav.crumbs{display:flex;flex-wrap:wrap;gap:6px;font-size:12.5px;color:rgba(246,236,215,.55);margin-bottom:22px}' +
      'nav.crumbs a{color:rgba(246,236,215,.75);text-decoration:none}' +
      'nav.crumbs a:hover{color:#F4B733}' +
      'img{width:100%;max-width:280px;border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,.5);display:block;margin:0 0 20px}' +
      'h1{font-size:28px;margin:0 0 6px;line-height:1.1}' +
      '.meta{color:rgba(246,236,215,.6);font-size:14px;margin-bottom:16px}' +
      'p{font-size:16px;line-height:1.55;color:rgba(246,236,215,.92)}' +
      '.cta{display:inline-block;margin-top:22px;background:#E49B0B;color:#20160B;font-weight:800;padding:13px 26px;border-radius:999px;text-decoration:none;font-size:15px}' +
    '</style>' +
    '</head><body>' +
    '<nav class="crumbs" aria-label="Breadcrumb">' +
      '<a href="' + esc(site) + '/">Well Seasoned</a><span>/</span>' +
      '<a href="' + esc(site) + '/#/browse">Browse</a><span>/</span>' +
      '<span>' + esc(f.t) + '</span>' +
    '</nav>' +
    (f.p ? '<img src="' + esc(f.p) + '" alt="' + esc(f.t) + ' poster">' : '') +
    '<h1>' + esc(f.t) + '</h1>' +
    '<div class="meta">' + (f.y || '') + (f.tv ? ' · Series' : '') + '</div>' +
    '<p>' + esc(f.d || desc) + '</p>' +
    '<a class="cta" href="' + esc(hashUrl) + '">Rate this ' + kind + ' on Well Seasoned →</a>' +
    '</body></html>');
}
