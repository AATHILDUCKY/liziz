// Streams images stored as base64 data-URIs in SQLite as real, cacheable
// binary. Referenced by the publicize* helpers on public pages so base64 never
// ships in HTML/JSON. The ?v= query changes when the image changes, so each
// URL is safe to cache `immutable` forever.
//
//   /api/img/product/:id?i=<index>   product gallery image
//   /api/img/setting/:key            a settings value (logo, hero, value art…)
//   /api/img/category/:id            a managed category tile image
//   /api/img/payment/:id             a payment-option icon
import { getProductImage, getSetting, getPaymentOptions, listCategoryTags } from "@/lib/models";
import { dataUriResponse } from "@/lib/img";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  const { path = [] } = await params;
  const [kind, key] = path;
  const url = new URL(req.url);

  let src = "";
  if (kind === "product") {
    const i = Math.max(0, parseInt(url.searchParams.get("i") || "0", 10) || 0);
    src = getProductImage(key, i);
  } else if (kind === "setting") {
    src = getSetting(key, "");
  } else if (kind === "category") {
    const c = listCategoryTags().find((row) => String(row.id) === String(key));
    src = c?.image || "";
  } else if (kind === "payment") {
    const o = getPaymentOptions().find((opt) => opt.id === key);
    src = o?.icon || "";
  }

  return dataUriResponse(src, url);
}
