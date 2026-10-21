import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
import { guardApi } from "@/lib/guard";
import { WorkRequestError } from "@/lib/work-request";
import { SourcingError } from "@/lib/sourcing";
import { declineInEvent, extendDeadline, notifyOthers, proposeInEvent, setProposalStatus } from "@/lib/sourcing-events";

// SE: Sourcing Event actions — the provider proposes or declines; the buyer runs the event.
type Body = { action?: string; jobId?: string; eventId?: string; rateCents?: number; start?: string | null; note?: string | null; reason?: string; hours?: number; proposalId?: string };
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
      case "shortlist":
      case "unshortlist":
      case "declineProposal":
        await setProposalStatus(gate, String(body.eventId ?? ""), String(body.proposalId ?? ""), body.action === "shortlist" ? "SHORTLISTED" : body.action === "unshortlist" ? "SUBMITTED" : "DECLINED");
        return NextResponse.json({ ok: true });
      case "notifyOthers":
        return NextResponse.json(await notifyOthers(gate, String(body.eventId ?? ""), String(body.note ?? "")));
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    return apiError(e, "sourcing", [WorkRequestError, SourcingError]);
  }
}
