import { z } from "zod";
import db from "@/lib/db";
import { route, ok, fail } from "@/lib/api";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { serializeUser } from "@/lib/models";

export const runtime = "nodejs";

const createSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters."),
  name: z.string().max(80).default(""),
  password: z.string().min(6, "Password must be at least 6 characters."),
  role: z.enum(["admin", "stock_updater"]),
});

// List all staff users (admin only).
export const GET = route(async () => {
  await requireAdmin();
  const rows = db.prepare("SELECT * FROM users ORDER BY created_at DESC").all();
  return ok({ users: rows.map(serializeUser) });
});

// Create a staff user (admin only).
export const POST = route(async (req) => {
  await requireAdmin();
  const body = createSchema.parse(await req.json());
  const exists = db.prepare("SELECT 1 FROM users WHERE username = ?").get(body.username);
  if (exists) return fail(409, "That username is already taken.");
  const info = db
    .prepare("INSERT INTO users (username, name, password, role, active) VALUES (?, ?, ?, ?, 1)")
    .run(body.username, body.name, hashPassword(body.password), body.role);
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
  return ok({ user: serializeUser(row) });
});
