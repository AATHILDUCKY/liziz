import { z } from "zod";
import { route, ok, fail } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { deleteCategoryTag, setCategoryImage } from "@/lib/models";

export const runtime = "nodejs";

async function getRouteId(params) {
  const resolved = await params;
  return resolved?.id;
}

const schema = z.object({ image: z.string().max(1_500_000).default("") });

// Admin only: set a category's landing-page image (URL or uploaded data-URI).
export const PUT = route(async (req, { params }) => {
  await requireAdmin();
  const { image } = schema.parse(await req.json());
  const category = setCategoryImage(await getRouteId(params), image);
  if (!category) return fail(404, "Category not found.");
  return ok({ category });
});

// Admin only: remove a category tag. (Existing products keep their category value.)
export const DELETE = route(async (_req, { params }) => {
  await requireAdmin();
  const removed = deleteCategoryTag(await getRouteId(params));
  if (!removed) return fail(404, "Category not found.");
  return ok();
});
