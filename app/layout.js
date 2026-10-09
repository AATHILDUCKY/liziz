import "./globals.css";
import Script from "next/script";
import { publicizeSettings } from "@/lib/img";
import { StoreProvider } from "./context/StoreProvider";
import Header from "./components/Header";
import MobileNav from "./components/MobileNav";
import Toast from "./components/Toast";
import Footer from "./components/Footer";
import { resolveSiteUrl, ogImage } from "@/lib/seo";
import {
  getSetting,
  getSeoSettings,
  keywordsList,
  getPublicSettings,
  getHomeContent,
  listCategoryTags,
} from "@/lib/models";

// Rendered per-request so admin-configured SEO / Analytics / Search Console
// settings apply on every page (including the cart & checkout funnel) without a
// rebuild.
export const dynamic = "force-dynamic";

const STORE = process.env.STORE_NAME || "Liziz";
const DEFAULT_TITLE = `${STORE} — Premium Modest Womenswear`;
const DEFAULT_DESC =
  "Discover Liziz: premium modest womenswear, designed and manufactured by us. Explore abayas, dresses, hijabs and everyday essentials. Order on WhatsApp.";
const DEFAULT_KEYWORDS = [
  "modest womenswear",
  "abayas",
  "hijabs",
  "modest dresses",
  STORE,
  "premium women’s clothing",
];

// Async so the canonical URL and admin-managed SEO fields (title, description,
// keywords, OG image, Search Console token) are read per-request.
export async function generateMetadata() {
  const site = await resolveSiteUrl();
  const seo = getSeoSettings();

  const title = seo.metaTitle || DEFAULT_TITLE;
  const description = seo.metaDescription || DEFAULT_DESC;
  const keywords = seo.metaKeywords ? keywordsList() : DEFAULT_KEYWORDS;
  const shareImage = ogImage(seo.ogImage || "/images/liziz-social.jpg", site);

  return {
    metadataBase: new URL(site),
    title: {
      default: title,
      template: `%s — ${STORE}`,
    },
    description,
    applicationName: STORE,
    keywords,
    authors: [{ name: STORE }],
    creator: STORE,
    publisher: STORE,
    icons: {
      icon: [
        { url: "/icon.svg", type: "image/svg+xml" },
        { url: "/favicon-48x48.png", type: "image/png", sizes: "48x48" },
      ],
      apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    },
    alternates: { canonical: "/" },
    ...(seo.googleSiteVerification
      ? { verification: { google: seo.googleSiteVerification } }
      : {}),
    openGraph: {
      type: "website",
      siteName: STORE,
      title,
      description,
      url: site,
      images: [{ url: shareImage, width: 1200, height: 630, alt: STORE }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [shareImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#FDFBF4",
};

export default async function RootLayout({ children }) {
  // Google Analytics 4 measurement id (set in Admin → Settings). When present,
  // gtag.js loads after the page is interactive so it never blocks first paint.
  const settings = getPublicSettings();
  const categories = listCategoryTags().map(({ name }) => ({ name }));
  const home = getHomeContent();
  const footerContent = Object.fromEntries(
    Object.entries(home).filter(([key]) => key.startsWith("footer_")),
  );
  const gaId = getSetting("google_analytics_id", "");
  const site = await resolveSiteUrl();
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${site}/#organization`,
    name: STORE,
    url: site,
    logo: {
      "@type": "ImageObject",
      url: `${site}/images/liziz-logo.svg`,
      width: 512,
      height: 512,
    },
  };

  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema).replace(/</g, "\\u003c"),
          }}
        />
        <StoreProvider initialSettings={publicizeSettings(settings)}>
          <Header categories={categories} />
          <main id="main-content" tabIndex={-1} className="min-h-[60vh]">
            {children}
          </main>
          <Footer
            storeName={settings.storeName}
            categories={categories}
            whatsappNumber={settings.whatsappNumber}
            content={footerContent}
            socialLinks={settings.socialLinks}
          />
          <MobileNav />
          <Toast />
        </StoreProvider>

        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
