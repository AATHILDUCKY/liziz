"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { compressImagesToWebP } from "@/lib/imageCompress";
import { comboKey, pruneVariantStock, normalizeVariantPrices } from "@/lib/variants";

const CURRENCY = "Rs.";

const EMPTY = {
  name: "", category: "", price: "", compareAtPrice: "", description: "",
  image: "", images: [], imageColours: [], sizes: [], colours: [],
  variantStock: {}, variantPrices: {}, inStock: true, featured: false, newDrop: false,
};

function discountPercent(price, compareAtPrice) {
  const sale = Number(price) || 0;
  const original = Number(compareAtPrice) || 0;
  if (!sale || original <= sale) return "";
  return String(Math.round(((original - sale) / original) * 100));
}

function compareAtFromDiscount(price, percent) {
  const sale = Number(price) || 0;
  const pct = Math.max(0, Math.min(95, Number(percent) || 0));
  if (!sale || !pct) return "";
  return String(Math.round(sale / (1 - pct / 100)));
}

// Live elapsed-seconds counter, running only while `active` is true. Used to
// show how long compression / saving is taking.
function useElapsed(active) {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    if (!active) { setMs(0); return; }
    const start = performance.now();
    const id = setInterval(() => setMs(performance.now() - start), 100);
    return () => clearInterval(id);
  }, [active]);
  return ms;
}

const secs = (ms) => (ms / 1000).toFixed(1);

// A single product's photos (base64 data-URIs) can total well over 1MB, and
// many hosting setups put a reverse proxy in front of the app that rejects
// request bodies above ~1MB — which surfaced as "network error" when saving an
// image-heavy product. To stay safely under that limit we send the gallery in
// size-bounded batches: the first batch rides along with the product save, and
// any remaining batches are appended in follow-up requests. Each request keeps
// its image payload under this budget.
const REQUEST_IMAGE_BUDGET = 600 * 1024; // ~600KB of image data per request

// Group image indices into batches whose combined data-URI length stays within
// REQUEST_IMAGE_BUDGET. A single oversized image still gets its own batch so it
// is never silently dropped.
function batchImageIndices(images) {
  const batches = [];
  let current = [];
  let size = 0;
  images.forEach((src, i) => {
    const len = (src || "").length;
    if (current.length && size + len > REQUEST_IMAGE_BUDGET) {
      batches.push(current);
      current = [];
      size = 0;
    }
    current.push(i);
    size += len;
  });
  if (current.length) batches.push(current);
  return batches;
}

