import ProductManager from "../ProductManager";

export const dynamic = "force-dynamic";

export default function ProductsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Products</h1>
        <p className="mt-1 text-sm text-ash">Add, edit, toggle stock and remove items.</p>
      </div>
      <ProductManager />
    </div>
  );
}
