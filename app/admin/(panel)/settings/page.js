"use client";
import { useEffect, useState } from "react";
import { compressImageToWebP, formatBytes } from "@/lib/imageCompress";

function normalizeWhatsAppNumber(value, defaultCountryCode = "94") {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith(defaultCountryCode) && digits.length >= 10) return digits;
  if (digits.startsWith("0") && digits.length === 10 && defaultCountryCode) {
    return `${defaultCountryCode}${digits.slice(1)}`;
  }
  return digits;
}

function isValidWhatsAppNumber(value, defaultCountryCode = "94") {
  const normalized = normalizeWhatsAppNumber(value, defaultCountryCode);
  return /^\d{10,15}$/.test(normalized);
}

export default function SettingsPage() {
  const [form, setForm] = useState({ storeName: "", currency: "", whatsappNumber: "", logo: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => { if (d.settings) setForm(d.settings); })
      .finally(() => setLoading(false));
  }, []);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); setMsg(null); }

  async function onLogo(file) {
    if (!file) return;
    try {
      const compressed = await compressImageToWebP(file, { maxBytes: 64 * 1024, maxDimension: 512, minDimension: 96 });
      set("logo", compressed.dataUri);
      setMsg({ type: "ok", text: `Logo converted to WebP (${formatBytes(compressed.bytes)}). Save to apply.` });
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Logo compression failed." });
    }
  }

  async function save(e) {
    e.preventDefault();
    setMsg(null);
    const normalized = normalizeWhatsAppNumber(form.whatsappNumber);
    if (!isValidWhatsAppNumber(normalized)) {
      return setMsg({ type: "error", text: "WhatsApp number must be 10–15 digits after normalization. Example: 0771234567 → 94771234567." });
    }
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, whatsappNumber: normalized }),
    });
    const data = await res.json();
    setSaving(false);
    setMsg(res.ok ? { type: "ok", text: "Settings saved." } : { type: "error", text: data.error || "Save failed." });
  }

  if (loading) return <p className="text-sm text-ash">Loading…</p>;

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Store settings</h1>
        <p className="mt-1 text-sm text-ash">Configure how the store works and where orders go.</p>
      </div>

      <form onSubmit={save} className="card space-y-4 p-5">
        <div>
          <label className="label">Logo</label>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-xl border border-line bg-ink">
              {form.logo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={form.logo} alt="Store logo" className="h-full w-full object-contain p-1.5" />
              ) : (
                <span className="font-display text-[10px] font-bold tracking-brand text-paper">LOGO</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="btn-outline cursor-pointer px-3 py-1.5 text-xs">
                {form.logo ? "Change logo" : "Upload logo"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onLogo(e.target.files?.[0])} />
              </label>
              {form.logo && (
                <button type="button" onClick={() => set("logo", "")} className="btn-ghost px-3 py-1.5 text-xs text-red-500">Remove</button>
              )}
            </div>
          </div>
          <p className="mt-1.5 text-xs text-ash">Shown top-left in the admin navigation. Uploads are converted to WebP under 64KB. Save to apply.</p>
        </div>

        <div>
          <label className="label">Store name</label>
          <input className="input" value={form.storeName} onChange={(e) => set("storeName", e.target.value)} />
        </div>

        <div>
          <label className="label">Order WhatsApp number</label>
          <input
            className="input"
            inputMode="tel"
            value={form.whatsappNumber}
            onChange={(e) => set("whatsappNumber", e.target.value)}
            placeholder="077 123 4567 or 94771234567"
          />
          <p className="mt-1.5 text-xs text-ash">
            This is the number customer orders are sent to on WhatsApp.
            <br />Local numbers are auto-converted. Example: <code className="rounded bg-smoke px-1">077 123 4567</code> → <code className="rounded bg-smoke px-1">94771234567</code>
          </p>
        </div>

        <div>
          <label className="label">Currency symbol</label>
          <input className="input w-32" value={form.currency} onChange={(e) => set("currency", e.target.value)} placeholder="Rs." />
        </div>

        {msg && (
          <p className={`text-sm ${msg.type === "ok" ? "text-emerald-600" : "text-red-600"}`}>{msg.text}</p>
        )}

        <button className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save settings"}</button>
      </form>

      <SocialLinksSection />
      <PaymentOptionsSection />
      <OptionsSection />
      <CategoriesSection />
    </div>
  );
}

