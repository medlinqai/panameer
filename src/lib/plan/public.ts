/**
 * ── THE PUBLIC PLAN VIEW MODEL (`P2-ALL-E785`) ──────────────────────────────
 *
 * ⚠⚠⚠ **`admin_note` NEVER LEAVES THIS FILE, AND THE SHAPE IS WHAT GUARANTEES
 * IT.** The returned types have no `admin_note` field at all, so a page cannot
 * render one by accident and a gate has something to assert. ⚠ A boolean flag on
 * one shared row type would have made the leak one forgotten condition away —
 * which is why `PlanRow` carries `public_note` and `admin_note` as two columns
 * rather than one column plus `is_public`.
 *
 * ⚠⚠ **`hours` AND `updated_by` DO NOT TRAVEL EITHER.** The public page shows
 * what is happening and when, not what it costs or who last touched the row.
 * ⚠⚠⚠ **`owner` DOES TRAVEL, BECAUSE THE APPROVED ACCORDION SPEC NAMES IT** —
 * see the field's own note below, where the reasoning and the limit are set out.
 * ⚠ This paragraph said the opposite for one commit's worth of editing, which is
 * the `decisions_2026-09-23.md` §6 failure exactly: a stated rule contradicting
 * the code it sits above, and the next reader implements the comment.
 *
 * ⚠ Numbering, lateness and readiness come from `model.ts`, the same functions
 * the editor uses, so the admin page and `/status` cannot disagree (`E585`).
 */
import {
  buildTree,
  isLate,
  planSpan,
  readiness,
  countableRows,
  subtreeReadiness,
  releaseReadiness,
  type PlanRowLike,
  type Readiness,
} from "./model";

export type PublicPlanRow = {
  id: string;
  number: string;
  /** What a number column prints: the outline number, or `◆` (`E809`). */
  mark: string;
  title: string;
  type: string;
  status: string;
  /** ⚠ `Late` is derived here once, so no surface recomputes it from a date it
   *  might format differently. */
  late: boolean;
  /** `YYYY-MM-DD` or null. ⚠ Null means NOT SCHEDULED and must render as that —
   *  never as a bar guessed from its neighbours (`E769`). */
  start: string | null;
  end: string | null;
  note: string | null;
  /**
   * ⚠⚠⚠ **A NAME ON A PUBLIC PAGE — THE BRIEF ASKS FOR IT AND IT IS FLAGGED
   * RATHER THAN ASSUMED.** The approved accordion spec reads *"open → its child
   * rows (status mark, title, owner, dates)"*, so `owner` travels.
   * ⚠ It is defensible: this is a free-text field Scott types on a plan he
   * chooses to publish, not a person's record pulled from the database. In R2 a
   * work order's plan is seen by the two parties to it, not by the public.
   * ⚠⚠ `hours`, `admin_note` and `updated_by` are STILL OUT — cost, private
   * notes and the actor are nobody else's business.
   */
  owner: string | null;
  releaseId: string | null;
  /**
   * This row's own readiness when it CONTAINS work — a release heading or a
   * phase with tasks (`E807`). `null` for a leaf and for a milestone, so a
   * surface cannot print a percentage for a single row (a figure needs rows to
   * count).
   */
  progress: Readiness | null;
  children: PublicPlanRow[];
};

export type PublicPlan = {
  title: string;
  rows: PublicPlanRow[];
  progress: Readiness;
  /** The window the timeline draws, or null when no row carries a date. */
  span: { start: string; end: string } | null;
};

export function publicPlan(
  plan: { title: string },
  rows: readonly PlanRowLike[],
  today: Date,
): PublicPlan {
  const span = planSpan(rows);
  return {
    title: plan.title,
    rows: buildTree(rows).map((node) => shape(node, today, rows)),
    progress: readiness(rows),
    span: span ? { start: day(span.start), end: day(span.end) } : null,
  };
}

/** One release's readiness over the plan's rows. */
export function publicReleaseProgress(rows: readonly PlanRowLike[], releaseId: string): Readiness {
  return releaseReadiness(rows, releaseId);
}

type Node = PlanRowLike & { number: string; mark: string; children: Node[] };

function shape(node: Node, today: Date, allRows: readonly PlanRowLike[]): PublicPlanRow {
  return {
    id: node.id,
    number: node.number,
    mark: node.mark,
    title: node.title,
    type: node.type,
    status: node.status,
    late: isLate(node, today),
    start: node.start_date ? day(node.start_date) : null,
    end: node.end_date ? day(node.end_date) : null,
    /** ⚠⚠ `public_note` ONLY. `admin_note` is not read in this file and is not
     *  in the type — the two reasons it cannot reach a page. */
    note: node.public_note ?? null,
    owner: node.owner ?? null,
    releaseId: node.release_id ?? null,
    progress:
      (node.children ?? []).length > 0 ? subtreeReadiness(node, allRows) : null,
    children: (node.children ?? []).map((c) => shape(c, today, allRows)),
  };
}

/** ⚠ A pure date stays a pure date. `toISOString().slice(0,10)` on a
 *  `@db.Date` is already UTC midnight, so this neither shifts nor localises it
 *  — the `E775` rule: pure dates are formatted as dates, in UTC. */
function day(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Release readiness, keyed by release CODE (`R1`, `R2`).
 *
 * ⚠⚠ **KEYED BY CODE AND NOT BY ID BECAUSE THE PUBLIC RELEASE PAYLOAD CARRIES
 * NO ID — DELIBERATELY.** `PublicRelease` exposes `code`, not the row's uuid, so
 * the page has nothing to join on. ⚠ The caller passes the id↔code pairs it read
 * server-side; the uuid never reaches the browser.
 *
 * ⚠⚠⚠ **THIS IS NOW THE ONLY DEFINITION OF A RELEASE'S PERCENTAGE.** It used to
 * be counted from AIM task states in `public-view.ts`; from `E785` the plan owns
 * it, because a release's scope is the plan rows tagged to it. ⚠ Two definitions
 * of one figure disagree in public, which is `E585` on the page a stranger reads.
 */
export function releaseProgressByCode(
  rows: readonly PlanRowLike[],
  pairs: readonly { id: string; code: string | null }[],
): Record<string, Readiness> {
  const out: Record<string, Readiness> = {};
  for (const p of pairs) {
    if (!p.code) continue;
    out[p.code] = releaseReadiness(rows, p.id);
  }
  return out;
}

/**
 * The plan rows tagged to each release, by code — their TITLES, in plan order
 * (`P2-ALL-E806`).
 *
 * Scott, 2026-10-03: the Releases section must "list R1's tagged journeys" and
 * use the same percentage as the hero. Both now come from the plan, so the
 * section cannot disagree with the figure above it (`E585`).
 *
 * Countable rows only — the same rule `readiness()` uses — so a phase that
 * merely contains tagged children is not itself listed as a journey.
 */
export function releaseScopeByCode(
  rows: readonly (PlanRowLike & { title: string })[],
  pairs: readonly { id: string; code: string | null }[],
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const countable = countableRows(rows);
  for (const p of pairs) {
    if (!p.code) continue;
    out[p.code] = countable
      .filter((r) => r.release_id === p.id)
      .map((r) => r.title.trim())
      .filter((t) => t.length > 0);
  }
  return out;
}
