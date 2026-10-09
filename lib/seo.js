// Central SEO helpers.
//
// Site-URL resolution is layered so the sitemap / robots / canonical URLs are
// never stuck on a dev value like http://localhost:3000:
//   1. Admin-configured canonical URL (Settings → SEO, stored in the DB).
//   2. SITE_URL env var — but only if it isn't a local/LAN address.
//   3. The real request origin, derived from the incoming Host header, so a
//      freshly deployed site produces correct absolute URLs with zero config.
//   4. http://localhost:3000 as a last resort (local dev, no request context).
import { headers } from "next/headers";
import { getSetting } from "@/lib/models";

const FALLBACK = "http://localhost:3000";

function clean(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

// True for empty, localhost, loopback, or private-LAN origins — i.e. anything
// that must never be published as a canonical/sitemap URL.
const LOCAL_HOST_RE =
  /^https?:\/\/(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[::1?\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?(\/|$)/i;
function isLocalOrigin(url) {
  return !url || LOCAL_HOST_RE.test(url);
}

// The explicitly-configured canonical URL: admin setting first, then env.
// Synchronous (no request context) — safe to call anywhere on the server.
export function configuredSiteUrl() {
  const fromDb = clean(getSetting("site_url", ""));
  if (fromDb) return fromDb;
  const fromEnv = clean(process.env.SITE_URL);
  if (fromEnv) return fromEnv;
  return FALLBACK;
}

// Backwards-compatible synchronous accessor (best effort, no header fallback).
export function siteUrl() {
  return configuredSiteUrl();
}

// Request-aware resolver. An explicit, non-local configured URL always wins so
// an admin can pin a canonical domain even behind a proxy. Otherwise we trust
// the Host the crawler actually reached us on — this is what fixes a sitemap
// that would otherwise emit localhost URLs in production.
export async function resolveSiteUrl() {
  const configured = configuredSiteUrl();
  if (!isLocalOrigin(configured)) return configured;
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host");
    if (host) {
      const proto =
        h.get("x-forwarded-proto") ||
        (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
      return clean(`${proto}://${host}`);
    }
  } catch {
    // headers() is unavailable outside a request (e.g. build) — fall through.
  }
  return configured;
}

// Absolute URL for a path. Pass `base` (from resolveSiteUrl) to honour the
// request origin; omit it for the statically-configured URL.
export function abs(path = "/", base) {
  const b = clean(base) || configuredSiteUrl();
  if (/^https?:\/\//.test(path)) return path;
  return `${b}${path.startsWith("/") ? "" : "/"}${path}`;
}

// An OG-safe image URL: crawlers can't fetch data: URIs, so fall back to a
// self-hosted default when a product only has an inline/base64 image. Served
// /api/img/ URLs are real fetchable images, so they're allowed through.
export function ogImage(src, base) {
  if (src && (src.startsWith("http") || src.startsWith("/images/") || src.startsWith("/api/img/")))
    return abs(src, base);
  return abs("/images/liziz-social.jpg", base);
}
