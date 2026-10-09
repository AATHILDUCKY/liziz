import { listProductCards } from "@/lib/models";
import { resolveSiteUrl } from "@/lib/seo";

// Auto-generated, auto-updated sitemap.
// Algorithm:
//   1. Read the live catalogue (in-stock products) from SQLite.
//   2. Emit static routes with priority weights (home > shop).
//   3. Filtered collection URLs share /shop as canonical and are omitted.
//      Emit one entry per product, using its DB updated_at as <lastmod>.
//   4. lastModified for the index pages = the newest product change, so the
//      sitemap's freshness signal tracks real catalogue updates.
// Because it reads the DB on each request (force-dynamic), it is always current.
export const dynamic = "force-dynamic";

function toDate(sqlTs) {
  const d = new Date(String(sqlTs || "").replace(" ", "T") + "Z");
  return isNaN(d.getTime()) ? new Date() : d;
}

export default async function sitemap() {
  const base = await resolveSiteUrl();
  const products = listProductCards({ publicOnly: true });

  const newest = products.reduce((max, p) => {
    const d = toDate(p.updatedAt);
    return d > max ? d : max;
  }, new Date(0));
  const lastSite = newest.getTime() ? newest : new Date();

  const staticRoutes = [
    {
      url: `${base}/`,
      lastModified: lastSite,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${base}/shop`,
      lastModified: lastSite,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${base}/about`,
      lastModified: lastSite,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  const productRoutes = products.map((p) => ({
    url: `${base}/product/${p.slug}`,
    lastModified: toDate(p.updatedAt),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...productRoutes];
}
