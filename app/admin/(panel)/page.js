import { currentUser } from "@/lib/auth";
import {
  productStats,
  getPublicSettings,
  getLeadAnalytics,
  bestSellers,
  recentLeads,
} from "@/lib/models";
import ProductManager from "./ProductManager";

export const dynamic = "force-dynamic";

function money(n, cur) {
  return `${cur} ${Math.round(Number(n) || 0).toLocaleString()}`;
}

function timeAgo(ts) {
  const then = new Date((ts || "").replace(" ", "T") + "Z").getTime();
  if (!then) return "";
  const s = Math.max(1, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function DashboardPage() {
  const user = await currentUser();
  const ps = productStats(); // counts only — never reads image blobs
  const settings = getPublicSettings();
  const cur = settings.currency || "Rs.";
  const waSet = /^\d{10,15}$/.test(settings.whatsappNumber || "");

  const a = getLeadAnalytics();
  const top = bestSellers({ limit: 5 });
  const recent = recentLeads(6);
  const maxUnits = top.reduce((m, t) => Math.max(m, t.units), 0) || 1;

  const stats = [
    { label: "Total products", value: ps.total },
    { label: "In stock", value: ps.inStock, accent: "text-emerald-600" },
    { label: "Sold out", value: ps.outStock, accent: "text-red-500" },
    { label: "Featured", value: ps.featured },
  ];

  const leadStats = [
    { label: "WhatsApp leads", value: a.totalLeads, sub: `${a.leadsToday} today` },
    { label: "Leads (7 days)", value: a.leads7d, sub: money(a.revenue7d, cur) },
    { label: "Intended revenue", value: money(a.intendedRevenue, cur), sub: `${a.unitsSold} units` },
    { label: "Avg. order value", value: money(a.avgOrderValue, cur), sub: "per lead" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Welcome back, {user.name || user.username}</h1>
        <p className="mt-1 text-sm text-ash">Here’s your store at a glance.</p>
      </div>

      {!waSet && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <span>⚠️</span>
          <div>
            <p className="font-medium">WhatsApp number not configured.</p>
            <p className="text-amber-700">
              Orders can’t be received until you set the store WhatsApp number in{" "}
              <a href="/admin/settings" className="underline">Settings</a>.
            </p>
          </div>
        </div>
      )}

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-ash">{s.label}</p>
            <p className={`mt-1 text-3xl font-bold ${s.accent || ""}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Leads & sales analytics ── */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">WhatsApp leads</h2>
        <a href="/admin/analytics" className="text-xs font-medium text-ink underline underline-offset-4 hover:text-ash">View full analytics →</a>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {leadStats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-ash">{s.label}</p>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
            <p className="mt-0.5 text-[11px] text-ash">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="mb-8 grid gap-3 lg:grid-cols-2">
        {/* Best sellers */}
        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Best sellers</h3>
            <span className="text-[11px] text-ash">by units ordered</span>
          </div>
          {top.length === 0 ? (
            <p className="py-6 text-center text-sm text-ash">No orders yet — best sellers appear once customers check out.</p>
          ) : (
            <ol className="space-y-3">
              {top.map((t, i) => (
                <li key={(t.productId ?? t.name) + i} className="flex items-center gap-3">
                  <span className="w-5 text-sm font-bold text-ash">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{t.name}</p>
                      <p className="whitespace-nowrap text-sm font-semibold">{t.units} <span className="text-xs font-normal text-ash">units</span></p>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-smoke">
                      <div className="h-full rounded-full bg-ink" style={{ width: `${(t.units / maxUnits) * 100}%` }} />
                    </div>
                    <p className="mt-0.5 text-[11px] text-ash">{money(t.revenue, cur)} · {t.orders} order{t.orders !== 1 ? "s" : ""}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Recent leads */}
        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Recent leads</h3>
            <span className="text-[11px] text-ash">latest checkouts</span>
          </div>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-ash">No leads yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{l.customerName || "Customer"}</p>
                    <p className="text-[11px] text-ash">{l.customerPhone || "—"} · {l.itemCount} item{l.itemCount !== 1 ? "s" : ""} · {timeAgo(l.createdAt)}</p>
                  </div>
                  <span className="whitespace-nowrap text-sm font-semibold">{money(l.total, cur)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Inventory ── */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Inventory</h2>
        <span className="text-xs text-ash">Tap the toggle to mark items in stock / sold out</span>
      </div>
      <ProductManager />
    </div>
  );
}
