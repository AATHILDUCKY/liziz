import Link from "next/link";

export const metadata = { title: "Order sent", robots: { index: false, follow: false } };

export default function OrderSentPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-ink text-paper">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
      <h1 className="font-display text-3xl font-bold">Order on its way!</h1>
      <p className="mt-3 text-sm leading-relaxed text-ash">
        We’ve opened WhatsApp with your order details. Just press <strong>send</strong> to confirm and
        we’ll be in touch to arrange delivery and payment.
      </p>
      <p className="mt-2 text-xs text-ash">Didn’t open? Check that WhatsApp is installed, then try again from your bag.</p>
      <Link href="/shop" className="btn-primary mt-8">Continue shopping</Link>
    </div>
  );
}
