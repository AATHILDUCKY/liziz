import { resolveSiteUrl } from "@/lib/seo";

// Auto-generated /robots.txt. Blocks private/functional routes from indexing,
// allows the public storefront, and points crawlers at the sitemap. Dynamic so
// the host is resolved per-request (matches the sitemap's absolute URLs).
export const dynamic = "force-dynamic";

export default async function robots() {
  const base = await resolveSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/api/img/"],
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/cart",
          "/checkout",
          "/order-sent",
          "/*?*q=",
          "/*?*sort=", // avoid crawling duplicate filtered/sorted permutations
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
