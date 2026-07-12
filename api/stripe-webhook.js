// Stripe webhook — on a successful merch checkout, places the paid order
// with Printify for printing + shipping. This is the only place a real
// charge turns into a real physical order, so it's kept small and
// defensive. Config-gated on STRIPE_WEBHOOK_SECRET/PRINTIFY_API_TOKEN/
// PRINTIFY_SHOP_ID same as the rest of the shop scaffold.
//
// Needs the RAW request body to verify Stripe's signature (any JSON
// re-serialization would break the HMAC check), so Vercel's automatic body
// parsing is disabled below and the body is read as a raw buffer instead.
import crypto from 'crypto';

export const config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function verifyStripeSignature(rawBody, sigHeader, secret) {
  if (!sigHeader) return false;
  const parts = {};
  sigHeader.split(',').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx > -1) parts[pair.slice(0, idx)] = pair.slice(idx + 1);
  });
  if (!parts.t || !parts.v1) return false;
  const expected = crypto.createHmac('sha256', secret).update(parts.t + '.' + rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const printifyToken = process.env.PRINTIFY_API_TOKEN;
  const shopId = process.env.PRINTIFY_SHOP_ID;
  if (!webhookSecret || !printifyToken || !shopId) {
    console.error('stripe webhook received but shop checkout is not configured');
    return res.status(503).end();
  }

  const rawBody = await readRawBody(req);
  const sig = req.headers['stripe-signature'];
  let valid = false;
  try { valid = verifyStripeSignature(rawBody, sig, webhookSecret); } catch (e) { valid = false; }
  if (!valid) {
    console.error('stripe webhook: invalid signature');
    return res.status(400).end();
  }

  let event;
  try { event = JSON.parse(rawBody.toString('utf8')); } catch (e) { return res.status(400).end(); }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    // Only merch checkouts carry productId/variantId metadata — membership
    // checkouts (api/checkout.js) hit this same webhook endpoint if one is
    // ever wired up for subscriptions, so skip anything that isn't a shop order.
    if (session.metadata && session.metadata.productId) {
      try {
        await placePrintifyOrder(session, printifyToken, shopId);
      } catch (e) {
        // Stripe already has the customer's money at this point. Log for a
        // human to place the order manually via the Printify dashboard
        // rather than returning non-200 and triggering Stripe's retry loop
        // (retries would re-attempt fulfillment, not re-charge the card —
        // but a stuck failure needs a person, not an infinite retry).
        console.error('printify order placement failed for stripe session', session.id, e);
      }
    }
  }

  return res.status(200).end();
}

async function placePrintifyOrder(session, token, shopId) {
  const md = session.metadata || {};
  const shipping = session.shipping_details || {};
  const addr = shipping.address || {};
  const customer = session.customer_details || {};
  const fullName = (shipping.name || customer.name || '').trim();
  const spaceIdx = fullName.indexOf(' ');
  const firstName = spaceIdx === -1 ? (fullName || 'Customer') : fullName.slice(0, spaceIdx);
  const lastName = spaceIdx === -1 ? '' : fullName.slice(spaceIdx + 1);

  const body = {
    external_id: session.id,
    label: 'Well Seasoned shop order',
    line_items: [
      { product_id: md.productId, variant_id: Number(md.variantId), quantity: Number(md.quantity) || 1 },
    ],
    shipping_method: 1, // Printify's standard/economy shipping method
    send_shipping_notification: true,
    address_to: {
      first_name: firstName,
      last_name: lastName || firstName,
      email: customer.email || '',
      phone: customer.phone || '',
      country: addr.country || 'US',
      region: addr.state || '',
      address1: addr.line1 || '',
      address2: addr.line2 || '',
      city: addr.city || '',
      zip: addr.postal_code || '',
    },
  };

  const r = await fetch(`https://api.printify.com/v1/shops/${encodeURIComponent(shopId)}/orders.json`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) {
    console.error('printify order create error', r.status, data);
    throw new Error('printify order create failed: ' + r.status);
  }
  console.log('printify order placed', data.id, 'for stripe session', session.id);
}
