// Explicit reset only: remove About overrides and use Liziz CMS defaults.
require("../lib/seed"); // Load local env before resolving the DB path.
const db = require("../lib/db");
const info = db
  .prepare("DELETE FROM settings WHERE key LIKE 'home_about_%'")
  .run();
console.log(`Cleared ${info.changes} About overrides.`);