// Platform catalogue for the social-link editor. Kept in sync with
// SOCIAL_PLATFORMS in lib/models.js (that module is server-only, so we can't
// import it into this client component).
const SOCIAL_PLATFORMS = [
  { id: "instagram", name: "Instagram", placeholder: "https://instagram.com/yourstore" },
  { id: "facebook", name: "Facebook", placeholder: "https://facebook.com/yourstore" },
  { id: "tiktok", name: "TikTok", placeholder: "https://tiktok.com/@yourstore" },
  { id: "youtube", name: "YouTube", placeholder: "https://youtube.com/@yourstore" },
  { id: "whatsapp", name: "WhatsApp", placeholder: "https://wa.me/9477… (blank uses order number)" },
  { id: "x", name: "X (Twitter)", placeholder: "https://x.com/yourstore" },
  { id: "linkedin", name: "LinkedIn", placeholder: "https://linkedin.com/company/yourstore" },
  { id: "pinterest", name: "Pinterest", placeholder: "https://pinterest.com/yourstore" },
  { id: "snapchat", name: "Snapchat", placeholder: "https://snapchat.com/add/yourstore" },
  { id: "website", name: "Website / Other", placeholder: "https://…" },
];

// Add / remove the social media links shown in the storefront footer.
function SocialLinksSection() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setLinks(d.settings?.socialLinks || []))
      .finally(() => setLoading(false));
  }, []);

  function update(id, patch) {
    setLinks((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    setMsg(null);
  }
  function addLink() {
    setLinks((items) => [...items, { id: `social-${Date.now()}`, platform: "instagram", label: "", url: "" }]);
    setMsg(null);
  }
  function removeLink(id) {
    setLinks((items) => items.filter((item) => item.id !== id));
    setMsg(null);
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ socialLinks: links }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok && data.settings) {
      setLinks(data.settings.socialLinks || []);
      setMsg({ type: "ok", text: "Social links saved." });
    } else {
      setMsg({ type: "error", text: data.error || "Save failed." });
    }
  }

  return (
    <div className="card mt-6 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Social media links</h2>
          <p className="mt-1 text-sm text-ash">Shown in the storefront footer. Add as many as you like — pick a platform for the icon.</p>
        </div>
        <button type="button" onClick={addLink} className="btn-outline whitespace-nowrap px-3 py-1.5 text-xs">Add link</button>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-ash">Loading…</p>
      ) : (
        <div className="mt-4 space-y-3">
          {links.length === 0 && (
            <p className="border border-dashed border-line px-4 py-6 text-center text-sm text-ash">No social links yet. Add your first one.</p>
          )}
          {links.map((link) => {
            const meta = SOCIAL_PLATFORMS.find((p) => p.id === link.platform) || SOCIAL_PLATFORMS[SOCIAL_PLATFORMS.length - 1];
            return (
              <div key={link.id} className="rounded-xl border border-line p-3">
                <div className="grid gap-3 sm:grid-cols-[150px_minmax(0,1fr)]">
                  <div>
                    <label className="label">Platform</label>
                    <select
                      className="input h-10 py-2"
                      value={link.platform}
                      onChange={(e) => update(link.id, { platform: e.target.value })}
                    >
                      {SOCIAL_PLATFORMS.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Link URL</label>
                    <input
                      className="input h-10 py-2"
                      value={link.url}
                      onChange={(e) => update(link.id, { url: e.target.value })}
                      placeholder={meta.placeholder}
                      maxLength={300}
                    />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <div className="min-w-0 flex-1">
                    <label className="label">Label (optional)</label>
                    <input
                      className="input h-10 py-2"
                      value={link.label}
                      onChange={(e) => update(link.id, { label: e.target.value })}
                      placeholder={meta.name}
                      maxLength={40}
                    />
                  </div>
                  <button type="button" onClick={() => removeLink(link.id)} className="btn-ghost px-3 py-2 text-xs text-red-500">Remove</button>
                </div>
              </div>
            );
          })}

          {msg && <p className={`text-sm ${msg.type === "ok" ? "text-emerald-600" : "text-red-600"}`}>{msg.text}</p>}
          <button type="button" onClick={save} disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save social links"}</button>
        </div>
      )}
    </div>
  );
}

