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
            certification_test_id: assessment!.id,
          },
        ],
      },
    },
    select: { id: true },
  });

  /*
    ── ⚠⚠⚠ THE PROVIDER IS TOLD (`P2-A8-E683a` WS-E) ───────────────────────

    ⚠⚠ **THIS WRITER SHIPPED WITHOUT AN EVENT AND TOLD NOBODY.** Measured at
    WS-E's premise check: **zero `notify()` calls in this file**, and no
    `work.test_*` entry in the registry at all — so a buyer could send a test
    and the provider would never learn it existed. ⚠ It is `E680`'s shape
    exactly: the writer landed ahead of its event.

    ⚠⚠ **IT IS A WORKLIST ITEM** — the provider owes a response, and it clears
    when they sit the test or decline it.
    ⚠⚠⚠ **NO BUYER NAME IS PASSED**, and that is the load-bearing omission:
    `WorkRequest` carries `company_visibility`/`company_code_name`, and
    `buildBuyerIdentity` is the ONE redaction deciding what a provider may see.
    A notification is outside the page that applies it, so passing the name here
    would bypass the rule `check:work-request-identity` guards. The title falls
    back to *"A buyer"*, which is true under both visibilities.
    ⚠ Deduped on the request, so re-sending cannot stack a second worklist row —
    and `sendTest` already returns the open one rather than creating a second.
    ⚠⚠ `notify` catches its own failures and never rethrows, so a notification
    outage cannot turn a sent test into an error the buyer sees.
  */
  await notify({
    event: "work.test_requested",
    personId: input.providerPersonId,
    entityType: "test_request",
    entityId: created.id,
    dedupeKey: `work.test_requested:${created.id}`,
    /*
      ── ⚠⚠⚠ THE REQUEST IS NAMED; THE BUYER STILL IS NOT (`P2-ALL-E802`) ────

      ⚠ **SCOTT, 2026-10-03:** *"show each pending test once (name the
      buyer/skill if known)."*
      ⚠⚠⚠ **THE BUYER CANNOT BE NAMED HERE AND THAT IS DELIBERATE, NOT AN
      OMISSION** — `buildBuyerIdentity` is the one redaction deciding what a
      provider may see of `company_visibility` / `company_code_name`, a
      notification is outside the page that applies it, and passing the name
      would bypass the rule `check:work-request-identity` guards. The paragraph
      above this call says so.
      ⚠⚠ **AND THERE IS NO SKILL TO NAME: `TestRequest` RECORDS NONE** (measured
      — the model carries no skill column or relation).
      ⚠ **SO THE REQUEST'S OWN TITLE IS WHAT IS KNOWN AND SAFE.** The provider is
      already looking at that request on `/find-work/<id>`, and
      `work.order_offered` has always put `requestTitle` in its body — so this
      follows a precedent rather than opening a question.
      ⚠⚠ It goes in the BODY, not the title: the title is what `getWorklist`
      groups on, and a per-request title would make five tests five rows again —
      which is the repetition Scott asked to remove.
    */
    vars: { requestId: wr.id, requestTitle: wr.title },
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

  /* ⚠⚠ COUNTED ON `(user_id, learning_path_id)` — THE LEARN RULE'S OWN PAIR, so
     the two cannot disagree about how many tries are left. */
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
  /* ⚠⚠⚠ THE ATTEMPT MUST BE **THEIRS**, AND OF **THIS** ASSESSMENT. Without the
     first, a provider could point at somebody else's pass; without the second,
     at their own pass on an easier test. Either one forges the result, and
     neither is caught by the copy guard — that one only stops a TYPED score.
     ⚠ The owner column is `user_id`, not a person id: `LearnTestAttempt` is
     keyed on the USER because that is who sits a lesson. */
  if (attempt.user_id !== viewer.userId) {
    throw new SourcingError("That attempt isn't yours.", "ATTEMPT_NOT_YOURS");
  }
  if (attempt.certification_test_id !== line.certification_test_id) {
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
