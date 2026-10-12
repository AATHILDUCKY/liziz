/** @type {import('next').NextConfig} */
const { networkInterfaces } = require("node:os");

// Phones on the same Wi-Fi use a LAN address rather than localhost. Allow
// those actual interface addresses to receive development assets and updates.
let interfaces = [];
try {
  interfaces = Object.values(networkInterfaces()).flat();
} catch {
  // Restricted build environments may not permit reading network interfaces.
}
const lanAddresses = [
  ...new Set(
    interfaces
      .filter((network) =>
        network && network.family === "IPv4" && !network.internal &&
        !network.address.startsWith("169.254"),
      )
      .map((network) => network.address),
  ),
];

const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1", ...lanAddresses],
  // better-sqlite3 is a native module; keep it external to the server bundle.
  serverExternalPackages: ["better-sqlite3", "bcryptjs"],
};

module.exports = nextConfig;
