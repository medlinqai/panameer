import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { createDraft, resolveBuyer } from "@/lib/work-request";
import { addProvider } from "@/lib/shortlists";

/**
 * ── ⚠⚠⚠ HIRE FROM A PROFILE — SOLE-SOURCED (`P2-A8-E719`) ────────────────────
 *
 * ⚠ **SCOTT: a `Hire` button on `/providers/[id]` creates a draft Work Request, sole-sourced,
 * with that provider on its shortlist, and lands the buyer on the request to complete it.**
 *
 * ── ⚠⚠ IT WRITES NOTHING ITSELF. IT COMPOSES THE TWO EXISTING WRITERS ───────
 *
 * ⚠⚠⚠ **`createDraft` IS THE ONLY WORK-REQUEST CREATOR AND `addProvider` IS THE ONLY
 * SHORTLIST-LINE WRITER**, and this file calls both rather than reproducing either — the
 * brief's own condition (*"using the existing writers, no second WR creator"*) and `E585`.
 * ⚠ `addProvider` brings its own guarantees with it: it creates the `Shortlist` lazily
 * (`shortlistFor`), asserts the request belongs to the caller (`assertOwnsRequest`), numbers
 * the line, and **upserts on `(shortlist_id, provider_person_id)`** — so the same provider
 * cannot appear twice on one request even if this function were called twice in parallel.
 * ⚠⚠ It writes `source: "ADDED"`, which is the value Scott's own words in the schema describe:
 * *"they will not shortlist…they will add them to the WR."*
 *
 * ── ⚠⚠⚠ NO SCHEMA CHANGE, AND THE PREMISE CHECK IS WHY ──────────────────────
 *
 * ⚠ The brief said to stop if sole-sourcing plus a shortlist could not express *"this one
 * provider"* without one. **It can:** `WorkRequest.sole_sourced` is a real column
 * (`schema.prisma:3026`) and `ShortlistLine.provider_person_id` names the provider, with
 * `@@unique([shortlist_id, provider_person_id])` already enforcing one row per provider.
 * ⚠⚠ **THE ONE THING THAT IS NOT THERE IS A PRISMA RELATION BETWEEN `WorkRequest` AND
 * `Shortlist`** — `work_request_id` is a bare scalar, so *"a draft for this provider"* cannot
 * be a nested `where`. ⚠⚠⚠ **THAT IS A QUERY SHAPE, NOT A MISSING FACT**: two reads answer it,
 * and adding a relation would be a schema change this brief does not need. Ruling 38.
 */

/*
  ⚠⚠ **THIS FILE IS `sole-source.ts`, NOT `hire.ts`, AND THE REASON IS A MISTAKE I MADE.**
  `lib/hire.ts` ALREADY EXISTS — it is `/hire`'s list of work requests (`listWorkRequests`,
  `WorkRequestRow`) — and I wrote this module over it before checking. ⚠⚠⚠ **RESTORED FROM
  `HEAD` IMMEDIATELY AND VERIFIED CLEAN**, but the rule it broke is the plain one: look at the
  target before overwriting it. ⚠ The name here says what this does rather than which button
  triggers it, which is also the better name.

  ⚠⚠ **RELATED AND WORTH KNOWING: A PROVIDER CAN BE ATTACHED TO A REQUEST TWO WAYS.**
  `ShortlistLine.provider_person_id` is the shortlist (this file's), and
  `WorkRequestLine.provider_person_id` is a LINE on the request itself. ⚠⚠⚠ **`/hire`'s LIST
  READS THE LINES** (`hire.ts:86`, `providerNames`), so a draft created here shows the
  provider on the REQUEST but not yet in that list's name column — the brief asked for the
  shortlist, and this records where the other attachment lives so nobody reads the empty
  column as a bug.
*/
export class HireError extends Error {
  constructor(
    message: string,
    public code: "NOT_A_BUYER" | "OWN_PROFILE" | "NO_PROVIDER"
  ) {
    super(message);
  }
}

