import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
import { guardApi } from "@/lib/guard";
import { SourcingError } from "@/lib/sourcing";
import { WorkRequestError } from "@/lib/work-request";
import { closeJob, duplicateJob, holdJob, logExtend, reopenJob, resumeJob } from "@/lib/job-actions";
import { extendDeadline } from "@/lib/sourcing-events";
import { prisma } from "@/lib/prisma";

// JS-E003/E004: the Job page's Actions menu — owner-scoped from the session.
type Body = { action?: string; jobId?: string; reason?: string; note?: string | null; until?: string | null; hours?: number };

export async function POST(request: Request) {
  const gate = await guardApi("canHireTalent");
  if (gate instanceof NextResponse) return gate;
  const b = (await request.json().catch(() => ({}))) as Body;
  const jobId = String(b.jobId ?? "");
  try {
    switch (b.action) {
      case "close": await closeJob(gate, jobId, String(b.reason ?? ""), b.note ?? null); return NextResponse.json({ ok: true });
      case "hold": await holdJob(gate, jobId, b.until ?? null); return NextResponse.json({ ok: true });
      case "resume": await resumeJob(gate, jobId); return NextResponse.json({ ok: true });
      case "reopen": await reopenJob(gate, jobId); return NextResponse.json({ ok: true });
      case "duplicate": return NextResponse.json({ jobId: await duplicateJob(gate, jobId) });
      case "extend": {
        const ev = await prisma.sourcingEvent.findFirst({ where: { job_id: jobId, status: { in: ["OPEN", "CLOSED"] } }, orderBy: { created_at: "desc" }, select: { id: true } });
        if (!ev) return NextResponse.json({ error: "There's no answer deadline to extend." }, { status: 400 });
        await extendDeadline(gate, ev.id, Number(b.hours));
        const me = await prisma.person.findUnique({ where: { user_id: gate.userId }, select: { id: true } });
        if (me) await logExtend(jobId, Math.round(Number(b.hours)), me.id);
        return NextResponse.json({ ok: true });
      }
      default: return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    return apiError(e, "job-actions", [SourcingError, WorkRequestError]);
  }
}
