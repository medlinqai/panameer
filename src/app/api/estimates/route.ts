import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { decideEstimate, EstimateError, saveEstimate, sendEstimate } from "@/lib/estimates";

const LINE = z.object({ kind: z.enum(["SERVICE", "FIXED", "NOT_TO_EXCEED"]), description: z.string().max(300), providerServiceId: z.string().uuid().optional().nullable(), serviceProductId: z.string().uuid().optional().nullable(), uom: z.string().max(16).optional().nullable(), quantity: z.number().nonnegative().max(1e6).optional().nullable(), rateCents: z.number().int().nonnegative().max(1e9).optional().nullable(), amountCents: z.number().int().nonnegative().max(1e10).optional().nullable() });
const EST = z.object({
  requestId: z.string().uuid().optional().nullable(),
  customerPersonId: z.string().uuid().optional().nullable(),
  customerEmail: z.string().email().max(200).optional().nullable().or(z.literal("")),
  workRequestId: z.string().uuid().optional().nullable(),
  title: z.string().max(200),
  validUntil: z.string().max(30).optional().nullable(),
  scope: z.string().max(4000).optional().nullable(),
  assumptions: z.string().max(4000).optional().nullable(),
  exclusions: z.string().max(4000).optional().nullable(),
  message: z.string().max(2000).optional().nullable(),
  paymentTerms: z.enum(["IMMEDIATE", "NET15", "NET30", "NET45", "NET60"]).optional(),
  billingCycle: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "EVERY_90_DAYS"]).optional(),
  lines: z.array(LINE).max(50),
});
const BODY = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save"), id: z.string().uuid().nullable(), estimate: EST, send: z.boolean().optional() }),
  z.object({ action: z.literal("send"), id: z.string().uuid() }),
  z.object({ action: z.literal("decide"), id: z.string().uuid(), decision: z.enum(["ACCEPT", "CHANGES", "DECLINE"]), comment: z.string().max(2000).optional().nullable() }),
]);

// CAT-E006: cost estimates — provider saves/sends; the customer accepts, asks for changes or declines. Owner-scoped in the lib.
export async function POST(req: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const b = BODY.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: b.error.issues[0]?.message ?? "Check the estimate" }, { status: 400 });
  try {
    if (b.data.action === "save") {
      const id = await saveEstimate(gate, b.data.id, { ...b.data.estimate, customerEmail: b.data.estimate.customerEmail || null });
      if (b.data.send) await sendEstimate(gate, id);
      return NextResponse.json({ id });
    }
    if (b.data.action === "send") {
      await sendEstimate(gate, b.data.id);
      return NextResponse.json({ id: b.data.id });
    }
    return NextResponse.json(await decideEstimate(gate, b.data.id, b.data.decision, b.data.comment));
  } catch (e) {
    if (e instanceof EstimateError) return NextResponse.json({ error: e.message }, { status: e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400 });
    console.error("[estimates]", e);
    return NextResponse.json({ error: "Could not save that estimate" }, { status: 500 });
  }
}
