import { z } from "zod";
import { route, ok, fail } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { getSeoSettings, setSeoSettings } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin only: read the current SEO configuration for the editor.
export const GET = route(async () => {
  await requireAdmin();
  return ok({ seo: getSeoSettings() });
});

const schema = z.object({
  siteUrl: z.string().max(200).optional(),
  metaTitle: z.string().max(70).optional(),
  metaDescription: z.string().max(300).optional(),
  metaKeywords: z.string().max(500).optional(),
  ogImage: z.string().max(500).optional(),
  googleAnalyticsId: z.string().max(40).optional(),
  googleSiteVerification: z.string().max(200).optional(),
});

// GA4 "G-…", Universal Analytics "UA-…", or Tag Manager "GTM-…". Empty clears it.
function isValidAnalyticsId(value) {
  const v = String(value || "").trim();
  return v === "" || /^(G|UA|GTM)-[A-Z0-9-]+$/i.test(v);
}

// A canonical URL must be a valid absolute http(s) URL (or empty to clear).
function isValidSiteUrl(value) {
  const v = String(value || "").trim();
  if (v === "") return true;
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// Admin only: update the SEO configuration.
export const PUT = route(async (req) => {
  await requireAdmin();
  const b = schema.parse(await req.json());

  if (b.siteUrl !== undefined && !isValidSiteUrl(b.siteUrl)) {
    return fail(400, "Site URL must be a valid address, e.g. https://your-liziz-domain.com (or empty to auto-detect).");
  }
  if (b.googleAnalyticsId !== undefined && !isValidAnalyticsId(b.googleAnalyticsId)) {
    return fail(400, "Google Analytics ID must look like G-XXXXXXXXXX, UA-XXXXXX-X, or GTM-XXXXXX (or be empty).");
  }

  const seo = setSeoSettings(b);
  return ok({ seo });
});
