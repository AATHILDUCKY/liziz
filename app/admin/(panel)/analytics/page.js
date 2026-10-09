import {
  getLeadAnalytics,
  bestSellers,
  salesByCategory,
  productStats,
  getPublicSettings,
  ACTIVITY_RANGES,
  resolveRange,
  rangeSince,
  activitySeries,
  getTotalViews,
  topViewedProducts,
} from "@/lib/models";
import RangeFilter from "./RangeFilter";

export const dynamic = "force-dynamic";

const INK = "#0a0a0a";
const LINE = "#e4e4e7";
const TRACK = "#f4f4f5";
const ASH = "#a1a1aa";

function money(n, cur) {
  return `${cur} ${Math.round(Number(n) || 0).toLocaleString()}`;
}

// Map the selected range to a lookback in whole days for the lead-based rankings
// (best sellers), which filter on a "-N days" window.
const RANGE_DAYS = { "24h": 1, "7d": 7, "30d": 30, "12mo": 365 };

export default async function AnalyticsPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const range = resolveRange(sp.range);
  const meta = ACTIVITY_RANGES[range];

  const cur = getPublicSettings().currency || "Rs.";
  const a = getLeadAnalytics();
  const series = activitySeries(range);
  const totalViews = getTotalViews();
  const mostViewed = topViewedProducts({ since: rangeSince(range), limit: 6 });
  const top = bestSellers({ limit: 6, days: RANGE_DAYS[range] });
  const cats = salesByCategory();
  const { inStock, outStock } = productStats();

  // Everything above the fold reflects the selected range, summed from the one
  // activity series so the KPIs and the graph can never disagree.
  const rangeViews = series.reduce((n, d) => n + d.views, 0);
  const rangeLeads = series.reduce((n, d) => n + d.leads, 0);
  const rangeRevenue = series.reduce((n, d) => n + d.revenue, 0);
  const rangeUnit = meta.label.replace(/^Last\s+/i, "");

  const kpis = [
    { label: `Views · ${rangeUnit}`, value: rangeViews.toLocaleString(), sub: `${totalViews.toLocaleString()} all-time` },
    { label: `Leads · ${rangeUnit}`, value: rangeLeads.toLocaleString(), sub: `${a.totalLeads.toLocaleString()} all-time` },
    { label: `Revenue · ${rangeUnit}`, value: money(rangeRevenue, cur), sub: money(a.avgOrderValue, cur) + " avg order" },
    { label: "Total product views", value: totalViews.toLocaleString(), sub: `${a.unitsSold.toLocaleString()} units sold` },
  ];

  const noViews = totalViews === 0;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Analytics</h1>
          <p className="mt-1 text-sm text-ash">Website activity, product views, WhatsApp leads and revenue intent.</p>
        </div>
        <RangeFilter value={range} />
      </div>

      {/* KPI tiles — all reflect the selected range */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-line bg-white p-4">
            <p className="truncate text-xs uppercase tracking-wide text-ash">{k.label}</p>
            <p className="mt-1 text-2xl font-bold">{k.value}</p>
            <p className="mt-0.5 truncate text-[11px] text-ash">{k.sub}</p>
          </div>
        ))}
      </div>

      {noViews && (
        <div className="mb-6 rounded-2xl border border-line bg-smoke px-4 py-3 text-sm text-ash">
          No product views recorded yet — this fills in automatically as customers browse your storefront.
        </div>
      )}

      {/* Website activity — views (bars) + leads (line) over the range */}
      <div className="mb-4">
        <Card title="Website activity" note={`${meta.label} · views and leads per ${meta.unit}`}>
          <ActivityChart data={series} />
        </Card>
      </div>

      {/* Views ranking + revenue */}
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card title="Most viewed" note={`Top products · ${rangeUnit}`} className="lg:col-span-1">
          <HBars rows={mostViewed.map((m) => ({ label: m.name, value: m.views }))} unit="views" />
        </Card>
        <Card title="Revenue intent" note={`Order value per ${meta.unit} (${cur})`} className="lg:col-span-2">
          <AreaChart data={series} valueKey="revenue" cur={cur} />
        </Card>
      </div>

      {/* Rankings + donut */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Best sellers" note={`By units · ${rangeUnit}`} className="lg:col-span-1">
          <HBars rows={top.map((t) => ({ label: t.name, value: t.units, meta: money(t.revenue, cur) }))} unit="units" />
        </Card>
        <Card title="Sales by category" note="Units per category · all-time" className="lg:col-span-1">
          <HBars rows={cats.map((c) => ({ label: c.category, value: c.units, meta: money(c.revenue, cur) }))} unit="units" />
        </Card>
        <Card title="Stock status" note="Live inventory" className="lg:col-span-1">
          <Donut inStock={inStock} outStock={outStock} />
        </Card>
      </div>
    </div>
  );
}

