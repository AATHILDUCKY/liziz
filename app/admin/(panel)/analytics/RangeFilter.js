"use client";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";

// Segmented time-range control. Updates ?range= in the URL, which re-renders the
// server component with data for the selected window — no client-side data
// fetching or charting library, so it stays lightweight.
const RANGES = [
  { key: "24h", label: "24 hours", short: "24h" },
  { key: "7d", label: "7 days", short: "7d" },
  { key: "30d", label: "30 days", short: "30d" },
  { key: "12mo", label: "12 months", short: "12mo" },
];

export default function RangeFilter({ value }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, setPending] = useState(null);
  const active = RANGES.some((r) => r.key === value) ? value : "7d";

  function select(key) {
    if (key === active) return;
    setPending(key);
    router.push(`${pathname}?range=${key}`, { scroll: false });
  }

  return (
    <div className="inline-flex flex-none rounded-full border border-line bg-white p-1" role="group" aria-label="Time range">
      {RANGES.map((r) => {
        const on = r.key === active;
        const loading = pending === r.key && !on;
        return (
          <button
            key={r.key}
            type="button"
            onClick={() => select(r.key)}
            aria-pressed={on}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              on ? "bg-ink text-paper shadow-sm" : "text-ash hover:text-ink"
            } ${loading ? "opacity-60" : ""}`}
          >
            <span className="sm:hidden">{r.short}</span>
            <span className="hidden sm:inline">{r.label}</span>
          </button>
        );
      })}
    </div>
  );
}
