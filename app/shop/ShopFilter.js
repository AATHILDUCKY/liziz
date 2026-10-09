"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import ProductCard from "@/app/components/ProductCard";

export default function ShopFilter({
  products = [],
  managedCategories = [],
  initialCategory = "All",
  initialQuery = "",
  initialSort = "featured",
}) {
  const [q, setQ] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState(
    ["featured", "new", "price-low", "price-high"].includes(initialSort)
      ? initialSort
      : "featured",
  );
  const categories = useMemo(
    () => [
      "All",
      ...new Set(
        [
          ...managedCategories,
          ...products.map((p) => p.category),
          ...(initialCategory !== "All" ? [initialCategory] : []),
        ].filter((c) => c && c.toLowerCase() !== "all"),
      ),
    ],
    [managedCategories, products, initialCategory],
  );
  function updateUrl(next) {
    const params = new URLSearchParams(window.location.search);
    Object.entries(next).forEach(([k, v]) => {
      if (!v || v === "All" || v === "featured") params.delete(k);
      else params.set(k, v);
    });
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${params.size ? `?${params}` : ""}`,
    );
  }
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const result = products.filter(
      (p) =>
        (category === "All" || p.category === category) &&
        (!needle ||
          `${p.name} ${p.description || ""} ${p.category}`
            .toLowerCase()
            .includes(needle)),
    );
    if (sort === "new")
      result.sort(
        (a, b) =>
          String(b.createdAt).localeCompare(String(a.createdAt)) || b.id - a.id,
      );
    if (sort === "price-low") result.sort((a, b) => a.price - b.price);
    if (sort === "price-high") result.sort((a, b) => b.price - a.price);
    return result;
  }, [products, q, category, sort]);
  return (
    <div className="shop-page site-shell pb-12 pt-4 sm:pb-16 sm:pt-8">
      <div className="mb-4 sm:mb-6">
        <p className="eyebrow hidden sm:block">Designed by us. Chosen by you.</p>
        <h1 className="font-display text-[30px] font-normal leading-tight tracking-tight sm:mt-2 sm:text-[44px]">
          The collection
        </h1>
        <p className="mt-1.5 hidden text-sm leading-5 text-mocha sm:block">
          Modest pieces for everyday elegance.
        </p>
      </div>
      <div className="mb-3 border-b border-line pb-3 sm:mb-4 sm:pb-4">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,8.5rem)] gap-2 sm:flex sm:items-end sm:justify-between sm:gap-4">
          <div className="min-w-0 sm:w-full sm:max-w-md">
            <label htmlFor="search" className="mb-1.5 block text-xs font-medium text-mocha">
              Search
            </label>
            <input
              id="search"
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                updateUrl({ q: e.target.value });
              }}
              placeholder="Search pieces…"
              className="input min-h-11 min-w-0 scroll-mt-28 px-3 py-2"
            />
          </div>
          <div className="min-w-0 sm:w-48 sm:shrink-0">
            <label htmlFor="sort" className="mb-1.5 block text-xs font-medium text-mocha">
              Sort by
            </label>
            <select
              id="sort"
              className="input min-h-11 min-w-0 px-2 py-2 sm:px-3"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                updateUrl({ sort: e.target.value });
              }}
            >
              <option value="featured">Featured</option>
              <option value="new">Newest</option>
              <option value="price-low">Lowest price</option>
              <option value="price-high">Highest price</option>
            </select>
          </div>
        </div>
        <div
          className="shop-categories no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 py-1"
          role="group"
          aria-label="Filter by category"
        >
          {categories.map((c) => (
            <button
              key={c}
              aria-pressed={category === c}
              onClick={() => {
                setCategory(c);
                updateUrl({ category: c });
              }}
              className={`chip shrink-0 whitespace-nowrap active:bg-bisque active:text-ink ${category === c ? "border-mocha bg-mocha text-paper" : "border-line text-mocha hover:border-mocha"}`}
            >
              {c === "All" ? "All pieces" : c}
            </button>
          ))}
        </div>
      </div>
      <p className="mb-3 text-xs leading-5 text-mocha sm:mb-4" aria-live="polite">
        {filtered.length} piece{filtered.length !== 1 ? "s" : ""}
        {category !== "All" ? ` in ${category}` : ""}
      </p>
      {filtered.length ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-4 md:gap-x-6">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="border border-line bg-smoke px-6 py-16 text-center">
          <p className="eyebrow">
            {products.length ? "A little adjustment" : "A new chapter"}
          </p>
          <h2 className="mt-4 font-display text-3xl">
            {products.length
              ? "Let’s find something for you."
              : "Something considered is coming."}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-mocha">
            {products.length
              ? "No pieces match these filters. Try another category or a different search."
              : "We’re preparing the Liziz collection. Discover the thought behind our clothing while we get everything ready."}
          </p>
          {products.length ? (
            <button
              className="btn-outline mt-7"
              onClick={() => {
                setQ("");
                setCategory("All");
                updateUrl({ q: "", category: "All" });
              }}
            >
              Clear filters
            </button>
          ) : (
            <Link className="text-link mt-5" href="/about">
              Meet Liziz →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
