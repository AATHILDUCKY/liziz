import { z } from "zod";
import db from "@/lib/db";
import { route, ok, fail } from "@/lib/api";
import { verifyPassword, signSession, setSessionCookie } from "@/lib/auth";
import { serializeUser } from "@/lib/models";

export const runtime = "nodejs";

const schema = z.object({
  username: z.string().min(1, "Username is required."),
  password: z.string().min(1, "Password is required."),
});

export const POST = route(async (req) => {
  const { username, password } = schema.parse(await req.json());
  const row = db.prepare("SELECT * FROM users WHERE username = ? AND active = 1").get(username);
  if (!row || !verifyPassword(password, row.password)) {
    return fail(401, "Invalid username or password.");
  }
  await setSessionCookie(signSession(row));
  return ok({ user: serializeUser(row) });
});
