import { z } from "zod";
import db from "@/lib/db";
import { route, ok, fail } from "@/lib/api";
import {
  requireUser,
  verifyPassword,
  hashPassword,
  signSession,
  setSessionCookie,
} from "@/lib/auth";
import { serializeUser } from "@/lib/models";

export const runtime = "nodejs";

const schema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  username: z.string().min(3, "Username must be at least 3 characters.").optional(),
  name: z.string().max(80).optional(),
  newPassword: z
    .string()
    .min(6, "New password must be at least 6 characters.")
    .optional()
    .or(z.literal("")),
});

// Change your own username / display name / password.
export const PUT = route(async (req) => {
  const me = await requireUser();
  const body = schema.parse(await req.json());
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(me.id);
  if (!verifyPassword(body.currentPassword, row.password)) {
    return fail(403, "Your current password is incorrect.");
  }

  const fields = [];
  const params = [];
  if (body.username && body.username !== row.username) {
    fields.push("username = ?");
    params.push(body.username);
  }
  if (body.name !== undefined) {
    fields.push("name = ?");
    params.push(body.name);
  }
  if (body.newPassword) {
    fields.push("password = ?");
    params.push(hashPassword(body.newPassword));
  }
  if (!fields.length) return ok({ user: serializeUser(row) });

  params.push(me.id);
  db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).run(...params);

  const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(me.id);
  // Re-issue the session so a username change stays consistent.
  await setSessionCookie(signSession(updated));
  return ok({ user: serializeUser(updated) });
});
