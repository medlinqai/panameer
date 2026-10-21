import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
import { guardApi } from "@/lib/guard";
import { SourcingError } from "@/lib/sourcing";
import { completeInterview, confirmSlot, offerSlots } from "@/lib/interviews";

// DB-E008/E009: the provider offers times; the buyer confirms one (that makes the video room) or marks it done.
type Body = { action?: string; interviewId?: string; lineId?: string; slots?: { startsAt: string; timeZone: string }[] };

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body;
  const gate = await guardApi(body.action === "offer" ? "canProvideServices" : "canHireTalent");
  if (gate instanceof NextResponse) return gate;
  const id = String(body.interviewId ?? "");
  try {
    switch (body.action) {
      case "offer":
        await offerSlots(gate, id, (body.slots ?? []).slice(0, 5).map((s) => ({ starts_at: new Date(s.startsAt), time_zone: s.timeZone || "America/New_York" })));
        return NextResponse.json({ ok: true });
      case "confirm":
        await confirmSlot(gate, id, String(body.lineId ?? ""));
        return NextResponse.json({ ok: true });
      case "complete":
        await completeInterview(gate, id);
        return NextResponse.json({ ok: true });
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    return apiError(e, "interviews", [SourcingError]);
  }
}
