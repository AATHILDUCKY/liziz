import { z } from "zod";
import { route, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { getHomeContent, setHomeContent, HOME_CONTENT_DEFAULTS } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin only: read current home-page content.
export const GET = route(async () => {
  await requireAdmin();
  return ok({ content: getHomeContent(), defaults: HOME_CONTENT_DEFAULTS });
});

// Every field is an optional string. Images may be a /path or an uploaded data-URI.
const schema = z.object(
  Object.fromEntries(
    Object.keys(HOME_CONTENT_DEFAULTS).map((k) => [k, z.string().max(1_500_000).optional()])
  )
);

// Admin only: update home-page content.
export const PUT = route(async (req) => {
  await requireAdmin();
  const patch = schema.parse(await req.json());
  const content = setHomeContent(patch);
  return ok({ content });
});
