// ─────────────────────────────────────────────────────────────
// SQLite connection + schema. Single shared connection (cached on
// globalThis so Next.js hot-reload doesn't open many handles).
// ─────────────────────────────────────────────────────────────
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DATABASE_PATH || "data/liziz.db";

function resolveDbPath() {
  if (path.isAbsolute(DB_PATH)) return DB_PATH;

  const parts = path
    .normalize(DB_PATH)
    .replace(/^(\.\.[/\\])+/, "")
    .replace(/^\.[/\\]/, "")
    .split(/[/\\]+/)
    .filter(Boolean);

  if (parts[0] === "data") {
    return path.join(process.cwd(), "data", ...parts.slice(1));
  }

  return path.join(/* turbopackIgnore: true */ process.cwd(), ...parts);
}

function createConnection() {
  const abs = resolveDbPath();
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const db = new Database(abs);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      username     TEXT NOT NULL UNIQUE,
      name         TEXT NOT NULL DEFAULT '',
      password     TEXT NOT NULL,              -- bcrypt hash
      role         TEXT NOT NULL DEFAULT 'stock_updater',  -- 'admin' | 'stock_updater'
      active       INTEGER NOT NULL DEFAULT 1,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT NOT NULL,
      slug         TEXT NOT NULL UNIQUE,
      description  TEXT NOT NULL DEFAULT '',
      category     TEXT NOT NULL DEFAULT 'All',
      price        REAL NOT NULL DEFAULT 0,
      image        TEXT NOT NULL DEFAULT '',   -- primary image (URL or data-uri)
      images       TEXT NOT NULL DEFAULT '[]', -- JSON array of image URLs/data-uris
      sizes        TEXT NOT NULL DEFAULT '[]', -- JSON array of strings
      colours      TEXT NOT NULL DEFAULT '[]', -- JSON array of strings
      in_stock     INTEGER NOT NULL DEFAULT 1, -- one-tap toggle
      featured     INTEGER NOT NULL DEFAULT 0,
      new_drop     INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key          TEXT PRIMARY KEY,
      value        TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS categories (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT NOT NULL UNIQUE COLLATE NOCASE,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Analytics: a "lead" = a checkout handed off to WhatsApp (not an order inbox).
    CREATE TABLE IF NOT EXISTS leads (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      total          REAL NOT NULL DEFAULT 0,     -- intended order value
      item_count     INTEGER NOT NULL DEFAULT 0,  -- total units
      customer_name  TEXT NOT NULL DEFAULT '',    -- optional, for follow-up
      customer_phone TEXT NOT NULL DEFAULT '',
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS lead_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id     INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      product_id  INTEGER,                         -- snapshot; may be null if product later removed
      name        TEXT NOT NULL DEFAULT '',
      size        TEXT NOT NULL DEFAULT '',
      colour      TEXT NOT NULL DEFAULT '',
      qty         INTEGER NOT NULL DEFAULT 1,
      price       REAL NOT NULL DEFAULT 0
    );

    -- Product page views, rolled up per product per HOUR. Admin-only analytics —
    -- never shown to customers. One row per (product, hour) keeps this table
    -- small (bounded by catalogue × active hours) while supporting fine-grained
    -- time ranges (last 24h hourly, days, months). bucket = "YYYY-MM-DD HH:00"
    -- in local time, so it sorts and compares lexicographically as a timestamp.
    CREATE TABLE IF NOT EXISTS product_views (
      product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      bucket      TEXT NOT NULL,               -- 'YYYY-MM-DD HH:00' (local time)
      count       INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (product_id, bucket)
    );

    CREATE INDEX IF NOT EXISTS idx_leads_created      ON leads(created_at);
    CREATE INDEX IF NOT EXISTS idx_lead_items_lead    ON lead_items(lead_id);
    CREATE INDEX IF NOT EXISTS idx_lead_items_product ON lead_items(product_id);

    -- Product list ordering (featured, then newest) and the public in-stock /
    -- category filters — keeps catalogue queries index-driven as it grows.
    CREATE INDEX IF NOT EXISTS idx_products_sort     ON products(featured DESC, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_in_stock ON products(in_stock);
  `);

  // Additive migrations for databases created before a column existed.
  ensureColumn(db, "products", "images", "TEXT NOT NULL DEFAULT '[]'");
  ensureColumn(db, "categories", "image", "TEXT NOT NULL DEFAULT ''");
  // Legacy per-axis stock maps (superseded by variant_stock). Kept so existing
  // rows still read; new writes go to variant_stock.
  ensureColumn(db, "products", "size_stock", "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn(db, "products", "colour_stock", "TEXT NOT NULL DEFAULT '{}'");
  // Per-combination stock: JSON map keyed by "<size>::<colour>", value false =
  // sold out. A missing key means in stock (so untouched combos stay available).
  ensureColumn(db, "products", "variant_stock", "TEXT NOT NULL DEFAULT '{}'");
  // Product-level sale pricing plus optional per-combination overrides.
  ensureColumn(db, "products", "compare_at_price", "REAL NOT NULL DEFAULT 0");
  ensureColumn(db, "products", "variant_prices", "TEXT NOT NULL DEFAULT '{}'");
  // Per-image colour tags: JSON array parallel to `images`; image_colours[i] is
  // the colour that image[i] shows ("" = untagged / shown for all colours).
  ensureColumn(db, "products", "image_colours", "TEXT NOT NULL DEFAULT '[]'");
  // Merchandising flag for the home-page "NEW DROPS" carousel.
  ensureColumn(db, "products", "new_drop", "INTEGER NOT NULL DEFAULT 0");

  // Upgrade the first-gen daily product_views rollup (PK product_id, day) to the
  // hourly bucket schema. Existing daily rows fold into that day's midnight hour.
  // Runs before the bucket index so the column is guaranteed to exist first.
  migrateProductViewsToHourly(db);
  db.exec("CREATE INDEX IF NOT EXISTS idx_product_views_bucket ON product_views(bucket)");
}

function migrateProductViewsToHourly(db) {
  const cols = db.prepare("PRAGMA table_info(product_views)").all();
  if (!cols.length) return;                       // fresh DB — already hourly
  if (cols.some((c) => c.name === "bucket")) return; // already migrated
  db.exec(`
    ALTER TABLE product_views RENAME TO product_views_legacy;
    CREATE TABLE product_views (
      product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      bucket      TEXT NOT NULL,
      count       INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (product_id, bucket)
    );
    INSERT INTO product_views (product_id, bucket, count)
      SELECT product_id, day || ' 00:00', count FROM product_views_legacy;
    DROP TABLE product_views_legacy;
    CREATE INDEX IF NOT EXISTS idx_product_views_bucket ON product_views(bucket);
  `);
}

// Add a column if it isn't already present (SQLite has no "ADD COLUMN IF NOT EXISTS").
function ensureColumn(db, table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

// Cache the connection across hot reloads / route invocations.
let db = globalThis.__lizizDb;
if (!db) {
  db = createConnection();
  globalThis.__lizizDb = db;
}

module.exports = db;
module.exports.createConnection = createConnection;
