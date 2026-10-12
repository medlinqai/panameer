import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { setRateOverride } from "@/lib/company-catalog";

const Body = z.object({ serviceId: z.string().uuid(), rateCents: z.number().int().min(1).max(100_000_000).nullable(), unit: z.enum(["HOUR", "DAY", "WEEK", "MONTH", "SESSION", "VISIT", "EACH"]).nullable().optional() });

// BT-E005: Override My Rate — a provider's own rate for a company service (owner-scoped in the lib).
export async function POST(req: Request) {
  const viewer = await guardApi("canProvideServices");
  if (viewer instanceof NextResponse) return viewer;
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  try {
    await setRateOverride(viewer, b.data.serviceId, b.data.rateCents, b.data.unit ?? null);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
