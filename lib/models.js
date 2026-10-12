// Data-access helpers built on top of the shared SQLite connection.
const db = require("./db");
const { normalizeWhatsAppNumber } = require("./phone");
const { comboKey, normalizeVariantPrices } = require("./variants");
const { servedProductImageUrl } = require("./img");

// ---------- settings (key/value) ----------
function getSetting(key, fallback = "") {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row ? row.value : fallback;
}

function setSetting(key, value) {
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, String(value ?? ""));
}

function getPublicSettings() {
  const whatsappNumber = normalizeWhatsAppNumber(getSetting("whatsapp_number", process.env.WHATSAPP_NUMBER || ""));
  return {
    storeName: getSetting("store_name", process.env.STORE_NAME || "Liziz"),
    whatsappNumber,
    currency: getSetting("currency", process.env.CURRENCY || "Rs."),
    logo: getSetting("store_logo", ""), // uploaded brand logo (data-URI) or ""
    paymentOptions: getPaymentOptions(),
    socialLinks: getSocialLinks(),
    // Marketing / SEO integrations. Both are safe to expose publicly — the GA
    // measurement id and the Search Console token both end up in page source.
    googleAnalyticsId: getSetting("google_analytics_id", ""),
    googleSiteVerification: normalizeSiteVerification(getSetting("google_site_verification", "")),
  };
}

// ---------- SEO settings ----------
// Site-wide SEO configuration, editable from Admin → SEO. All values are plain
// strings stored under their own settings key. Empty means "use the built-in
// default", so an untouched store still ships sensible metadata.
function getSeoSettings() {
  return {
    // Canonical public URL. Drives sitemap.xml, robots.txt, canonical + OG tags.
    siteUrl: getSetting("site_url", ""),
    // Home/default <title> and description. Blank → code defaults in the layout.
    metaTitle: getSetting("meta_title", ""),
    metaDescription: getSetting("meta_description", ""),
    // Comma-separated keywords string (as typed by the admin).
    metaKeywords: getSetting("meta_keywords", ""),
    // Default social-share image (absolute URL or /images/… path). Blank → hero.
    ogImage: getSetting("seo_og_image", ""),
    // Google marketing integrations (also surfaced in the layout).
    googleAnalyticsId: getSetting("google_analytics_id", ""),
    googleSiteVerification: normalizeSiteVerification(getSetting("google_site_verification", "")),
  };
}

