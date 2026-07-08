// A clean link preview for the advertiser rate-card page. Same trick as
// /apply/<role> and /f/<slug>: crawlers read real Open Graph/Twitter meta
// here so a link the owner DMs to a prospective (Black-owned) sponsor
// doesn't show the generic homepage card — then humans get bounced into
// the app's #/advertise page.

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export default function handler(req, res) {
  const site = 'https://itswellseasoned.com';
  const title = 'Advertise on Well Seasoned';
  const desc = 'Reach the culture that shows up. Well Seasoned is where Black film and TV get scored honestly — no non-Black advertising, ever. Placement-based sponsorships for Black-owned media and brands.';
  const pageTitle = title + ' — Reach the culture that shows up';
  const img = site + '/og.png';
  const hashUrl = site + '/#/advertise';
  const pageUrl = site + '/advertise';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  res.status(200).send('<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<title>' + esc(pageTitle) + '</title>' +
    '<meta name="description" content="' + esc(desc) + '">' +
    '<meta property="og:type" content="website">' +
    '<meta property="og:site_name" content="Well Seasoned">' +
    '<meta property="og:url" content="' + esc(pageUrl) + '">' +
    '<meta property="og:title" content="' + esc(title) + '">' +
    '<meta property="og:description" content="' + esc(desc) + '">' +
    '<meta property="og:image" content="' + esc(img) + '">' +
    '<meta name="twitter:card" content="summary_large_image">' +
    '<meta name="twitter:title" content="' + esc(title) + '">' +
    '<meta name="twitter:description" content="' + esc(desc) + '">' +
    '<meta name="twitter:image" content="' + esc(img) + '">' +
    '<meta name="robots" content="noindex">' +
    '<script>location.replace(' + JSON.stringify(hashUrl) + ');</script>' +
    '</head><body>' +
    '<p><a href="' + esc(hashUrl) + '">' + esc(title) + '</a></p>' +
    '</body></html>');
}
