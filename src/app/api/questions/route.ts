import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
import { checkTransact, guardApi } from "@/lib/guard";
import { SourcingError } from "@/lib/sourcing";
import { TRANSACT_MESSAGE } from "@/lib/transact-message";
import { draftQuestions, saveAnswers, sendQuestions } from "@/lib/job-questions";

// AQ: the buyer drafts (AI) and sends written questions; the provider saves or sends answers.
type Body = { action?: string; jobId?: string; providerPersonIds?: string[]; questions?: string[]; dueAt?: string | null; answerId?: string; answers?: string[] };

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body;
  const provider = body.action === "save" || body.action === "sendAnswers";
  const gate = await guardApi(provider ? "canProvideServices" : "canHireTalent");
  if (gate instanceof NextResponse) return gate;
  try {
    switch (body.action) {
      case "draft":
        return NextResponse.json({ questions: await draftQuestions(gate, String(body.jobId ?? "")) });
      case "send": {
        const transact = await checkTransact(gate);
        if (!transact.ok) return NextResponse.json({ error: TRANSACT_MESSAGE[transact.reason], code: transact.reason }, { status: 403 });
        return NextResponse.json(await sendQuestions(gate, { jobId: String(body.jobId ?? ""), providerPersonIds: (body.providerPersonIds ?? []).map(String), questions: (body.questions ?? []).map(String), dueAt: body.dueAt ?? null }));
      }
      case "save":
      case "sendAnswers":
        await saveAnswers(gate, String(body.answerId ?? ""), (body.answers ?? []).map(String), body.action === "sendAnswers");
        return NextResponse.json({ ok: true });
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    return apiError(e, "questions", [SourcingError]);
  }
}
