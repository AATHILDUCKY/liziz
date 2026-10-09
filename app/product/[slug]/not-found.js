import Link from "next/link";

export default function ProductNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
      <h1 className="font-display text-3xl font-bold">Product not found</h1>
      <p className="mt-2 text-sm text-ash">This item may have been removed or is no longer available.</p>
      <Link href="/shop" className="btn-primary mt-6">Back to shop</Link>
    </div>
  );
}
