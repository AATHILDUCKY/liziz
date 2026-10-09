import { z } from "zod";
import db from "@/lib/db";
import { route, ok, fail } from "@/lib/api";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { serializeUser } from "@/lib/models";

export const runtime = "nodejs";

async function getRouteId(params) {
  const resolved = await params;
  return resolved?.id;
}

const updateSchema = z.object({
  name: z.string().max(80).optional(),
  role: z.enum(["admin", "stock_updater"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(6, "Password must be at least 6 characters.").optional().or(z.literal("")),
});

// Update a staff user (admin only).
export const PUT = route(async (req, { params }) => {
  const me = await requireAdmin();
  const id = Number(await getRouteId(params));
  const target = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!target) return fail(404, "User not found.");

  const body = updateSchema.parse(await req.json());

  // Safety: don't let an admin demote/deactivate the last active admin (or themselves out of admin).
  if ((body.role && body.role !== "admin") || body.active === false) {
    const admins = db
      .prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND active = 1")
      .get().c;
    if (target.role === "admin" && admins <= 1) {
      return fail(400, "You cannot remove the last active admin.");
    }
  }

  const fields = [];
  const p = [];
  if (body.name !== undefined) { fields.push("name = ?"); p.push(body.name); }
  if (body.role !== undefined) { fields.push("role = ?"); p.push(body.role); }
  if (body.active !== undefined) { fields.push("active = ?"); p.push(body.active ? 1 : 0); }
  if (body.password) { fields.push("password = ?"); p.push(hashPassword(body.password)); }
  if (!fields.length) return ok({ user: serializeUser(target) });

  p.push(id);
  db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).run(...p);
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  return ok({ user: serializeUser(row) });
});

// Delete a staff user (admin only).
export const DELETE = route(async (_req, { params }) => {
  const me = await requireAdmin();
  const id = Number(await getRouteId(params));
  if (id === me.id) return fail(400, "You cannot delete your own account.");
  const target = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!target) return fail(404, "User not found.");
  if (target.role === "admin") {
    const admins = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND active = 1").get().c;
    if (admins <= 1) return fail(400, "You cannot delete the last active admin.");
  }
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  return ok();
});
