// Authentication + role-based access control.
// Session = signed JWT stored in an httpOnly cookie ("liziz_session").
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import db from "./db";
import { serializeUser } from "./models";

const COOKIE = "liziz_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) throw new Error("Set JWT_SECRET to a random value of at least 32 characters.");
  return value;
}

// Whether to set the `Secure` flag on the session cookie. A Secure cookie is
// silently dropped by browsers over plain HTTP — which is how the store is
// accessed on a LAN by IP (http://192.168.x.x:3000) — so login would appear
// to fail. Only enable Secure when actually served over HTTPS.
function cookieSecure() {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;
  return (process.env.SITE_URL || "").startsWith("https://");
}

export function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain, hash) {
  try {
    return bcrypt.compareSync(plain, hash);
  } catch {
    return false;
  }
}

export function signSession(user) {
  return jwt.sign(
    { uid: user.id, username: user.username, role: user.role },
    secret(),
    { expiresIn: MAX_AGE }
  );
}

async function cookieStore() {
  return await cookies();
}

export async function setSessionCookie(token) {
  const store = await cookieStore();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const store = await cookieStore();
  store.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

// Returns the live user record from the session cookie, or null.
export async function currentUser() {
  const token = (await cookieStore()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, secret());
    const row = db.prepare("SELECT * FROM users WHERE id = ? AND active = 1").get(payload.uid);
    return serializeUser(row);
  } catch {
    return null;
  }
}

// Guard helpers for route handlers. Throw an object the routes translate to HTTP.
export class AuthError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new AuthError(401, "Authentication required.");
  return user;
}

export async function requireRole(...roles) {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new AuthError(403, "You do not have permission to do this.");
  }
  return user;
}

// stock_updater and admin may both manage products/stock.
export async function requireStockAccess() {
  return await requireRole("admin", "stock_updater");
}

// only admin may manage users & store settings.
export async function requireAdmin() {
  return await requireRole("admin");
}
