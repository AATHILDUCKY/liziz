"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer({
  storeName = "Liziz",
  categories = [],
  whatsappNumber = "",
  content = {},
  socialLinks = [],
}) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  const wa = String(whatsappNumber || "").replace(/\D/g, "");
  return (
    <footer className="border-t border-line bg-smoke">
      <div className="site-shell grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr] lg:py-20">
        <div>
          <Link
            href="/"
            className="brand-wordmark text-6xl"
            aria-label={`${storeName} home`}
          >
            {content.footer_heading || "liziz"}
          </Link>
          <p className="mt-5 font-display text-xl">{content.footer_tagline}</p>
          <p className="mt-3 max-w-xs text-sm leading-7 text-mocha">
            {content.footer_text}
          </p>
        </div>
        <div>
          <h2 className="eyebrow">Explore</h2>
          <ul className="mt-4 space-y-1">
            <li>
              <Link className="footer-link" href="/shop">
                The collection
              </Link>
            </li>
            {categories.slice(0, 5).map((c) => (
              <li key={c.name}>
                <Link
                  className="footer-link"
                  href={`/shop?category=${encodeURIComponent(c.name)}`}
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="eyebrow">Here for you</h2>
          <ul className="mt-4 space-y-1">
            <li>
              <Link className="footer-link" href="/about">
                Our story
              </Link>
            </li>
            <li>
              <Link className="footer-link" href="/cart">
                Your bag
              </Link>
            </li>
            {wa && (
              <li>
                <a
                  className="footer-link"
                  href={`https://wa.me/${wa}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Contact Liziz ↗
                </a>
              </li>
            )}
            {socialLinks.map((s) => (
              <li key={s.id}>
                <a
                  className="footer-link"
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {s.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="site-shell flex flex-wrap items-center justify-between gap-4 border-t border-line py-6 text-xs text-mocha">
        <p>
          © {new Date().getFullYear()} {storeName}. All rights reserved.
        </p>
        <p>{content.footer_eyebrow}</p>
        <Link className="inline-flex min-h-11 items-center" href="/admin">
          Store admin
        </Link>
      </div>
    </footer>
  );
}