export default function ProductManager() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [variantOptions, setVariantOptions] = useState({ sizes: [], colours: [] });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null); // product object or EMPTY (with _new flag)
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/products", { cache: "no-store" });
    const data = await res.json();
    setProducts(data.products || []);
    setLoading(false);
  }
  async function loadCategories() {
    const res = await fetch("/api/categories", { cache: "no-store" });
    const data = await res.json();
    setCategories((data.categories || []).map((c) => c.name));
  }
  async function loadOptions() {
    const res = await fetch("/api/settings", { cache: "no-store" });
    const data = await res.json();
    if (data.variantOptions) setVariantOptions(data.variantOptions);
  }
  useEffect(() => { load(); loadCategories(); loadOptions(); }, []);

  // Re-render the server components on this route (dashboard stat cards +
  // analytics + storefront) so they reflect the DB write immediately.
  function syncServer() {
    router.refresh();
  }

  function flash(text) {
    setMsg(text);
    setTimeout(() => setMsg(""), 2500);
  }

  // One-tap in-stock toggle.
  async function toggleStock(p) {
    setBusyId(p.id);
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, inStock: !x.inStock } : x)));
    const res = await fetch(`/api/products/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inStock: !p.inStock }),
    });
    if (!res.ok) { await load(); flash("Could not update stock."); }
    else syncServer();
    setBusyId(null);
  }

  async function toggleNewDrop(p) {
    setBusyId(p.id);
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, newDrop: !x.newDrop } : x)));
    const res = await fetch(`/api/products/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newDrop: !p.newDrop }),
    });
    if (!res.ok) { await load(); flash("Could not update new drop."); }
    else syncServer();
    setBusyId(null);
  }

  async function remove(p) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    setBusyId(p.id);
    const res = await fetch(`/api/products/${p.id}`, { method: "DELETE" });
    if (res.ok) { setProducts((prev) => prev.filter((x) => x.id !== p.id)); flash("Product deleted."); syncServer(); }
    else flash("Delete failed.");
    setBusyId(null);
  }

  function openNew() { setEditing({ ...EMPTY, _new: true }); }
  // The list is lightweight (no gallery/variant data), so pull the full product
  // — with its raw image data-URIs — only when the editor actually opens.
  async function openEdit(p) {
    setBusyId(p.id);
    let full = p;
    try {
      const res = await fetch(`/api/products/${p.id}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.product) full = data.product;
      else flash("Could not load product details.");
    } catch {
      flash("Could not load product details.");
    }
    setBusyId(null);
    setEditing({
      ...full,
      images: full.images && full.images.length ? full.images : full.image ? [full.image] : [],
      imageColours: [...(full.imageColours || [])],
      sizes: [...(full.sizes || [])],
      colours: [...(full.colours || [])],
      variantStock: { ...(full.variantStock || {}) },
      variantPrices: { ...(full.variantPrices || {}) },
    });
  }

  const filtered = products.filter((p) =>
    !q.trim() || p.name.toLowerCase().includes(q.toLowerCase()) || p.category.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" className="input" />
        </div>
        <button onClick={openNew} className="btn-primary whitespace-nowrap">+ Add product</button>
      </div>

      {msg && <p className="mb-3 rounded-lg bg-ink px-3 py-2 text-xs text-paper">{msg}</p>}

      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        {/* Table header (desktop only) */}
        <div className="hidden grid-cols-12 gap-2 border-b border-line px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-ash sm:grid">
          <div className="col-span-4">Product</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-2">Price</div>
          <div className="col-span-1">Views</div>
          <div className="col-span-1">Stock</div>
          <div className="col-span-1">New</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="px-4 py-16 text-center text-sm text-ash">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-16 text-center text-sm text-ash">No products. Add your first one.</div>
        ) : (
          filtered.map((p) => (
            <ProductRow
              key={p.id}
              p={p}
              busy={busyId === p.id}
              onToggleStock={() => toggleStock(p)}
              onToggleNewDrop={() => toggleNewDrop(p)}
              onEdit={() => openEdit(p)}
              onRemove={() => remove(p)}
            />
          ))
        )}
      </div>

      {editing && (
        <ProductForm
          initial={editing}
          categories={categories}
          variantOptions={variantOptions}
          onClose={() => setEditing(null)}
          onSaved={(saved, isNew, took) => {
            setEditing(null);
            setProducts((prev) => isNew ? [saved, ...prev] : prev.map((x) => (x.id === saved.id ? saved : x)));
            flash(`${isNew ? "Product added" : "Product updated"}${took ? ` in ${took}s` : ""}.`);
            syncServer();
          }}
        />
      )}
    </div>
  );
}

/* ─── Product listing row: a stacked card on mobile, a table row on desktop ─── */
function ProductRow({ p, busy, onToggleStock, onToggleNewDrop, onEdit, onRemove }) {
  const price = Number(p.price).toLocaleString();
  const onSale = Number(p.compareAtPrice) > Number(p.price);
  const wasPrice = Number(p.compareAtPrice).toLocaleString();
  const views = Number(p.views) || 0;

  const nameLine = (
    <>
      {p.name}
      {p.featured && <span className="ml-1 rounded bg-smoke px-1.5 py-0.5 text-[10px] text-ash">★</span>}
      {p.newDrop && <span className="ml-1 rounded bg-ink px-1.5 py-0.5 text-[10px] uppercase text-paper">New</span>}
    </>
  );

  const actions = (
    <>
      <button onClick={onEdit} disabled={busy} className="rounded-lg p-2 hover:bg-smoke disabled:opacity-40" title="Edit" aria-label={`Edit ${p.name}`}>
        <EditIcon />
      </button>
      <button onClick={onRemove} disabled={busy} className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-40" title="Delete" aria-label={`Delete ${p.name}`}>
        <TrashIcon />
      </button>
    </>
  );

  return (
    <div className="border-b border-line last:border-0">
      {/* ── Mobile: card ── */}
      <div className="p-3 sm:hidden">
        <div className="flex gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.image} alt="" className="h-20 w-16 flex-none rounded-xl object-cover" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 flex-1 truncate text-sm font-semibold leading-tight">{nameLine}</p>
              <ViewsBadge views={views} />
            </div>
            <p className="mt-0.5 truncate text-[11px] text-ash">{p.category || "Uncategorised"}</p>
            <p className="mt-1 text-sm">
              <span className="font-semibold">{CURRENCY} {price}</span>
              {onSale && <span className="ml-1.5 text-xs text-ash line-through">{CURRENCY} {wasPrice}</span>}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <MiniToggle on={p.inStock} disabled={busy} onClick={onToggleStock} onColor="bg-emerald-500"
            label={p.inStock ? "In stock" : "Sold out"} labelClass={p.inStock ? "text-emerald-600" : "text-ash"} />
          <MiniToggle on={p.newDrop} disabled={busy} onClick={onToggleNewDrop} onColor="bg-ink"
            label={p.newDrop ? "New drop" : "New off"} labelClass={p.newDrop ? "text-ink" : "text-ash"} />
          <div className="ml-auto flex gap-1">{actions}</div>
        </div>
      </div>

      {/* ── Desktop: table row ── */}
      <div className="hidden grid-cols-12 items-center gap-2 px-4 py-3 sm:grid">
        <div className="col-span-4 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.image} alt="" className="h-12 w-10 flex-none rounded-lg object-cover" />
          <p className="min-w-0 truncate text-sm font-medium">{nameLine}</p>
        </div>
        <div className="col-span-2 truncate text-sm text-ash">{p.category}</div>
        <div className="col-span-2 text-sm">
          <span className="font-medium">{CURRENCY} {price}</span>
          {onSale && <span className="ml-1 text-xs text-ash line-through">{CURRENCY} {wasPrice}</span>}
          {Object.keys(p.variantPrices || {}).length > 0 && (
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-ash">Variant pricing</p>
          )}
        </div>
        <div className="col-span-1"><ViewsBadge views={views} /></div>
        <div className="col-span-1">
          <MiniToggle on={p.inStock} disabled={busy} onClick={onToggleStock} onColor="bg-emerald-500" />
        </div>
        <div className="col-span-1">
          <MiniToggle on={p.newDrop} disabled={busy} onClick={onToggleNewDrop} onColor="bg-ink" />
        </div>
        <div className="col-span-1 flex justify-end gap-1">{actions}</div>
      </div>
    </div>
  );
}

// A compact switch with an optional inline label (label used on mobile only).
function MiniToggle({ on, disabled, onClick, onColor, label, labelClass = "" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      role="switch"
      aria-checked={!!on}
      aria-label={label || undefined}
      className={`inline-flex items-center gap-2 rounded-full disabled:opacity-50 ${label ? "border border-line px-1 py-1 pr-2.5" : ""}`}
    >
      <span className={`relative inline-flex h-6 w-11 flex-none items-center rounded-full transition ${on ? onColor : "bg-ash/40"}`}>
        <span className={`inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow transition ${on ? "translate-x-[22px]" : "translate-x-[3px]"}`} />
      </span>
      {label && <span className={`text-xs font-medium ${labelClass}`}>{label}</span>}
    </button>
  );
}

// Eye icon + count. Shows how many visitors have viewed the product (admin-only).
function ViewsBadge({ views }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-smoke px-2 py-0.5 text-xs font-medium text-ink"
      title={`${views.toLocaleString()} product view${views === 1 ? "" : "s"}`}
    >
      <EyeIcon />
      <span className="tabular-nums">{views.toLocaleString()}</span>
    </span>
  );
}

const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-ash">
    <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
);
const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
);

function ProductForm({ initial, categories = [], variantOptions = { sizes: [], colours: [] }, onClose, onSaved }) {
  const isNew = !!initial._new;
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [imgBusy, setImgBusy] = useState(null); // { done, total } while compressing
  const compressMs = useElapsed(!!imgBusy);
  const saveMs = useElapsed(saving);

  // Build the dropdown options: the managed list, plus this product's own
  // category if it isn't in the list anymore (so editing never loses it).
  const options = [...categories];
  if (form.category && !options.some((c) => c.toLowerCase() === form.category.toLowerCase())) {
    options.unshift(form.category);
  }

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function setCommonDiscount(percent) {
    setForm((f) => ({ ...f, compareAtPrice: compareAtFromDiscount(f.price, percent) }));
  }

  // Offer / un-offer a size or colour on this product. `listKey` is
  // "sizes"/"colours". Un-offering prunes any combos that referenced it.
  function toggleOffered(listKey, name) {
    setForm((f) => {
      const has = (f[listKey] || []).includes(name);
      const list = has ? f[listKey].filter((x) => x !== name) : [...(f[listKey] || []), name];
      const next = { ...f, [listKey]: list };
      next.variantStock = pruneVariantStock(f.variantStock || {}, next.sizes || [], next.colours || []);
      next.variantPrices = normalizeVariantPrices(f.variantPrices || {}, next.sizes || [], next.colours || []);
      return next;
    });
  }

  // Add a custom (one-off) size/colour not in the master pool, offered by
  // default. It shows for this product; add it in Settings to reuse it.
  function addCustom(listKey, raw) {
    const name = String(raw || "").trim();
    if (!name) return;
    setForm((f) => (f[listKey] || []).includes(name)
      ? f
      : { ...f, [listKey]: [...(f[listKey] || []), name] });
  }

  // Flip one combination between in-stock and sold-out. Only sold-out combos
  // are stored (missing key = in stock), keeping the saved map small.
  function toggleCombo(size, colour) {
    const key = comboKey(size, colour);
    setForm((f) => {
      const map = { ...(f.variantStock || {}) };
      if (map[key] === false) delete map[key];
      else map[key] = false;
      return { ...f, variantStock: map };
    });
  }

  function setVariantPrice(size, colour, field, value) {
    const key = comboKey(size, colour);
    setForm((f) => {
      const map = { ...(f.variantPrices || {}) };
      const current = { ...(map[key] || {}) };
      current[field] = value;
      const price = Number(current.price) || 0;
      const compareAtPrice = Number(current.compareAtPrice) || 0;
      if (price > 0 || compareAtPrice > 0) map[key] = current;
      else delete map[key];
      return { ...f, variantPrices: map };
    });
  }

  function setVariantDiscount(size, colour, value) {
    const key = comboKey(size, colour);
    setForm((f) => {
      const map = { ...(f.variantPrices || {}) };
      const current = { ...(map[key] || {}) };
      const sale = current.price || f.price;
      current.compareAtPrice = compareAtFromDiscount(sale, value);
      const price = Number(current.price) || 0;
      const compareAtPrice = Number(current.compareAtPrice) || 0;
      if (price > 0 || compareAtPrice > 0) map[key] = current;
      else delete map[key];
      return { ...f, variantPrices: map };
    });
  }

  // Colour tags run parallel to images; every image mutation keeps them aligned.
  // Append one or more uploaded images to the gallery (max 20).
  async function onImageFiles(files) {
    const list = Array.from(files || []);
    if (!list.length) return;
    setError("");
    const current = form.images || [];
    const room = 20 - current.length;
    if (room <= 0) { setError("Up to 20 images per product."); return; }
    const toRead = list.slice(0, room);
    setImgBusy({ done: 0, total: toRead.length });
    try {
      const compressed = await compressImagesToWebP(toRead, {
        maxDimension: 1400,
        maxBytes: 64 * 1024,
        onProgress: (done, total) => setImgBusy({ done, total }),
      });
      const reads = compressed.map((img) => img.dataUri);
      setForm((f) => ({
        ...f,
        images: [...(f.images || []), ...reads],
        imageColours: [...(f.imageColours || []), ...reads.map(() => "")],
      }));
    } catch (err) {
      setError(err.message || "Image compression failed.");
    } finally {
      setImgBusy(null);
    }
  }

  function removeImage(idx) {
    setForm((f) => ({
      ...f,
      images: (f.images || []).filter((_, i) => i !== idx),
      imageColours: (f.imageColours || []).filter((_, i) => i !== idx),
    }));
  }

  function makePrimary(idx) {
    setForm((f) => {
      const imgs = [...(f.images || [])];
      const cols = [...(f.imageColours || [])];
      const [pImg] = imgs.splice(idx, 1);
      const [pCol] = cols.splice(idx, 1);
      return { ...f, images: [pImg, ...imgs], imageColours: [pCol ?? "", ...cols] };
    });
  }

  // Tag the image at `idx` with a colour (or "" to clear / show for all).
  function setImageColour(idx, colour) {
    setForm((f) => {
      const cols = [...(f.imageColours || [])];
      while (cols.length < (f.images || []).length) cols.push("");
      cols[idx] = cols[idx] === colour ? "" : colour;
      return { ...f, imageColours: cols };
    });
  }

  // POST/PUT JSON and parse the response, distinguishing a transport failure
  // (fetch throws — server unreachable) from an application error (parsed body
  // with { ok:false }). Never throws on a non-2xx; returns { res, data }.
  async function sendJSON(url, method, body) {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    let data = {};
    try { data = await res.json(); } catch { /* empty / non-JSON body */ }
    return { res, data };
  }

  async function save() {
    setError("");
    if (!form.name.trim()) return setError("Name is required.");
    if (form.price === "" || Number(form.price) < 0) return setError("Enter a valid price.");
    setSaving(true);

    const gallery = (form.images && form.images.length ? form.images : []).filter(Boolean);
    const hasImages = gallery.length > 0;
    const images = hasImages ? gallery : [placeholder(form.name)];
    const colours = hasImages ? (form.imageColours || []) : [""];

    // Split the gallery so no single request exceeds the safe body-size budget.
    // The first batch saves with the product; the rest are appended after.
    const batches = batchImageIndices(images);
    const firstBatch = batches[0] || [];
    const restBatches = batches.slice(1);

    const payload = {
      name: form.name,
      category: form.category || "All",
      price: Number(form.price),
      compareAtPrice: Number(form.compareAtPrice) || 0,
      description: form.description || "",
      images: firstBatch.map((i) => images[i]),
      imageColours: firstBatch.map((i) => colours[i] || ""),
      sizes: form.sizes || [],
      colours: form.colours || [],
      variantStock: pruneVariantStock(form.variantStock || {}, form.sizes || [], form.colours || []),
      variantPrices: normalizeVariantPrices(form.variantPrices || {}, form.sizes || [], form.colours || []),
      inStock: !!form.inStock,
      featured: !!form.featured,
      newDrop: !!form.newDrop,
    };

    const startedAt = performance.now();
    try {
      // 1) Create/update the product with its first batch of photos.
      const { res, data } = await sendJSON(
        isNew ? "/api/products" : `/api/products/${form.id}`,
        isNew ? "POST" : "PUT",
        payload,
      );
      if (!res.ok || !data.ok) { setSaving(false); return setError(data.error || "Save failed."); }
      let product = data.product;

      // 2) Append any remaining photos in small follow-up requests.
      for (const batch of restBatches) {
        const r = await sendJSON(`/api/products/${product.id}`, "PUT", {
          appendImages: batch.map((i) => images[i]),
          appendImageColours: batch.map((i) => colours[i] || ""),
        });
        if (!r.res.ok || !r.data.ok) {
          setSaving(false);
          return setError(r.data.error || "Some photos couldn't be saved. Open the product and re-add the remaining ones.");
        }
        product = r.data.product;
      }

      const took = secs(performance.now() - startedAt);
      setSaving(false);
      onSaved(product, isNew, took);
    } catch {
      setSaving(false);
      return setError("Network error — could not reach the server.");
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold">{isNew ? "Add product" : "Edit product"}</h2>
            <p className="truncate text-xs text-ash">{isNew ? "Create a new listing for your store." : form.name}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-ash transition hover:bg-smoke hover:text-ink">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-7 overflow-y-auto px-5 py-5">
          {/* Photos */}
          <Section n="1" title="Photos" hint="Tag each photo with the colour it shows — the storefront jumps to it when a shopper picks that colour.">
            {imgBusy && (
              <div className="mb-3 flex items-center gap-3 rounded-xl border border-line bg-smoke/60 px-3 py-2.5 text-xs">
                <Spinner />
                <div className="flex-1">
                  <p className="font-medium text-ink">Optimising photos… {imgBusy.done}/{imgBusy.total}</p>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-ink transition-all duration-200"
                      style={{ width: `${imgBusy.total ? (imgBusy.done / imgBusy.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <span className="font-mono tabular-nums text-ash">{secs(compressMs)}s</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(form.images || []).map((src, i) => (
                <ImageCard
                  key={i}
                  src={src}
                  isMain={i === 0}
                  colour={form.imageColours?.[i] || ""}
                  colours={form.colours || []}
                  onRemove={() => removeImage(i)}
                  onMakeMain={() => makePrimary(i)}
                  onSetColour={(c) => setImageColour(i, c)}
                />
              ))}
              {(form.images?.length || 0) < 20 && (
                <label className={`flex aspect-[4/5] flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-line text-ash transition ${imgBusy ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-ink hover:bg-smoke hover:text-ink"}`}>
                  {imgBusy ? <Spinner /> : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 5v14M5 12h14" /></svg>}
                  <span className="text-[11px] font-medium uppercase tracking-wide">{imgBusy ? "Optimising…" : "Add photo"}</span>
                  <span className="text-[10px] text-ash">{form.images?.length || 0}/20 · under 64KB</span>
                  <input type="file" accept="image/*" multiple disabled={!!imgBusy} className="hidden" onChange={(e) => onImageFiles(e.target.files)} />
                </label>
              )}
            </div>
          </Section>

          {/* Details */}
          <Section n="2" title="Details">
            <div className="space-y-3">
              <div>
                <label className="label">Name *</label>
                <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Heritage Oversized Tee" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Category</label>
                  {options.length > 0 ? (
                    <select className="input" value={form.category} onChange={(e) => set("category", e.target.value)}>
                      <option value="">Select…</option>
                      {options.map((c) => (<option key={c} value={c}>{c}</option>))}
                    </select>
                  ) : (
                    <input className="input" value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="Add in Settings" />
                  )}
                </div>
                <div>
                  <label className="label">Sale price ({CURRENCY})</label>
                  <input className="input" inputMode="numeric" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="3200" />
                </div>
              </div>
              <div>
                <label className="label">Original price ({CURRENCY})</label>
                <input className="input" inputMode="numeric" value={form.compareAtPrice ?? ""} onChange={(e) => set("compareAtPrice", e.target.value)} placeholder="4200" />
                <p className="mt-1 text-[11px] text-ash">Shown crossed out when it is higher than the sale price.</p>
              </div>
              <div>
                <label className="label">Common discount %</label>
                <input
                  className="input w-32"
                  inputMode="numeric"
                  value={discountPercent(form.price, form.compareAtPrice)}
                  onChange={(e) => setCommonDiscount(e.target.value)}
                  placeholder="20"
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input min-h-[70px]" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Fabric, fit, styling notes…" />
              </div>
            </div>
          </Section>

          {/* Variants & stock */}
          <Section n="3" title="Sizes, colours & stock" hint="Pick what this product comes in, then set stock for each combination.">
            <div className="space-y-4">
              <VariantPicker
                label="Sizes"
                pool={variantOptions.sizes}
                selected={form.sizes || []}
                placeholder="Add a custom size"
                onToggleOffered={(n) => toggleOffered("sizes", n)}
                onAddCustom={(n) => addCustom("sizes", n)}
              />
              <VariantPicker
                label="Colours"
                pool={variantOptions.colours}
                selected={form.colours || []}
                placeholder="Add a custom colour"
                onToggleOffered={(n) => toggleOffered("colours", n)}
                onAddCustom={(n) => addCustom("colours", n)}
              />
              <StockMatrix
                sizes={form.sizes || []}
                colours={form.colours || []}
                stock={form.variantStock || {}}
                prices={form.variantPrices || {}}
                basePrice={form.price}
                baseCompareAtPrice={form.compareAtPrice}
                onToggle={toggleCombo}
                onPriceChange={setVariantPrice}
                onDiscountChange={setVariantDiscount}
              />
            </div>
          </Section>

          {/* Visibility */}
          <Section n="4" title="Visibility">
            <div className="space-y-2">
              <Toggle checked={!!form.inStock} onChange={(v) => set("inStock", v)} title="In stock" subtitle="Available to buy on the storefront" />
              <Toggle checked={!!form.featured} onChange={(v) => set("featured", v)} title="Featured on home" subtitle="Show in the featured section" />
              <Toggle checked={!!form.newDrop} onChange={(v) => set("newDrop", v)} title="New drop" subtitle="Show in the NEW DROPS section on the home page" />
            </div>
          </Section>

          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-line px-5 py-4">
          <button onClick={onClose} disabled={saving} className="btn-ghost flex-1 disabled:opacity-50">Cancel</button>
          <button onClick={save} disabled={saving || !!imgBusy} className="btn-primary flex-[2] disabled:opacity-60">
            {saving
              ? `Saving… ${secs(saveMs)}s`
              : imgBusy
              ? "Optimising photos…"
              : isNew
              ? "Add product"
              : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Modern form building blocks ─── */

// Small inline loading spinner.
function Spinner() {
  return (
    <svg className="h-4 w-4 flex-none animate-spin text-ink" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// A numbered section header + its content.
function Section({ n, title, hint, children }) {
  return (
    <section>
      <div className="mb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-paper">{n}</span>
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        {hint && <p className="mt-1.5 text-xs leading-relaxed text-ash">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

// A row with a title/subtitle and an iOS-style switch on the right.
function Toggle({ checked, onChange, title, subtitle }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className="flex w-full items-center justify-between rounded-xl border border-line px-3 py-2.5 text-left transition hover:border-ink"
    >
      <div>
        <p className="text-sm font-medium">{title}</p>
        {subtitle && <p className="text-[11px] text-ash">{subtitle}</p>}
      </div>
      <span className={`relative inline-flex h-6 w-11 flex-none items-center rounded-full transition ${checked ? "bg-emerald-500" : "bg-ash/40"}`}>
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </span>
    </button>
  );
}

// A small colour dot inferred from a colour name (best-effort, for the UI only).
const SWATCH = {
  black: "#111827", white: "#ffffff", grey: "#9ca3af", gray: "#9ca3af",
  navy: "#1e3a5f", blue: "#2563eb", beige: "#e8dcc4", cream: "#f5f0e1",
  green: "#3f6212", olive: "#556b2f", brown: "#5b3a29", tan: "#c8a97e",
  red: "#dc2626", maroon: "#7f1d1d", pink: "#ec4899", purple: "#7c3aed",
  yellow: "#eab308", orange: "#ea580c", khaki: "#94875a", charcoal: "#374151",
};
function Swatch({ name }) {
  const key = String(name || "").toLowerCase().trim();
  const hit = SWATCH[key] || Object.keys(SWATCH).find((k) => key.includes(k));
  const color = SWATCH[key] || (hit ? SWATCH[hit] : "#d4d4d8");
  return <span className="inline-block h-2.5 w-2.5 flex-none rounded-full border border-black/10" style={{ background: color }} />;
}

// An image tile with main/remove controls and an inline colour-tag picker.
function ImageCard({ src, isMain, colour, colours = [], onRemove, onMakeMain, onSetColour }) {
  // Offered colours, plus the current tag if it's no longer in the offered list.
  const opts = colour && !colours.includes(colour) ? [colour, ...colours] : colours;
  return (
    <div className="group overflow-hidden rounded-2xl border border-line bg-white">
      <div className="relative aspect-[4/5]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-1.5">
          {isMain ? (
            <span className="rounded-full bg-ink/85 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-paper">Main</span>
          ) : (
            <button type="button" onClick={onMakeMain} className="rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-paper opacity-0 transition group-hover:opacity-100" title="Make main image">Set main</button>
          )}
          <button type="button" onClick={onRemove} aria-label="Remove image" className="flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-paper transition hover:bg-red-500">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        {colour && (
          <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-ink shadow-sm backdrop-blur">
            <Swatch name={colour} /> {colour}
          </span>
        )}
      </div>
      <div className="border-t border-line p-1.5">
        {opts.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {opts.map((c) => {
              const on = c === colour;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => onSetColour(c)}
                  title={on ? `Tagged ${c} — click to clear` : `Tag as ${c}`}
                  className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium transition ${
                    on ? "border-ink bg-ink text-paper" : "border-line text-ash hover:border-ink"
                  }`}
                >
                  <Swatch name={c} /> {c}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="px-1 py-0.5 text-[10px] leading-tight text-ash">Add colours in section 3 to tag this photo.</p>
        )}
      </div>
    </div>
  );
}

// Lists every option in the master pool (plus any custom ones already on the
// product). Click a chip to offer / un-offer that size or colour on the product.
function VariantPicker({ label, pool = [], selected = [], placeholder, onToggleOffered, onAddCustom }) {
  const [custom, setCustom] = useState("");
  const all = [...pool, ...selected.filter((s) => !pool.includes(s))];

  function submitCustom(e) {
    e.preventDefault();
    onAddCustom(custom);
    setCustom("");
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="label mb-0">{label}</label>
        <span className="text-[11px] text-ash">{selected.length} selected</span>
      </div>

      {all.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {all.map((n) => {
            const offered = selected.includes(n);
            return (
              <button
                key={n}
                type="button"
                onClick={() => onToggleOffered(n)}
                aria-pressed={offered}
                title={offered ? `${n} — offered (click to remove)` : `${n} — click to offer`}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  offered ? "border-ink bg-ink text-paper" : "border-line bg-white text-ash hover:border-ink"
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-[11px] text-ash">No {label.toLowerCase()} in the pool yet — add one below or in Settings.</p>
      )}

      <form onSubmit={submitCustom} className="mt-2 flex gap-2">
        <input
          className="input h-9 py-1 text-sm"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder={placeholder}
          maxLength={40}
        />
        <button type="submit" className="btn-outline whitespace-nowrap px-3 py-1.5 text-xs">Add</button>
      </form>
    </div>
  );
}

// Grid of size × colour combinations, each a toggle: green = in stock,
// red/struck = sold out (stock["size::colour"] === false). Collapses to a
// single row/column when the product only uses one axis.
function StockMatrix({
  sizes = [],
  colours = [],
  stock = {},
  prices = {},
  basePrice = "",
  baseCompareAtPrice = "",
  onToggle,
  onPriceChange,
  onDiscountChange,
}) {
  if (!sizes.length && !colours.length) return null;
  const rows = sizes.length ? sizes : [""];
  const cols = colours.length ? colours : [""];

  return (
    <div className="rounded-xl border border-line bg-smoke/40 p-3">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ash">Stock per combination</p>
      <p className="mb-3 text-[11px] text-ash">Tap stock to flip availability. Leave price fields empty to inherit the product prices.</p>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-1 text-left">
          {colours.length > 0 && (
            <thead>
              <tr>
                {sizes.length > 0 && <th className="w-10" />}
                {cols.map((c) => (
                  <th key={c} className="px-1 pb-1 text-[11px] font-semibold text-ink">{c}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((s) => (
              <tr key={s || "_"}>
                {sizes.length > 0 && (
                  <th className="pr-2 text-[11px] font-semibold text-ink">{s}</th>
                )}
                {cols.map((c) => (
                  <td key={comboKey(s, c)}>
                    <StockCell
                      size={s}
                      colour={c}
                      soldOut={stock[comboKey(s, c)] === false}
                      override={prices[comboKey(s, c)] || {}}
                      basePrice={basePrice}
                      baseCompareAtPrice={baseCompareAtPrice}
                      onToggle={onToggle}
                      onPriceChange={onPriceChange}
                      onDiscountChange={onDiscountChange}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StockCell({
  size,
  colour,
  soldOut,
  override = {},
  basePrice = "",
  baseCompareAtPrice = "",
  onToggle,
  onPriceChange,
  onDiscountChange,
}) {
  const label = [size, colour].filter(Boolean).join(" · ") || "This item";
  const salePrice = override.price || basePrice;
  const originalPrice = override.compareAtPrice || baseCompareAtPrice;
  return (
    <div className="min-w-[210px] rounded-xl border border-line bg-white p-2">
      <button
        type="button"
        onClick={() => onToggle(size, colour)}
        title={`${label} — ${soldOut ? "sold out (click for in stock)" : "in stock (click for sold out)"}`}
        className={`mb-2 w-full rounded-lg border px-2 py-1.5 text-[11px] font-medium transition ${
          soldOut
            ? "border-red-300 bg-red-50 text-red-600 line-through"
            : "border-emerald-500 bg-emerald-50 text-emerald-700"
        }`}
      >
        {soldOut ? "Sold out" : "In stock"}
      </button>
      <div className="grid grid-cols-3 gap-1.5">
        <label className="block">
          <span className="mb-0.5 block text-[9px] font-semibold uppercase tracking-wide text-ash">Sale</span>
          <input
            className="h-8 w-full rounded-lg border border-line px-2 text-[11px] focus:border-ink focus:outline-none"
            inputMode="numeric"
            value={override.price ?? ""}
            onChange={(e) => onPriceChange(size, colour, "price", e.target.value)}
            placeholder={basePrice ? String(basePrice) : "Price"}
          />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[9px] font-semibold uppercase tracking-wide text-ash">Original</span>
          <input
            className="h-8 w-full rounded-lg border border-line px-2 text-[11px] focus:border-ink focus:outline-none"
            inputMode="numeric"
            value={override.compareAtPrice ?? ""}
            onChange={(e) => onPriceChange(size, colour, "compareAtPrice", e.target.value)}
            placeholder={baseCompareAtPrice ? String(baseCompareAtPrice) : "Was"}
          />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[9px] font-semibold uppercase tracking-wide text-ash">Off %</span>
          <input
            className="h-8 w-full rounded-lg border border-line px-2 text-[11px] focus:border-ink focus:outline-none"
            inputMode="numeric"
            value={discountPercent(salePrice, originalPrice)}
            onChange={(e) => onDiscountChange(size, colour, e.target.value)}
            placeholder="20"
          />
        </label>
      </div>
    </div>
  );
}

function placeholder(label) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='1000'><rect width='100%' height='100%' fill='#0a0a0a'/><rect x='24' y='24' width='752' height='952' fill='none' stroke='#3f3f46' stroke-width='2'/><text x='50%' y='50%' fill='#fff' font-family='Georgia' font-size='30' letter-spacing='6' text-anchor='middle'>${String(label).slice(0, 18).toUpperCase()}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
