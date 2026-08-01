import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/guard";
import {
  generateAssessment,
  getTestState,
  readQuestions,
} from "@/lib/learn-assessment";

/**
 * GET  — the current question set, WITH answers (admin review).
 * POST — regenerate it.
 *
 * Admins see correctIndex; learners never do. That asymmetry is the whole point
 * of the brief's "admin can review/tweak" — you cannot judge whether a
 * generated question is fair without seeing which answer it expects.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;

  const row = await prisma.learnAssessment.findUnique({ where: { learning_path_id: id } });
  return NextResponse.json({
    exists: Boolean(row),
    model: row?.model ?? null,
    generatedAt: row?.generated_at ?? null,
    threshold: row?.pass_threshold ?? 70,
    maxAttempts: row?.max_attempts ?? 3,
    questions: row ? readQuestions(row) : [],
    state: await getTestState(null, id),
  });
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