function PaymentOptionsSection() {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setOptions(d.settings?.paymentOptions || []))
      .finally(() => setLoading(false));
  }, []);

  function update(id, patch) {
    setOptions((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    setMsg(null);
  }

  function addOption() {
    const n = options.length + 1;
    setOptions((items) => [
      ...items,
      { id: `payment-${Date.now()}`, name: `Payment ${n}`, icon: "", enabled: true },
    ]);
    setMsg(null);
  }

  function removeOption(id) {
    setOptions((items) => items.filter((item) => item.id !== id));
    setMsg(null);
  }

  async function uploadIcon(option, file) {
    if (!file) return;
    try {
      const compressed = await compressImageToWebP(file, { maxBytes: 64 * 1024, maxDimension: 512, minDimension: 96 });
      update(option.id, { icon: compressed.dataUri });
      setMsg({ type: "ok", text: `"${option.name}" icon converted to WebP (${formatBytes(compressed.bytes)}).` });
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Icon compression failed." });
    }
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentOptions: options }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok && data.settings?.paymentOptions) {
      setOptions(data.settings.paymentOptions);
      setMsg({ type: "ok", text: "Payment options saved." });
    } else {
      setMsg({ type: "error", text: data.error || "Save failed." });
    }
  }

  return (
    <div className="card mt-6 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Payment options</h2>
          <p className="mt-1 text-sm text-ash">Enable the payment icons shown on product pages. Uploads are converted to WebP under 64KB automatically.</p>
        </div>
        <button type="button" onClick={addOption} className="btn-outline whitespace-nowrap px-3 py-1.5 text-xs">
          Add option
        </button>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-ash">Loading…</p>
      ) : (
        <div className="mt-4 space-y-3">
          {options.map((option) => (
            <div key={option.id} className="rounded-xl border border-line p-3">
              <div className="flex items-center gap-3">
                <PaymentIconPreview option={option} />
                <div className="min-w-0 flex-1">
                  <input
                    className="input h-10 py-2"
                    value={option.name}
                    onChange={(e) => update(option.id, { name: e.target.value })}
                    maxLength={40}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => update(option.id, { enabled: !option.enabled })}
                  role="switch"
                  aria-checked={!!option.enabled}
                  className={`relative inline-flex h-7 w-12 flex-none items-center rounded-full transition ${option.enabled ? "bg-emerald-500" : "bg-ash/40"}`}
                  title={option.enabled ? "Shown on product page" : "Hidden from product page"}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${option.enabled ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="btn-outline cursor-pointer px-3 py-1.5 text-xs">
                  {option.icon ? "Change icon" : "Upload icon"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadIcon(option, e.target.files?.[0])} />
                </label>
                {option.icon && (
                  <button type="button" onClick={() => update(option.id, { icon: "" })} className="btn-ghost px-3 py-1.5 text-xs text-red-500">
                    Clear icon
                  </button>
                )}
                {!["koko", "mintpay", "payzy"].includes(option.id) && (
                  <button type="button" onClick={() => removeOption(option.id)} className="btn-ghost px-3 py-1.5 text-xs text-red-500">
                    Remove
                  </button>
                )}
                <span className={`text-xs font-medium ${option.enabled ? "text-emerald-600" : "text-ash"}`}>
                  {option.enabled ? "Enabled" : "Hidden"}
                </span>
              </div>
            </div>
          ))}

          {msg && <p className={`text-sm ${msg.type === "ok" ? "text-emerald-600" : "text-red-600"}`}>{msg.text}</p>}
          <button type="button" onClick={save} disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save payment options"}
          </button>
        </div>
      )}
    </div>
  );
}

function PaymentIconPreview({ option }) {
  return (
    <div className="flex h-12 w-24 flex-none items-center justify-center rounded-lg border border-line bg-white px-2">
      {option.icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={option.icon} alt="" className="max-h-7 max-w-full object-contain" />
      ) : (
        <span className="truncate text-xs font-black tracking-wide text-ink">{option.name}</span>
      )}
    </div>
  );
}

// Manage the master pools of sizes & colours the product form offers as chips.
function OptionsSection() {
  const [sizes, setSizes] = useState([]);
  const [colours, setColours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.variantOptions) {
          setSizes(d.variantOptions.sizes || []);
          setColours(d.variantOptions.colours || []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sizeOptions: sizes, colourOptions: colours }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok && data.variantOptions) {
      setSizes(data.variantOptions.sizes || []);
      setColours(data.variantOptions.colours || []);
      setMsg({ type: "ok", text: "Options saved." });
    } else {
      setMsg({ type: "error", text: data.error || "Save failed." });
    }
  }

  return (
    <div className="card mt-6 p-5">
      <h2 className="text-lg font-semibold">Sizes &amp; colours</h2>
      <p className="mt-1 text-sm text-ash">
        These appear as toggle chips when adding a product — pick which a product comes in and mark each in stock or sold out.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-ash">Loading…</p>
      ) : (
        <div className="mt-4 space-y-5">
          <ChipEditor label="Sizes" values={sizes} onChange={setSizes} placeholder="e.g. XXL" />
          <ChipEditor label="Colours" values={colours} onChange={setColours} placeholder="e.g. Olive" />
          {msg && <p className={`text-sm ${msg.type === "ok" ? "text-emerald-600" : "text-red-600"}`}>{msg.text}</p>}
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save options"}</button>
        </div>
      )}
    </div>
  );
}

