// Non-destructive bootstrap. Never seeds products, leads, or customer data.
const { main } = require("../lib/seed");
try {
  main();
} catch (err) {
  console.error("Database init failed:", err.message);
  process.exit(1);
}
