// Printify catalog proxy (Vercel serverless function).
// Set PRINTIFY_API_TOKEN and PRINTIFY_SHOP_ID in Vercel → Settings →
// Environment Variables once the owner has a Printify shop with real
// products designed. Without both, this returns 503 and the client shows
// an honest empty state — same config-gated pattern as api/checkout.js
// (Stripe) and api/showtimes.js (SerpApi).
//
// Zero-dependency by design (matches every other api/*.js in this repo):
// calls Printify's REST API directly with fetch + a Bearer token, never
// exposing the token to the client. Only real, currently-published,
// visible products are returned — nothing invented, no placeholder SKUs.
export default async function handler(req, res) {
  const token = process.env.PRINTIFY_API_TOKEN;
  const shopId = process.env.PRINTIFY_SHOP_ID;
  if (!token || !shopId) {
    return res.status(503).json({ error: 'Shop isn\'t configured yet.', products: [] });
  }

  try {
    const printifyRes = await fetch(
      `https://api.printify.com/v1/shops/${encodeURIComponent(shopId)}/products.json?limit=50`,
      { headers: { Authorization: 'Bearer ' + token } }
    );
    const data = await printifyRes.json();
    if (!printifyRes.ok || !data || !Array.isArray(data.data)) {
      console.error('printify catalog error', printifyRes.status, data);
      return res.status(502).json({ error: 'Could not load the shop right now.', products: [] });
    }

    // Sanitize to exactly what the storefront UI needs — never leak cost
    // price, print-provider internals, or unpublished/disabled products.
    const products = data.data
      .filter((p) => p.visible !== false)
      .map((p) => {
        const enabledVariants = (p.variants || []).filter((v) => v.is_enabled);
        // Printify options are keyed by id (e.g. a "Colors" option and a
        // "Sizes" option); each variant carries the ids it matches via
        // variant.options — NOT reliably in the same order as
        // product.options (confirmed against live data: a product can
        // declare options as [size, color] while every variant still
        // reports its option ids as [colorId, sizeId]). Matching by id
        // membership in each option's own values list is order-independent
        // and safe regardless of how Printify orders either array.
        const colorOpt = (p.options || []).find((o) => (o.type || '').toLowerCase() === 'color');
        const sizeOpt = (p.options || []).find((o) => (o.type || '').toLowerCase() === 'size');
        const colorIds = colorOpt ? new Set(colorOpt.values.map((v) => v.id)) : null;
        const sizeIds = sizeOpt ? new Set(sizeOpt.values.map((v) => v.id)) : null;

        const colors = colorOpt
          ? colorOpt.values.map((v) => ({ id: v.id, title: v.title, hex: (v.colors && v.colors[0]) || null }))
          : [];
        const sizes = sizeOpt ? sizeOpt.values.map((v) => ({ id: v.id, title: v.title })) : [];

        function variantColorId(v) { return colorIds ? (v.options || []).find((id) => colorIds.has(id)) : null; }
        function variantSizeId(v) { return sizeIds ? (v.options || []).find((id) => sizeIds.has(id)) : null; }

        const variants = enabledVariants.map((v) => ({
          id: v.id,
          colorId: variantColorId(v) != null ? variantColorId(v) : null,
          sizeId: variantSizeId(v) != null ? variantSizeId(v) : null,
          price: v.price, // cents, real Printify retail price
          inStock: v.is_available !== false,
        }));

        // One representative image per color, keyed by color id, so the
        // gallery can swap photos as the shopper picks a swatch — falls
        // back to the product's default image when a color has none of
        // its own tagged images yet.
        const imagesByColor = {};
        (p.images || []).forEach((img) => {
          (img.variant_ids || []).forEach((vid) => {
            const variant = enabledVariants.find((v) => v.id === vid);
            const cid = variant ? variantColorId(variant) : null;
            if (cid != null && !imagesByColor[cid]) imagesByColor[cid] = img.src;
          });
        });
        const defaultImg = (p.images.find((i) => i.is_default) || p.images[0] || {}).src || null;

        const prices = variants.map((v) => v.price).filter((n) => typeof n === 'number');
        return {
          id: p.id,
          title: p.title,
          description: (p.description || '').replace(/<[^>]+>/g, '').trim(),
          colors,
          sizes,
          variants,
          imagesByColor,
          defaultImage: defaultImg,
          priceMin: prices.length ? Math.min(...prices) : null,
          priceMax: prices.length ? Math.max(...prices) : null,
        };
      })
      .filter((p) => p.variants.length && p.defaultImage);

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    return res.status(200).json({ products });
  } catch (e) {
    console.error('printify catalog exception', e);
    return res.status(502).json({ error: 'Could not load the shop right now.', products: [] });
  }
}
