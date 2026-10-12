"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore, formatMoney } from "@/app/context/StoreProvider";
import { isVariantAvailable } from "@/lib/variants";

function normalizeWhatsAppNumber(value, defaultCountryCode = "94") {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith(defaultCountryCode) && digits.length >= 10)
    return digits;
  if (digits.startsWith("0") && digits.length === 10 && defaultCountryCode) {
    return `${defaultCountryCode}${digits.slice(1)}`;
  }
  return digits;
}

export default function CheckoutPage() {
  const { cart, subtotal, settings, clearCart, showToast, ready } = useStore();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    altPhone: "",
    address: "",
    note: "",
  });
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [handedOff, setHandedOff] = useState(false);
  const [handoffUrl, setHandoffUrl] = useState("");

  useEffect(() => {
    if (ready && cart.length === 0 && !handedOff) router.replace("/cart");
  }, [ready, cart.length, handedOff, router]);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
    setHandoffUrl("");
  }

  function validate() {
    const e = {};
    const validPhone = (value) =>
      /^[\d+\-\s()]+$/.test(value.trim()) &&
      /^\d{7,15}$/.test(value.replace(/\D/g, ""));
    if (!form.name.trim()) e.name = "Please enter your name.";
    if (!validPhone(form.phone))
      e.phone = "Enter a valid phone number.";
    if (form.altPhone.trim() && !validPhone(form.altPhone)) {
      e.altPhone = "Enter a valid alternative phone number.";
    }
    if (!form.address.trim()) e.address = "Please enter a delivery address.";
    setErrors(e);
    const first = Object.keys(e)[0];
    if (first) document.getElementById(`checkout-${first}`)?.focus();
    return Object.keys(e).length === 0;
  }

  // Build the WhatsApp order message.
  function buildMessage() {
    const cur = settings.currency;
    const origin = window.location.origin;
    const orderRef = `LZ-${Date.now()}`;
    const lines = cart.map((l, i) => {
      const discount = l.compareAtPrice > l.price
        ? `Original unit price: ${formatMoney(l.compareAtPrice, cur)}\n` +
          `Item savings: ${formatMoney((l.compareAtPrice - l.price) * l.qty, cur)}\n`
        : "";
      const productLink = l.slug
        ? `${origin}/product/${encodeURIComponent(l.slug)}`
        : `${origin}/cart`;
      return (
        `*${i + 1}. ${l.name}*\n` +
        `Size: ${l.size || "Not applicable"}\n` +
        `Colour: ${l.colour || "Not applicable"}\n` +
        `Quantity: ${l.qty}\n` +
        `Unit price: ${formatMoney(l.price, cur)}\n` +
        discount +
        `Item total: ${formatMoney(l.price * l.qty, cur)}\n` +
        `Product link: ${productLink}`
      );
    });
    const quantity = cart.reduce((total, line) => total + line.qty, 0);

    return (
      `*${settings.storeName || "LIZIZ"} — NEW ORDER*\n` +
      `Order reference: ${orderRef}\n\n` +
      `*Customer & delivery details*\n` +
      `Full name: ${form.name.trim()}\n` +
      `Phone number: ${form.phone.trim()}\n` +
      `Alternative phone: ${form.altPhone.trim() || "Not provided"}\n` +
      `Delivery address:\n${form.address.trim()}\n` +
      `Order notes: ${form.note.trim() || "None"}\n\n` +
      `*Order items*\n${lines.join("\n\n")}\n\n` +
      `Total quantity: ${quantity}\n` +
      `*ITEMS TOTAL: ${formatMoney(subtotal, cur)}*\n\n` +
      `Website: ${origin}`
    );
  }

  async function placeOrder(e) {
    e?.preventDefault();
    if (sending) return;
    if (!validate()) return;
    const number = normalizeWhatsAppNumber(settings.whatsappNumber);
    if (!number) {
      showToast("Store WhatsApp number not set. Please contact us.", "error");
      return;
    }
    // Reserve the tab during the submit gesture, before asynchronous requests
    // consume the browser's popup permission.
    let whatsappWindow = null;
    try {
      whatsappWindow = window.open("about:blank", "_blank");
      if (whatsappWindow) whatsappWindow.opener = null;
    } catch {}
    setHandoffUrl("");
    setSending(true);

    // Re-check stock right before ordering so we never send a sold-out item.
    try {
      const ids = [...new Set(cart.map((line) => line.productId))];
      const entries = await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(
            `/api/products/${encodeURIComponent(id)}?availability=1`,
            { cache: "no-store" },
          );
          if (res.status === 404) return [id, null];
          if (!res.ok) throw new Error("Could not check availability.");
          const data = await res.json();
          return [id, data.product];
        }),
      );
      const live = new Map(entries);
      const dead = cart.filter((l) => {
        const p = live.get(l.productId);
        return !p || !isVariantAvailable(p, l.size || "", l.colour || "");
      });
      if (dead.length) {
        whatsappWindow?.close();
        const options = [dead[0].size, dead[0].colour].filter(Boolean).join(" / ");
        showToast(
          `${dead[0].name}${options ? ` (${options})` : ""} is unavailable. Please review your bag.`,
          "error",
        );
        setSending(false);
        router.push("/cart");
        return;
      }
    } catch {
      // If the check fails (offline), proceed — the store confirms on WhatsApp anyway.
    }

    // Record the lead for analytics (best sellers + lead counting). Fire-and-forget:
    // never block the WhatsApp hand-off if this fails.
    try {
      fetch("/api/leads", {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((l) => ({
            productId: l.productId,
            name: l.name,
            size: l.size,
            colour: l.colour,
            qty: l.qty,
            price: l.price,
          })),
          total: subtotal,
          customerName: form.name,
          customerPhone: form.phone,
        }),
      }).catch(() => {});
    } catch {}

    const url = `https://wa.me/${number}?text=${encodeURIComponent(buildMessage())}`;
    // If a popup is blocked or closed, retain the bag and offer a direct link.
    if (!whatsappWindow || whatsappWindow.closed) {
      setHandoffUrl(url);
      setSending(false);
      return;
    }
    try {
      whatsappWindow.location.replace(url);
    } catch {
      whatsappWindow.close();
      setHandoffUrl(url);
      setSending(false);
      return;
    }
    // Clearing the bag must not trigger the empty-cart redirect while the
    // confirmation route is loading.
    setHandedOff(true);
    clearCart();
    setSending(false);
    router.push("/order-sent");
  }

  if (!ready || cart.length === 0) return null;

  return (
    <div className="bg-paper text-ink">
      <section className="mx-auto w-[90%] max-w-[1600px] py-6 sm:py-10">
        <Link
          href="/cart"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-ash transition hover:text-ink"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to bag
        </Link>

        <div className="mt-6 border-t border-line pt-4">
          <div className="flex items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ash">
                Checkout
              </p>
              <h1 className="mt-2 font-display text-4xl font-normal leading-none tracking-tight sm:text-5xl">
                Confirm your order
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-ash">
                Enter your delivery details. We will confirm everything on
                WhatsApp.
              </p>
            </div>
            <div className="hidden font-mono text-[11px] uppercase tracking-[0.2em] text-ash lg:block">
              {cart.length} item{cart.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        <form
          onSubmit={placeOrder}
          className="mt-8 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14"
        >
          <div>
            <div className="mb-4 flex items-center justify-between border-t border-line pt-4">
              <h2 className="font-display text-2xl font-normal leading-none tracking-tight">
                Your details
              </h2>
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ash">
                Required *
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="checkout-name" className="label">
                  Full name *
                </label>
                <input
                  className="input"
                  id="checkout-name"
                  name="name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "error-name" : undefined}
                  aria-required="true"
                />
                {errors.name && (
                  <p
                    id="error-name"
                    role="alert"
                    className="mt-1 text-xs text-red-600"
                  >
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="checkout-phone" className="label">
                  Phone number *
                </label>
                <input
                  className="input"
                  inputMode="tel"
                  id="checkout-phone"
                  name="phone"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="077 123 4567"
                  autoComplete="tel"
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? "error-phone" : undefined}
                  aria-required="true"
                />
                {errors.phone && (
                  <p
                    id="error-phone"
                    role="alert"
                    className="mt-1 text-xs text-red-600"
                  >
                    {errors.phone}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="checkout-altPhone" className="label">
                  Other phone (optional)
                </label>
                <input
                  className="input"
                  inputMode="tel"
                  id="checkout-altPhone"
                  name="altPhone"
                  value={form.altPhone}
                  onChange={(e) => set("altPhone", e.target.value)}
                  placeholder="Backup number"
                  autoComplete="tel"
                  aria-invalid={Boolean(errors.altPhone)}
                  aria-describedby={
                    errors.altPhone ? "error-altPhone" : undefined
                  }
                />
                {errors.altPhone ? (
                  <p
                    id="error-altPhone"
                    role="alert"
                    className="mt-1 text-xs text-red-600"
                  >
                    {errors.altPhone}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-ash">
                    Use only if another person may receive the order.
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="checkout-address" className="label">
                  Delivery address *
                </label>
                <textarea
                  className="input min-h-[116px]"
                  id="checkout-address"
                  name="address"
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="House no, street, city"
                  autoComplete="street-address"
                  aria-invalid={Boolean(errors.address)}
                  aria-describedby={
                    errors.address ? "error-address" : undefined
                  }
                  aria-required="true"
                />
                {errors.address && (
                  <p
                    id="error-address"
                    role="alert"
                    className="mt-1 text-xs text-red-600"
                  >
                    {errors.address}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="checkout-note" className="label">
                  Order note (optional)
                </label>
                <input
                  className="input"
                  id="checkout-note"
                  name="note"
                  value={form.note}
                  onChange={(e) => set("note", e.target.value)}
                  placeholder="Size request, delivery time, or other note"
                />
              </div>
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="mb-4 flex items-center justify-between border-t border-line pt-4">
              <h2 className="font-display text-2xl font-normal leading-none tracking-tight">
                Your order
              </h2>
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ash">
                {cart.length} item{cart.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="border-b border-line">
              {cart.map((l) => (
                <div
                  key={l.key}
                  className="flex items-center gap-3 border-t border-line py-4"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={l.image}
                    alt={l.name}
                    className="h-20 w-16 flex-none object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-sans text-base font-semibold uppercase tracking-tight">
                      {l.name}
                    </p>
                    <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-ash">
                      {[l.size, l.colour].filter(Boolean).join(" · ") ||
                        "Standard"}{" "}
                      · Qty {l.qty}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">
                    {formatMoney(l.price * l.qty, settings.currency)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-b border-ink py-4">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ash">
                Total
              </span>
              <span className="font-display text-2xl font-normal tracking-tight">
                {formatMoney(subtotal, settings.currency)}
              </span>
            </div>

            <button
              type="submit"
              disabled={sending}
              className="btn mt-6 w-full bg-ink text-paper hover:bg-ink/85"
            >
              <WhatsAppIcon />
              {sending ? "Preparing…" : "Continue on WhatsApp"}
            </button>
            {handoffUrl && (
              <div className="mt-4" role="status">
                <p className="text-sm text-ash">
                  WhatsApp did not open. Your bag is saved; use this link to continue.
                </p>
                <a href={handoffUrl} className="btn-outline mt-3 w-full">
                  Open WhatsApp with your order
                </a>
              </div>
            )}

            <p className="mt-3 text-center text-xs leading-relaxed text-ash">
              Your order details will open in WhatsApp before sending.
            </p>
          </aside>
        </form>
      </section>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.5 14.4c-.3-.15-1.7-.85-2-.95-.26-.1-.45-.15-.65.15-.19.3-.75.94-.92 1.13-.17.19-.34.21-.63.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.34.44-.51.15-.17.2-.29.3-.48.1-.19.05-.36-.02-.51-.08-.15-.65-1.57-.9-2.15-.24-.56-.48-.48-.65-.49h-.56c-.19 0-.5.07-.77.36-.26.29-1 .98-1 2.4 0 1.41 1.03 2.78 1.17 2.97.15.19 2.03 3.1 4.92 4.35.69.3 1.22.48 1.64.61.69.22 1.32.19 1.81.12.55-.08 1.7-.7 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.34ZM12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.1-1.1l-.3-.18-3 .95.98-2.9-.2-.3A8 8 0 1 1 12 20Z" />
    </svg>
  );
}
