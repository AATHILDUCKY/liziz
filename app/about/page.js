import Link from "next/link";
import { getHomeContent, getPublicSettings } from "@/lib/models";
import { publicizeHomeContent } from "@/lib/img";
import { abs, ogImage, resolveSiteUrl } from "@/lib/seo";
import BranchMap from "./BranchMap";

export const dynamic = "force-dynamic";

const SHELL = "site-shell";

export async function generateMetadata() {
  const content = publicizeHomeContent(getHomeContent());
  const base = await resolveSiteUrl();
  const title = "About";
  const description = content.about_intro || "About Liziz.";
  return {
    title,
    description,
    alternates: { canonical: "/about" },
    openGraph: {
      type: "website",
      title,
      description,
      url: abs("/about", base),
      images: [
        {
          url: ogImage(content.about_image, base),
          alt: content.about_image_alt || title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage(content.about_image, base)],
    },
  };
}

// Split a stored paragraph field into paragraphs on blank lines.
function paragraphs(text) {
  return String(text || "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export default function AboutPage() {
  const content = publicizeHomeContent(getHomeContent());
  const settings = getPublicSettings();

  // Journey milestones — drop any the admin has cleared out.
  const milestones = [1, 2, 3, 4, 5, 6]
    .map((n) => ({
      year: content[`about_t${n}_year`],
      title: content[`about_t${n}_title`],
      text: content[`about_t${n}_text`],
    }))
    .filter((m) => m.year || m.title || m.text);

  // Stats band — drop any empty slots.
  const stats = [1, 2, 3, 4]
    .map((n) => ({
      value: content[`about_stat${n}_value`],
      label: content[`about_stat${n}_label`],
    }))
    .filter((s) => s.value || s.label);

  const values = [
    { title: content.about_value1_title, text: content.about_value1_text },
    { title: content.about_value2_title, text: content.about_value2_text },
    { title: content.about_value3_title, text: content.about_value3_text },
  ].filter((v) => v.title || v.text);

  const countries = String(content.about_sourcing_countries || "")
    .split(/[·,|]/)
    .map((c) => c.trim())
    .filter(Boolean);

  // Store branches — a JSON array in the CMS, so more can be added anytime.
  let locations = [];
  try {
    const parsed = JSON.parse(content.about_locations || "[]");
    if (Array.isArray(parsed))
      locations = parsed.filter((l) => l && (l.name || l.address));
  } catch {
    locations = [];
  }
  const mappable = locations.filter(
    (l) => Number.isFinite(Number(l.lat)) && Number.isFinite(Number(l.lng)),
  );

  return (
    <div className="bg-paper text-ink">
      {/* ── Hero ── */}
      <section className={`${SHELL} py-8 sm:py-12`}>
        <div className="border-t border-line pt-4">
          <p className="font-sans text-sm uppercase tracking-[0.22em] text-ash">
            {content.about_eyebrow}
          </p>
          <div className="mt-5 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
            <div>
              <h1 className="max-w-4xl whitespace-pre-line font-display text-4xl font-normal leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
                {content.about_heading}
              </h1>
              <p className="mt-6 max-w-2xl font-sans text-base leading-8 text-ash sm:text-lg">
                {content.about_intro}
              </p>
              {content.about_since && (
                <div className="mt-8 border-y border-line py-4">
                  <p className="font-display text-4xl font-normal leading-none tracking-tight sm:text-6xl">
                    Since
                  </p>
                  <p className="mt-1 font-display text-6xl font-normal leading-none tracking-tight sm:text-8xl">
                    {content.about_since}
                  </p>
                </div>
              )}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/shop" className="btn-primary">
                  Shop the edit
                </Link>
                <Link href="/" className="btn-outline">
                  Back home
                </Link>
              </div>
            </div>
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={content.about_image}
                alt={content.about_image_alt || settings.storeName}
                className="aspect-[4/5] w-full object-cover lg:max-h-[620px]"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Founder's note ── */}
      {content.about_founder_heading && (
        <section className={`${SHELL} py-10 sm:py-16`}>
          <div className="grid gap-8 border-t border-line pt-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={content.about_founder_image}
                alt="Liziz editorial: textiles and thoughtful details"
                className="aspect-[4/5] w-full object-cover sm:aspect-[16/11] lg:aspect-[4/5]"
                loading="lazy"
              />
            </div>
            <div className="flex flex-col justify-center">
              <p className="font-sans text-sm uppercase tracking-[0.22em] text-ash">
                {content.about_founder_eyebrow}
              </p>
              <h2 className="mt-3 font-display text-3xl font-normal leading-none tracking-tight sm:text-5xl">
                {content.about_founder_heading}
              </h2>
              <div className="mt-6 max-w-3xl space-y-4 text-lg leading-9 text-ash sm:text-xl">
                {paragraphs(content.about_founder_text).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              {(content.about_founder_name || content.about_founder_role) && (
                <div className="mt-8 border-t border-line pt-4">
                  {content.about_founder_name && (
                    <p className="font-display text-2xl font-normal tracking-tight">
                      {content.about_founder_name}
                    </p>
                  )}
                  {content.about_founder_role && (
                    <p className="mt-1 font-sans text-sm uppercase tracking-[0.18em] text-ash">
                      {content.about_founder_role}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Journey timeline ── */}
      {milestones.length > 0 && (
        <section className={`${SHELL} py-10 sm:py-16`}>
          <div className="border-t border-line pt-8">
            <p className="font-sans text-sm uppercase tracking-[0.22em] text-ash">
              {content.about_timeline_eyebrow}
            </p>
            <h2 className="mt-3 max-w-3xl font-display text-3xl font-normal leading-none tracking-tight sm:text-5xl">
              {content.about_timeline_heading}
            </h2>
            <ol className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {milestones.map((m, i) => (
                <li key={i} className="relative border-t border-line pt-5">
                  <span className="font-sans text-sm text-ash">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="mt-2 font-display text-3xl font-normal leading-none tracking-tight sm:text-4xl">
                    {m.year}
                  </p>
                  <h3 className="mt-4 font-display text-xl font-normal tracking-tight">
                    {m.title}
                  </h3>
                  <p className="mt-2 text-base leading-7 text-ash">{m.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* ── Stats band ── */}
      {stats.length > 0 && (
        <section className={`${SHELL} pb-4 pt-2 sm:pb-8`}>
          <div className="grid grid-cols-2 gap-px overflow-hidden border border-ink bg-ink sm:grid-cols-4">
            {stats.map((s, i) => (
              <div key={i} className="bg-paper px-5 py-8 text-center">
                <p className="font-display text-4xl font-normal leading-none tracking-tight sm:text-6xl">
                  {s.value}
                </p>
                <p className="mt-3 font-sans text-xs uppercase tracking-[0.18em] text-ash sm:text-sm">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Sourcing / quality ── */}
      <section className={`${SHELL} py-10 sm:py-16`}>
        <div className="grid gap-8 border-t border-line pt-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
          <div className="flex flex-col justify-center">
            <p className="font-sans text-sm uppercase tracking-[0.22em] text-ash">
              Quality
            </p>
            <h2 className="mt-3 font-display text-3xl font-normal leading-none tracking-tight sm:text-5xl">
              {content.about_story_heading}
            </h2>
            <p className="mt-6 max-w-3xl text-lg leading-9 text-ash sm:text-xl">
              {content.about_story}
            </p>
            {countries.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-3">
                {countries.map((c) => (
                  <span
                    key={c}
                    className="border border-ink px-4 py-2 font-sans text-xs uppercase tracking-[0.18em]"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={content.about_second_image}
              alt={content.about_second_image_alt || ""}
              className="aspect-[4/5] w-full object-cover sm:aspect-[16/11] lg:aspect-[4/5]"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* ── Store locations / branches ── */}
      {locations.length > 0 && (
        <section className={`${SHELL} py-10 sm:py-16`}>
          <div className="border-t border-line pt-8">
            <p className="font-sans text-sm uppercase tracking-[0.22em] text-ash">
              {content.about_locations_eyebrow}
            </p>
            <h2 className="mt-3 max-w-3xl font-display text-3xl font-normal leading-none tracking-tight sm:text-5xl">
              {content.about_locations_heading}
            </h2>

            {mappable.length > 0 && (
              <div className="mt-8">
                <BranchMap locations={mappable} />
              </div>
            )}

            <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {locations.map((l, i) => {
                const maps =
                  Number.isFinite(Number(l.lat)) &&
                  Number.isFinite(Number(l.lng))
                    ? `https://www.google.com/maps/search/?api=1&query=${Number(l.lat)},${Number(l.lng)}`
                    : l.address
                      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(l.address)}`
                      : null;
                return (
                  <li
                    key={i}
                    className="flex flex-col border-t border-line pt-4"
                  >
                    {l.area && (
                      <p className="font-sans text-xs uppercase tracking-[0.18em] text-ash">
                        {l.area}
                      </p>
                    )}
                    <h3 className="mt-2 font-display text-2xl font-normal tracking-tight">
                      {l.name}
                    </h3>
                    {l.address && (
                      <p className="mt-2 text-base leading-7 text-ash">
                        {l.address}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-3">
                      {l.opened && (
                        <span className="border border-ink px-2.5 py-1 font-sans text-[11px] uppercase tracking-[0.16em]">
                          Since {l.opened}
                        </span>
                      )}
                      {maps && (
                        <a
                          href={maps}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-sans text-[11px] uppercase tracking-[0.16em] text-ink underline underline-offset-4 hover:text-ash"
                        >
                          Get directions ↗
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* ── Values ── */}
      {values.length > 0 && (
        <section className={`${SHELL} pb-6 pt-2 sm:pb-10`}>
          <div className="grid gap-3 border-t border-line pt-8 sm:grid-cols-3">
            {values.map((item, i) => (
              <div key={i} className="border-t border-line pt-3">
                <p className="font-sans text-sm text-ash">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-3 font-display text-2xl font-normal tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-2 text-base leading-7 text-ash">{item.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Closing CTA ── */}
      <section className={`${SHELL} pb-16 pt-4`}>
        <div className="border border-ink bg-ink px-6 py-12 text-center text-paper sm:py-16">
          <p className="font-sans text-sm uppercase tracking-[0.24em] text-paper/90">
            Liziz
          </p>
          <h2 className="mx-auto mt-4 max-w-3xl font-display text-3xl font-normal leading-none tracking-tight sm:text-5xl">
            {content.about_cta_heading}
          </h2>
          <p className="mx-auto mt-4 max-w-xl font-sans text-base leading-8 text-paper/90">
            {content.about_cta_text}
          </p>
          <Link
            href="/shop"
            className="btn mt-7 bg-paper text-ink hover:bg-white/90"
          >
            Shop now
          </Link>
        </div>
      </section>
    </div>
  );
}
