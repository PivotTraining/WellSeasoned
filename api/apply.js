// Shareable apply links with their OWN link preview. /apply/critic and
// /apply/writer serve role-specific Open Graph / Twitter meta ("Want to be a
// critic?") so a pasted link doesn't look like the generic site card — then
// bounce humans into the app's application form (#/apply/<role>). Same trick as
// /f/<slug>: crawlers read the meta, humans get redirected.

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export default function handler(req, res) {
  const site = 'https://itswellseasoned.com';
  let role = String((req.query || {}).role || 'critic').toLowerCase();
  if (role !== 'writer') role = 'critic';

  const M = role === 'writer'
    ? { title: 'Want to write for the culture?',
        desc: 'Join The Word on Well Seasoned — essays, features, and reviews by the culture. Real bylines, no gatekeeping. Tap to apply.' }
    : { title: 'Want to be a critic?',
        desc: 'Join The Kitchen on Well Seasoned — verified critics of the culture. Your score moves the official number, and nothing is ever bought. Tap to apply.' };

  const pageTitle = M.title + ' — Well Seasoned';
  const img = site + '/og.png';
  const hashUrl = site + '/#/apply/' + role;
  const pageUrl = site + '/apply/' + role;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  res.status(200).send('<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<title>' + esc(pageTitle) + '</title>' +
    '<meta name="description" content="' + esc(M.desc) + '">' +
    '<meta property="og:type" content="website">' +
    '<meta property="og:site_name" content="Well Seasoned">' +
    '<meta property="og:url" content="' + esc(pageUrl) + '">' +
    '<meta property="og:title" content="' + esc(M.title) + '">' +
    '<meta property="og:description" content="' + esc(M.desc) + '">' +
    '<meta property="og:image" content="' + esc(img) + '">' +
    '<meta name="twitter:card" content="summary_large_image">' +
    '<meta name="twitter:title" content="' + esc(M.title) + '">' +
    '<meta name="twitter:description" content="' + esc(M.desc) + '">' +
    '<meta name="twitter:image" content="' + esc(img) + '">' +
    '<meta name="robots" content="noindex">' +
    '<script>location.replace(' + JSON.stringify(hashUrl) + ');</script>' +
    '</head><body>' +
    '<p><a href="' + esc(hashUrl) + '">' + esc(M.title) + ' on Well Seasoned</a></p>' +
    '</body></html>');
}
