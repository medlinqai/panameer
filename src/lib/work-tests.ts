import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import {
  SourcingError,
  assertTestRequestLine,
  copyResultFromAttempt,
  testRequestOutcome,
  type TestRequestOutcome,
} from "@/lib/sourcing";
import type { Viewer } from "@/lib/access";

async function ownPerson(viewer: Viewer) {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) throw new SourcingError("No person for this account.", "NOT_FOUND");
  return person;
}

export async function sendTest(
  viewer: Viewer,
  input: {
    workRequestId: string;
    providerPersonId: string;
    learnAssessmentId: string;
    respondsBy?: Date | null;
    message?: string | null;
  }
): Promise<{ id: string; created: boolean }> {
  const me = await ownPerson(viewer);

  const wr = await prisma.workRequest.findUnique({
    where: { id: input.workRequestId },
    select: { id: true, buyer_person_id: true, status: true, title: true },
  });
  if (!wr) throw new SourcingError("That work request isn't available.", "NOT_FOUND");
  if (wr.buyer_person_id !== me.id) {
    throw new SourcingError("Only the buyer can send a test.", "NOT_BUYER");
  }

  const assessment = await prisma.certificationTest.findUnique({
    where: { id: input.learnAssessmentId },
    select: { id: true, status: true },
  });
  assertTestRequestLine({ assessment });

  const proposal = await prisma.proposal.findUnique({
    where: {
      work_request_id_provider_person_id: {
        work_request_id: wr.id,
        provider_person_id: input.providerPersonId,
      },
    },
    select: { id: true, status: true },
  });
  if (!proposal || proposal.status === "WITHDRAWN") {
    throw new SourcingError(
      "That provider hasn't proposed on this work request.",
      "NO_PROPOSAL"
    );
  }

  const open = await prisma.testRequest.findFirst({
    where: {
      work_request_id: wr.id,
      provider_person_id: input.providerPersonId,
      status: { in: ["DRAFT", "ISSUED", "IN_PROGRESS"] },
    },
    select: { id: true },
  });
  if (open) return { id: open.id, created: false };

  const created = await prisma.testRequest.create({
    data: {
      request_number: `TR-${Date.now().toString(36).toUpperCase()}-${input.providerPersonId.slice(0, 4)}`,
      work_request_id: wr.id,
      provider_person_id: input.providerPersonId,
      requested_by_person_id: me.id,
      proposal_id: proposal.id,
      // ISSUED IN ONE ACT. A `DRAFT` test request would be a test nobody
      status: "ISSUED",
      issued_at: new Date(),
      responds_by: input.respondsBy ?? null,
      message: input.message?.trim() || null,
      lines: {
        create: [
          {
            line_number: 1,
            /* THE FOREIGN KEY **IS** THE REUSE. No engine is copied. */
            certification_test_id: assessment!.id,
          },
        ],
      },
    },
    select: { id: true },
  });

  // THE PROVIDER IS TOLD WS-E)
  await notify({
    event: "work.test_requested",
    personId: input.providerPersonId,
    entityType: "test_request",
    entityId: created.id,
    dedupeKey: `work.test_requested:${created.id}`,
    // THE REQUEST IS NAMED; THE BUYER STILL IS NOT
    vars: { requestId: wr.id, requestTitle: wr.title },
  });

  return { id: created.id, created: true };
}

/** WHAT THE PROVIDER IS ALLOWED TO DO ABOUT THIS TEST — AND IT IS A READ. */
export async function testStateFor(
  viewer: Viewer,
  testRequestId: string
): Promise<TestRequestOutcome> {
  const tr = await prisma.testRequest.findFirst({
    where: { id: testRequestId, provider_person_id: (await ownPerson(viewer)).id },
    select: {
      id: true,
      lines: {
        select: { certification_test_id: true },
        orderBy: { line_number: "asc" },
        take: 1,
      },
    },
  });
  if (!tr) throw new SourcingError("That test isn't yours.", "NOT_FOUND");
  const line = tr.lines[0];
  if (!line) throw new SourcingError("That test has no questions.", "NO_LINES");

  const assessment = await prisma.certificationTest.findUnique({
    where: { id: line.certification_test_id },
    select: { id: true, learning_path_id: true, max_attempts: true },
  });
  if (!assessment) throw new SourcingError("That test doesn't exist.", "NOT_FOUND");

  // COUNTED ON `(user_id, learning_path_id)` — THE LEARN RULE'S OWN PAIR, so
  const where = {
    user_id: viewer.userId,
    learning_path_id: assessment.learning_path_id,
  };
  const [attemptsUsed, passed] = await Promise.all([
    prisma.certificationAttempt.count({ where }),
    prisma.certificationAttempt.findFirst({
      where: { ...where, passed: true },
      orderBy: { created_at: "desc" },
      select: { id: true },
    }),
  ]);

  return testRequestOutcome({
    attemptsUsed,
    attemptsAllowed: assessment.max_attempts,
    passedAttemptId: passed?.id ?? null,
  });
}

