"use client";
import Link from "next/link";
import { useStore, formatMoney } from "@/app/context/StoreProvider";

export default function CartPage() {
  const { cart, updateQty, removeLine, subtotal, settings, ready } = useStore();

  if (ready && cart.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-smoke">
          <svg
            width="34"
            height="34"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          >
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
            <path d="M3 6h18" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
        </div>
        <h1 className="font-display text-3xl font-normal">Your bag is empty</h1>
        <p className="mt-2 text-sm text-ash">
          Looks like you haven’t added anything yet.
        </p>
        <Link href="/shop" className="btn-primary mt-6">
          Browse the collection
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="mb-5 font-display text-4xl font-normal">Your bag</h1>

      <div className="space-y-3">
        {cart.map((line) => (
          <div key={line.key} className="card flex gap-3 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={line.image}
              alt={line.name}
              className="h-24 w-20 flex-none rounded-xl object-cover"
            />
            <div className="flex flex-1 flex-col">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/product/${line.slug}`}
                  className="text-sm font-medium hover:underline"
                >
                  {line.name}
                </Link>
                <button
                  onClick={() => removeLine(line.key)}
                  className="flex min-h-11 min-w-11 items-center justify-center text-ash hover:text-red-600"
                  aria-label={`Remove ${line.name}`}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  >
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  </svg>
                </button>
              </div>
              <p className="mt-0.5 text-xs text-ash">
                {[line.size, line.colour].filter(Boolean).join(" · ") || "—"}
              </p>
              <div className="mt-auto flex items-center justify-between pt-2">
                <div className="inline-flex items-center rounded-full border border-line">
                  <button
                    onClick={() => updateQty(line.key, line.qty - 1)}
                    className="min-h-11 min-w-11 px-3 py-1.5 text-base"
                    aria-label="Decrease"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm">{line.qty}</span>
                  <button
                    onClick={() => updateQty(line.key, line.qty + 1)}
                    className="min-h-11 min-w-11 px-3 py-1.5 text-base"
                    aria-label="Increase"
                  >
                    +
                  </button>
                </div>
                <div className="text-right">
                  {line.compareAtPrice > line.price && (
                    <p className="text-xs text-ash line-through">
                      {formatMoney(
                        line.compareAtPrice * line.qty,
                        settings.currency,
                      )}
                    </p>
                  )}
                  <span className="text-sm font-semibold">
                    {formatMoney(line.price * line.qty, settings.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="card mt-6 p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-ash">Subtotal</span>
          <span className="font-medium">
            {formatMoney(subtotal, settings.currency)}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-ash">Delivery</span>
          <span className="text-ash">Calculated on WhatsApp</span>
        </div>
        <div className="my-4 border-t border-line" />
        <div className="flex items-center justify-between">
          <span className="font-medium">Total</span>
          <span className="text-lg font-bold">
            {formatMoney(subtotal, settings.currency)}
          </span>
        </div>
        <Link href="/checkout" className="btn-primary mt-5 w-full">
          Proceed to checkout
        </Link>
        <Link href="/shop" className="btn-ghost mt-2 w-full">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
