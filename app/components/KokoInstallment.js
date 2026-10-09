// "Pay in 3" installment hint shown under a product price, e.g.
//   3 × Rs. 4,996.67 with [koko]
// Koko (koko.lk) splits a purchase into 3 equal payments, so we divide the
// price by three. Rendered in the store's monochrome theme.

const KOKO_SPLITS = 3;

// Installments rarely divide evenly, so always show 2 decimals.
function formatInstallment(amount, currency = "Rs.") {
  const n = Number(amount || 0);
  return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Small monochrome "koko" badge (theme-matched: ink pill, paper text).
export function KokoBadge({ className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-md bg-ink px-1.5 py-[3px] font-sans text-[10px] font-black lowercase leading-none tracking-[-0.03em] text-paper ${className}`}
      aria-label="Koko"
    >
      koko
    </span>
  );
}

export default function KokoInstallment({ price, currency = "Rs.", size = "sm", className = "" }) {
  const per = Number(price) / KOKO_SPLITS;
  if (!Number.isFinite(per) || per <= 0) return null;

  const textSize = size === "lg" ? "text-sm" : "text-[11px]";

  return (
    <p className={`flex flex-wrap items-center gap-x-1.5 gap-y-1 ${textSize} text-ash ${className}`}>
      <span>
        {KOKO_SPLITS} <span className="text-ash">&times;</span>{" "}
        <span className="font-semibold text-ink">{formatInstallment(per, currency)}</span>
      </span>
      <span>with</span>
      <KokoBadge />
    </p>
  );
}
