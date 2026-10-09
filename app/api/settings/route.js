import { z } from "zod";
import { route, ok, fail } from "@/lib/api";
import { requireAdmin, currentUser } from "@/lib/auth";
import { publicizeSettings } from "@/lib/img";
import {
  getPublicSettings,
  setSetting,
  getVariantOptions,
  setVariantOptions,
  setPaymentOptions,
  setSocialLinks,
} from "@/lib/models";

function normalizeWhatsAppNumber(value, defaultCountryCode = "94") {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith(defaultCountryCode) && digits.length >= 10) return digits;
  if (digits.startsWith("0") && digits.length === 10 && defaultCountryCode) {
    return `${defaultCountryCode}${digits.slice(1)}`;
  }
  return digits;
}

function isValidWhatsAppNumber(value, defaultCountryCode = "94") {
  const normalized = normalizeWhatsAppNumber(value, defaultCountryCode);
  return /^\d{10,15}$/.test(normalized);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: store name, currency, WhatsApp number, plus the size/colour option
// pools the product form draws its toggle chips from.
export const GET = route(async () => {
  // Shoppers get light URL-backed images (logo, payment icons); staff keep raw
  // data-URIs so the admin settings editor can round-trip them.
  const staff = await currentUser();
  const settings = getPublicSettings();
  return ok({
    settings: staff ? settings : publicizeSettings(settings),
    variantOptions: getVariantOptions(),
  });
});

const schema = z.object({
  storeName: z.string().min(1).optional(),
  currency: z.string().min(1).optional(),
  whatsappNumber: z.string().min(1).optional(),
  // Logo: a data-URI (uploaded) or "" to remove. Capped to keep the row small.
  logo: z.string().max(1_500_000).optional(),
  // Master option pools for the product form.
  sizeOptions: z.array(z.string()).optional(),
  colourOptions: z.array(z.string()).optional(),
  paymentOptions: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1).max(40),
    icon: z.string().max(1_500_000).default(""),
    enabled: z.boolean().default(true),
  })).max(12).optional(),
  // Footer social links (multiple). Each: platform key, display label, url.
  socialLinks: z.array(z.object({
    id: z.string().optional(),
    platform: z.string().optional(),
    label: z.string().max(40).optional(),
    url: z.string().max(300),
  })).max(12).optional(),
  // Marketing / SEO integrations.
  googleAnalyticsId: z.string().max(40).optional(),
  googleSiteVerification: z.string().max(200).optional(),
});

// GA4 "G-…", Universal Analytics "UA-…", or Tag Manager "GTM-…". Empty clears it.
function isValidAnalyticsId(value) {
  const v = String(value || "").trim();
  return v === "" || /^(G|UA|GTM)-[A-Z0-9-]+$/i.test(v);
}

// Admin only: update store settings + WhatsApp receiving number.
export const PUT = route(async (req) => {
  await requireAdmin();
  const b = schema.parse(await req.json());
  if (b.storeName !== undefined) setSetting("store_name", b.storeName);
  if (b.currency !== undefined) setSetting("currency", b.currency);
  if (b.logo !== undefined) setSetting("store_logo", b.logo);
  if (b.whatsappNumber !== undefined) {
    const normalized = normalizeWhatsAppNumber(b.whatsappNumber);
    if (!isValidWhatsAppNumber(normalized)) {
      return fail(400, "WhatsApp number must be 10–15 digits after normalization.");
    }
    setSetting("whatsapp_number", normalized);
  }
  if (b.sizeOptions !== undefined || b.colourOptions !== undefined) {
    setVariantOptions({ sizes: b.sizeOptions, colours: b.colourOptions });
  }
  if (b.paymentOptions !== undefined) setPaymentOptions(b.paymentOptions);
  if (b.socialLinks !== undefined) setSocialLinks(b.socialLinks);
  if (b.googleAnalyticsId !== undefined) {
    if (!isValidAnalyticsId(b.googleAnalyticsId)) {
      return fail(400, "Google Analytics ID must look like G-XXXXXXXXXX, UA-XXXXXX-X, or GTM-XXXXXX (or be empty).");
    }
    setSetting("google_analytics_id", b.googleAnalyticsId.trim());
  }
  if (b.googleSiteVerification !== undefined) {
    setSetting("google_site_verification", b.googleSiteVerification.trim());
  }
  return ok({ settings: getPublicSettings(), variantOptions: getVariantOptions() });
});
