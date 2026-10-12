import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, listProductCards, getSetting } from "@/lib/models";
import { publicizeProduct } from "@/lib/img";
import { abs, ogImage, resolveSiteUrl } from "@/lib/seo";
import { variantPricing } from "@/lib/variants";
import ProductCard from "@/app/components/ProductCard";
import ProductView from "./ProductView";

export const dynamic = "force-dynamic";

async function getRouteSlug(params) {
  const resolved = await params;
  return resolved?.slug;
}

export async function generateMetadata({ params }) {
  const slug = await getRouteSlug(params);
  const p = publicizeProduct(getProduct(slug));
  if (!p) return { title: "Product not found" };
  const base = await resolveSiteUrl();
  const desc =
    (p.description && p.description.slice(0, 160)) ||
    `${p.name} — ${p.category} at ${getSetting("store_name", "Liziz")}.`;
  return {
    title: p.name,
    description: desc,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: {
      type: "website",
      title: p.name,
      description: desc,
      url: abs(`/product/${p.slug}`, base),
      images: [{ url: ogImage(p.image, base), alt: p.name }],
    },
    twitter: { card: "summary_large_image", title: p.name, description: desc, images: [ogImage(p.image, base)] },
  };
}

// Product structured data for rich search results.
function productJsonLd(p, currency, base) {
  const pricing = variantPricing(p);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description || p.name,
    image: (p.images || [p.image]).map((s) => ogImage(s, base)),
    category: p.category,
    brand: { "@type": "Brand", name: getSetting("store_name", "Liziz") },
    offers: {
      "@type": "Offer",
      price: pricing.price,
      priceCurrency: currency === "Rs." ? "LKR" : currency,
      availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: abs(`/product/${p.slug}`, base),
    },
  };
}

export default async function ProductPage({ params }) {
  const slug = await getRouteSlug(params);
  const raw = getProduct(slug);
  if (!raw) notFound();
  const product = publicizeProduct(raw);

  const currency = getSetting("currency", "Rs.");
  const base = await resolveSiteUrl();
  const related = listProductCards({ publicOnly: true })
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4)
    .map(publicizeProduct);

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product, currency, base)).replace(/</g, "\\u003c") }}
      />
      <Link href="/shop" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ash hover:text-ink">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Back to shop
      </Link>

      {/* Gallery + purchase panel share the selected colour (client) */}
      <ProductView key={product.id} product={product} />

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-4 font-display text-xl font-bold">You may also like</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
