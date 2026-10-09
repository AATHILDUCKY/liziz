// Shared, dependency-free variant helpers — safe to import from both server
// code (models/API) and client components (product form, storefront), so the
// combination key format can never drift between where it's written and read.

// Stable key for a size × colour combination. Either axis may be "" when a
// product doesn't use it (e.g. sizes only). Format: "<size>::<colour>".
function comboKey(size, colour) {
  return `${size || ""}::${colour || ""}`;
}

// All combination keys for a product's offered sizes/colours. An empty axis
// collapses to a single "" slot so sizes-only / colours-only still produce keys.
function comboKeys(sizes = [], colours = []) {
  const rows = sizes.length ? sizes : [""];
  const cols = colours.length ? colours : [""];
  const keys = [];
  for (const s of rows) for (const c of cols) keys.push(comboKey(s, c));
  return keys;
}

// Keep only the explicitly sold-out entries (value === false) whose combination
// still exists, so the saved map stays small and never holds stale variants.
function pruneVariantStock(stock = {}, sizes = [], colours = []) {
  const valid = new Set(comboKeys(sizes, colours));
  const out = {};
  for (const [k, v] of Object.entries(stock)) if (v === false && valid.has(k)) out[k] = false;
  return out;
}

function moneyNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function normalizeVariantPrices(prices = {}, sizes = [], colours = []) {
  const valid = new Set(comboKeys(sizes, colours));
  const out = {};
  for (const [k, v] of Object.entries(prices || {})) {
    if (!valid.has(k) || !v || typeof v !== "object" || Array.isArray(v)) continue;
    const price = moneyNumber(v.price);
    const compareAtPrice = moneyNumber(v.compareAtPrice);
    if (price > 0 || compareAtPrice > 0) out[k] = { price, compareAtPrice };
  }
  return out;
}

function variantPricing(product = {}, size = "", colour = "") {
  const key = comboKey(size || "", colour || "");
  const override = product.variantPrices?.[key] || {};
  const overridePrice = moneyNumber(override.price);
  const basePrice = moneyNumber(product.price);
  let price = overridePrice || basePrice;
  let compareAtPrice = moneyNumber(override.compareAtPrice) || moneyNumber(product.compareAtPrice);
  // If both fields are filled but reversed, infer intent: higher = original,
  // lower = discounted selling price. This prevents admin entry mistakes from
  // hiding a valid discount on the storefront.
  if (overridePrice > 0 && moneyNumber(override.compareAtPrice) > 0 && compareAtPrice < overridePrice) {
    price = compareAtPrice;
    compareAtPrice = overridePrice;
  }
  // If a variant has a lower sale price but no explicit original price, use the
  // base product price as the original price for that selected item.
  if (!compareAtPrice && overridePrice > 0 && basePrice > overridePrice) {
    compareAtPrice = basePrice;
  }
  const hasDiscount = compareAtPrice > price && price > 0;
  const discountPercent = hasDiscount ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100) : 0;
  return { price, compareAtPrice, hasDiscount, discountPercent, key };
}

function splitComboKey(key) {
  const [size = "", colour = ""] = String(key || "").split("::");
  return { size, colour };
}

function variantPricingSummary(product = {}, size = "", colour = "") {
  const hasSize = !!(size && size !== "-");
  const hasColour = !!(colour && colour !== "-");
  const keys = [];
  for (const key of comboKeys(product.sizes || [], product.colours || [])) {
    const combo = splitComboKey(key);
    if (hasSize && combo.size !== size) continue;
    if (hasColour && combo.colour !== colour) continue;
    keys.push(key);
  }
  const selectedKeys = keys.length ? keys : [comboKey(hasSize ? size : "", hasColour ? colour : "")];

  let priceMin = Infinity;
  let priceMax = 0;
  let compareAtMin = Infinity;
  let compareAtMax = 0;
  let discountPercent = 0;
  let hasDiscount = false;

  for (const key of selectedKeys) {
    const combo = splitComboKey(key);
    const row = variantPricing(product, combo.size, combo.colour);
    if (row.price > 0) {
      priceMin = Math.min(priceMin, row.price);
      priceMax = Math.max(priceMax, row.price);
    }
    if (row.hasDiscount) {
      hasDiscount = true;
      compareAtMin = Math.min(compareAtMin, row.compareAtPrice);
      compareAtMax = Math.max(compareAtMax, row.compareAtPrice);
      discountPercent = Math.max(discountPercent, row.discountPercent);
    }
  }

  if (!Number.isFinite(priceMin)) priceMin = moneyNumber(product.price);
  if (!priceMax) priceMax = moneyNumber(product.price);
  if (!Number.isFinite(compareAtMin)) compareAtMin = 0;

  return {
    ...variantPricing(product, hasSize ? size : "", hasColour ? colour : ""),
    priceMin,
    priceMax,
    compareAtMin,
    compareAtMax,
    hasRange: priceMin !== priceMax,
    hasCompareRange: compareAtMin !== compareAtMax,
    hasDiscount,
    discountPercent,
  };
}

// Drop empty image entries while keeping each kept image's colour tag aligned
// 1:1. Returns parallel arrays safe to store.
function normalizeGallery(images = [], colours = []) {
  const gallery = [];
  const galleryColours = [];
  images.forEach((src, i) => {
    if (!src) return;
    gallery.push(src);
    galleryColours.push(colours[i] || "");
  });
  return { gallery, galleryColours };
}

module.exports = {
  comboKey,
  comboKeys,
  pruneVariantStock,
  normalizeVariantPrices,
  variantPricing,
  variantPricingSummary,
  normalizeGallery,
};
