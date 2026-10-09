import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { guardApi } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { publishAssessment, readQuestions, toPublicQuestions } from "@/lib/learn-assessment";
import { notifyTestOpened } from "@/lib/learn-watch";

// L-E042: an admin takes a DRAFT test as a preview — sees the answers, flags questions, publishes. No certificate.
async function load(id: string) {
  return prisma.certificationTest.findUnique({ where: { learning_path_id: id } });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;
  const t = await load((await params).id);
  if (!t) return NextResponse.json({ error: "No test for this path yet." }, { status: 404 });
  return NextResponse.json({ status: t.status, threshold: t.pass_threshold, questions: toPublicQuestions(readQuestions(t)), flags: t.review_flags ?? [] });
}

const BODY = z.discriminatedUnion("action", [
  z.object({ action: z.literal("grade"), answers: z.record(z.string(), z.number().int().min(0)) }),
  z.object({ action: z.literal("flag"), questionId: z.string().max(100), note: z.string().min(2).max(1000) }),
  z.object({ action: z.literal("publish") }),
]);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  const b = BODY.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const t = await load(id);
  if (!t) return NextResponse.json({ error: "No test for this path yet." }, { status: 404 });
  const qs = readQuestions(t);

  if (b.data.action === "grade") {
    const answers = b.data.answers;
    const results = qs.map((q) => ({ id: q.id, question: q.question, options: q.options, chosen: answers[q.id] ?? null, correctIndex: q.correctIndex, right: answers[q.id] === q.correctIndex, explanation: q.explanation ?? null }));
    const correct = results.filter((r) => r.right).length;
    const score = qs.length ? Math.round((correct / qs.length) * 100) : 0;
    // Recorded as a preview: never counts as an attempt and never issues a certificate.
    await prisma.certificationAttempt.create({ data: { certification_test_id: t.id, user_id: gate.userId, learning_path_id: id, score, passed: score >= t.pass_threshold, answers, is_preview: true } });
    return NextResponse.json({ score, correct, total: qs.length, threshold: t.pass_threshold, results });
  }
  if (b.data.action === "flag") {
    const person = await prisma.person.findUnique({ where: { user_id: gate.userId }, select: { id: true } });
    const flags = Array.isArray(t.review_flags) ? (t.review_flags as Prisma.InputJsonValue[]) : [];
    const index = qs.findIndex((q) => q.id === (b.data as { questionId: string }).questionId);
    await prisma.certificationTest.update({ where: { id: t.id }, data: { review_flags: [...flags, { questionId: b.data.questionId, index: index + 1, note: b.data.note, by: person?.id ?? null, at: new Date().toISOString() }] } });
    return NextResponse.json({ ok: true });
  }
  const r = await publishAssessment(id, gate.userId);
  if (!r.ok) return NextResponse.json({ error: r.message }, { status: 400 });
  const told = await notifyTestOpened(id);
  return NextResponse.json({ ok: true, status: r.status, told });
}
