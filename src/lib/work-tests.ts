import { prisma } from "@/lib/prisma";
import {
  SourcingError,
  assertTestRequestLine,
  copyResultFromAttempt,
  testRequestOutcome,
  type TestRequestOutcome,
} from "@/lib/sourcing";
import type { Viewer } from "@/lib/access";

/**
 * ── ⚠⚠⚠ WORK TESTS (`P2-A8-E621` WS-B item 4) ───────────────────────────
 *
 * ⚠⚠⚠ **A CORRECTION I OWE, AND A RULING WAS RECORDED ON MY WRONG ANSWER.**
 *
 * ⚠ At the premise check I reported: *"a work test CANNOT reuse the Learn
 * engine — `learn-assessment.ts` is keyed on `learning_path_id` in EVERY query
 * and certifies against a path."* ⚠⚠ **Ruling 37 recorded that, and added
 * *"a second engine is its own brief — do not build one inside this brief."***
 *
 * ⚠⚠⚠ **THE FIRST HALF WAS WRONG, AND I MEASURED IT WRONG THE FIRST TIME.** It
 * is true that `learn-assessment.ts` GENERATES an assessment from a path's
 * lessons — but **reuse here was never code-sharing. It is a FOREIGN KEY**, and
 * the schema already says so: `TestRequestLine.learn_assessment_id` is **NOT
 * NULL**. A work test generates nothing; it POINTS AT an assessment that exists.
 *
 * ⚠ MEASURED 2026-09-24: **8 `LearnAssessment` rows, 2 of them `PUBLISHED`** —
 * so a buyer has something real to send. And every mechanism the chain needs
 * already has a writer:
 *
 * | piece | writer, measured |
 * |---|---|
 * | taking the assessment | ⚠ `learn-assessment.ts:892` — `learnTestAttempt.create`, LIVE |
 * | attempts used vs allowed | `testRequestOutcome()` in `sourcing.ts` |
 * | the published-assessment guard | `assertTestRequestLine()` in `sourcing.ts` |
 * | the result | ⚠⚠ `copyResultFromAttempt()` — and it REFUSES a supplied score |
 *
 * ⚠⚠ **SO THE RULING'S INSTRUCTION IS OBEYED, NOT OVERTURNED: NO SECOND ENGINE
 * IS BUILT HERE.** ⚠ All four helpers above are IMPORTED, never restated —
 * three of them had no caller at all until this file, which is why the premise
 * read as *"nothing reuses Learn"*: **the bridge was built and unused, not
 * absent.** ⚠ Ruling 26's recruiter-sent audit test lands on the same engine and
 * inherits this rather than needing its own.
 *
 * ── ⚠⚠ WHAT THIS FILE DELIBERATELY DOES NOT DO ──────────────────────────
 *
 * ⚠⚠⚠ **IT SENDS NO NOTIFICATION, AND THAT IS MEASURED, NOT FORGOTTEN.** Four
 * `work.*` events are registered — `proposal_received`, `interview_requested`,
 * `order_offered`, `settlement_approval` — and **none of them is about a test.**
 * ⚠ Ruling 37: *"call the event that exists; do not invent a second."* Inventing
 * `work.test_requested` here would register an event inside a brief that was not
 * asked to, so **the provider is told on the page, not by mail, and the missing
 * event is reported as owed.**
 * ⚠ It moves no money and touches no `Payment` (ruling 25).
 */

async function ownPerson(viewer: Viewer) {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) throw new SourcingError("No person for this account.", "NOT_FOUND");
  return person;
}

/**
 * The buyer sends a test. ⚠ Created `ISSUED`, in one act.
 *
 * ⚠⚠ THE PUBLISHED CHECK IS `assertTestRequestLine`, IMPORTED. A `DRAFT`
 * assessment has not been read by a human (`LearnAssessment.status` defaults
 * `DRAFT` precisely so an unreviewed question bank cannot award anything), and
 * ⚠ MEASURED: **6 of the 8 rows are `DRAFT`** — so this is not hypothetical.
 * ⚠⚠⚠ A second copy of that rule here is exactly the `E585` shape; the guard's
 * own docblock calls a DRAFT test *"a dead end the provider cannot clear."*
 */
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
    select: { id: true, buyer_person_id: true, status: true },
  });
  if (!wr) throw new SourcingError("That work request isn't available.", "NOT_FOUND");
  if (wr.buyer_person_id !== me.id) {
    throw new SourcingError("Only the buyer can send a test.", "NOT_BUYER");
  }

  const assessment = await prisma.learnAssessment.findUnique({
    where: { id: input.learnAssessmentId },
    select: { id: true, status: true },
  });
  /* ⚠⚠ THE IMPORTED GUARD, GIVEN THE SHAPE IT ASKS FOR. It refuses a missing
     assessment AND an unpublished one, in one call, with the copy it owns. */
  assertTestRequestLine({ assessment });

  /* ⚠ The provider must have proposed — the same rule `requestInterview` holds,
     for the same reason: a test is a step in a conversation already started. */
  const proposal = await prisma.providerBid.findUnique({
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

  /* ⚠⚠ ONE OPEN TEST PER PROVIDER PER REQUEST, AND IT RETURNS THE EXISTING ONE
     RATHER THAN THROWING — the idempotency shape `requestInterview` uses.
     `COMPLETED`, `DECLINED` and `EXPIRED` are finished, so a buyer may send
     another after any of them. */
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
      provider_bid_id: proposal.id,
      /* ⚠⚠ ISSUED IN ONE ACT. A `DRAFT` test request would be a test nobody
         sent, and no screen resumes one — a state with no way out is the
         door-onto-a-wall shape `E579` names. */
      status: "ISSUED",
      issued_at: new Date(),
      responds_by: input.respondsBy ?? null,
      message: input.message?.trim() || null,
      lines: {
        create: [
          {
            line_number: 1,
            /* ⚠⚠⚠ THE FOREIGN KEY **IS** THE REUSE. No engine is copied. */
            learn_assessment_id: assessment!.id,
          },
        ],
      },
    },
    select: { id: true },
  });

  return { id: created.id, created: true };
}

