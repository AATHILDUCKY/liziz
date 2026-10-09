import { z } from "zod";
import { route, ok, fail } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { listCategoryTags, addCategoryTag } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: the master category list (used by the product form + shop filter).
export const GET = route(async () => {
  return ok({ categories: listCategoryTags() });
});

const schema = z.object({
  name: z.string().trim().min(1, "Category name is required.").max(40, "Category name is too long."),
});

// Admin only: add a category tag.
export const POST = route(async (req) => {
  await requireAdmin();
  const { name } = schema.parse(await req.json());
  try {
    const category = addCategoryTag(name);
    return ok({ category });
  } catch (e) {
    if (e?.code === "SQLITE_CONSTRAINT_UNIQUE") return fail(409, "That category already exists.");
    throw e;
  }
});
