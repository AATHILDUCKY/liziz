"use client";
import Link from "next/link";
import { useStore, formatMoney } from "@/app/context/StoreProvider";
import { variantPricingSummary } from "@/lib/variants";
import KokoInstallment from "@/app/components/KokoInstallment";

export default function ProductCard({ product }) {
  const { settings } = useStore();
  const soldOut = !product.inStock;
  const pricing = variantPricingSummary(product);

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex h-full w-full flex-col overflow-hidden bg-paper transition-colors"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-smoke">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image}
          alt={product.name}
          className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${soldOut ? "opacity-60 grayscale" : ""}`}
          loading="lazy"
          decoding="async"
          width="640"
          height="800"
        />
        {product.featured && !soldOut && (
          <span className="absolute left-3 top-3 rounded-sm bg-paper px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink">
            The Liziz edit
          </span>
        )}
        {soldOut && (
          <span className="absolute inset-x-0 bottom-0 bg-ink/90 py-2 text-center text-[11px] font-semibold uppercase tracking-widest text-paper">
            Sold out
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col py-3 sm:py-4">
        <span className="text-[11px] uppercase tracking-wide text-ash">
          {product.category}
        </span>
        <h3 className="mt-0.5 line-clamp-2 text-sm font-medium leading-5">
          {product.name}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-semibold tabular-nums">
            {formatPriceRange(
              pricing.priceMin,
              pricing.priceMax,
              settings.currency,
            )}
          </span>
          {pricing.hasDiscount && (
            <span className="text-xs text-ash line-through">
              {formatPriceRange(
                pricing.compareAtMin,
                pricing.compareAtMax,
                settings.currency,
              )}
            </span>
          )}
        </div>
        {pricing.hasDiscount && (
          <span className="mt-1 w-fit rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-600">
            Save {pricing.discountPercent}%
          </span>
        )}
        <KokoInstallment
          price={pricing.priceMin}
          currency={settings.currency}
          className="mt-2"
        />
      </div>
    </Link>
  );
}

function formatPriceRange(min, max, currency) {
  if (!max || min === max) return formatMoney(min, currency);
  return `${formatMoney(min, currency)} - ${formatMoney(max, currency)}`;
}
