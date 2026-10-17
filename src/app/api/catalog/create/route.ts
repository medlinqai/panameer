import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { OnboardingError } from "@/lib/onboarding";
import { createState, CwsError, enableMyCatalog, productGrid, removeProductRow, saveProductRow } from "@/lib/create-what-you-sell";

// CWS-E002–E005: Create What You Sell — state, skill search, and the three stops' saves. Owner-scoped in the lib.
export async function GET(req: Request) {
  const viewer = await guardApi("canProvideServices");
  if (viewer instanceof NextResponse) return viewer;
  const url = new URL(req.url);
  if (url.searchParams.get("grid") === "products") return NextResponse.json(await productGrid(viewer));
  return NextResponse.json(await createState(viewer));
}

const Body = z.discriminatedUnion("stop", [
  z.object({ stop: z.literal("enable") }),
  z.object({ stop: z.literal("remove"), id: z.string().uuid() }),
  // CG-E003: one product row, saved as you go.
  z.object({ stop: z.literal("product"), id: z.string().uuid().nullish(), serviceTypeId: z.string().uuid(), offered: z.boolean(), name: z.string().max(40), short: z.string().max(120), pricing: z.enum(["FIXED", "RECURRING"]), paymentEvent: z.enum(["ACCEPTANCE", "DOWNLOAD", "INSTALLATION", "PAYMENT_REQUEST"]), offers: z.boolean(), leadDays: z.number().int().min(0).max(365).nullable(), priceCents: z.number().int().min(0).max(100_000_000).nullable(), imageUrl: z.string().url().max(600).nullable(), pdfUrl: z.string().url().max(600).nullable() }),
]);

export async function POST(req: Request) {
  const viewer = await guardApi("canProvideServices");
  if (viewer instanceof NextResponse) return viewer;
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Check the form." }, { status: 400 });
  try {
    const d = b.data;
    if (d.stop === "remove") return NextResponse.json({ ok: true, result: await removeProductRow(viewer, d.id) });
    if (d.stop === "product") return NextResponse.json({ ok: true, id: await saveProductRow(viewer, d) });
    await enableMyCatalog(viewer);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof CwsError || e instanceof OnboardingError) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e instanceof Error && /publish|company|price|name|type|description|cover|delivery/i.test(e.message)) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
