import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/guard";
import {
  MIN_REVIEWED_QUESTIONS,
  dropQuestions,
  generateAssessment,
  getTestState,
  publishAssessment,
  readQuestions,
  unpublishAssessment,
} from "@/lib/learn-assessment";

/**
 * GET   — the current question set, WITH answers (admin review).
 * POST  — regenerate it.
 * PATCH — the REVIEW ACTIONS: `publish`, `unpublish`, `drop` (P1-J3-E020).
 *
 * Admins see correctIndex; learners never do. That asymmetry is the whole point
 * of the brief's "admin can review/tweak" — you cannot judge whether a
 * generated question is fair without seeing which answer it expects.
 *
 * ── ⚠ WHY PATCH AND NOT A SECOND POST ────────────────────────────────────────
 *
 * `POST` already means REGENERATE here, and regenerate is the one action that
 * throws the reviewer's work away. Overloading it with a body discriminator would
 * make "publish" one typo away from "replace every question". Separate verb,
 * separate blast radius.
 *
 * ⚠ THE SCREEN THIS SERVES IS NOT AN EDITOR. There is no route to add a question
 * or rewrite a stem, deliberately — see the note in `learn-assessment.ts`.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;

  const row = await prisma.learnAssessment.findUnique({ where: { learning_path_id: id } });
  /*
    ⚠ THE REVIEWER NEEDS THE PROVENANCE, NOT JUST THE QUESTIONS. `source_note`
    holds which documentation URLs informed the set and `status`/`reviewed_*` say
    whether anyone has stood behind it — all three were already stored and none of
    them reached the client.
  */
  const reviewer = row?.reviewed_by
    ? await prisma.person.findUnique({
        where: { id: row.reviewed_by },
        select: { first_name: true, last_name: true },
      })
    : null;
  return NextResponse.json({
    exists: Boolean(row),
    model: row?.model ?? null,
    generatedAt: row?.generated_at ?? null,
    threshold: row?.pass_threshold ?? 70,
    maxAttempts: row?.max_attempts ?? 3,
    status: row?.status ?? null,
    sourceNote: row?.source_note ?? null,
    reviewedAt: row?.reviewed_at ?? null,
    reviewedBy: reviewer ? `${reviewer.first_name} ${reviewer.last_name}`.trim() : null,
    minQuestions: MIN_REVIEWED_QUESTIONS,
    questions: row ? readQuestions(row) : [],
    state: await getTestState(null, id),
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;
  const viewer = gate;
  const { id } = await params;

  const body = (await request.json().catch(() => null)) as
    | { action?: string; dropIds?: unknown }
    | null;

  /*
    ⚠ THE ACTION IS AN ALLOW-LIST, NOT A SWITCH WITH A DEFAULT. An unrecognised
    string must do NOTHING — a default branch that fell through to `publish` is
    how a stale client publishes a set nobody read.
  */
  if (body?.action === "publish") {
    const out = await publishAssessment(id, viewer.userId);
    return out.ok
      ? NextResponse.json({ ok: true, status: out.status, questions: out.questions })
      : NextResponse.json({ error: out.message, code: out.code }, { status: 409 });
  }

  if (body?.action === "unpublish") {
    const out = await unpublishAssessment(id);
    return out.ok
      ? NextResponse.json({ ok: true, status: out.status, questions: out.questions })
      : NextResponse.json({ error: out.message, code: out.code }, { status: 409 });
  }

  if (body?.action === "drop") {
    const ids = Array.isArray(body.dropIds)
      ? body.dropIds.filter((x): x is string => typeof x === "string")
      : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "Nothing to drop." }, { status: 400 });
    }
    const out = await dropQuestions(id, ids);
    return out.ok
      ? NextResponse.json({ ok: true, status: out.status, questions: out.questions })
      : NextResponse.json({ error: out.message, code: out.code }, { status: 409 });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;

  const outcome = await generateAssessment(id);
  if (!outcome.ok) {
    return NextResponse.json({ error: outcome.message }, { status: 503 });
  }

  /*
    Regenerating REPLACES the set but leaves past attempts standing. Someone who
    passed last week passed a real test; deleting the questions they answered
    doesn't undo that, and cascading the attempts away would quietly revoke
    credentials that were properly earned.
  */
  const row = await prisma.learnAssessment.upsert({
    where: { learning_path_id: id },
    create: { learning_path_id: id, questions: outcome.questions, model: outcome.model },
    update: { questions: outcome.questions, model: outcome.model, generated_at: new Date() },
  });

  console.info(
    `[learn-assessment] regenerated path=${id} questions=${outcome.questions.length} ms=${outcome.ms}`
  );
  return NextResponse.json({
    ok: true,
    questions: readQuestions(row),
    model: outcome.model,
    ms: outcome.ms,
  });
}
