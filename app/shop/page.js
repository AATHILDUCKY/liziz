import { listProductCards, listCategoryTags } from "@/lib/models";
import ShopFilter from "./ShopFilter";
import { abs, resolveSiteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";
export async function generateMetadata({ searchParams }) {
  const sp = (await searchParams) || {};
  const title = "The Collection — Modest Womenswear";
  const description =
    "Explore premium modest womenswear by Liziz. Thoughtfully designed and made by us, with a personal WhatsApp ordering experience.";
  // Filtered views share the collection canonical to avoid duplicate pages.
  const path = "/shop";
  const site = await resolveSiteUrl();
  return {
    title,
    description,
    alternates: { canonical: path },
    ...(sp.q ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title,
      description,
      url: abs(path, site),
      images: [
        {
          url: abs("/images/liziz-social.jpg", site),
          width: 1200,
          height: 630,
          alt: "Liziz — premium modest womenswear",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [abs("/images/liziz-social.jpg", site)],
    },
  };
}
export default async function ShopPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const initialCategory = typeof sp.category === "string" ? sp.category : "All";
  const initialQuery = typeof sp.q === "string" ? sp.q : "";
  const initialSort = typeof sp.sort === "string" ? sp.sort : "featured";
  const products = listProductCards({ publicOnly: true });
  const categories = listCategoryTags().map((c) => c.name);
  return (
    <ShopFilter
      key={`${initialCategory}-${initialQuery}-${initialSort}`}
      products={products}
      managedCategories={categories}
      initialCategory={initialCategory}
      initialQuery={initialQuery}
      initialSort={initialSort}
    />
  );
}
