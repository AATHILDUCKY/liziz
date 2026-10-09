"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore, formatMoney } from "@/app/context/StoreProvider";
import {
  comboKey,
  comboKeys,
  variantPricing,
  variantPricingSummary,
} from "@/lib/variants";
import KokoInstallment from "@/app/components/KokoInstallment";

export default function AddToCartPanel({ product, colour, setColour }) {
  const { addToCart, showToast, settings } = useStore();
  const router = useRouter();

  const hasSizes = product.sizes?.length > 0;
  const hasColours = product.colours?.length > 0;
  // Per-combination stock. A missing key means that combo is in stock.
  const variantStock = product.variantStock || {};
  const comboSoldOut = (s, c) => variantStock[comboKey(s, c)] === false;

  // `colour` is lifted to the parent so the gallery can react to it.
  const [size, setSize] = useState(hasSizes ? "" : "-");
  const [qty, setQty] = useState(1);
  const [error, setError] = useState("");

  const sizeChosen = hasSizes ? size && size !== "-" : true;
  const colourChosen = hasColours ? colour && colour !== "-" : true;
  const keySize = hasSizes ? size : "";
  const keyColour = hasColours ? colour : "";
  const priceSize = sizeChosen ? keySize : "";
  const priceColour = colourChosen ? keyColour : "";
  const exactSelection = sizeChosen && colourChosen;
  const hasVariantPrices = Object.keys(product.variantPrices || {}).length > 0;
  const displayProduct =
    hasVariantPrices && !exactSelection
      ? { ...product, variantPrices: {} }
      : product;
  const displayPricing = variantPricingSummary(
    displayProduct,
    priceSize,
    priceColour,
  );
  const selectedPricing = variantPricing(product, keySize, keyColour);
  const selectedPriceOverride = !!product.variantPrices?.[displayPricing.key];

  // A size/colour chip is available given the *other* axis's current choice:
  // if the counterpart is picked, check that exact combo; otherwise it's fine
  // as long as at least one combo with it is in stock.
  const sizeAvail = (s) => {
    if (!hasColours) return !comboSoldOut(s, "");
    if (colourChosen) return !comboSoldOut(s, colour);
    return product.colours.some((c) => !comboSoldOut(s, c));
  };
  const colourAvail = (c) => {
    if (!hasSizes) return !comboSoldOut("", c);
    if (sizeChosen) return !comboSoldOut(size, c);
    return product.sizes.some((s) => !comboSoldOut(s, c));
  };
  // Whole product sold out: master toggle off, or every combination sold out.
  const soldOut =
    !product.inStock ||
    comboKeys(product.sizes || [], product.colours || []).every(
      (k) => variantStock[k] === false,
    );

  // Is the current selection unavailable?
  const selectedComboOut =
    sizeChosen && colourChosen && comboSoldOut(keySize, keyColour);
  const noColourForSize =
    hasColours &&
    sizeChosen &&
    !colourChosen &&
    product.colours.every((c) => comboSoldOut(size, c));
  const noSizeForColour =
    hasSizes &&
    colourChosen &&
    !sizeChosen &&
    product.sizes.every((s) => comboSoldOut(s, colour));
  const variantSoldOut = selectedComboOut || noColourForSize || noSizeForColour;
  const outMsg = selectedComboOut
    ? `${[keySize, keyColour].filter(Boolean).join(" / ")} is out of stock.`
    : noColourForSize
      ? `Size “${size}” is sold out in every colour.`
      : noSizeForColour
        ? `Colour “${colour}” is sold out in every size.`
        : "";

  // No add/buy when the product is sold out or the chosen combo is unavailable.
  const canBuy = !soldOut && !variantSoldOut;

  function buildLine() {
    return {
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: selectedPricing.price,
      compareAtPrice: selectedPricing.compareAtPrice,
      image: product.image,
      size: size === "-" ? "" : size,
      colour: colour === "-" ? "" : colour,
      qty,
    };
  }

  function validate() {
    if (hasSizes && !sizeChosen) return "Please choose a size.";
    if (hasColours && !colourChosen) return "Please choose a colour.";
    if (variantSoldOut) return outMsg;
    return "";
  }

  function handleAdd(goCart = false) {
    const err = validate();
    if (err) return setError(err);
    setError("");
    addToCart(buildLine());
    showToast("Added to bag");
    if (goCart) router.push("/cart");
  }

  return (
    <div className="flex flex-col">
      <span className="text-xs uppercase tracking-wide text-ash">
        {product.category}
      </span>
      <h1 className="mt-1 font-display text-3xl font-normal leading-tight tracking-tight sm:text-3xl">
        {product.name}
      </h1>
      <div className="mt-3">
        <PriceBlock pricing={displayPricing} currency={settings.currency} />
        <KokoInstallment
          price={displayPricing.priceMin}
          currency={settings.currency}
          size="lg"
          className="mt-2.5"
        />
        {selectedPriceOverride ? (
          <p className="mt-2 text-xs font-medium text-ash">
            Price updated for your selection.
          </p>
        ) : hasVariantPrices ? (
          <p className="mt-2 text-xs font-medium text-ash">
            Choose options to see the exact price.
          </p>
        ) : null}
      </div>

      {soldOut ? (
        <span className="mt-3 inline-flex w-fit rounded-full bg-ink px-3 py-1 text-xs font-semibold uppercase tracking-wide text-paper">
          Sold out
        </span>
      ) : (
        <span className="mt-3 inline-flex w-fit items-center gap-1.5 text-xs font-medium text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> In stock
        </span>
      )}

      {product.description && (
        <p className="mt-5 text-sm leading-relaxed text-ash">
          {product.description}
        </p>
      )}

      {/* Sizes */}
      {product.sizes?.length > 0 && (
        <div className="mt-6">
          <p className="label">Size</p>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((s) => {
              const avail = sizeAvail(s);
              return (
                <button
                  key={s}
                  aria-pressed={size === s}
                  onClick={() => {
                    setSize(s);
                    setError("");
                  }}
                  disabled={soldOut}
                  aria-disabled={!avail}
                  title={avail ? s : `${s} — out of stock`}
                  className={`chip min-w-[46px] justify-center ${
                    !avail
                      ? "border-line text-ash line-through decoration-2 opacity-60"
                      : size === s
                        ? "border-ink bg-ink text-paper"
                        : "border-line hover:border-ink"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Colours — chip tags (same style as Size). The photo-box swatches under
          the gallery share this component's `colour` state, so both stay in sync. */}
      {product.colours?.length > 0 && (
        <div className="mt-5">
          <p className="label">Colour</p>
          <div className="flex flex-wrap gap-2">
            {product.colours.map((c) => {
              const avail = colourAvail(c);
              return (
                <button
                  key={c}
                  aria-pressed={colour === c}
                  onClick={() => {
                    setColour(c);
                    setError("");
                  }}
                  disabled={soldOut}
                  aria-disabled={!avail}
                  title={avail ? c : `${c} — out of stock`}
                  className={`chip ${
                    !avail
                      ? "border-line text-ash line-through decoration-2 opacity-60"
                      : colour === c
                        ? "border-ink bg-ink text-paper"
                        : "border-line hover:border-ink"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Live out-of-stock notice for the chosen variant */}
      {!soldOut && outMsg && (
        <p className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-600">
          {outMsg}
        </p>
      )}

      {/* Quantity */}
      {canBuy && (
        <div className="mt-5">
          <p className="label">Quantity</p>
          <div className="inline-flex items-center rounded-full border border-line">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="min-h-11 min-w-11 px-4 py-2 text-lg"
              aria-label="Decrease"
            >
              −
            </button>
            <span className="w-10 text-center text-sm font-medium">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="min-h-11 min-w-11 px-4 py-2 text-lg"
              aria-label="Increase"
            >
              +
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <PaymentBadges options={settings.paymentOptions} />

      {/* Actions — sticky on mobile for easy reach */}
      <div className="sticky bottom-20 z-30 mt-7 flex gap-3 sm:static sm:bottom-auto">
        <button
          onClick={() => handleAdd(false)}
          disabled={!canBuy}
          className="flex-1 rounded-full border border-ink bg-ink px-6 py-3 text-sm font-medium text-paper transition-all duration-200 hover:bg-ink/90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
        >
          {soldOut
            ? "Sold out"
            : variantSoldOut
              ? "Out of stock"
              : "Add to bag"}
        </button>
        <button
          onClick={() => handleAdd(true)}
          disabled={!canBuy}
          className="btn-primary flex-1"
        >
          Buy now
        </button>
      </div>
    </div>
  );
}

function PriceBlock({ pricing, currency }) {
  return (
    <div>
      {pricing.hasDiscount && (
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-600">
          Limited offer
        </p>
      )}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {pricing.hasDiscount && (
          <p className="text-lg font-medium text-ash line-through decoration-2">
            {formatPriceRange(
              pricing.compareAtMin,
              pricing.compareAtMax,
              currency,
            )}
          </p>
        )}
        <p className="text-3xl font-bold leading-none text-ink">
          {formatPriceRange(pricing.priceMin, pricing.priceMax, currency)}
        </p>
        {pricing.hasDiscount && (
          <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-red-600">
            Save {pricing.discountPercent}%
          </span>
        )}
      </div>
    </div>
  );
}

function formatPriceRange(min, max, currency) {
  if (!max || min === max) return formatMoney(min, currency);
  return `${formatMoney(min, currency)} - ${formatMoney(max, currency)}`;
}

function PaymentBadges({ options = [] }) {
  const enabled = (options || []).filter((option) => option.enabled !== false);
  if (!enabled.length) return null;

  return (
    <div
      className="mt-6 flex flex-wrap items-center gap-2"
      aria-label="Available payment options"
    >
      {enabled.map((option) => (
        <span
          key={option.id || option.name}
          title={option.name}
          className="inline-flex h-10 min-w-16 items-center justify-center rounded-lg border border-line bg-white px-3 shadow-sm"
        >
          {option.icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={option.icon}
              alt={option.name}
              className="max-h-6 max-w-20 object-contain"
            />
          ) : (
            <span className="text-xs font-black tracking-wide text-ink">
              {option.name}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