/* ── Website activity: view bars + a leads line, each on its own scale ── */
function ActivityChart({ data }) {
  const W = 760, H = 240, pad = { l: 34, r: 34, t: 20, b: 28 };
  const n = data.length;
  const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b;
  const vMax = Math.max(1, ...data.map((d) => d.views));
  const lMax = Math.max(1, ...data.map((d) => d.leads));
  const slot = cw / n;
  const barW = Math.max(3, Math.min(26, slot - 6));
  const vY = (v) => pad.t + ch * (1 - v / vMax);
  const lY = (v) => pad.t + ch * (1 - v / lMax);
  const xMid = (i) => pad.l + i * slot + slot / 2;
  const ticks = niceTicks(vMax, 3);
  const hasLeads = data.some((d) => d.leads > 0);
  const linePts = data.map((d, i) => [xMid(i), lY(d.leads)]);
  const line = linePts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const labelEvery = Math.ceil(n / 8);

  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-[11px] text-ash">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: INK }} /> Product views</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-0.5 w-4 rounded-full" style={{ background: "#e11d48" }} /> Leads</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Website activity: product views and leads over time" className="overflow-visible">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={vY(t)} y2={vY(t)} stroke={LINE} strokeWidth="1" />
            <text x={pad.l - 6} y={vY(t) + 3} textAnchor="end" fontSize="10" fill={ASH} fontFamily="var(--font-mono)">{shortNum(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const bh = ch * (d.views / vMax);
          const x = pad.l + i * slot + (slot - barW) / 2;
          return d.views > 0 ? (
            <rect key={i} x={x} y={pad.t + ch - bh} width={barW} height={bh} rx="2.5" fill={INK}>
              <title>{`${d.label}: ${d.views} views, ${d.leads} leads`}</title>
            </rect>
          ) : null;
        })}
        {hasLeads && <path d={line} fill="none" stroke="#e11d48" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
        {hasLeads && data.map((d, i) => (d.leads > 0 ? <circle key={i} cx={linePts[i][0]} cy={linePts[i][1]} r="2.5" fill="#e11d48" /> : null))}
        {hasLeads && ticks.map((t) => {
          const lv = Math.round((t / vMax) * lMax);
          return <text key={`r${t}`} x={W - pad.r + 6} y={vY(t) + 3} textAnchor="start" fontSize="10" fill="#e11d48" fontFamily="var(--font-mono)">{shortNum(lv)}</text>;
        })}
        {data.map((d, i) => (i % labelEvery === 0 ? (
          <text key={`x${i}`} x={xMid(i)} y={H - 8} textAnchor="middle" fontSize="9" fill={ASH} fontFamily="var(--font-mono)">{d.label}</text>
        ) : null))}
      </svg>
    </div>
  );
}

function Card({ title, note, children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-line bg-white p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-[11px] text-ash">{note}</span>
      </div>
      {children}
    </div>
  );
}

