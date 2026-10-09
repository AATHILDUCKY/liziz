"use client";
import { useEffect, useState } from "react";

// Rough colour-name → CSS mapping so swatches show a real dot. Falls back to a
// neutral chip (name only) for anything we don't recognise.
const COLOUR_CSS = {
  black: "#111111", white: "#ffffff", ivory: "#f8f4ea", cream: "#f3ead6",
  grey: "#8a8a8a", gray: "#8a8a8a", charcoal: "#36393d", ash: "#b8bcc0",
  navy: "#1f2a44", blue: "#2f5bd0", indigo: "#33406b", denim: "#3b5a7a",
  green: "#3f7d54", olive: "#6b6b3a", beige: "#d9c8a9", stone: "#cabfa8",
  brown: "#6b4a30", tan: "#b98d5f", red: "#c23b3b", pink: "#e0a0b4",
  yellow: "#e6c34a", orange: "#d98032", purple: "#6d4a8c",
};

function colourCss(name) {
  const n = String(name || "").toLowerCase();
  for (const key of Object.keys(COLOUR_CSS)) {
    if (n.includes(key)) return COLOUR_CSS[key];
  }
  return null;
}

// Main image + thumbnail strip + colour swatches. Colour selection is two-way:
// picking a colour jumps to its photo, and clicking a tagged photo selects its
// colour. Falls back gracefully when a product has no gallery or no colours.
export default function ProductGallery({
  images = [],
  imageColours = [],
  name,
  inStock = true,
  colours = [],
  soldOutColours = [],
  activeColour = "",
  onColour,
}) {
  const gallery = images.length ? images : [""];
  const [active, setActive] = useState(0);
  const dim = inStock ? "" : "opacity-70 grayscale";
  const hasColours = colours.length > 0;

  // When the shopper picks a colour, jump to the first photo tagged with it.
  useEffect(() => {
    if (!activeColour || activeColour === "-") return;
    const idx = imageColours.findIndex((c) => c === activeColour);
    if (idx >= 0) setActive(idx);
  }, [activeColour, imageColours]);

  // Click a photo → show it, and if it's tagged with a colour, select that colour.
  function pickImage(i) {
    setActive(i);
    const tag = imageColours[i];
    if (tag && onColour && colours.includes(tag)) onColour(tag);
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-3xl border border-line bg-smoke">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={gallery[active]}
          alt={`${name}${gallery.length > 1 ? ` — view ${active + 1}` : ""}`}
          className={`aspect-[4/5] w-full object-cover ${dim}`}
          loading="eager"
          fetchPriority="high"
        />
        {hasColours && activeColour && activeColour !== "-" && (
          <span className="absolute left-3 top-3 rounded-full bg-ink/85 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-paper backdrop-blur-sm">
            {activeColour}
          </span>
        )}
      </div>

      {/* Thumbnail strip — only when there are no colours to pick from, so the
          gallery isn't shown twice (the COLOUR swatches double as navigation). */}
      {gallery.length > 1 && !hasColours && (
        <div className="mt-3 grid grid-cols-5 gap-2 sm:gap-3">
          {gallery.map((src, i) => {
            const tagged = imageColours[i] && imageColours[i] === activeColour;
            return (
              <button
                key={i}
                type="button"
                onClick={() => pickImage(i)}
                aria-label={imageColours[i] ? `View ${imageColours[i]} — image ${i + 1}` : `View image ${i + 1}`}
                aria-current={i === active}
                className={`overflow-hidden rounded-xl border transition ${
                  i === active
                    ? "border-ink ring-2 ring-ink"
                    : tagged
                    ? "border-ash"
                    : "border-line hover:border-ash"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className={`aspect-square w-full object-cover ${dim}`} loading="lazy" />
              </button>
            );
          })}
        </div>
      )}

      {/* Colour swatches — names + dots, synced with the purchase panel. */}
      {hasColours && (
        <div className="mt-5">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="label mb-0">Colour</p>
            {activeColour && activeColour !== "-" && (
              <span className="text-xs font-medium text-ink">{activeColour}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2.5 sm:gap-3">
            {colours.map((c) => {
              const selected = c === activeColour;
              const soldOut = soldOutColours.includes(c);
              const css = colourCss(c);
              // Show the actual photo tagged with this colour, so patterns and
              // shades are clearly viewable — fall back to a colour dot.
              const imgIdx = imageColours.findIndex((tag) => tag === c);
              const swatchImg = imgIdx >= 0 ? gallery[imgIdx] : null;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => onColour && onColour(c)}
                  aria-pressed={selected}
                  title={soldOut ? `${c} — sold out` : c}
                  className="group flex w-[72px] flex-col items-center gap-1.5 sm:w-20"
                >
                  <span
                    className={`relative block aspect-square w-full overflow-hidden rounded-xl border transition ${
                      selected
                        ? "border-ink ring-2 ring-ink"
                        : "border-line group-hover:border-ash"
                    } ${soldOut ? "opacity-60" : ""}`}
                  >
                    {swatchImg ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={swatchImg}
                        alt={c}
                        className={`h-full w-full object-cover ${soldOut ? "grayscale" : ""}`}
                        loading="lazy"
                      />
                    ) : (
                      <span
                        className="block h-full w-full"
                        style={
                          css
                            ? { backgroundColor: css }
                            : { backgroundImage: "linear-gradient(135deg,#e5e5e5,#a3a3a3)" }
                        }
                      />
                    )}
                    {soldOut && (
                      <span className="absolute inset-x-0 bottom-0 bg-ink/80 py-0.5 text-center text-[8px] font-semibold uppercase tracking-wide text-paper">
                        Sold
                      </span>
                    )}
                  </span>
                  <span
                    className={`w-full truncate text-center text-[11px] font-medium leading-tight ${
                      selected ? "text-ink" : "text-ash"
                    } ${soldOut ? "line-through" : ""}`}
                  >
                    {c}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
