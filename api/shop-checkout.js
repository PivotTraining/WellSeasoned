// Merch checkout session creator (Vercel serverless function) — Phase 2 of
// the Printify shop (api/printify.js is Phase 1: browse/pick only). Same
// config-gated pattern as api/checkout.js (membership): without real Stripe
// + Printify credentials in Vercel env, this 503s and the client shows a
// friendly "almost here" message instead of a dead/broken button.
//
// Deliberately does NOT trust the price/title the client sends — it
// re-fetches the specific product from Printify server-side and builds the
// Stripe line item from that authoritative data, so a tampered client
// request can't under-charge a customer or check out a disabled variant.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const printifyToken = process.env.PRINTIFY_API_TOKEN;
  const shopId = process.env.PRINTIFY_SHOP_ID;
  if (!stripeKey || !printifyToken || !shopId) {
    return res.status(503).json({ error: "Shop checkout isn't configured yet." });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const productId = body && body.productId;
  const variantId = body && Number(body.variantId);
  const quantity = Math.max(1, Math.min(10, Number((body && body.quantity) || 1)));
  if (!productId || !variantId) {
    return res.status(400).json({ error: 'Missing product selection.' });
  }

  try {
    const prodRes = await fetch(
      `https://api.printify.com/v1/shops/${encodeURIComponent(shopId)}/products/${encodeURIComponent(productId)}.json`,
      { headers: { Authorization: 'Bearer ' + printifyToken } }
    );
    const product = await prodRes.json();
    if (!prodRes.ok || !product || !Array.isArray(product.variants)) {
      console.error('shop checkout: product lookup failed', prodRes.status);
      return res.status(502).json({ error: 'Could not verify that product. Please try again.' });
    }
    const variant = product.variants.find((v) => v.id === variantId && v.is_enabled);
    if (!variant || variant.is_available === false) {
      return res.status(400).json({ error: 'That color/size just went out of stock.' });
    }

    const image = (product.images && (product.images.find((i) => i.is_default) || product.images[0]) || {}).src;
    const site = 'https://itswellseasoned.com';
    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('line_items[0][quantity]', String(quantity));
    params.append('line_items[0][price_data][currency]', 'usd');
    params.append('line_items[0][price_data][unit_amount]', String(variant.price));
    params.append('line_items[0][price_data][product_data][name]', product.title + (variant.title ? ' — ' + variant.title : ''));
    if (image) params.append('line_items[0][price_data][product_data][images][0]', image);
    // US-only for now — Printify shipping rates/methods beyond domestic
    // aren't confirmed for this shop yet; international is a follow-up.
    params.append('shipping_address_collection[allowed_countries][0]', 'US');
    params.append('metadata[productId]', String(productId));
    params.append('metadata[variantId]', String(variantId));
    params.append('metadata[quantity]', String(quantity));
    params.append('success_url', site + '/#/shop?checkout=success');
    params.append('cancel_url', site + '/#/shop?checkout=cancel');

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(stripeKey + ':').toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await stripeRes.json();
    if (!stripeRes.ok || !data || !data.url) {
      console.error('shop checkout: stripe session error', stripeRes.status, data && data.error);
      return res.status(502).json({ error: 'Could not start checkout. Please try again shortly.' });
    }

    return res.status(200).json({ url: data.url });
  } catch (e) {
    console.error('shop checkout exception', e);
    return res.status(502).json({ error: 'Could not start checkout. Please try again shortly.' });
  }
}
