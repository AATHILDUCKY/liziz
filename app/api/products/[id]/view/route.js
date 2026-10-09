import { route, ok } from "@/lib/api";
import { recordProductView } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getRouteId(params) {
  const resolved = await params;
  return resolved?.id;
}

// Public: record one product view. Fired by the product page in the browser
// (not during server render) so prefetches and bots don't inflate the count.
// Always returns ok so a failed beacon never surfaces an error to the shopper.
export const POST = route(async (_req, { params }) => {
  recordProductView(await getRouteId(params));
  return ok();
});
