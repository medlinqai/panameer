import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { keepSuggestion, proposeFromResume, removeSuggestion } from "@/lib/catalog-suggestions";

const UNITS = ["HOUR", "DAY", "WEEK", "MONTH", "SESSION", "VISIT", "EACH"] as const;
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("refresh") }),
  z.object({ action: z.literal("keep"), id: z.string().uuid(), rateCents: z.number().int().min(0).max(100_000_000).nullable().optional(), unit: z.enum(UNITS).nullable().optional() }),
  z.object({ action: z.literal("remove"), id: z.string().uuid() }),
]);

// BT-E003: Suggested from your résumé — read the résumé once, then Keep / Remove each draft (owner-scoped in the lib).
export const maxDuration = 60;
export async function POST(req: Request) {
  const viewer = await guardApi("canProvideServices");
  if (viewer instanceof NextResponse) return viewer;
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  try {
    const d = b.data;
    if (d.action === "refresh") return NextResponse.json({ ok: true, ...((await proposeFromResume(viewer)) ?? { proposed: 0, source: null }) });
    if (d.action === "keep") await keepSuggestion(viewer, d.id, d);
    else await removeSuggestion(viewer, d.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
