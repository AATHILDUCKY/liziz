// ─────────────────────────────────────────────────────────────
// Public image delivery.
//
// Images (product photos, the logo, hero/value/category art, payment icons)
// are all stored inline in SQLite as base64 data-URIs. Shipping that base64 in
// server HTML / API JSON is the single biggest weight on the site: it's ~33%
// larger than binary, can't be browser-cached, can't be lazy-loaded as a
// resource and re-downloads on every navigation.
//
// On PUBLIC read paths we swap each data-URI for a URL under /api/img/…, which
// streams the decoded bytes once with a long, immutable cache. Real URLs and
// /images/* paths pass through untouched. Admin/edit paths keep the raw
// data-URI so the editor can still round-trip the image.
// ─────────────────────────────────────────────────────────────

function isDataUri(s) {
  return typeof s === "string" && s.startsWith("data:");
}

// Cache-busting version. Products carry updatedAt; settings/categories don't,
// so we fall back to the byte length (changes whenever the image changes).
function productVersion(product) {
  const t = Date.parse(product?.updatedAt || product?.createdAt || "");
  return Number.isFinite(t) ? t : 0;
}

// ---- URL builders (data-URI → served URL; everything else passed through) ----
function productImageUrl(product, idx, value) {
  if (!isDataUri(value)) return value || "";
  return `/api/img/product/${product.id}?i=${idx}&v=${productVersion(product)}`;
}

// Primary-image URL from just id + updatedAt — lets the lightweight card query
// build the served URL without ever reading the base64 blob from the DB.
function servedProductImageUrl(id, updatedAt) {
  const t = Date.parse(updatedAt || "");
  return `/api/img/product/${id}?i=0&v=${Number.isFinite(t) ? t : 0}`;
}

function settingImageUrl(key, value) {
  if (!isDataUri(value)) return value || "";
  return `/api/img/setting/${encodeURIComponent(key)}?v=${value.length}`;
}

function categoryImageUrl(cat) {
  if (!isDataUri(cat?.image)) return cat?.image || "";
  return `/api/img/category/${cat.id}?v=${cat.image.length}`;
}

function paymentIconUrl(opt) {
  if (!isDataUri(opt?.icon)) return opt?.icon || "";
  return `/api/img/payment/${encodeURIComponent(opt.id)}?v=${opt.icon.length}`;
}

// ---- publicizers: copy of a record with data-URIs swapped for URLs ----
function publicizeProduct(product) {
  if (!product) return product;
  const images = (product.images || []).map((src, i) => productImageUrl(product, i, src));
  const image = productImageUrl(product, 0, product.image) || images[0] || "";
  return { ...product, image, images };
}

// Home CMS content: every field that holds a data-URI (stored as home_<key>).
function publicizeHomeContent(content) {
  if (!content) return content;
  const out = { ...content };
  for (const [k, v] of Object.entries(content)) {
    if (isDataUri(v)) out[k] = settingImageUrl(`home_${k}`, v);
  }
  return out;
}

// Public settings: the logo and any payment-option icons.
function publicizeSettings(settings) {
  if (!settings) return settings;
  return {
    ...settings,
    logo: settingImageUrl("store_logo", settings.logo),
    paymentOptions: (settings.paymentOptions || []).map((o) => ({ ...o, icon: paymentIconUrl(o) })),
  };
}

function publicizeCategoryTag(cat) {
  return { ...cat, image: categoryImageUrl(cat) };
}

// ---- serving (used by the /api/img route) ----
// data:<mime>[;charset=..][;base64],<data>
function parseDataUri(uri) {
  const m = /^data:([^;,]+)?(;[^,]*)?,([\s\S]*)$/.exec(uri || "");
  if (!m) return null;
  const mime = m[1] || "application/octet-stream";
  const isBase64 = /;base64/i.test(m[2] || "");
  const data = m[3] || "";
  const buf = isBase64
    ? Buffer.from(data, "base64")
    : Buffer.from(decodeURIComponent(data), "utf8");
  return { mime, buf };
}

// Build a cacheable binary Response for a stored image value.
function dataUriResponse(src, reqUrl) {
  if (!src) return new Response("Not found", { status: 404 });
  if (!src.startsWith("data:")) {
    const target = src.startsWith("http") ? src : new URL(src, reqUrl.origin).toString();
    return Response.redirect(target, 302);
  }
  const parsed = parseDataUri(src);
  if (!parsed) return new Response("Unsupported image", { status: 415 });
  return new Response(parsed.buf, {
    headers: {
      "Content-Type": parsed.mime,
      "Content-Length": String(parsed.buf.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

module.exports = {
  isDataUri,
  productImageUrl,
  servedProductImageUrl,
  settingImageUrl,
  publicizeProduct,
  publicizeHomeContent,
  publicizeSettings,
  publicizeCategoryTag,
  parseDataUri,
  dataUriResponse,
};