/* ── Area + line chart (revenue) ── */
function AreaChart({ data, valueKey, cur }) {
  const W = 700, H = 220, pad = { l: 46, r: 10, t: 18, b: 26 };
  const n = data.length;
  const max = Math.max(1, ...data.map((d) => d[valueKey]));
  const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b;
  const xOf = (i) => pad.l + (n === 1 ? cw / 2 : (cw * i) / (n - 1));
  const yOf = (v) => pad.t + ch * (1 - v / max);
  const pts = data.map((d, i) => [xOf(i), yOf(d[valueKey])]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pad.l + cw} ${pad.t + ch} L${pad.l} ${pad.t + ch} Z`;
  const ticks = niceTicks(max, 3);
  const labelEvery = Math.ceil(n / 8);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Revenue intent over the selected range" className="overflow-visible">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={yOf(t)} y2={yOf(t)} stroke={LINE} strokeWidth="1" />
          <text x={pad.l - 6} y={yOf(t) + 3} textAnchor="end" fontSize="10" fill={ASH} fontFamily="var(--font-mono)">{shortNum(t)}</text>
        </g>
      ))}
      <path d={area} fill={INK} fillOpacity="0.07" />
      <path d={line} fill="none" stroke={INK} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={pts[i][0]} cy={pts[i][1]} r="2.5" fill={INK} />
          <rect
            x={xOf(i) - (cw / n) / 2}
            y={pad.t}
            width={cw / n}
            height={ch}
            fill="transparent"
            aria-label={`${d.label}: ${money(d[valueKey], cur)}`}
          />
          {i % labelEvery === 0 && <text x={pts[i][0]} y={H - 8} textAnchor="middle" fontSize="9" fill={ASH} fontFamily="var(--font-mono)">{d.label}</text>}
        </g>
      ))}
    </svg>
  );
}

/* ── Horizontal bars (rankings) ── */
function HBars({ rows, unit }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-ash">No data yet.</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.label + i}>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-medium">{r.label}</span>
            <span className="whitespace-nowrap text-sm font-semibold">{r.value} <span className="text-xs font-normal text-ash">{unit}</span></span>
          </div>
          <div className="h-2 overflow-hidden rounded-full" style={{ background: TRACK }} title={`${r.label}: ${r.value} ${unit}`}>
            <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: INK }} />
          </div>
          {r.meta && <p className="mt-1 text-[11px] text-ash">{r.meta}</p>}
        </li>
      ))}
    </ul>
  );
}

/* ── Donut (stock status, 2 states) ── */
function Donut({ inStock, outStock }) {
  const total = inStock + outStock;
  const r = 52, sw = 20, C = 2 * Math.PI * r;
  const frac = total ? inStock / total : 0;
  const items = [
    { label: "In stock", value: inStock, color: INK },
    { label: "Sold out", value: outStock, color: "#d4d4d8" },
  ];
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 140 140" width="128" height="128" role="img" aria-label={`In stock ${inStock}, sold out ${outStock}`}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="#d4d4d8" strokeWidth={sw} />
        {total > 0 && (
          <circle
            cx="70" cy="70" r={r} fill="none" stroke={INK} strokeWidth={sw}
            strokeDasharray={`${(C * frac).toFixed(2)} ${C.toFixed(2)}`}
            strokeDashoffset={C / 4} transform="rotate(-90 70 70)" strokeLinecap="butt"
            aria-label={`In stock: ${inStock} of ${total}`}
          />
        )}
        <text x="70" y="66" textAnchor="middle" fontSize="26" fontWeight="700" fill={INK}>{total}</text>
        <text x="70" y="84" textAnchor="middle" fontSize="9" fill={ASH} fontFamily="var(--font-mono)" letterSpacing="1">PRODUCTS</text>
      </svg>
      <ul className="space-y-2 text-sm">
        {items.map((it) => (
          <li key={it.label} className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: it.color, outline: `1px solid ${LINE}` }} />
            <span className="text-ash">{it.label}</span>
            <span className="font-semibold">{it.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── helpers ── */
function niceTicks(max, count) {
  const step = Math.max(1, Math.ceil(max / count));
  const ticks = [];
  for (let v = 0; v <= max; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] !== max) ticks.push(max);
  return ticks;
}

function shortNum(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}
