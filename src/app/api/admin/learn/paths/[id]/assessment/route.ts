import { NextResponse } from "next/server";
import { notifyTestOpened } from "@/lib/learn-watch";
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;

  const row = await prisma.certificationTest.findUnique({ where: { learning_path_id: id } });
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

  // THE ACTION IS AN ALLOW-LIST, NOT A SWITCH WITH A DEFAULT. An unrecognised
  if (body?.action === "publish") {
    const out = await publishAssessment(id, viewer.userId);
    // L-E042: once published, enrolled members and test watchers hear it's open.
    if (out.ok) await notifyTestOpened(id);
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

  // Regenerating REPLACES the set but leaves past attempts standing. Someone who
  const row = await prisma.certificationTest.upsert({
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