// Google Search Console hands you an HTML <meta> tag for the "HTML tag"
// verification method. Admins routinely paste the whole tag — or the
// `google-site-verification="…"` attribute — instead of just the token, which
// would render a broken meta tag Google can't read. Extract the bare token so
// the rendered `content` is exactly what Search Console expects. Accepts:
//   <meta name="google-site-verification" content="TOKEN" />
//   google-site-verification="TOKEN"  /  google-site-verification=TOKEN
//   content="TOKEN"
//   TOKEN
function normalizeSiteVerification(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  // Full meta tag / any content="…" attribute — take the quoted value.
  const content = raw.match(/content\s*=\s*["']([^"']+)["']/i);
  if (content) return content[1].trim();
  // `google-site-verification=TOKEN`, optionally quoted.
  const named = raw.match(/google-site-verification\s*=\s*["']?([^"'>\s]+)/i);
  if (named) return named[1].trim();
  // Bare token: strip stray surrounding quotes / angle brackets.
  return raw.replace(/^[\s"'<]+|[\s"'>/]+$/g, "").trim();
}

// Normalise a canonical site URL: must be http(s) and is stored without a
// trailing slash. Empty string clears it (falls back to env/request host).
function normalizeSiteUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    return `${u.protocol}//${u.host}`.replace(/\/+$/, "");
  } catch {
    return "";
  }
}

// Split/rejoin a keywords string into a clean, de-duplicated, capped list.
function normalizeKeywords(value) {
  const list = String(value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const k of list) {
    const key = k.toLowerCase();
    if (!seen.has(key)) { seen.add(key); out.push(k); }
  }
  return out.slice(0, 20).join(", ");
}

function setSeoSettings(patch = {}) {
  if (patch.siteUrl !== undefined) setSetting("site_url", normalizeSiteUrl(patch.siteUrl));
  if (patch.metaTitle !== undefined) setSetting("meta_title", String(patch.metaTitle).trim().slice(0, 70));
  if (patch.metaDescription !== undefined) setSetting("meta_description", String(patch.metaDescription).trim().slice(0, 300));
  if (patch.metaKeywords !== undefined) setSetting("meta_keywords", normalizeKeywords(patch.metaKeywords));
  if (patch.ogImage !== undefined) setSetting("seo_og_image", String(patch.ogImage).trim().slice(0, 500));
  if (patch.googleAnalyticsId !== undefined) setSetting("google_analytics_id", String(patch.googleAnalyticsId).trim());
  if (patch.googleSiteVerification !== undefined) setSetting("google_site_verification", normalizeSiteVerification(patch.googleSiteVerification).slice(0, 200));
  return getSeoSettings();
}

// Keywords as an array (for Next's metadata `keywords` field).
function keywordsList() {
  return getSetting("meta_keywords", "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---------- social media links (footer) ----------
// Known platforms the footer can render an icon for. `website` is the catch-all
// used for anything not in this list, so admins can still add other links.
const SOCIAL_PLATFORMS = [
  { id: "instagram", name: "Instagram" },
  { id: "facebook", name: "Facebook" },
  { id: "tiktok", name: "TikTok" },
  { id: "youtube", name: "YouTube" },
  { id: "whatsapp", name: "WhatsApp" },
  { id: "x", name: "X (Twitter)" },
  { id: "linkedin", name: "LinkedIn" },
  { id: "pinterest", name: "Pinterest" },
  { id: "snapchat", name: "Snapchat" },
  { id: "website", name: "Website" },
];

function normalizeSocialLinks(list = []) {
  return (Array.isArray(list) ? list : [])
    .map((l) => {
      const rawPlatform = String(l?.platform || "").toLowerCase().trim();
      const known = SOCIAL_PLATFORMS.find((p) => p.id === rawPlatform);
      const platform = known ? known.id : "website";
      let url = String(l?.url || "").trim().slice(0, 300);
      // Be forgiving: prepend https:// when the admin pastes a bare domain, but
      // leave root-relative and tel:/mailto: links alone.
      if (url && !/^(https?:|tel:|mailto:)/i.test(url) && !url.startsWith("/")) {
        url = `https://${url}`;
      }
      if (!url) return null;
      return {
        id: String(l?.id || `${platform}-${Math.random().toString(36).slice(2, 8)}`),
        platform,
        label: String(l?.label || "").trim().slice(0, 40) || (known ? known.name : "Link"),
        url,
      };
    })
    .filter(Boolean)
    .slice(0, 12);
}

function getSocialLinks() {
  return normalizeSocialLinks(safeJson(getSetting("social_links", "[]"), []));
}

function setSocialLinks(list = []) {
  const normalized = normalizeSocialLinks(list);
  setSetting("social_links", JSON.stringify(normalized));
  return normalized;
}

const PAYMENT_OPTIONS_DEFAULT = [
  { id: "koko", name: "KOKO", icon: "", enabled: true },
  { id: "mintpay", name: "mintpay", icon: "", enabled: true },
  { id: "payzy", name: "Payzy", icon: "", enabled: true },
];

function normalizePaymentOptions(options = []) {
  const byId = new Map(
    (Array.isArray(options) ? options : [])
      .map((o) => {
        const name = String(o?.name || "").trim().slice(0, 40);
        const id =
          String(o?.id || name)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "")
            .slice(0, 40) || "";
        if (!id || !name) return null;
        return [
          id,
          {
            id,
            name,
            icon: String(o?.icon || "").slice(0, 1_500_000),
            enabled: o?.enabled !== false,
          },
        ];
      })
      .filter(Boolean)
  );

  const merged = PAYMENT_OPTIONS_DEFAULT.map((d) => ({
    ...d,
    ...(byId.get(d.id) || {}),
  }));
  for (const option of byId.values()) {
    if (!merged.some((o) => o.id === option.id)) merged.push(option);
  }
  return merged.slice(0, 12);
}

function getPaymentOptions() {
  return normalizePaymentOptions(safeJson(getSetting("payment_options", "[]"), []));
}

function setPaymentOptions(options = []) {
  const normalized = normalizePaymentOptions(options);
  setSetting("payment_options", JSON.stringify(normalized));
  return normalized;
}

// ---------- master variant option lists (sizes / colours) ----------
// The pool of sizes & colours the product form offers as toggle chips. Admin
// can edit these in Settings; sensible defaults are used until they do.
const SIZE_OPTIONS_DEFAULT = ["XS", "S", "M", "L", "XL", "XXL"];
const COLOUR_OPTIONS_DEFAULT = ["Black", "White", "Grey", "Navy", "Beige", "Cream", "Green", "Brown"];

function getVariantOptions() {
  const sizes = safeJson(getSetting("sizes_master", "[]"), []);
  const colours = safeJson(getSetting("colours_master", "[]"), []);
  return {
    sizes: sizes.length ? sizes : SIZE_OPTIONS_DEFAULT,
    colours: colours.length ? colours : COLOUR_OPTIONS_DEFAULT,
  };
}

function setVariantOptions({ sizes, colours } = {}) {
  const clean = (arr) => [...new Set((arr || []).map((s) => String(s).trim()).filter(Boolean))];
  if (sizes !== undefined) setSetting("sizes_master", JSON.stringify(clean(sizes)));
  if (colours !== undefined) setSetting("colours_master", JSON.stringify(clean(colours)));
  return getVariantOptions();
}

// ---------- editable home-page content (admin CMS) ----------
const HOME_CONTENT_DEFAULTS = {
  "hero_heading": "Modesty, beautifully made.",
  "hero_sub": "Thoughtfully designed. Made by us. Premium modest womenswear for the way you move through life.",
  "hero_image": "/images/liziz-editorial.webp",
  "meta_left": "Premium modest womenswear",
  "meta_right": "Designed & made by Liziz",
  "ticker": "Designed by us. Made for you.\nConsidered details. Effortless modesty.",
  "values_eyebrow": "The Liziz difference",
  "values_heading": "Considered from the very first stitch.",
  "values_intro": "We design and manufacture our own clothing, with modest silhouettes, thoughtful details and everyday ease at the heart of every piece.",
  "value1_image": "",
  "value1_icon": "",
  "value1_title": "Our own creations",
  "value1_text": "Designed and manufactured by Liziz.",
  "value2_image": "",
  "value2_icon": "",
  "value2_title": "Modesty in every detail",
  "value2_text": "Thoughtful coverage. Room to move.",
  "value3_image": "",
  "value3_icon": "",
  "value3_title": "A considered wardrobe",
  "value3_text": "Quiet colours and enduring silhouettes.",
  "value4_image": "",
  "value4_icon": "",
  "value4_title": "A personal experience",
  "value4_text": "Choose your pieces. Order on WhatsApp.",
  "quote": "Beautifully modest.\nEntirely yourself.",
  "editorial_image": "/images/liziz-craft.webp",
  "cta_heading": "A little guidance, a personal touch.",
  "cta_text": "Need help choosing a size or styling a piece? Speak with us on WhatsApp, or explore the collection at your own pace.",
  "lookbook_label": "The Liziz journal",
  "lookbook_heading": "A quieter kind of statement.",
  "look1_image": "",
  "look1_tag": "",
  "look1_label": "",
  "look2_image": "",
  "look2_tag": "",
  "look2_label": "",
  "look3_image": "",
  "look3_tag": "",
  "look3_label": "",
  "footer_eyebrow": "Designed with intention",
  "footer_heading": "liziz",
  "footer_tagline": "Modesty, beautifully made.",
  "footer_text": "Premium modest womenswear. Designed and made by us, for you.",
  "about_eyebrow": "Our story",
  "about_since": "",
  "about_heading": "Made by us.\nMade for you.",
  "about_intro": "Liziz is a premium women’s clothing brand with modesty at its heart. We design and manufacture our own pieces, bringing a considered approach to the clothes you choose every day.",
  "about_image": "/images/liziz-editorial.webp",
  "about_image_alt": "Liziz modest fashion editorial with a flowing taupe abaya and cream hijab",
  "about_founder_eyebrow": "A note from Liziz",
  "about_founder_heading": "Clothing that feels like you.",
  "about_founder_text": "We believe modest dressing should feel effortless, expressive and entirely your own.\n\nCreating our own clothing allows us to shape the details that matter: the drape, the coverage and the way a piece moves with you.",
  "about_founder_name": "",
  "about_founder_role": "The Liziz team",
  "about_founder_image": "/images/liziz-craft.webp",
  "about_timeline_eyebrow": "Our journey",
  "about_timeline_heading": "The story of Liziz",
  "about_t1_year": "",
  "about_t1_title": "",
  "about_t1_text": "",
  "about_t2_year": "",
  "about_t2_title": "",
  "about_t2_text": "",
  "about_t3_year": "",
  "about_t3_title": "",
  "about_t3_text": "",
  "about_t4_year": "",
  "about_t4_title": "",
  "about_t4_text": "",
  "about_t5_year": "",
  "about_t5_title": "",
  "about_t5_text": "",
  "about_t6_year": "",
  "about_t6_title": "",
  "about_t6_text": "",
  "about_stat1_value": "",
  "about_stat1_label": "",
  "about_stat2_value": "",
  "about_stat2_label": "",
  "about_stat3_value": "",
  "about_stat3_label": "",
  "about_stat4_value": "",
  "about_stat4_label": "",
  "about_story_heading": "From our hands to your wardrobe.",
  "about_story": "We manufacture our own clothing. From the first design to the finished piece, our focus is on considered silhouettes and a refined, modest wardrobe you can make your own.",
  "about_sourcing_countries": "",
  "about_second_image": "/images/liziz-craft.webp",
  "about_second_image_alt": "Cream and taupe textiles with thread and dressmaking scissors",
  "about_value1_title": "Created by Liziz",
  "about_value1_text": "Our designs. Our manufacturing. A personal approach from the start.",
  "about_value2_title": "Modest by design",
  "about_value2_text": "Clothing that brings together thoughtful coverage and effortless style.",
  "about_value3_title": "Quietly refined",
  "about_value3_text": "Considered details and soft, wearable colours.",
  "about_locations_eyebrow": "Visit Liziz",
  "about_locations_heading": "Find us",
  "about_locations": "[]",
  "about_cta_heading": "Find your everyday elegance.",
  "about_cta_text": "Explore modest womenswear, thoughtfully designed and made by Liziz."
};

// Every editable value is stored under the `home_<key>` settings key.
function getHomeContent() {
  const out = {};
  for (const [k, def] of Object.entries(HOME_CONTENT_DEFAULTS)) {
    out[k] = getSetting(`home_${k}`, def);
  }
  return out;
}

function setHomeContent(patch = {}) {
  for (const k of Object.keys(HOME_CONTENT_DEFAULTS)) {
    if (patch[k] !== undefined) setSetting(`home_${k}`, patch[k]);
  }
  return getHomeContent();
}

// ---------- products ----------
function serializeProduct(row) {
  if (!row) return null;
  // Gallery: prefer the `images` array; fall back to the single `image` for
  // products created before multi-image support.
  let images = safeJson(row.images, []);
  if (!images.length && row.image) images = [row.image];
  const primary = images[0] || row.image || "";

  // Colour tag per image, aligned 1:1 with `images` ("" = untagged).
  const rawImageColours = safeJson(row.image_colours, []);
  const imageColours = images.map((_, i) => rawImageColours[i] || "");

  const sizes = safeJson(row.sizes, []);
  const colours = safeJson(row.colours, []);

  // Per-combination stock: a map of the combos that are SOLD OUT ("S::Black" →
  // false). A missing key means that combination is in stock.
  let variantStock = safeObj(row.variant_stock, {});
  // Legacy fallback: older rows stored independent size/colour sold-out flags.
  // Synthesize combos from them so nothing silently comes back in stock.
  if (Object.keys(variantStock).length === 0) {
    const legacySize = safeObj(row.size_stock, {});
    const legacyColour = safeObj(row.colour_stock, {});
    const hasLegacy =
      Object.values(legacySize).includes(false) || Object.values(legacyColour).includes(false);
    if (hasLegacy) {
      const rows = sizes.length ? sizes : [""];
      const cols = colours.length ? colours : [""];
      for (const s of rows)
        for (const c of cols)
          if (legacySize[s] === false || legacyColour[c] === false) variantStock[comboKey(s, c)] = false;
    }
  }

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    category: row.category,
    price: row.price,
    compareAtPrice: row.compare_at_price || 0,
    image: primary,   // primary image (cards, thumbnails, OG)
    images,           // full gallery
    imageColours,     // colour tag per image, aligned to `images`
    sizes,
    colours,
    variantStock,     // sold-out combos: { "S::Black": false, ... }  (missing = in stock)
    variantPrices: normalizeVariantPrices(safeObj(row.variant_prices, {}), sizes, colours),
    inStock: !!row.in_stock,
    featured: !!row.featured,
    newDrop: !!row.new_drop,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function safeJson(str, fallback) {
  try {
    const v = JSON.parse(str);
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

// Parse a JSON object (non-array). Used for the per-variant stock maps.
function safeObj(str, fallback) {
  try {
    const v = JSON.parse(str);
    return v && typeof v === "object" && !Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function listProducts({ publicOnly = false, category, search } = {}) {
  const clauses = [];
  const params = [];
  if (publicOnly) clauses.push("in_stock = 1");
  if (category && category !== "All") {
    clauses.push("category = ?");
    params.push(category);
  }
  if (search) {
    clauses.push("(name LIKE ? OR description LIKE ? OR category LIKE ?)");
    const q = `%${search}%`;
    params.push(q, q, q);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db
    .prepare(`SELECT * FROM products ${where} ORDER BY featured DESC, created_at DESC`)
    .all(...params);
  return rows.map(serializeProduct);
}

// Lightweight card serializer — only the fields a ProductCard renders. Never
// includes image blobs: the primary image URL is derived from id + updatedAt.
// `views` is only present when the query asked for it (staff/admin lists) so
// customer-facing responses never carry view counts.
function serializeCard(row) {
  const sizes = safeJson(row.sizes, []);
  const colours = safeJson(row.colours, []);
  const card = {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    category: row.category,
    price: row.price,
    compareAtPrice: row.compare_at_price || 0,
    image: row.image_is_data ? servedProductImageUrl(row.id, row.updated_at) : row.image_ref || "",
    sizes,
    colours,
    variantPrices: normalizeVariantPrices(safeObj(row.variant_prices, {}), sizes, colours),
    inStock: !!row.in_stock,
    featured: !!row.featured,
    newDrop: !!row.new_drop,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (row.views !== undefined) card.views = Number(row.views) || 0;
  return card;
}

// Product list optimised for card grids (shop). Selects only card columns and
// avoids reading the (base64) image blobs — the CASE checks just the prefix, so
// a whole catalogue load stays tiny in memory. Description is kept for search.
function listProductCards({ publicOnly = false, category, search, withViews = false } = {}) {
  const clauses = [];
  const params = [];
  if (publicOnly) clauses.push("in_stock = 1");
  if (category && category !== "All") {
    clauses.push("category = ?");
    params.push(category);
  }
  if (search) {
    clauses.push("(name LIKE ? OR description LIKE ? OR category LIKE ?)");
    const q = `%${search}%`;
    params.push(q, q, q);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  // Total view count is only selected for staff lists (`withViews`), so a public
  // catalogue load stays lean and never leaks view counts to customers.
  const viewsCol = withViews
    ? ", (SELECT COALESCE(SUM(pv.count), 0) FROM product_views pv WHERE pv.product_id = products.id) AS views"
    : "";
  const rows = db
    .prepare(
      `SELECT id, name, slug, description, category, price, compare_at_price,
              variant_prices, sizes, colours, in_stock, featured, new_drop, created_at, updated_at,
              CASE WHEN image LIKE 'data:%' THEN 1 ELSE 0 END AS image_is_data,
              CASE WHEN image LIKE 'data:%' THEN '' ELSE image END AS image_ref${viewsCol}
       FROM products ${where}
       ORDER BY featured DESC, created_at DESC`
    )
    .all(...params);
  return rows.map(serializeCard);
}

function getProduct(idOrSlug) {
  const row = db
    .prepare("SELECT * FROM products WHERE id = ? OR slug = ?")
    .get(idOrSlug, String(idOrSlug));
  return serializeProduct(row);
}

// Checkout needs exact option stock, without downloading the product gallery.
function getProductAvailability(idOrSlug) {
  const row = db.prepare(
    `SELECT id, in_stock, sizes, colours, variant_stock, size_stock, colour_stock
     FROM products WHERE id = ? OR slug = ?`,
  ).get(idOrSlug, String(idOrSlug));
  const product = serializeProduct(row);
  if (!product) return null;
  const { id, inStock, sizes, colours, variantStock } = product;
  return { id, inStock, sizes, colours, variantStock };
}

// Headline product counts for dashboard/analytics. A single aggregate query so
// we never read the (base64) image blobs just to count rows.
function productStats() {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(in_stock), 0) AS inStock,
              COALESCE(SUM(featured), 0) AS featured
       FROM products`
    )
    .get();
  return {
    total: row.total,
    inStock: row.inStock,
    outStock: row.total - row.inStock,
    featured: row.featured,
  };
}

// Read a single gallery image without pulling the whole row (used by the image
// route). Selects only the two image columns so serving a thumbnail never loads
// the entire base64 gallery for that product.
function getProductImage(id, index = 0) {
  const row = db
    .prepare("SELECT image, images FROM products WHERE id = ?")
    .get(Number(id));
  if (!row) return "";
  let images = safeJson(row.images, []);
  if (!images.length && row.image) images = [row.image];
  return images[index] || row.image || "";
}

function slugify(name) {
  const base = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "item";
  let slug = base;
  let n = 1;
  while (db.prepare("SELECT 1 FROM products WHERE slug = ?").get(slug)) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

function categories() {
  const rows = db
    .prepare("SELECT DISTINCT category FROM products WHERE in_stock = 1 ORDER BY category")
    .all();
  return rows.map((r) => r.category);
}

// ---------- managed category tags (admin-curated master list) ----------
function listCategoryTags() {
  return db
    .prepare("SELECT id, name, image FROM categories ORDER BY name COLLATE NOCASE")
    .all();
}

function addCategoryTag(name) {
  const clean = String(name || "").trim();
  if (!clean) throw new Error("Category name is required.");
  db.prepare("INSERT INTO categories (name) VALUES (?)").run(clean);
  return db.prepare("SELECT id, name, image FROM categories WHERE name = ? COLLATE NOCASE").get(clean);
}

function setCategoryImage(id, image) {
  db.prepare("UPDATE categories SET image = ? WHERE id = ?").run(String(image || ""), Number(id));
  return db.prepare("SELECT id, name, image FROM categories WHERE id = ?").get(Number(id));
}

function deleteCategoryTag(id) {
  return db.prepare("DELETE FROM categories WHERE id = ?").run(Number(id)).changes > 0;
}

// ---------- leads / analytics ----------
// Record a lead (checkout handed to WhatsApp). Atomic: one leads row + N items.
function recordLead({ items = [], total = 0, customerName = "", customerPhone = "" }) {
  const clean = items
    .map((i) => ({
      productId: Number(i.productId) || null,
      name: String(i.name || "").slice(0, 120),
      size: String(i.size || "").slice(0, 40),
      colour: String(i.colour || "").slice(0, 40),
      qty: Math.max(1, Math.min(999, Math.floor(Number(i.qty) || 1))),
      price: Math.max(0, Number(i.price) || 0),
    }))
    .filter((i) => i.name);
  if (!clean.length) throw new Error("Cannot record an empty lead.");

  const itemCount = clean.reduce((n, i) => n + i.qty, 0);
  const computedTotal = clean.reduce((n, i) => n + i.qty * i.price, 0);
  const finalTotal = Number(total) > 0 ? Number(total) : computedTotal;

  const tx = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO leads (total, item_count, customer_name, customer_phone)
         VALUES (?, ?, ?, ?)`
      )
      .run(finalTotal, itemCount, String(customerName).slice(0, 120), String(customerPhone).slice(0, 40));
    const leadId = info.lastInsertRowid;
    const insItem = db.prepare(
      `INSERT INTO lead_items (lead_id, product_id, name, size, colour, qty, price)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    for (const i of clean) {
      insItem.run(leadId, i.productId, i.name, i.size, i.colour, i.qty, i.price);
    }
    return leadId;
  });
  return tx();
}

// Top-selling products, optionally within the last `days`. Single grouped query.
function bestSellers({ limit = 5, days = null } = {}) {
  const where = days ? "WHERE l.created_at >= datetime('now', ?)" : "";
  const params = days ? [`-${Number(days)} days`] : [];
  return db
    .prepare(
      `SELECT li.product_id AS productId,
              li.name       AS name,
              SUM(li.qty)                 AS units,
              SUM(li.qty * li.price)      AS revenue,
              COUNT(DISTINCT li.lead_id)  AS orders
       FROM lead_items li
       JOIN leads l ON l.id = li.lead_id
       ${where}
       GROUP BY COALESCE(li.product_id, li.name)
       ORDER BY units DESC, revenue DESC
       LIMIT ?`
    )
    .all(...params, Number(limit));
}

// Headline analytics for the dashboard.
function getLeadAnalytics() {
  const one = (sql, ...p) => db.prepare(sql).get(...p);

  const totals = one(
    `SELECT COUNT(*) AS leads, COALESCE(SUM(total), 0) AS revenue, COALESCE(SUM(item_count), 0) AS units FROM leads`
  );
  const today = one(`SELECT COUNT(*) AS c FROM leads WHERE created_at >= date('now', 'localtime')`).c;
  const last7 = one(`SELECT COUNT(*) AS c, COALESCE(SUM(total),0) AS rev FROM leads WHERE created_at >= datetime('now', '-7 days')`);
  const last30 = one(`SELECT COUNT(*) AS c, COALESCE(SUM(total),0) AS rev FROM leads WHERE created_at >= datetime('now', '-30 days')`);

  const totalLeads = totals.leads;
  return {
    totalLeads,
    leadsToday: today,
    leads7d: last7.c,
    leads30d: last30.c,
    intendedRevenue: totals.revenue,
    revenue7d: last7.rev,
    revenue30d: last30.rev,
    unitsSold: totals.units,
    avgOrderValue: totalLeads ? totals.revenue / totalLeads : 0,
  };
}

// Daily leads + revenue for the last `days` (zero-filled, oldest → newest).
function leadsDaily(days = 14) {
  return db
    .prepare(
      `WITH RECURSIVE days(day, idx) AS (
         SELECT date('now', ?), 0
         UNION ALL
         SELECT date(day, '+1 day'), idx + 1
         FROM days
         WHERE idx + 1 < ?
       ),
       totals AS (
         SELECT date(created_at) AS day, COUNT(*) AS leads, COALESCE(SUM(total), 0) AS revenue
         FROM leads
         WHERE created_at >= datetime('now', ?)
         GROUP BY date(created_at)
       )
       SELECT
         days.day AS date,
         CAST(strftime('%m', days.day) AS INTEGER) || '/' || CAST(strftime('%d', days.day) AS INTEGER) AS label,
         COALESCE(totals.leads, 0) AS leads,
         COALESCE(totals.revenue, 0) AS revenue
       FROM days
       LEFT JOIN totals ON totals.day = days.day
       ORDER BY days.day`
    )
    .all(`-${days - 1} days`, days, `-${days - 1} days`);
}

// Units + revenue grouped by the product's category (deleted products → "Other").
function salesByCategory() {
  return db
    .prepare(
      `SELECT COALESCE(p.category, 'Other') AS category,
              SUM(li.qty)             AS units,
              SUM(li.qty * li.price)  AS revenue
       FROM lead_items li
       LEFT JOIN products p ON p.id = li.product_id
       GROUP BY COALESCE(p.category, 'Other')
       ORDER BY units DESC`
    )
    .all();
}

// ---------- product views + site activity (admin-only) ----------
// Record one view of a product into the current hour's per-product counter.
// Every visit counts (repeat visits included). Unknown ids are ignored so a
// stale client can't create orphan rows.
function recordProductView(productId) {
  const id = Number(productId);
  if (!Number.isInteger(id) || id <= 0) return false;
  const exists = db.prepare("SELECT 1 FROM products WHERE id = ?").get(id);
  if (!exists) return false;
  db.prepare(
    `INSERT INTO product_views (product_id, bucket, count)
     VALUES (?, strftime('%Y-%m-%d %H:00', 'now', 'localtime'), 1)
     ON CONFLICT(product_id, bucket) DO UPDATE SET count = count + 1`
  ).run(id);
  return true;
}

// Time ranges the analytics filter offers. `unit` drives bucket granularity;
// `points` is how many buckets the activity graph spans.
const ACTIVITY_RANGES = {
  "24h": { label: "Last 24 hours", unit: "hour", points: 24 },
  "7d": { label: "Last 7 days", unit: "day", points: 7 },
  "30d": { label: "Last 30 days", unit: "day", points: 30 },
  "12mo": { label: "Last 12 months", unit: "month", points: 12 },
};

function resolveRange(range) {
  return ACTIVITY_RANGES[range] ? range : "7d";
}

// SQL fragments for each granularity: the recursive bucket generator plus how to
// derive a matching key/label from a stored value. `col` is the source column
// (product_views.bucket, already hourly; or leads.created_at converted to local).
const RANGE_SQL = {
  hour: {
    start: (p) => `strftime('%Y-%m-%d %H:00', 'now', 'localtime', '-${p - 1} hours')`,
    seedStep: `strftime('%Y-%m-%d %H:00', datetime(b, '+1 hour'))`,
    key: (col) => `strftime('%Y-%m-%d %H:00', ${col})`,
    label: `strftime('%H:00', b)`,
  },
  day: {
    start: (p) => `date('now', 'localtime', '-${p - 1} days')`,
    seedStep: `date(b, '+1 day')`,
    key: (col) => `date(${col})`,
    label: `CAST(strftime('%m', b) AS INTEGER) || '/' || CAST(strftime('%d', b) AS INTEGER)`,
  },
  month: {
    start: (p) => `strftime('%Y-%m-01', 'now', 'localtime', 'start of month', '-${p - 1} months')`,
    seedStep: `strftime('%Y-%m-01', datetime(b, '+1 month'))`,
    key: (col) => `strftime('%Y-%m-01', ${col})`,
    label: `substr('JanFebMarAprMayJunJulAugSepOctNovDec', (CAST(strftime('%m', b) AS INTEGER) - 1) * 3 + 1, 3)`,
  },
};

// The local-time lower bound (as a stored bucket compares against it) for a range.
function rangeSince(range) {
  const r = ACTIVITY_RANGES[resolveRange(range)];
  const sql = RANGE_SQL[r.unit];
  return db.prepare(`SELECT ${sql.start(r.points)} AS s`).get().s;
}

// One zero-filled series covering the range with BOTH product views and leads
// (+ revenue) per bucket — the "website activity" timeline. Product views come
// from the hourly rollup; leads from their timestamp, converted to local time so
// both align to the same buckets.
function activitySeries(range = "7d") {
  const r = ACTIVITY_RANGES[resolveRange(range)];
  const s = RANGE_SQL[r.unit];
  const viewsKey = s.key("bucket");
  const leadsKey = s.key("datetime(created_at, 'localtime')");
  return db
    .prepare(
      `WITH RECURSIVE seq(b, idx) AS (
         SELECT ${s.start(r.points)}, 0
         UNION ALL
         SELECT ${s.seedStep}, idx + 1 FROM seq WHERE idx + 1 < ${r.points}
       ),
       vtot AS (
         SELECT ${viewsKey} AS k, SUM(count) AS views
         FROM product_views
         WHERE bucket >= ${s.start(r.points)}
         GROUP BY k
       ),
       ltot AS (
         SELECT ${leadsKey} AS k, COUNT(*) AS leads, COALESCE(SUM(total), 0) AS revenue
         FROM leads
         WHERE datetime(created_at, 'localtime') >= ${s.start(r.points)}
         GROUP BY k
       )
       SELECT
         seq.b AS date,
         ${s.label} AS label,
         COALESCE(vtot.views, 0) AS views,
         COALESCE(ltot.leads, 0) AS leads,
         COALESCE(ltot.revenue, 0) AS revenue
       FROM seq
       LEFT JOIN vtot ON vtot.k = seq.b
       LEFT JOIN ltot ON ltot.k = seq.b
       ORDER BY seq.b`
    )
    .all();
}

// All-time total product views (cheap headline number).
function getTotalViews() {
  return db.prepare("SELECT COALESCE(SUM(count), 0) AS v FROM product_views").get().v;
}

// Most-viewed products within a range (deleted products fall out via the join).
function topViewedProducts({ limit = 6, since = null } = {}) {
  const where = since ? "WHERE pv.bucket >= ?" : "";
  const params = since ? [since, Number(limit)] : [Number(limit)];
  return db
    .prepare(
      `SELECT p.id AS productId, p.name AS name, COALESCE(SUM(pv.count), 0) AS views
       FROM product_views pv
       JOIN products p ON p.id = pv.product_id
       ${where}
       GROUP BY p.id
       ORDER BY views DESC, p.name
       LIMIT ?`
    )
    .all(...params);
}

// Recent leads (lightweight list for follow-up).
function recentLeads(limit = 8) {
  return db
    .prepare(
      `SELECT id, total, item_count AS itemCount, customer_name AS customerName,
              customer_phone AS customerPhone, created_at AS createdAt
       FROM leads ORDER BY created_at DESC LIMIT ?`
    )
    .all(Number(limit));
}

// ---------- users ----------
function serializeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    active: !!row.active,
    createdAt: row.created_at,
  };
}

module.exports = {
  db,
  getSetting,
  setSetting,
  getPublicSettings,
  getSeoSettings,
  setSeoSettings,
  keywordsList,
  getPaymentOptions,
  setPaymentOptions,
  SOCIAL_PLATFORMS,
  getSocialLinks,
  setSocialLinks,
  getVariantOptions,
  setVariantOptions,
  getHomeContent,
  setHomeContent,
  HOME_CONTENT_DEFAULTS,
  serializeProduct,
  serializeUser,
  listProducts,
  listProductCards,
  getProduct,
  getProductAvailability,
  getProductImage,
  productStats,
  slugify,
  categories,
  listCategoryTags,
  addCategoryTag,
  setCategoryImage,
  deleteCategoryTag,
  recordLead,
  bestSellers,
  getLeadAnalytics,
  recentLeads,
  leadsDaily,
  salesByCategory,
  recordProductView,
  ACTIVITY_RANGES,
  resolveRange,
  rangeSince,
  activitySeries,
  getTotalViews,
  topViewedProducts,
};
