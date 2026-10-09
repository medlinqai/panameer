import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { OnboardingError } from "@/lib/onboarding";
import { listProviderServices, retireProviderService, saveProviderService } from "@/lib/provider-services";

const SERVICE = z.object({
  name: z.string().max(200),
  serviceType: z.enum(["SERVICE_BY_QTY", "SERVICE_BY_AMT"]),
  uom: z.string().max(16).optional().nullable(),
  rateCents: z.number().int().positive().max(1_000_000_000).nullable(),
  billingCycle: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "EVERY_90_DAYS"]),
  paymentTerms: z.enum(["IMMEDIATE", "NET15", "NET30", "NET45", "NET60"]),
  paymentTrigger: z.enum(["TIMESHEET", "PAYMENT_REQUEST", "INVOICE", "DOWNLOAD", "INSTALLATION"]),
});
const BODY = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save"), id: z.string().uuid().nullable(), service: SERVICE }),
  z.object({ action: z.literal("retire"), id: z.string().uuid() }),
]);

export async function GET() {
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;
  return NextResponse.json({ services: await listProviderServices(gate) });
}

export async function POST(request: Request) {
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;
  const body = BODY.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Check the service details" }, { status: 400 });
  try {
    if (body.data.action === "save") await saveProviderService(gate, body.data.id, body.data.service);
    else await retireProviderService(gate, body.data.id);
    return NextResponse.json({ services: await listProviderServices(gate) });
  } catch (e) {
    if (e instanceof OnboardingError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[provider-services]", e);
    return NextResponse.json({ error: "Could not save that service" }, { status: 500 });
  }
}
