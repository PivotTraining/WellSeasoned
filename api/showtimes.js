// Live showtimes proxy (Vercel serverless function).
// The site calls /api/showtimes?q=<title>&location=<zip-or-city>; this fetches
// Google showtimes via SerpApi and returns a trimmed payload. The SerpApi key
// stays server-side: set SERPAPI_KEY in Vercel → Project → Settings →
// Environment Variables, then redeploy. Without the key this returns 501 and
// the site falls back to sample rows + live Fandango/Google links.
export default async function handler(req, res) {
  const key = process.env.SERPAPI_KEY;
  const { q, location } = req.query || {};
  if (!key) return res.status(501).json({ error: 'not_configured' });
  if (!q || !location) return res.status(400).json({ error: 'missing_params' });

  try {
    // Put the place in the query itself: Google's showtimes panel triggers on
    // "<title> showtimes near <zip/city>", and SerpApi's `location` param
    // rejects bare ZIP codes anyway.
    const url =
      'https://serpapi.com/search.json?engine=google&google_domain=google.com&hl=en&gl=us' +
      '&q=' + encodeURIComponent(q + ' showtimes near ' + String(location)) +
      '&api_key=' + key;
    const r = await fetch(url);
    if (!r.ok) return res.status(502).json({ error: 'provider_error', status: r.status });
    const data = await r.json();

    // ?debug=1 → reveal the response SHAPE (keys + provider error text), never content/keys
    if (req.query && req.query.debug === '1') {
      return res.status(200).json({
        q: q + ' showtimes near ' + String(location),
        provider_error: data.error || null,
        top_keys: Object.keys(data),
        showtimes_len: (data.showtimes || []).length,
      });
    }

    // Trim to what the UI needs: days -> theaters -> times
    const days = (data.showtimes || []).slice(0, 2).map((d) => ({
      day: d.day || '',
      date: d.date || '',
      theaters: (d.theaters || []).slice(0, 8).map((t) => ({
        name: t.name || '',
        address: t.address || '',
        distance: t.distance || '',
        link: t.link || null,
        showing: (t.showing || []).map((s) => ({
          type: s.type || '',
          times: s.time || [],
        })),
      })),
    }));

    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');
    return res.status(200).json({ days });
  } catch (e) {
    return res.status(502).json({ error: 'provider_error' });
  }
}
