// Generates sitemap.xml from the same films.json extract api/f.js uses, so
// every /f/<id> page (the real, indexable film pages) is discoverable —
// nothing hand-maintained, nothing that can drift from the live catalog.
import films from './films.json' with { type: 'json' };

export default function handler(req, res) {
  const site = 'https://itswellseasoned.com';
  const staticUrls = [
    { loc: site + '/', priority: '1.0' },
    { loc: site + '/join', priority: '0.6' },
    { loc: site + '/advertise', priority: '0.3' },
    { loc: site + '/apply/critic', priority: '0.3' },
    { loc: site + '/apply/writer', priority: '0.3' },
  ];
  const filmUrls = Object.keys(films).map((id) => ({
    loc: site + '/f/' + encodeURIComponent(id),
    priority: '0.8',
  }));

  const urls = staticUrls.concat(filmUrls);
  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls
      .map(
        (u) =>
          '<url><loc>' + u.loc + '</loc><priority>' + u.priority + '</priority></url>'
      )
      .join('\n') +
    '\n</urlset>';

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  res.status(200).send(body);
}
