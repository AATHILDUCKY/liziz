"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useStore, formatMoney } from "@/app/context/StoreProvider";
import {
  comboKey,
  comboKeys,
  variantPricing,
  variantPricingSummary,
} from "@/lib/variants";
import KokoInstallment from "@/app/components/KokoInstallment";

export default function AddToCartPanel({
  product,
  colour,
  setColour,
}) {
  const { addToCart, showToast, settings } = useStore();
  const router = useRouter();

  const hasSizes = product.sizes?.length > 0;
  const hasColours = product.colours?.length > 0;
  const variantStock = product.variantStock || {};
  const comboSoldOut = (s, c) => variantStock[comboKey(s, c)] === false;
  const [size, setSize] = useState(hasSizes ? "" : "-");
  const [qty, setQty] = useState(1);
  const [error, setError] = useState("");
  const sizeGroup = useRef(null);
  const colourGroup = useRef(null);
  useEffect(() => setError(""), [size, colour]);

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
  const soldOut = !product.inStock || comboKeys(product.sizes || [], product.colours || []).every(
    (key) => variantStock[key] === false,
  );
  const selectedComboOut = exactSelection && comboSoldOut(keySize, keyColour);
  const noColourForSize = hasColours && sizeChosen && !colourChosen && product.colours.every(
    (c) => comboSoldOut(size, c),
  );
  const noSizeForColour = hasSizes && colourChosen && !sizeChosen && product.sizes.every(
    (s) => comboSoldOut(s, colour),
  );
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

  function chooseSize(value) {
    setSize(value);
    setError("");
  }

  function chooseColour(value) {
    setColour(value);
    setError("");
  }

  function buildLine() {
    return {
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: selectedPricing.price,
      compareAtPrice: selectedPricing.compareAtPrice,
      image:
        product.images?.[product.imageColours?.indexOf(keyColour)] || product.image,
      size: keySize,
      colour: keyColour,
      qty,
    };
  }

  function validate() {
    if (soldOut) return "This product is sold out.";
    if (hasSizes && !sizeChosen) return "Please choose a size.";
    if (hasColours && !colourChosen) return "Please choose a colour.";
    if (variantSoldOut) return outMsg;
    return "";
  }

  function handleAdd(buyNow = false) {
    const err = validate();
    if (err) {
      setError(err);
      const group = !sizeChosen ? sizeGroup : !colourChosen ? colourGroup : null;
      group?.current?.scrollIntoView({ block: "center", behavior: "auto" });
      group?.current?.querySelector("button:not(:disabled)")?.focus({
        preventScroll: true,
      });
      return;
    }
    setError("");
    addToCart(buildLine());
    showToast("Added to bag");
    if (buyNow) router.push("/checkout");
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
        <fieldset
          ref={sizeGroup}
          className="mt-6 min-w-0"
          aria-describedby={error ? "product-option-error" : undefined}
        >
          <legend className="label">
            Size{sizeChosen && size ? `: ${size}` : " — choose a size"}
          </legend>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((s) => {
              const avail = sizeAvail(s);
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={size === s}
                  data-selected={size === s}
                  onPointerDown={() => chooseSize(s)}
                  onClick={() => chooseSize(s)}
                  disabled={soldOut || !avail}
                  title={avail ? s : `${s} — out of stock`}
                  className={`chip min-w-[46px] justify-center ${
                    !avail
                      ? "border-line text-ash line-through decoration-2 opacity-60"
                      : size === s
                        ? "border-ink bg-ink text-paper ring-2 ring-ink ring-offset-2"
                        : "border-line hover:border-ink"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {/* Colours — chip tags (same style as Size). The photo-box swatches under
          the gallery share this component's `colour` state, so both stay in sync. */}
      {product.colours?.length > 0 && (
        <fieldset
          ref={colourGroup}
          className="mt-5 min-w-0"
          aria-describedby={error ? "product-option-error" : undefined}
        >
          <legend className="label">
            Colour{colourChosen && colour ? `: ${colour}` : " — choose a colour"}
          </legend>
          <div className="flex flex-wrap gap-2">
            {product.colours.map((c) => {
              const avail = colourAvail(c);
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={colour === c}
                  data-selected={colour === c}
                  onPointerDown={() => chooseColour(c)}
                  onClick={() => chooseColour(c)}
                  disabled={soldOut || !avail}
                  title={avail ? c : `${c} — out of stock`}
                  className={`chip ${
                    !avail
                      ? "border-line text-ash line-through decoration-2 opacity-60"
                      : colour === c
                        ? "border-ink bg-ink text-paper ring-2 ring-ink ring-offset-2"
                        : "border-line hover:border-ink"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </fieldset>
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
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="min-h-11 min-w-11 px-4 py-2 text-lg"
              aria-label="Decrease"
            >
              −
            </button>
            <span className="w-10 text-center text-sm font-medium">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => q + 1)}
              className="min-h-11 min-w-11 px-4 py-2 text-lg"
              aria-label="Increase"
            >
              +
            </button>
          </div>
        </div>
      )}

      {error && (
        <p id="product-option-error" role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}

      <PaymentBadges options={settings.paymentOptions} />

      {/* Keep the actions in flow so they cannot cover the option controls. */}
      <div className="mt-7 flex gap-3">
        <button
          type="button"
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
          type="button"
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