/**
 * ⚠⚠⚠ WHAT THE PROVIDER IS ALLOWED TO DO ABOUT THIS TEST — AND IT IS A READ.
 *
 * ⚠⚠ **A BUYER'S REQUEST GRANTS NO ATTEMPTS AND CONSUMES NONE.** Attempts are
 * counted where they always were — `LearnTestAttempt` by `(user_id,
 * learning_path_id)`, the same pair `learn-assessment.ts` refuses past — so a
 * second buyer asking for the same test cannot hand the provider a fresh set of
 * tries, and cannot burn the ones they have.
 *
 * ⚠⚠⚠ **AN EXISTING PASS IS REUSED, NOT RE-SAT.** The schema says so in as many
 * words: *"a second buyer requesting the same test points at THE EXISTING
 * ATTEMPT — it does not force a retake — or the test becomes a toll gate rather
 * than a credential."* ⚠ `testRequestOutcome` is the one place that decides
 * between the three states, and it is imported.
 */
export async function testStateFor(
  viewer: Viewer,
  testRequestId: string
): Promise<TestRequestOutcome> {
  const tr = await prisma.testRequest.findFirst({
    where: { id: testRequestId, provider_person_id: (await ownPerson(viewer)).id },
    select: {
      id: true,
      lines: {
        select: { learn_assessment_id: true },
        orderBy: { line_number: "asc" },
        take: 1,
      },
    },
  });
  if (!tr) throw new SourcingError("That test isn't yours.", "NOT_FOUND");
  const line = tr.lines[0];
  if (!line) throw new SourcingError("That test has no questions.", "NO_LINES");

  const assessment = await prisma.learnAssessment.findUnique({
    where: { id: line.learn_assessment_id },
    select: { id: true, learning_path_id: true, max_attempts: true },
  });
  if (!assessment) throw new SourcingError("That test doesn't exist.", "NOT_FOUND");

  /* ⚠⚠ COUNTED ON `(user_id, learning_path_id)` — THE LEARN RULE'S OWN PAIR, so
     the two cannot disagree about how many tries are left. */
  const where = {
    user_id: viewer.userId,
    learning_path_id: assessment.learning_path_id,
  };
  const [attemptsUsed, passed] = await Promise.all([
    prisma.learnTestAttempt.count({ where }),
    prisma.learnTestAttempt.findFirst({
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

/**
 * ⚠⚠⚠ RECORD THE RESULT — **COPIED FROM THE ATTEMPT, NEVER SUPPLIED.**
 *
 * ⚠ `copyResultFromAttempt` is imported, and it THROWS if a caller passes a
 * score: *"a typed score is a second source of truth."* ⚠⚠ That guard existed
 * with nothing calling it; **this is its first caller**, and it is what makes a
 * work test's result unforgeable — the number comes from the attempt the
 * provider actually sat, and `LearnTestAttempt` stays the system of record.
 *
 * ⚠⚠ THE PROVIDER RECORDS THEIR OWN. They sat it; the attempt is theirs; the
 * buyer reads the outcome. A buyer writing a provider's score would be a second
 * writer for a number that already has one.
 */
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
        select: { id: true, learn_assessment_id: true },
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

  const attempt = await prisma.learnTestAttempt.findUnique({
    where: { id: input.learnTestAttemptId },
    select: {
      id: true,
      score: true,
      passed: true,
      created_at: true,
      user_id: true,
      assessment_id: true,
    },
  });
  if (!attempt) throw new SourcingError("That attempt doesn't exist.", "NOT_FOUND");
  /* ⚠⚠⚠ THE ATTEMPT MUST BE **THEIRS**, AND OF **THIS** ASSESSMENT. Without the
     first, a provider could point at somebody else's pass; without the second,
     at their own pass on an easier test. Either one forges the result, and
     neither is caught by the copy guard — that one only stops a TYPED score.
     ⚠ The owner column is `user_id`, not a person id: `LearnTestAttempt` is
     keyed on the USER because that is who sits a lesson. */
  if (attempt.user_id !== viewer.userId) {
    throw new SourcingError("That attempt isn't yours.", "ATTEMPT_NOT_YOURS");
  }
  if (attempt.assessment_id !== line.learn_assessment_id) {
    throw new SourcingError("That attempt is for a different test.", "ATTEMPT_WRONG_TEST");
  }

  /* ⚠ The guard that refuses a supplied score. The empty draft IS the point —
     there is no parameter through which a score could arrive. */
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
    /* ⚠ One line per request line, replaced rather than appended, so a provider
       who re-sits and records again does not leave two scores behind. */
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

/**
 * ⚠ The provider declines a test. ⚠⚠ RECORDED, NEVER DELETED — the same rule the
 * withdrawn proposal and the closed interview both hold.
 */
export async function declineTest(viewer: Viewer, testRequestId: string): Promise<void> {
  const me = await ownPerson(viewer);
  /* ⚠⚠ OWNER-SCOPED IN THE `where` (load-bearing rule 5), and `updateMany` so a
     crafted id matches nothing rather than throwing on somebody else's row. */
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
