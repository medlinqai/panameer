import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { WorkRequestError } from "@/lib/work-request";
import { SourcingError } from "@/lib/sourcing";
import { declineInEvent, extendDeadline, proposeInEvent } from "@/lib/sourcing-events";

// SE: Sourcing Event actions — the provider proposes or declines; the buyer runs the event.
type Body = { action?: string; jobId?: string; eventId?: string; rateCents?: number; start?: string | null; note?: string | null; reason?: string; hours?: number };
const PROVIDER = new Set(["propose", "decline"]);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body;
  const gate = await guardApi(PROVIDER.has(body.action ?? "") ? "canProvideServices" : "canHireTalent");
  if (gate instanceof NextResponse) return gate;
  try {
    switch (body.action) {
      case "propose":
        return NextResponse.json(await proposeInEvent(gate, String(body.jobId ?? ""), { rateCents: Number(body.rateCents), start: body.start, note: body.note }));
      case "decline":
        await declineInEvent(gate, String(body.jobId ?? ""), String(body.reason ?? ""));
        return NextResponse.json({ ok: true });
      case "extend":
        return NextResponse.json({ deadlineAt: await extendDeadline(gate, String(body.eventId ?? ""), Number(body.hours ?? 24)) });
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    if (e instanceof WorkRequestError || e instanceof SourcingError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[sourcing] failed:", e);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
