import { route, ok } from "@/lib/api";
import { currentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  return ok({ user: await currentUser() });
});
