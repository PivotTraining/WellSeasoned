// Generates sitemap.xml from the same films.json extract api/f.js uses, so
// every /f/<id> page (the real, indexable film pages) is discoverable —
// nothing hand-maintained, nothing that can drift from the live catalog.
// Also pulls every published /read/<slug> (The Balcony) so those pieces are
// discoverable too — they were missing entirely until this pass, on top of
// having been noindex'd (see api/read.js for that fix).
import films from './films.json' with { type: 'json' };

const SUPABASE_URL = 'https://iherwgeuxwpapjreoofq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Owy8s8-j6LzxYhDmpCo53w_7ehrsGuh';

export default async function handler(req, res) {
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

  let articleUrls = [];
  try {
    const r = await fetch(
      SUPABASE_URL + '/rest/v1/articles?published=eq.true&select=slug&order=created_at.desc&limit=500',
      { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } }
    );
    if (r.ok) {
      const rows = await r.json();
      if (Array.isArray(rows)) {
        articleUrls = rows.map((a) => ({ loc: site + '/read/' + encodeURIComponent(a.slug), priority: '0.7' }));
      }
    }
  } catch (e) { /* sitemap still ships with films + static pages if this fails */ }

  const urls = staticUrls.concat(filmUrls).concat(articleUrls);
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
