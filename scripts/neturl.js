// Prints the URLs to open on other devices (phone/tablet) on the same WiFi.
const os = require("os");

const PORT = process.env.PORT || 3000;
const nets = os.networkInterfaces();
const urls = [];

for (const name of Object.keys(nets)) {
  for (const net of nets[name] || []) {
    // IPv4, not internal (skip loopback), not link-local
    if (net.family === "IPv4" && !net.internal && !net.address.startsWith("169.254")) {
      urls.push({ iface: name, url: `http://${net.address}:${PORT}` });
    }
  }
}

console.log("\n  Liziz — open on any device on this WiFi:\n");
console.log(`  Local:    http://localhost:${PORT}`);
if (urls.length === 0) {
  console.log("  Network:  (no LAN address found — are you connected to WiFi?)");
} else {
  for (const u of urls) console.log(`  Network:  ${u.url}   (${u.iface})`);
}
console.log("\n  Admin portal: add /admin to any of the above.\n");
