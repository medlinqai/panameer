import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { addCompanyPayout, removeCompanyPayout, setPayeeType } from "@/lib/company-pay";
import { OnboardingError } from "@/lib/onboarding";

// Company v3 lane 2: Who Gets Paid + the company payout account (admins only, enforced in the lib).
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("payee"), type: z.enum(["COMPANY", "SOLE_PROPRIETOR"]) }),
  z.object({
    action: z.literal("add"),
    kind: z.enum(["BANK_ACCOUNT", "WIRE", "PAYPAL"]),
    label: z.string().trim().min(1, "Give it a name you'll recognize.").max(80),
    last4: z.string().trim().max(34).nullable().optional(),
    country: z.string().trim().min(2, "Where does the money land?").max(80),
  }),
  z.object({ action: z.literal("remove"), id: z.string().uuid() }),
]);

export async function POST(request: Request) {
  const viewer = await guardApi("authenticated");
  if (viewer instanceof NextResponse) return viewer;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "That didn't look right." }, { status: 400 });
  const b = parsed.data;
  try {
    if (b.action === "payee") return NextResponse.json(await setPayeeType(viewer, b.type));
    if (b.action === "add") return NextResponse.json(await addCompanyPayout(viewer, b));
    return NextResponse.json(await removeCompanyPayout(viewer, b.id));
  } catch (e) {
    if (e instanceof OnboardingError) return NextResponse.json({ error: e.message }, { status: e.code === "GATE_UNMET" ? 403 : 400 });
    throw e;
  }
}
