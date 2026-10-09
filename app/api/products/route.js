import { z } from "zod";
import db from "@/lib/db";
import { route, ok } from "@/lib/api";
import { currentUser, requireStockAccess } from "@/lib/auth";
import { listProductCards, getProduct, slugify } from "@/lib/models";
import { pruneVariantStock, normalizeVariantPrices, normalizeGallery } from "@/lib/variants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1, "Name is required."),
  description: z.string().default(""),
  category: z.string().min(1).default("All"),
  price: z.coerce.number().min(0, "Price must be 0 or more."),
  compareAtPrice: z.coerce.number().min(0).default(0),
  image: z.string().default(""),
  images: z.array(z.string()).max(20, "Up to 20 images per product.").default([]),
  imageColours: z.array(z.string()).default([]),
  sizes: z.array(z.string()).default([]),
  colours: z.array(z.string()).default([]),
  // Per-combination stock: { "S::Black": false, ... }  (missing = in stock).
  variantStock: z.record(z.boolean()).default({}),
  variantPrices: z.record(z.object({
    price: z.coerce.number().min(0).default(0),
    compareAtPrice: z.coerce.number().min(0).default(0),
  })).default({}),
  inStock: z.boolean().default(true),
  featured: z.boolean().default(false),
  newDrop: z.boolean().default(false),
});

// Public list (in-stock only) unless a staff member is logged in (then all).
// Always returns lightweight cards: only the columns a list/grid renders, with
// image blobs served as cacheable /api/img URLs instead of shipped as base64.
// The admin editor fetches the full product (with raw data-URIs) on demand via
// GET /api/products/:id, so a whole-catalogue load stays tiny.
export const GET = route(async (req) => {
  const url = new URL(req.url);
  const staff = await currentUser();
  const products = listProductCards({
    publicOnly: !staff,
    category: url.searchParams.get("category") || undefined,
    search: url.searchParams.get("q") || undefined,
    withViews: !!staff, // per-product view counts are admin-only
  });
  return ok({ products });
});

// Create a product (admin or stock_updater).
export const POST = route(async (req) => {
  await requireStockAccess();
  const b = createSchema.parse(await req.json());
  // Normalise the gallery (use `images`, else the single `image`), keeping each
  // image's colour tag aligned as we drop any empty entries.
  const { gallery, galleryColours } = normalizeGallery(b.images.length ? b.images : b.image ? [b.image] : [], b.imageColours);
  const primary = gallery[0] || b.image || "";
  const info = db
    .prepare(
      `INSERT INTO products (name, slug, description, category, price, compare_at_price, image, images, image_colours, sizes, colours, variant_stock, variant_prices, in_stock, featured, new_drop)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      b.name,
      slugify(b.name),
      b.description,
      b.category,
      b.price,
      b.compareAtPrice,
      primary,
      JSON.stringify(gallery),
      JSON.stringify(galleryColours),
      JSON.stringify(b.sizes),
      JSON.stringify(b.colours),
      JSON.stringify(pruneVariantStock(b.variantStock, b.sizes, b.colours)),
      JSON.stringify(normalizeVariantPrices(b.variantPrices, b.sizes, b.colours)),
      b.inStock ? 1 : 0,
      b.featured ? 1 : 0,
      b.newDrop ? 1 : 0
    );
  return ok({ product: getProduct(info.lastInsertRowid) });
});