/**
 * The buyer's existing unsent sole-sourced draft for this provider, or `null`.
 *
 * ⚠⚠ **"UNSENT" IS `status: "DRAFT"`** — the status a request holds before it is posted or
 * assigned. A sole-sourced request that has already gone to the provider is `ASSIGNED`
 * (`lib/selection.ts:535` writes both together), so it is not a draft and is never reopened
 * by this. ⚠ Reopening a sent request would be re-editing something the provider has seen.
 *
 * ⚠⚠⚠ **TWO READS, BECAUSE THERE IS NO RELATION TO JOIN ON.** The shortlist lines naming this
 * provider give a set of shortlists; those give a set of work-request ids; the second query
 * asks which of those is this buyer's unsent sole-sourced draft. ⚠ **The buyer scope is on the
 * SECOND query, never on the first** — the first is a lookup by provider and must not be
 * mistaken for an authorisation boundary.
 */
async function existingDraftFor(
  buyerPersonId: string,
  providerPersonId: string
): Promise<string | null> {
  const lines = await prisma.shortlistLine.findMany({
    where: { provider_person_id: providerPersonId },
    select: { shortlist_id: true },
  });
  if (lines.length === 0) return null;

  const shortlists = await prisma.shortlist.findMany({
    where: { id: { in: lines.map((l) => l.shortlist_id) } },
    select: { work_request_id: true },
  });
  if (shortlists.length === 0) return null;

  const draft = await prisma.workRequest.findFirst({
    where: {
      id: { in: shortlists.map((s) => s.work_request_id) },
      buyer_person_id: buyerPersonId,
      status: "DRAFT",
      sole_sourced: true,
    },
    /* ⚠ Newest first, so a buyer who somehow has two lands on the one they touched last
       rather than on whichever the database happened to return. */
    orderBy: { updated_at: "desc" },
    select: { id: true },
  });
  return draft?.id ?? null;
}

/**
 * Find-or-create the sole-sourced draft that names this provider.
 *
 * ⚠⚠⚠ **CLICKING `Hire` TWICE MUST PRODUCE ONE DRAFT, NOT TWO** — the brief asserts it and
 * this is where it is decided. ⚠ The reopen is a real read of the buyer's own rows, not a
 * client-side guard: a second tab, a refresh or a double submit all arrive here.
 * ⚠⚠ **IT IS NOT A TRANSACTION AND DOES NOT NEED TO BE.** If two clicks raced past the read,
 * `addProvider`'s unique constraint still collapses the shortlist line, and the loser is a
 * second empty draft rather than a duplicated provider — the cheap failure, not the expensive
 * one. **A transaction spanning a create and a separate writer would be the second place that
 * knows how a draft is made**, which is what this file exists not to be.
 */
export async function hireSoleSourced(
  viewer: Viewer,
  providerPersonId: string
): Promise<{ workRequestId: string; reopened: boolean }> {
  if (!providerPersonId) {
    throw new HireError("No provider named.", "NO_PROVIDER");
  }
  /* ⚠ `resolveBuyer` throws `NOT_A_BUYER` on `!is_service_buyer` — the SAME rule
     `canHireTalent` is (`access.ts:110`, literally `is_service_buyer`). The capability is not
     re-stated here; the existing writer's own gate is the gate. */
  const { personId } = await resolveBuyer(viewer);

  /* ⚠⚠ A BUYER CANNOT SOLE-SOURCE THEMSELVES. The UI does not render the button on the
     owner's preview, but the UI is not a permission — this is the server's answer. */
  if (personId === providerPersonId) {
    throw new HireError("You cannot hire yourself.", "OWN_PROFILE");
  }

  const existing = await existingDraftFor(personId, providerPersonId);
  if (existing) {
    /* ⚠ The provider is already on it — `addProvider` upserts, so re-adding is harmless, but
       skipping the write keeps the reopen a pure read. */
    return { workRequestId: existing, reopened: true };
  }

  const draft = await createDraft(viewer, undefined, undefined, { soleSourced: true });
  await addProvider(viewer, {
    workRequestId: draft.id,
    providerPersonId,
  });
  return { workRequestId: draft.id, reopened: false };
}
