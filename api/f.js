// Per-film share previews (Vercel serverless function).
// Hash routes (#/film/x) never reach a server, so crawlers scraping a shared
// link only ever saw the homepage OG tags. /f/<slug> is the shareable form:
// crawlers get film-specific OG/Twitter meta from api/films.json (a build
// artifact extracted from the FILMS array — regenerate it whenever the
// catalog in index.html changes), humans get bounced straight to the hash
// route the SPA already understands. Nothing here invents data: title, year,
// synopsis and poster are the same baked catalog the page renders.
import films from './films.json' with { type: 'json' };

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
  const img = f.p || site + '/og.png';
  const hashUrl = site + '/#/film/' + encodeURIComponent(id);
  const pageUrl = site + '/f/' + encodeURIComponent(id);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Cache at the edge for a day; s-maxage keeps human redirects instant too.
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  res.status(200).send('<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<title>' + esc(title) + '</title>' +
    '<meta name="description" content="' + esc(desc) + '">' +
    '<meta property="og:type" content="video.movie">' +
    '<meta property="og:site_name" content="Well Seasoned">' +
    '<meta property="og:url" content="' + esc(pageUrl) + '">' +
    '<meta property="og:title" content="' + esc(title) + '">' +
    '<meta property="og:description" content="' + esc(desc) + '">' +
    '<meta property="og:image" content="' + esc(img) + '">' +
    '<meta name="twitter:card" content="summary_large_image">' +
    '<meta name="twitter:title" content="' + esc(title) + '">' +
    '<meta name="twitter:description" content="' + esc(desc) + '">' +
    '<meta name="twitter:image" content="' + esc(img) + '">' +
    '<meta name="robots" content="noindex">' + // canonical content lives on the SPA
    '<script>location.replace(' + JSON.stringify(hashUrl) + ');</script>' +
    '</head><body>' +
    '<p><a href="' + esc(hashUrl) + '">' + esc(title) + ' on Well Seasoned</a></p>' +
    '</body></html>');
}
