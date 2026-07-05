// Stripe Checkout session creator (Vercel serverless function).
// Scaffolded ahead of a real Stripe account: set STRIPE_SECRET_KEY and
// STRIPE_PRICE_ID in Vercel → Settings → Environment Variables once the
// owner has created a Stripe account + a Product/Price for membership.
// Without both, this returns 503 and the client shows a friendly
// "almost here" message instead of a dead/broken button — same
// config-gated pattern as api/showtimes.js (SERPAPI_KEY).
//
// Zero-dependency by design (matches api/f.js, api/apply.js,
// api/showtimes.js — no npm deps in this repo): we call Stripe's REST
// API directly with fetch + HTTP Basic auth (secret key as username, no
// password) and a form-urlencoded body, rather than adding the `stripe`
// npm package.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!secretKey || !priceId) {
    return res.status(503).json({ error: "Membership checkout isn't configured yet." });
  }

  try {
    const site = 'https://itswellseasoned.com';
    const params = new URLSearchParams();
    // ASSUMPTION: recurring subscription billing ("The Regular" is priced
    // /mo in the UI). The owner may decide on a one-time charge instead —
    // if so, switch mode to 'payment' and drop the [line_items][0][price]
    // recurring requirement (Stripe Price would need to be one-time too).
    params.append('mode', 'subscription');
    params.append('line_items[0][price]', priceId);
    params.append('line_items[0][quantity]', '1');
    params.append('success_url', site + '/#/join?checkout=success');
    params.append('cancel_url', site + '/#/join?checkout=cancel');

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(secretKey + ':').toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await stripeRes.json();
    if (!stripeRes.ok || !data || !data.url) {
      // log server-side only — never leak raw Stripe error internals to the client
      console.error('stripe checkout error', stripeRes.status, data && data.error);
      return res.status(502).json({ error: 'Could not start checkout. Please try again shortly.' });
    }

    return res.status(200).json({ url: data.url });
  } catch (e) {
    console.error('stripe checkout exception', e);
    return res.status(502).json({ error: 'Could not start checkout. Please try again shortly.' });
  }
}
