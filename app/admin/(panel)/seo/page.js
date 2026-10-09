"use client";
import { useEffect, useState } from "react";

const EMPTY = {
  siteUrl: "",
  metaTitle: "",
  metaDescription: "",
  metaKeywords: "",
  ogImage: "",
  googleAnalyticsId: "",
  googleSiteVerification: "",
};

// Recommended length windows search engines display without truncating.
const TITLE_MAX = 60;
const DESC_MAX = 160;

export default function SeoPage() {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/seo", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (d.seo) setForm({ ...EMPTY, ...d.seo }); })
      .finally(() => setLoading(false));
  }, []);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); setMsg(null); }

  async function save(e) {
    e?.preventDefault();
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/seo", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok && data.seo) {
      setForm({ ...EMPTY, ...data.seo });
      setMsg({ type: "ok", text: "SEO settings saved. Sitemap, robots.txt and page tags update on the next request." });
    } else {
      setMsg({ type: "error", text: data.error || "Save failed." });
    }
  }

  if (loading) return <p className="text-sm text-ash">Loading…</p>;

  const canonical = (form.siteUrl || origin || "https://your-domain").replace(/\/+$/, "");
  const previewTitle = form.metaTitle || "Liziz — Premium Modest Womenswear";
  const previewDesc =
    form.metaDescription ||
    "Premium modest womenswear, designed and made by Liziz. Discover abayas, dresses, hijabs and everyday essentials.";
  const keywordChips = form.metaKeywords.split(",").map((s) => s.trim()).filter(Boolean);

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">SEO</h1>
        <p className="mt-1 text-sm text-ash">
          Control how your store appears in Google and when shared on social media. These fields drive your
          {" "}<code className="rounded bg-smoke px-1">sitemap.xml</code>, <code className="rounded bg-smoke px-1">robots.txt</code>, canonical URLs and meta tags.
        </p>
      </div>

      {/* Google result preview */}
      <div className="card mb-6 p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ash">Search result preview</p>
        <div className="rounded-xl border border-line bg-white p-4">
          <p className="truncate text-xs text-emerald-700">{canonical}</p>
          <p className="mt-0.5 truncate text-lg text-[#1a0dab]">{previewTitle}</p>
          <p className="mt-0.5 line-clamp-2 text-sm text-[#4d5156]">{previewDesc}</p>
        </div>
      </div>

      <form onSubmit={save} className="card space-y-5 p-5">
        <div>
          <label className="label">Canonical site URL</label>
          <input
            className="input"
            value={form.siteUrl}
            onChange={(e) => set("siteUrl", e.target.value)}
            placeholder="https://your-liziz-domain.com"
            inputMode="url"
          />
          <p className="mt-1.5 text-xs text-ash">
            Your live public domain. This is the single most important SEO setting — it makes
            {" "}<a href="/sitemap.xml" target="_blank" rel="noreferrer" className="underline">sitemap.xml</a> and
            {" "}<a href="/robots.txt" target="_blank" rel="noreferrer" className="underline">robots.txt</a> use your real
            domain instead of <code className="rounded bg-smoke px-1">localhost</code>. Leave blank to auto-detect from the request.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="label">Meta title</label>
            <CharCount value={form.metaTitle} max={TITLE_MAX} />
          </div>
          <input
            className="input"
            value={form.metaTitle}
            onChange={(e) => set("metaTitle", e.target.value)}
            placeholder="Liziz — Premium Modest Womenswear"
            maxLength={70}
          />
          <p className="mt-1.5 text-xs text-ash">The home-page &amp; default browser-tab title. Keep it under ~60 characters. Blank uses the built-in default.</p>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="label">Meta description</label>
            <CharCount value={form.metaDescription} max={DESC_MAX} />
          </div>
          <textarea
            className="input min-h-[84px] resize-y"
            value={form.metaDescription}
            onChange={(e) => set("metaDescription", e.target.value)}
            placeholder="Premium modest womenswear, designed and made by Liziz. Order on WhatsApp."
            maxLength={300}
          />
          <p className="mt-1.5 text-xs text-ash">The grey summary line under your title in Google. Aim for 120–160 characters.</p>
        </div>

        <div>
          <label className="label">Meta keywords</label>
          <input
            className="input"
            value={form.metaKeywords}
            onChange={(e) => set("metaKeywords", e.target.value)}
            placeholder="modest womenswear, abayas, hijabs, modest dresses, Liziz"
          />
          {keywordChips.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {keywordChips.map((k, i) => (
                <span key={`${k}-${i}`} className="rounded-full border border-line bg-smoke px-2.5 py-0.5 text-xs font-medium">{k}</span>
              ))}
            </div>
          )}
          <p className="mt-1.5 text-xs text-ash">Comma-separated. Add the terms customers search for. Duplicates are removed automatically (max 20).</p>
        </div>

        <div>
          <label className="label">Default social share image URL</label>
          <input
            className="input"
            value={form.ogImage}
            onChange={(e) => set("ogImage", e.target.value)}
            placeholder="/images/liziz-editorial.webp or https://…"
            inputMode="url"
          />
          <p className="mt-1.5 text-xs text-ash">Shown when your home page is shared on WhatsApp, Facebook, X, etc. Use a hosted URL (crawlers can’t read uploaded data images). Blank uses the hero image.</p>
        </div>

        {msg && <p className={`text-sm ${msg.type === "ok" ? "text-emerald-600" : "text-red-600"}`}>{msg.text}</p>}
        <button className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save SEO settings"}</button>
      </form>

      {/* Google integrations moved here from Settings — they're SEO/marketing. */}
      <div className="card mt-6 p-5">
        <h2 className="text-lg font-semibold">Google integrations</h2>
        <p className="mt-1 text-sm text-ash">Connect Google Analytics and verify the site for Search Console. Leave blank to disable.</p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="label">Google Analytics measurement ID</label>
            <input
              className="input"
              value={form.googleAnalyticsId}
              onChange={(e) => set("googleAnalyticsId", e.target.value)}
              placeholder="G-XXXXXXXXXX"
            />
            <p className="mt-1.5 text-xs text-ash">
              From Analytics → Admin → Data streams. Accepts <code className="rounded bg-smoke px-1">G-…</code> (GA4), <code className="rounded bg-smoke px-1">UA-…</code>, or <code className="rounded bg-smoke px-1">GTM-…</code>.
            </p>
          </div>
          <div>
            <label className="label">Search Console verification token</label>
            <input
              className="input"
              value={form.googleSiteVerification}
              onChange={(e) => set("googleSiteVerification", e.target.value)}
              placeholder='content value, or paste the whole google-site-verification="…" tag'
            />
            <p className="mt-1.5 text-xs text-ash">
              In Search Console pick the <strong>HTML tag</strong> method. You can paste the whole
              {" "}<code className="rounded bg-smoke px-1">&lt;meta name=&quot;google-site-verification&quot; content=&quot;…&quot;&gt;</code> tag,
              the <code className="rounded bg-smoke px-1">google-site-verification=&quot;…&quot;</code> attribute, or just the token — we extract the value automatically.
              Save, wait for the page to redeploy, then click <strong>Verify</strong> in Search Console.
            </p>
          </div>
          <button type="button" onClick={save} disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save integrations"}</button>
        </div>
      </div>

      {/* Quick links to the generated files */}
      <div className="card mt-6 p-5">
        <h2 className="text-lg font-semibold">Generated files</h2>
        <p className="mt-1 text-sm text-ash">These are built automatically from your catalogue and the settings above.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="/sitemap.xml" target="_blank" rel="noreferrer" className="btn-outline px-3 py-1.5 text-xs">View sitemap.xml</a>
          <a href="/robots.txt" target="_blank" rel="noreferrer" className="btn-outline px-3 py-1.5 text-xs">View robots.txt</a>
        </div>
      </div>
    </div>
  );
}

function CharCount({ value, max }) {
  const len = (value || "").length;
  const over = len > max;
  return (
    <span className={`text-xs ${over ? "text-red-500" : len > max * 0.85 ? "text-amber-500" : "text-ash"}`}>
      {len}/{max}
    </span>
  );
}
