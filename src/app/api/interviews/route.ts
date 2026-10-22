import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
import { checkTransact, guardApi } from "@/lib/guard";
import { SourcingError } from "@/lib/sourcing";
import { closeInterview, completeInterview, confirmSlot, offerSlots, requestInterview } from "@/lib/interviews";
import { addOpenTime, bookSlot, removeOpenTime } from "@/lib/open-times";
import { TRANSACT_MESSAGE } from "@/lib/transact-message";

// DB-E008/E009: the provider offers times; the buyer confirms one (that makes the video room) or marks it done.
// IW: Open Times — the buyer adds/removes windows and invites (one or many); the provider books a slot or cancels.
type Body = { action?: string; interviewId?: string; lineId?: string; slots?: { startsAt: string; timeZone: string }[];
  date?: string; from?: string; to?: string; timeZone?: string; openTimeId?: string;
  jobId?: string; providerPersonIds?: string[]; minutes?: number; startsAt?: string; as?: string };
const PROVIDER_ACTIONS = new Set(["offer", "book"]);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body;
  const gate = await guardApi(PROVIDER_ACTIONS.has(body.action ?? "") || (body.action === "cancel" && body.as === "provider") ? "canProvideServices" : "canHireTalent");
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
      case "openTimeAdd":
        return NextResponse.json(await addOpenTime(gate, { date: String(body.date ?? ""), from: String(body.from ?? ""), to: String(body.to ?? ""), timeZone: String(body.timeZone ?? "") }));
      case "openTimeRemove":
        await removeOpenTime(gate, String(body.openTimeId ?? ""));
        return NextResponse.json({ ok: true });
      case "invite": {
        const transact = await checkTransact(gate);
        if (!transact.ok) return NextResponse.json({ error: TRANSACT_MESSAGE[transact.reason], code: transact.reason }, { status: 403 });
        const minutes = [15, 30, 45, 60].includes(Number(body.minutes)) ? Number(body.minutes) : 30;
        const ids = [...new Set((body.providerPersonIds ?? []).map(String))].slice(0, 50);
        if (!ids.length) return NextResponse.json({ error: "Pick at least one provider." }, { status: 400 });
        let sent = 0;
        const skipped: string[] = [];
        for (const providerPersonId of ids) {
          try { const r = await requestInterview(gate, { workRequestId: String(body.jobId ?? ""), providerPersonId, mode: "VIDEO", slotMinutes: minutes }); if (r.created) sent++; else skipped.push(providerPersonId); }
          catch (e) { if (e instanceof SourcingError) skipped.push(providerPersonId); else throw e; }
        }
        return NextResponse.json({ ok: true, sent, skipped: skipped.length });
      }
      case "book":
        await bookSlot(gate, id, String(body.startsAt ?? ""), String(body.timeZone ?? ""));
        return NextResponse.json({ ok: true });
      case "cancel":
        await closeInterview(gate, id, body.as === "provider" ? "DECLINED" : "CANCELLED");
        return NextResponse.json({ ok: true });
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    return apiError(e, "interviews", [SourcingError]);
  }
}