/** RECORD THE RESULT — COPIED FROM THE ATTEMPT, NEVER SUPPLIED. */
export async function recordTestResult(
  viewer: Viewer,
  input: { testRequestId: string; learnTestAttemptId: string }
): Promise<{ passed: boolean; score: number }> {
  const me = await ownPerson(viewer);

  const tr = await prisma.testRequest.findFirst({
    where: { id: input.testRequestId, provider_person_id: me.id },
    select: {
      id: true,
      status: true,
      lines: {
        select: { id: true, certification_test_id: true },
        orderBy: { line_number: "asc" },
        take: 1,
      },
    },
  });
  if (!tr) throw new SourcingError("That test isn't yours.", "NOT_FOUND");
  if (tr.status !== "ISSUED" && tr.status !== "IN_PROGRESS") {
    throw new SourcingError("That test isn't open.", "NOT_OPEN");
  }
  const line = tr.lines[0];
  if (!line) throw new SourcingError("That test has no questions.", "NO_LINES");

  const attempt = await prisma.certificationAttempt.findUnique({
    where: { id: input.learnTestAttemptId },
    select: {
      id: true,
      score: true,
      passed: true,
      created_at: true,
      user_id: true,
      certification_test_id: true,
    },
  });
  if (!attempt) throw new SourcingError("That attempt doesn't exist.", "NOT_FOUND");
  // THE ATTEMPT MUST BE THEIRS, AND OF THIS ASSESSMENT. Without the
  if (attempt.user_id !== viewer.userId) {
    throw new SourcingError("That attempt isn't yours.", "ATTEMPT_NOT_YOURS");
  }
  if (attempt.certification_test_id !== line.certification_test_id) {
    throw new SourcingError("That attempt is for a different test.", "ATTEMPT_WRONG_TEST");
  }

  // The guard that refuses a supplied score. The empty draft IS the point —
  const copied = copyResultFromAttempt({}, attempt);

  await prisma.$transaction(async (tx) => {
    const response = await tx.testResponse.upsert({
      where: { test_request_id: tr.id },
      create: {
        response_number: `TS-${Date.now().toString(36).toUpperCase()}-${me.id.slice(0, 4)}`,
        test_request_id: tr.id,
        provider_person_id: me.id,
        submitted_at: new Date(),
        status: "COMPLETED",
      },
      update: { submitted_at: new Date(), status: "COMPLETED" },
      select: { id: true },
    });
    // One line per request line, replaced rather than appended, so a provider
    await tx.testResponseLine.deleteMany({ where: { test_response_id: response.id } });
    await tx.testResponseLine.create({
      data: {
        test_response_id: response.id,
        line_number: 1,
        test_request_line_id: line.id,
        ...copied,
      },
    });
    await tx.testRequest.update({ where: { id: tr.id }, data: { status: "COMPLETED" } });
  });

  return { passed: copied.passed, score: copied.score };
}

/** The provider declines a test. RECORDED, NEVER DELETED — the same rule the */
export async function declineTest(viewer: Viewer, testRequestId: string): Promise<void> {
  const me = await ownPerson(viewer);
  // OWNER-SCOPED IN THE `where` (load-bearing rule 5), and `updateMany` so a
  const res = await prisma.testRequest.updateMany({
    where: {
      id: testRequestId,
      provider_person_id: me.id,
      status: { in: ["ISSUED", "IN_PROGRESS"] },
    },
    data: { status: "DECLINED" },
  });
  if (res.count === 0) {
    throw new SourcingError("That test can't be declined.", "NOT_DECLINABLE");
  }
}
