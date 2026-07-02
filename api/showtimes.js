// Live showtimes proxy (Vercel serverless function).
// The site calls /api/showtimes?q=<title>&location=<zip-or-city>. The SerpApi
// key stays server-side: set SERPAPI_KEY in Vercel → Settings → Environment
// Variables. Without it this returns 501 and the site falls back to sample
// rows + live Fandango/Google links.
//
// Flow: resolve the user's ZIP/city to a canonical Google location (SerpApi's
// public locations API handles both), then search "<title> showtimes" with
// that location — the canonical trigger for Google's showtimes panel. When
// Google answers with streaming availability instead of showtimes, we report
// not_in_theaters so the UI can say so honestly.
export default async function handler(req, res) {
  const key = process.env.SERPAPI_KEY;
  const { q, location } = req.query || {};
  if (!key) return res.status(501).json({ error: 'not_configured' });
  if (!q || !location) return res.status(400).json({ error: 'missing_params' });

  try {
    // 1) canonicalize the location (works for ZIPs and city names; no key needed)
    let canonical = null;
    try {
      const lr = await fetch(
        'https://serpapi.com/locations.json?limit=1&q=' + encodeURIComponent(String(location))
      );
      if (lr.ok) {
        const locs = await lr.json();
        if (Array.isArray(locs) && locs[0] && locs[0].country_code === 'US') {
          canonical = locs[0].canonical_name;
        }
      }
    } catch (e) {}

    // 2) search with the location param when we resolved one, else lean on query text
    const url =
      'https://serpapi.com/search.json?engine=google&google_domain=google.com&hl=en&gl=us' +
      '&q=' + encodeURIComponent(canonical ? q + ' showtimes' : q + ' showtimes near ' + String(location)) +
      (canonical ? '&location=' + encodeURIComponent(canonical) : '') +
      '&api_key=' + key;
    const r = await fetch(url);
    if (!r.ok) return res.status(502).json({ error: 'provider_error', status: r.status });
    const data = await r.json();

    // ?debug=1 → response SHAPE only (keys + provider error text), never content or keys
    if (req.query && req.query.debug === '1') {
      return res.status(200).json({
        canonical,
        provider_error: data.error || null,
        top_keys: Object.keys(data),
        showtimes_len: (data.showtimes || []).length,
        has_streaming: !!(data.available_on && data.available_on.length),
      });
    }

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

    // Google answered "where to stream it" instead of showtimes → it's left theaters
    const notInTheaters =
      days.length === 0 && !!(data.available_on && data.available_on.length);

    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');
    return res.status(200).json({ days, not_in_theaters: notInTheaters });
  } catch (e) {
    return res.status(502).json({ error: 'provider_error' });
  }
}
