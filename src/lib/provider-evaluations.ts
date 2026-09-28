import { prisma } from "@/lib/prisma";
import { SourcingError } from "@/lib/sourcing";
import type { Viewer } from "@/lib/access";
import type { ProviderEvaluationStatus } from "@prisma/client";

/**
 * ── ⚠⚠⚠ `ProviderEvaluation` — THE REQUESTER'S JUDGEMENT (`P2-A8-E695` WS-D) ──
 *
 * ⚠⚠ **SCOTT, 2026-09-28: *"The interview table IS a scheduling tool….BUT there
 * needs to be a place where the results of that interview are recorded."***
 *
 * ⚠⚠⚠ **THE PROVIDER AUTHORS THE SCHEDULING REPLY (`interviews.ts:offerSlots`).
 * THE REQUESTER AUTHORS THE EVALUATION. TWO AUTHORS, TWO DOCUMENTS** — the
 * sourcing pattern's own rule (`P1-J4-E395`).
 *
 * ⚠ **NOT SCOPED TO AN INTERVIEW, AND NEVER TO A SHORTLIST.** Scott, same day:
 * *"if the requester gets a proposal and does not interview, they will not
 * shortlist…they will add them to the WR."* ⚠⚠ **SHORTLIST IS OPTIONAL AND IS
 * NOT A STAGE** — hanging judgement off it would make the commonest path
 * impossible, and no function here reads or requires one.
 */

/** ⚠ The person behind this account. Never taken from input (`access.ts` rule). */
async function ownPerson(viewer: Viewer) {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) throw new SourcingError("No person for this account.", "NOT_FOUND");
  return person;
}

/**
 * ⚠⚠ THE WORK REQUEST MUST BE THE CALLER'S. ⚠⚠⚠ **OWNER-SCOPED FROM THE
 * SESSION, NOT FROM THE BODY** — without this any signed-in member could write a
 * judgement onto somebody else's sourcing event, which is the one thing an
 * evaluation must never allow.
 */
async function assertOwnsRequest(workRequestId: string, personId: string) {
  const wr = await prisma.workRequest.findUnique({
    where: { id: workRequestId },
    select: { id: true, buyer_person_id: true },
  });
  if (!wr) throw new SourcingError("That work request doesn't exist.", "NOT_FOUND");
  if (wr.buyer_person_id !== personId) {
    throw new SourcingError("That work request isn't yours.", "NOT_YOURS");
  }
  return wr;
}

export type EvaluationLineInput = {
  criterion: string;
  rating?: number | null;
  note?: string | null;
};

/**
 * Record (or replace) the requester's evaluation of one provider on one request.
 *
 * ⚠⚠ **UPSERT ON `(work_request_id, provider_person_id, created_by_person_id)`,
 * WHICH THE SCHEMA MAKES UNIQUE.** A second judgement REPLACES rather than
 * accumulates — otherwise *"what did they think"* has no answer, only a list.
 *
 * ⚠ **THE LINES ARE REPLACED WHOLE**, for the same reason `offerSlots` replaces
 * its slots: they are the current judgement, not a log of judgements. ⚠⚠ Scoped
 * to this evaluation, which is scoped to this author's own work request.
 *
 * ⚠⚠⚠ **NO MONEY MOVES HERE AND NOTHING ABOUT AN ORDER CHANGES.** An evaluation
 * is a document the requester writes; it does not select, assign, order or pay.
 */
