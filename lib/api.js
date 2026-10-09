// Small helpers for API route handlers.
import { NextResponse } from "next/server";
import { AuthError } from "./auth";

export function ok(data = {}, init) {
  return NextResponse.json({ ok: true, ...data }, init);
}

export function fail(status, message) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

// Wrap a handler so thrown AuthError / ZodError / Error become clean JSON.
export function route(handler) {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof AuthError) return fail(err.status, err.message);
      if (err?.name === "ZodError") {
        const msg = err.issues?.map((i) => i.message).join(", ") || "Invalid input.";
        return fail(400, msg);
      }
      if (err?.code === "SQLITE_CONSTRAINT_UNIQUE") {
        return fail(409, "That value is already taken.");
      }
      console.error("[api] error:", err);
      return fail(500, "Something went wrong.");
    }
  };
}
