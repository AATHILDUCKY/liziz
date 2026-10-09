import Link from "next/link";
import ProductCard from "./components/ProductCard";
import EditorialImage from "./components/EditorialImage";
import {
  listProductCards,
  getPublicSettings,
  bestSellers,
  getHomeContent,
  listCategoryTags,
} from "@/lib/models";
import { publicizeHomeContent, publicizeCategoryTag } from "@/lib/img";
import { resolveSiteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const site = await resolveSiteUrl();
  const settings = getPublicSettings();
  const content = publicizeHomeContent(getHomeContent());
  const products = listProductCards({ publicOnly: true });
  const featured = products.filter((p) => p.featured);
  const newest = [...products].sort((a, b) =>
    String(b.createdAt).localeCompare(String(a.createdAt)),
  );
  const flagged = newest.filter((p) => p.newDrop);
  const arrivals = (flagged.length ? flagged : newest).slice(0, 4);
  const categories = listCategoryTags().map(publicizeCategoryTag);
  const wanted = bestSellers({ limit: 4 })
    .map((t) => products.find((p) => p.id === t.productId))
    .filter(Boolean);
  const looks = [1, 2, 3]
    .map((n) => ({
      image: content[`look${n}_image`],
      tag: content[`look${n}_tag`],
      label: content[`look${n}_label`],
    }))
    .filter((l) => l.image);
  const wa = String(settings.whatsappNumber || "").replace(/\D/g, "");
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: settings.storeName,
    url: site,
    potentialAction: {
      "@type": "SearchAction",
      target: `${site}/shop?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />
      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow">{content.meta_left}</p>
          <h1>{content.hero_heading}</h1>
          <p className="hero-description">{content.hero_sub}</p>
          <div className="mt-8 flex flex-wrap items-center gap-5 sm:mt-10">
            <Link href="/shop" className="btn-primary">
              Explore the collection <Arrow />
            </Link>
            <Link href="/about" className="text-link">
              Our story
            </Link>
          </div>
          <div className="hero-signature">
            <span className="h-px w-9 bg-taupe" />
            <span>{content.meta_right}</span>
          </div>
        </div>
        <div className="hero-visual">
          <EditorialImage
            src={content.hero_image}
            alt="Modest fashion editorial: a flowing taupe abaya and cream hijab"
            priority
            sizes="(max-width: 767px) 100vw, 52vw"
          />
          <div className="hero-image-note">
            <span>THE LIZIZ PERSPECTIVE</span>
            <span>Quietly refined.</span>
          </div>
        </div>
      </section>

      {content.ticker && (
        <div className="brand-note">
          {content.ticker
            .split("\n")
            .filter(Boolean)
            .map((text, i) => (
              <span key={i}>{text}</span>
            ))}
        </div>
      )}

      <section
        className="site-shell section-space"
        aria-labelledby="collection-heading"
      >
        <SectionHead
          eyebrow="A wardrobe, considered"
          title="Discover your kind of modest."
          id="collection-heading"
          href="/shop"
        />
        <div className="collection-list">
          {categories.map((category, i) => (
            <Link
              key={category.id}
              href={`/shop?category=${encodeURIComponent(category.name)}`}
              className="collection-link group"
            >
              {category.image ? (
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <EditorialImage
                    src={category.image}
                    alt={category.name}
                    sizes="(max-width: 640px) 50vw, 20vw"
                  />
                </div>
              ) : (
                <span className="collection-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
              )}
              <span className="flex w-full items-center justify-between gap-3">
                <span className="font-display text-xl sm:text-2xl">
                  {category.name}
                </span>
                <Arrow />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {arrivals.length > 0 && (
        <ProductSection
          eyebrow="Just arrived"
          title="New to your wardrobe."
          products={arrivals}
          href="/shop?sort=new"
        />
      )}
      {featured.length > 0 && (
        <ProductSection
          eyebrow="The Liziz edit"
          title="Pieces to make your own."
          products={featured.slice(0, 4)}
        />
      )}

      <section className="craft-section">
        <div className="relative min-h-[280px] md:min-h-[520px]">
          <EditorialImage
            src={content.editorial_image}
            alt="A study in texture: soft cream and taupe textiles with dressmaking tools"
            sizes="(max-width: 767px) 100vw, 50vw"
          />
        </div>
        <div className="craft-copy">
          <p className="eyebrow">{content.values_eyebrow}</p>
          <h2 className="section-title mt-5">{content.values_heading}</h2>
          <p className="mt-6 max-w-md leading-7 text-mocha">
            {content.values_intro}
          </p>
          <Link href="/about" className="text-link mt-8 w-fit">
            Discover how we make it <Arrow />
          </Link>
        </div>
      </section>

      <section
        className="site-shell grid grid-cols-2 gap-x-6 gap-y-9 py-12 sm:py-16 lg:grid-cols-4"
        aria-label="The Liziz experience"
      >
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="border-t border-line pt-5">
            {(content[`value${n}_image`] || content[`value${n}_icon`]) && (
              <div className="relative mb-4 aspect-[4/3]">
                <EditorialImage
                  src={content[`value${n}_image`] || content[`value${n}_icon`]}
                  alt=""
                  sizes="25vw"
                />
              </div>
            )}
            <span className="eyebrow text-taupe" aria-hidden="true">
              0{n}
            </span>
            <h3 className="mt-3 font-display text-xl sm:text-2xl">
              {content[`value${n}_title`]}
            </h3>
            <p className="mt-2 text-sm leading-6 text-mocha">
              {content[`value${n}_text`]}
            </p>
          </div>
        ))}
      </section>

      {looks.length > 0 && (
        <section className="site-shell section-space">
          <SectionHead
            eyebrow={content.lookbook_label}
            title={content.lookbook_heading}
          />
          <div className="grid gap-5 sm:grid-cols-3">
            {looks.map((look, i) => (
              <figure key={i}>
                <div className="relative aspect-[4/5]">
                  <EditorialImage
                    src={look.image}
                    alt={look.label || "Liziz lookbook"}
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                </div>
                <figcaption className="mt-4">
                  <p className="eyebrow">{look.tag}</p>
                  <p className="mt-2 font-display text-2xl">{look.label}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
      {wanted.length > 0 && (
        <ProductSection
          eyebrow="Your favourites"
          title="The most-loved edit."
          products={wanted}
        />
      )}

      <section className="bg-bisque/40 px-6 py-16 text-center sm:py-24">
        <p className="eyebrow">The beauty of being yourself</p>
        <p className="mx-auto mt-5 max-w-2xl whitespace-pre-line font-display text-4xl leading-tight sm:text-6xl">
          {content.quote}
        </p>
        <div className="mx-auto my-8 h-9 w-px bg-taupe" />
        <h2 className="font-display text-2xl">{content.cta_heading}</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-mocha">
          {content.cta_text}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-4">
          {wa && (
            <a
              className="btn-outline"
              href={`https://wa.me/${wa}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Speak with Liziz <Arrow />
            </a>
          )}
          <Link className="btn-primary" href="/shop">
            Explore Liziz <Arrow />
          </Link>
        </div>
      </section>
    </div>
  );
}

function Arrow() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
    >
      <path d="M4 12h15m-6-6 6 6-6 6" />
    </svg>
  );
}
function SectionHead({ eyebrow, title, id, href }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-6 sm:mb-10">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={id} className="section-title mt-4">
          {title}
        </h2>
      </div>
      {href && (
        <Link href={href} className="text-link">
          View collection <Arrow />
        </Link>
      )}
    </div>
  );
}
function ProductSection({ eyebrow, title, products, href = "/shop" }) {
  return (
    <section className="site-shell section-space">
      <SectionHead eyebrow={eyebrow} title={title} href={href} />
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 md:gap-x-6">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