export async function recordEvaluation(
  viewer: Viewer,
  input: {
    workRequestId: string;
    providerPersonId: string;
    interviewRequestId?: string | null;
    testRequestId?: string | null;
    overallRating?: number | null;
    summary?: string | null;
    lines?: EvaluationLineInput[];
    submit?: boolean;
  }
): Promise<{ id: string; status: "DRAFT" | "SUBMITTED" }> {
  const me = await ownPerson(viewer);
  await assertOwnsRequest(input.workRequestId, me.id);

  /* ⚠⚠ THE SCALE IS 1–5 AND IT IS ENFORCED, NOT DOCUMENTED. A rating outside it
     is a number nobody can read against the others. */
  const assertRating = (n: number | null | undefined, what: string) => {
    if (n == null) return;
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      throw new SourcingError(`${what} must be a whole number from 1 to 5.`, "BAD_RATING");
    }
  };
  assertRating(input.overallRating, "Overall rating");
  for (const l of input.lines ?? []) assertRating(l.rating, `Rating for "${l.criterion}"`);

  /* ⚠⚠⚠ A SUBMITTED EVALUATION MUST SAY SOMETHING. A submit with no overall
     rating and no lines is an empty document wearing a verdict. */
  if (input.submit && input.overallRating == null && (input.lines ?? []).length === 0) {
    throw new SourcingError(
      "Add a rating or at least one criterion before submitting.",
      "EMPTY_EVALUATION"
    );
  }

  /* ⚠ TYPED AS THE ENUM, NOT INFERRED AS `string` — Prisma refuses a widened
     literal, and that refusal is the compiler doing the job a runtime check
     would have done worse. */
  const status: ProviderEvaluationStatus = input.submit ? "SUBMITTED" : "DRAFT";

  return prisma.$transaction(async (tx) => {
    const existing = await tx.providerEvaluation.findUnique({
      where: {
        work_request_id_provider_person_id_created_by_person_id: {
          work_request_id: input.workRequestId,
          provider_person_id: input.providerPersonId,
          created_by_person_id: me.id,
        },
      },
      select: { id: true },
    });

    const data = {
      work_request_id: input.workRequestId,
      provider_person_id: input.providerPersonId,
      created_by_person_id: me.id,
      interview_request_id: input.interviewRequestId ?? null,
      test_request_id: input.testRequestId ?? null,
      overall_rating: input.overallRating ?? null,
      summary: input.summary ?? null,
      status,
      submitted_at: input.submit ? new Date() : null,
    };

    const row = existing
      ? await tx.providerEvaluation.update({
          where: { id: existing.id },
          data,
          select: { id: true, status: true },
        })
      : await tx.providerEvaluation.create({
          data: {
            ...data,
            /* ⚠ Human-readable and unique. `PE-` is Provider Evaluation — and it
               is chosen to collide with nothing: `PRO-` is a proposal number. */
            evaluation_number: `PE-${Date.now().toString(36).toUpperCase()}-${input.providerPersonId.slice(0, 4)}`,
          },
          select: { id: true, status: true },
        });

    await tx.providerEvaluationLine.deleteMany({
      where: { provider_evaluation_id: row.id },
    });
    if ((input.lines ?? []).length > 0) {
      await tx.providerEvaluationLine.createMany({
        data: (input.lines ?? []).map((l, i) => ({
          provider_evaluation_id: row.id,
          line_number: i + 1,
          criterion: l.criterion,
          rating: l.rating ?? null,
          note: l.note ?? null,
        })),
      });
    }
    return { id: row.id, status: row.status as "DRAFT" | "SUBMITTED" };
  });
}

/**
 * ⚠⚠ THE READER. **A WRITER WITH NO READER IS HALF A FEATURE** — the brief's own
 * acceptance, and the reason this ships in the same commit as `recordEvaluation`.
 *
 * ⚠ Owner-scoped: only the requester who owns the work request sees the
 * judgements written against it.
 */
export async function evaluationsOn(
  viewer: Viewer,
  workRequestId: string
): Promise<
  {
    id: string;
    evaluationNumber: string;
    providerPersonId: string;
    status: "DRAFT" | "SUBMITTED";
    overallRating: number | null;
    summary: string | null;
    submittedAt: Date | null;
    lines: { criterion: string; rating: number | null; note: string | null }[];
  }[]
> {
  const me = await ownPerson(viewer);
  await assertOwnsRequest(workRequestId, me.id);

  const rows = await prisma.providerEvaluation.findMany({
    where: { work_request_id: workRequestId, created_by_person_id: me.id },
    orderBy: { created_at: "asc" },
    select: {
      id: true,
      evaluation_number: true,
      provider_person_id: true,
      status: true,
      overall_rating: true,
      summary: true,
      submitted_at: true,
      lines: {
        orderBy: { line_number: "asc" },
        select: { criterion: true, rating: true, note: true },
      },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    evaluationNumber: r.evaluation_number,
    providerPersonId: r.provider_person_id,
    status: r.status as "DRAFT" | "SUBMITTED",
    overallRating: r.overall_rating,
    summary: r.summary,
    submittedAt: r.submitted_at,
    lines: r.lines,
  }));
}
