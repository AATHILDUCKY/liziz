"use client";
import { useEffect, useState } from "react";

const EMPTY = { username: "", name: "", password: "", role: "stock_updater" };

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function flash(t) { setMsg(t); setTimeout(() => setMsg(""), 2500); }

  async function createUser(e) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) return setError(data.error || "Could not create user.");
    setUsers((u) => [data.user, ...u]);
    setForm(EMPTY);
    setCreating(false);
    flash("User created.");
  }

  async function toggleActive(u) {
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !u.active }),
    });
    const data = await res.json();
    if (!res.ok) return flash(data.error || "Update failed.");
    setUsers((prev) => prev.map((x) => (x.id === u.id ? data.user : x)));
  }

  async function changeRole(u, role) {
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (!res.ok) return flash(data.error || "Update failed.");
    setUsers((prev) => prev.map((x) => (x.id === u.id ? data.user : x)));
  }

  async function resetPassword(u) {
    const pw = prompt(`New password for ${u.username} (min 6 chars):`);
    if (!pw) return;
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    const data = await res.json();
    flash(res.ok ? "Password updated." : (data.error || "Failed."));
  }

  async function remove(u) {
    if (!confirm(`Delete user "${u.username}"?`)) return;
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return flash(data.error || "Delete failed.");
    setUsers((prev) => prev.filter((x) => x.id !== u.id));
    flash("User deleted.");
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Staff users</h1>
          <p className="mt-1 text-sm text-ash">Admins manage everything; stock updaters manage products only.</p>
        </div>
        <button onClick={() => { setCreating((c) => !c); setError(""); }} className="btn-primary">
          {creating ? "Close" : "+ New user"}
        </button>
      </div>

      {msg && <p className="mb-3 rounded-lg bg-ink px-3 py-2 text-xs text-paper">{msg}</p>}

      {creating && (
        <form onSubmit={createUser} className="card mb-5 space-y-3 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Username *</label>
              <input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>
            <div>
              <label className="label">Display name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Password *</label>
              <input className="input" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="min 6 characters" />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="stock_updater">Stock Updater</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn-primary">Create user</button>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        {loading ? (
          <p className="px-4 py-12 text-center text-sm text-ash">Loading…</p>
        ) : (
          users.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-0">
              <div className="min-w-[140px] flex-1">
                <p className="text-sm font-medium">{u.name || u.username}</p>
                <p className="text-xs text-ash">@{u.username}</p>
              </div>
              <select
                value={u.role}
                onChange={(e) => changeRole(u, e.target.value)}
                className="rounded-lg border border-line px-2 py-1.5 text-xs"
              >
                <option value="stock_updater">Stock Updater</option>
                <option value="admin">Admin</option>
              </select>
              <button
                onClick={() => toggleActive(u)}
                className={`chip ${u.active ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-line text-ash"}`}
              >
                {u.active ? "Active" : "Disabled"}
              </button>
              <button onClick={() => resetPassword(u)} className="text-xs text-ash underline hover:text-ink">Reset pw</button>
              <button onClick={() => remove(u)} className="text-xs text-red-500 underline hover:text-red-700">Delete</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
