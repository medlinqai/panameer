import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { OnboardingError } from "@/lib/onboarding";
import { createState, CwsError, enableMyCatalog, productGrid, saveProductRow, saveWhatYouCharge, saveWhatYouDo, searchSkills } from "@/lib/create-what-you-sell";

// CWS-E002–E005: Create What You Sell — state, skill search, and the three stops' saves. Owner-scoped in the lib.
export async function GET(req: Request) {
  const viewer = await guardApi("canProvideServices");
  if (viewer instanceof NextResponse) return viewer;
  const url = new URL(req.url);
  if (url.searchParams.get("grid") === "products") return NextResponse.json(await productGrid(viewer));
  const q = url.searchParams.get("q");
  if (q !== null) return NextResponse.json({ skills: await searchSkills(q.slice(0, 80)) });
  return NextResponse.json(await createState(viewer));
}

const Pkg = z.object({ id: z.string().uuid().nullish(), name: z.string().trim().max(120), included: z.string().trim().max(2000), priceCents: z.number().int().min(0).max(100_000_000).nullable(), perMonth: z.boolean(), readyDays: z.number().int().min(0).max(365).nullable() });
const Body = z.discriminatedUnion("stop", [
  z.object({ stop: z.literal("do"), title: z.string().max(200), skillIds: z.array(z.string().uuid()).max(60), industryIds: z.array(z.string().uuid()).max(30) }),
  z.object({ stop: z.literal("charge"), hourlyCents: z.number().int().min(0).max(10_000_000).nullable(), monthly: z.object({ priceCents: z.number().int().min(0).max(100_000_000), hours: z.number().int().min(0).max(744).nullable() }).nullable(), packages: z.array(Pkg).max(3) }),
  z.object({ stop: z.literal("enable") }),
  // CG-E003: one product row, saved as you go.
  z.object({ stop: z.literal("product"), id: z.string().uuid().nullish(), serviceTypeId: z.string().uuid(), offered: z.boolean(), name: z.string().max(40), short: z.string().max(50), pricing: z.enum(["FIXED", "RECURRING"]), paymentEvent: z.enum(["ACCEPTANCE", "DOWNLOAD", "INSTALLATION", "PAYMENT_REQUEST"]), offers: z.boolean(), leadDays: z.number().int().min(0).max(365).nullable(), priceCents: z.number().int().min(0).max(100_000_000).nullable(), imageUrl: z.string().url().max(600).nullable(), pdfUrl: z.string().url().max(600).nullable() }),
]);

export async function POST(req: Request) {
  const viewer = await guardApi("canProvideServices");
  if (viewer instanceof NextResponse) return viewer;
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Check the form." }, { status: 400 });
  try {
    const d = b.data;
    if (d.stop === "product") return NextResponse.json({ ok: true, id: await saveProductRow(viewer, d) });
    if (d.stop === "do") await saveWhatYouDo(viewer, d);
    else if (d.stop === "charge") await saveWhatYouCharge(viewer, d);
    else await enableMyCatalog(viewer);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof CwsError || e instanceof OnboardingError) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e instanceof Error && /publish|company|price|name|type|description|cover|delivery/i.test(e.message)) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
