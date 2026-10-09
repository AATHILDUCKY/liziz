import { route, ok } from "@/lib/api";
import { requireStockAccess } from "@/lib/auth";
import { getLeadAnalytics, bestSellers, recentLeads } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Staff only: aggregated lead analytics + best sellers.
export const GET = route(async (req) => {
  await requireStockAccess();
  const url = new URL(req.url);
  const days = url.searchParams.get("days");
  const window = days ? Number(days) : null;
  return ok({
    analytics: getLeadAnalytics(),
    bestSellers: bestSellers({ limit: 5, days: window }),
    recentLeads: recentLeads(8),
  });
});
