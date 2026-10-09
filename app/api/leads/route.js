import { z } from "zod";
import { route, ok } from "@/lib/api";
import { recordLead } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  items: z
    .array(
      z.object({
        productId: z.union([z.number(), z.string()]).optional(),
        name: z.string().min(1),
        size: z.string().optional().default(""),
        colour: z.string().optional().default(""),
        qty: z.coerce.number().int().positive(),
        price: z.coerce.number().nonnegative(),
      })
    )
    .min(1, "Cannot record an empty order."),
  total: z.coerce.number().nonnegative().default(0),
  customerName: z.string().max(120).optional().default(""),
  customerPhone: z.string().max(40).optional().default(""),
});

// Public: called by checkout just before opening WhatsApp. Records the lead
// for analytics (lead counting + best sellers). No login required.
export const POST = route(async (req) => {
  const body = schema.parse(await req.json());
  const leadId = recordLead(body);
  return ok({ leadId });
});
