"use client";
import dynamic from "next/dynamic";

// Leaflet touches `window` at import time, so load the map only in the browser.
// (ssr:false is permitted here because this wrapper is itself a client component.)
const Inner = dynamic(() => import("./BranchMapInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[360px] w-full items-center justify-center border border-ink bg-smoke sm:h-[460px]">
      <span className="font-mono text-xs uppercase tracking-[0.2em] text-ash">Loading map…</span>
    </div>
  ),
});

export default function BranchMap({ locations = [] }) {
  return <Inner locations={locations} />;
}
