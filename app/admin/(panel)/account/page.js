"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AccountPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [form, setForm] = useState({ username: "", name: "", currentPassword: "", newPassword: "" });
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setMe(d.user);
          setForm((f) => ({ ...f, username: d.user.username, name: d.user.name || "" }));
        }
      });
  }, []);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); setMsg(null); }

  async function save(e) {
    e.preventDefault();
    setMsg(null);
    if (!form.currentPassword) return setMsg({ type: "error", text: "Enter your current password to confirm changes." });
    setSaving(true);
    const res = await fetch("/api/account", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok || !data.ok) return setMsg({ type: "error", text: data.error || "Update failed." });
    setMsg({ type: "ok", text: "Account updated." });
    setForm((f) => ({ ...f, currentPassword: "", newPassword: "" }));
    router.refresh();
  }

  if (!me) return <p className="text-sm text-ash">Loading…</p>;

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">My account</h1>
        <p className="mt-1 text-sm text-ash">Change your username, name, or password.</p>
      </div>

      <form onSubmit={save} className="card space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Username</label>
            <input className="input" value={form.username} onChange={(e) => set("username", e.target.value)} />
          </div>
          <div>
            <label className="label">Display name</label>
            <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
        </div>

        <div className="border-t border-line pt-4">
          <label className="label">New password (leave blank to keep current)</label>
          <input className="input" type="text" value={form.newPassword} onChange={(e) => set("newPassword", e.target.value)} placeholder="min 6 characters" />
        </div>

        <div>
          <label className="label">Current password *</label>
          <input className="input" type="password" value={form.currentPassword} onChange={(e) => set("currentPassword", e.target.value)} placeholder="Confirm it's you" />
        </div>

        {msg && <p className={`text-sm ${msg.type === "ok" ? "text-emerald-600" : "text-red-600"}`}>{msg.text}</p>}

        <button className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
      </form>
    </div>
  );
}
