// Idempotent seeder. Run with `npm run seed`.
// - Creates the initial admin from .env (only if it doesn't already exist).
// - Seeds store settings from .env (only if unset).
// - Adds modest-fashion categories; never creates sample products or leads.
try {
  // Load .env manually (no dotenv dependency needed).
  const fs = require("fs");
  const path = require("path");
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
      if (m && !line.trim().startsWith("#")) {
        const key = m[1];
        let val = m[2].replace(/^["']|["']$/g, "");
        if (process.env[key] === undefined) process.env[key] = val;
      }
    }
  }
} catch {}

const bcrypt = require("bcryptjs");
const db = require("./db");
const { setSetting, getSetting } = require("./models");

function seedCategories() {
  const count = db.prepare("SELECT COUNT(*) AS c FROM categories").get().c;
  if (count > 0) {
    console.log(`✓ Categories already present (${count}) — skipping.`);
    return;
  }
  const defaults = [
    "Abayas",
    "Dresses",
    "Hijabs",
    "Co-ords",
    "Everyday essentials",
  ];
  const insert = db.prepare(
    "INSERT OR IGNORE INTO categories (name) VALUES (?)",
  );
  const tx = db.transaction((names) => names.forEach((n) => insert.run(n)));
  tx(defaults);
  console.log(`✓ Inserted ${defaults.length} default categories.`);
}

function seedAdmin() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "Liziz Owner";
  const existing = db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(username);
  if (existing) {
    console.log(`✓ Admin "${username}" already exists — left unchanged.`);
    return;
  }
  if (!password) {
    console.log(
      "Admin not created: set ADMIN_PASSWORD in .env, then run npm run seed.",
    );
    return;
  }
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    "INSERT INTO users (username, name, password, role, active) VALUES (?, ?, ?, 'admin', 1)",
  ).run(username, name, hash);
  console.log(
    `✓ Created admin "${username}" (change the password after first login).`,
  );
}

function seedSettings() {
  const defaults = {
    store_name: process.env.STORE_NAME || "Liziz",
    whatsapp_number: process.env.WHATSAPP_NUMBER || "",
    currency: process.env.CURRENCY || "Rs.",
  };
  for (const [k, v] of Object.entries(defaults)) {
    if (getSetting(k, null) === null) {
      setSetting(k, v);
      console.log(`✓ Setting "${k}" = "${v}"`);
    }
  }
}

function main() {
  seedAdmin();
  seedSettings();
  seedCategories();
  console.log("Liziz is ready. Add your real products in Admin → Products.");
}
module.exports = { main, seedAdmin, seedSettings, seedCategories };
if (require.main === module) main();