// A simple editable list of tags: chips with remove + an add input.
function ChipEditor({ label, values, onChange, placeholder }) {
  const [text, setText] = useState("");
  function add(e) {
    e.preventDefault();
    const v = text.trim();
    if (v && !values.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...values, v]);
    setText("");
  }
  return (
    <div>
      <label className="label">{label}</label>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {values.length === 0 && <span className="text-[11px] text-ash">None yet.</span>}
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full border border-line bg-smoke px-2.5 py-1 text-xs font-medium">
            {v}
            <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`Remove ${v}`} className="text-ash hover:text-red-500">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </span>
        ))}
      </div>
      <form onSubmit={add} className="flex gap-2">
        <input className="input h-9 py-1 text-sm" value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} maxLength={40} />
        <button type="submit" className="btn-outline whitespace-nowrap px-3 py-1.5 text-xs">Add</button>
      </form>
    </div>
  );
}

function CategoriesSection() {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/categories");
    const data = await res.json();
    setCats(data.categories || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault();
    setError("");
    const clean = name.trim();
    if (!clean) return;
    setBusy(true);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: clean }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok || !data.ok) return setError(data.error || "Could not add category.");
    setCats((c) => [...c, data.category].sort((a, b) => a.name.localeCompare(b.name)));
    setName("");
  }

  async function remove(cat) {
    if (!confirm(`Remove category "${cat.name}"? Existing products keep their category.`)) return;
    const res = await fetch(`/api/categories/${cat.id}`, { method: "DELETE" });
    if (res.ok) setCats((c) => c.filter((x) => x.id !== cat.id));
  }

  async function uploadImage(cat, file) {
    if (!file) return;
    let dataUri = "";
    try {
      const compressed = await compressImageToWebP(file, { maxBytes: 64 * 1024, maxDimension: 1000, minDimension: 280 });
      dataUri = compressed.dataUri;
    } catch (err) {
      setError(err.message || "Image compression failed.");
      return;
    }
    const resp = await fetch(`/api/categories/${cat.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: dataUri }),
    });
    const data = await resp.json();
    if (resp.ok && data.ok) setCats((c) => c.map((x) => (x.id === cat.id ? data.category : x)));
    else setError(data.error || "Upload failed.");
  }

  async function clearImage(cat) {
    const resp = await fetch(`/api/categories/${cat.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: "" }),
    });
    const data = await resp.json();
    if (resp.ok) setCats((c) => c.map((x) => (x.id === cat.id ? data.category : x)));
  }

  return (
    <div className="card mt-6 p-5">
      <h2 className="text-lg font-semibold">Categories</h2>
      <p className="mt-1 text-sm text-ash">
        Category tags appear when adding a product, and as tiles in the home “Shop by category” section.
        Upload an image to control how each tile looks (otherwise a product photo is used).
      </p>

      <form onSubmit={add} className="mt-4 flex gap-2">
        <input
          className="input"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(""); }}
          placeholder="e.g. Footwear"
          maxLength={40}
        />
        <button className="btn-primary whitespace-nowrap" disabled={busy}>Add</button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-sm text-ash">Loading…</p>
        ) : cats.length === 0 ? (
          <p className="text-sm text-ash">No categories yet. Add your first one above.</p>
        ) : (
          cats.map((cat) => (
            <div key={cat.id} className="flex items-center gap-3 rounded-xl border border-line p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cat.image || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60'><rect width='100%25' height='100%25' fill='%23f4f4f5'/></svg>"}
                alt=""
                className="h-12 w-12 flex-none rounded-lg border border-line object-cover"
              />
              <span className="flex-1 text-sm font-medium">{cat.name}</span>
              {cat.image && (
                <button onClick={() => clearImage(cat)} className="text-xs text-ash underline hover:text-ink">Clear</button>
              )}
              <label className="btn-outline cursor-pointer px-3 py-1.5 text-xs">
                {cat.image ? "Change" : "Add image"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage(cat, e.target.files?.[0])} />
              </label>
              <button
                onClick={() => remove(cat)}
                className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                aria-label={`Remove ${cat.name}`}
                title="Remove category"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
