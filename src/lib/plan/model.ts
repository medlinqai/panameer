/**
 * ── THE PLAN MODEL — PURE, NO DATABASE (`P2-ALL-E783`) ──────────────────────
 *
 * ⚠⚠ EVERYTHING HERE IS A FUNCTION OF THE ROWS AND NOTHING IS STORED TWICE.
 * Numbering, lateness and readiness are DERIVED, so they cannot disagree with
 * the dates and statuses a reader can see on the same screen (`E585`).
 *
 * ⚠ Kept free of `prisma` on purpose: the gate exercises this file directly,
 * with fixtures, so the maths is proven without a database and without a
 * server. (`E586`'s lesson is the opposite one — a gate with no inputs does not
 * fail — so every function here is called with real fixtures by `check:plan`.)
 */

export const PLAN_OWNER_PANAMEER = "panameer-build";

/**
 * WHICH PLAN THE PUBLIC PAGE RENDERS (`P2-ALL-E804`).
 *
 * Scott, 2026-10-03: "no test may read or write the panameer-build plan, ever
 * again." A browser test cannot assert chart contents without controlling the
 * data, so the owner key is a server-side setting and the plan suite points its
 * own server at a throwaway plan.
 *
 * Server-side env only — never a query parameter, a header or a cookie, so no
 * visitor can aim the page at another plan. Refused outright in production: the
 * live site renders the live plan and nothing else.
 */
export function planOwnerKey(): string {
  const override = process.env.PLAN_OWNER_KEY?.trim();
  if (!override) return PLAN_OWNER_PANAMEER;
  if (process.env.VERCEL_ENV === "production") {
    throw new Error(
      "PLAN_OWNER_KEY must not be set in production — /status renders the live plan.",
    );
  }
  if (override === PLAN_OWNER_PANAMEER) {
    /* Setting it to the live key is pointless and reads as an attempt to test
       against live data. Fail loudly rather than quietly allowing it. */
    throw new Error("PLAN_OWNER_KEY must not be the live plan's key.");
  }
  return override;
}

export const ROW_TYPES = ["phase", "task", "milestone"] as const;
export type RowType = (typeof ROW_TYPES)[number];

/**
 * ⚠ `Late` IS DELIBERATELY ABSENT FROM THIS LIST. It is not a status anybody
 * types — it is what an end date in the past means while the work is not Done,
 * and `isLate()` computes it. A fifth stored value would let the badge and the
 * date contradict each other.
 */
export const ROW_STATUSES = ["Planned", "In progress", "Done", "Blocked"] as const;
export type RowStatus = (typeof ROW_STATUSES)[number];

export function isRowType(v: unknown): v is RowType {
  return typeof v === "string" && (ROW_TYPES as readonly string[]).includes(v);
}

export function isRowStatus(v: unknown): v is RowStatus {
  return typeof v === "string" && (ROW_STATUSES as readonly string[]).includes(v);
}

/** The shape the maths needs — a subset of `PlanRow`, so tests need no database. */
export type PlanRowLike = {
  id: string;
  parent_id: string | null;
  sort: number;
  type: string;
  title: string;
  start_date: Date | null;
  end_date: Date | null;
  status: string;
  owner?: string | null;
  hours?: number | null;
  release_id?: string | null;
  public_note?: string | null;
};

export type PlanNode<T extends PlanRowLike = PlanRowLike> = T & {
  /** `"1"`, `"1.1"`, or `"◆"` for a milestone at either level. */
  number: string;
  depth: 0 | 1;
  children: PlanNode<T>[];
};

export const MILESTONE_MARK = "◆";

/**
 * ── NUMBERING ──────────────────────────────────────────────────────────────
 *
 * ⚠⚠ A MILESTONE DOES NOT CONSUME A NUMBER, AND THAT IS NOT A DETAIL — it is
 * what makes Scott's own outline read the way he wrote it:
 *
 *     1 Define · 2 Design · 3 Build · 4 Prove · ◆ R1 Public beta · 5 Launch
 *
 * ⚠ `Launch` is **5**, not 6. If a milestone took a number, every row after an
 * inserted milestone would renumber, and a plan you can reorder freely would
 * punish you for adding the one row that marks a date.
 */
export function buildTree<T extends PlanRowLike>(rows: readonly T[]): PlanNode<T>[] {
  const byParent = new Map<string | null, T[]>();
  for (const r of rows) {
    const key = r.parent_id ?? null;
    const list = byParent.get(key);
    if (list) list.push(r);
    else byParent.set(key, [r]);
  }
  /** ⚠ `sort` orders within a parent; `id` only breaks a genuine tie, so the
   *  order is total and a render is never arbitrary between two equal sorts. */
  const ordered = (key: string | null) =>
    (byParent.get(key) ?? []).slice().sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id));

  let counter = 0;
  return ordered(null).map((row) => {
    const isMilestone = row.type === "milestone";
    const number = isMilestone ? MILESTONE_MARK : String(++counter);
    let childCounter = 0;
    const children = ordered(row.id).map((child) => ({
      ...child,
      number:
        child.type === "milestone" ? MILESTONE_MARK : `${number}.${++childCounter}`,
      depth: 1 as const,
      /** ⚠ Two levels are enough (Scott). Nothing reads a third, and nothing
       *  writes one — `indentRow` refuses it rather than trusting this. */
      children: [] as PlanNode<T>[],
    }));
    return { ...row, number, depth: 0 as const, children };
  });
}

/** Depth-first, parents before their children — the order the page renders in. */
export function flattenTree<T extends PlanRowLike>(tree: readonly PlanNode<T>[]): PlanNode<T>[] {
  const out: PlanNode<T>[] = [];
  for (const node of tree) {
    out.push(node);
    for (const child of node.children) out.push(child);
  }
  return out;
}

/**
 * ⚠⚠ LATE IS COMPUTED, AND IT NEEDS `today` PASSED IN. A function that reached
 * for `new Date()` itself could not be tested across a date boundary, and the
 * one thing this must never do is disagree with the Today line on the timeline
 * — which takes its date from the same caller.
 */
export function isLate(row: PlanRowLike, today: Date): boolean {
  if (row.status === "Done") return false;
  if (!row.end_date) return false;
  return row.end_date.getTime() < startOfUtcDay(today).getTime();
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * ── READINESS ──────────────────────────────────────────────────────────────
 *
 * The brief says *"overall % (rows Done ÷ rows)"*. ⚠⚠ "Rows" HAD TO BE PINNED
 * DOWN, because two honest readings give materially different numbers and the
 * figure goes on a public page:
 *
 *   · a PHASE WITH CHILDREN is a container, not work. Counting it as well as
 *     its tasks counts the same work twice, and marking a phase Done while its
 *     tasks are not would print progress nobody made.
 *   · a MILESTONE is a date, not work. ◆ R1 sitting Planned would drag the
 *     figure down for the whole run-up to the day it is reached.
 *
 * ⚠ SO: countable = rows that are not milestones and have no children. A phase
 * Scott has typed but not filled still counts — it is real work, just not
 * broken down yet.
 * ⚠⚠ `total` IS RETURNED BESIDE `percent` SO A SURFACE CAN PRINT "12 of 34"
 * AND NEVER HAVE TO RE-DERIVE IT. One definition, one place.
 */
export type Readiness = {
  done: number;
  /** ⚠ `In progress` rows, returned so a surface never recounts them (`E585`). */
  moving: number;
  total: number;
  percent: number | null;
};

/**
 * ── ⚠⚠⚠ HALF CREDIT FOR WORK IN PROGRESS — SCOTT, 2026-10-03 (`E797`) ───────
 *
 * ⚠ **THE RULE: `(Done + ½ × In progress) ÷ countable rows`.** `Blocked` and
 * `Planned` count **0**.
 * ⚠⚠ **SUPERSEDED, quoted not deleted (`E164`):**
 * //   const done = counted.filter((r) => r.status === "Done").length;
 * //   percent = Math.round((done / counted.length) * 100)
 *
 * ⚠⚠ **WHY IT IS NOT A SOFTENING OF THE NUMBER:** on a plan where most rows are
 * open, Done-only readiness sits near zero for weeks while real work moves, so
 * the figure stops tracking the thing it names. ⚠ Half is the honest weight for
 * a row that has started and not finished — it is not a claim about how far
 * through that row is, and no row may ever be weighted by a guess at its own
 * progress.
 * ⚠⚠⚠ **`done` AND `moving` ARE STILL RETURNED AS WHOLE COUNTS.** The halving
 * lives in the PERCENTAGE only, so *"66 done · 36 moving"* keeps meaning
 * exactly what it says — a reader must always be able to get back to the rows
 * behind the figure.
 */
export function readiness<T extends PlanRowLike>(rows: readonly T[]): Readiness {
  const counted = countableRows(rows);
  const done = counted.filter((r) => r.status === "Done").length;
  const moving = counted.filter((r) => r.status === "In progress").length;
  /** ⚠ `Blocked` and `Planned` are absent from this sum ON PURPOSE, not by
   *  oversight: neither has produced anything yet. */
  const credit = done + moving / 2;
  /**
   * ⚠⚠⚠ AN EMPTY PLAN RETURNS `percent: null`, NOT `0`. A plan with no rows is
   * UNCOUNTABLE, not 0% complete, and the two must not look the same — the
   * 2026-09-23 counting rule, applied here at its source rather than left to
   * each card to remember.
   */
  return {
    done,
    moving,
    total: counted.length,
    percent: counted.length === 0 ? null : Math.round((credit / counted.length) * 100),
  };
}

/** The same rule, for one release's rows. ⚠ A release nobody has tagged is
 *  uncountable, which is why this returns the same nullable shape. */
export function releaseReadiness<T extends PlanRowLike>(rows: readonly T[], releaseId: string): Readiness {
  return readiness(rows.filter((r) => r.release_id === releaseId));
}

export function countableRows<T extends PlanRowLike>(rows: readonly T[]): T[] {
  const hasChildren = new Set(rows.map((r) => r.parent_id).filter((v): v is string => !!v));
  return rows.filter((r) => r.type !== "milestone" && !hasChildren.has(r.id));
}

/**
 * The window the timeline draws. ⚠ Returns null when no row carries a date —
 * **a timeline with no dates is not a timeline from 1970 to today**, it is
 * nothing to draw, and the caller shows the accordions alone.
 */
export function planSpan(rows: readonly PlanRowLike[]): { start: Date; end: Date } | null {
  const dates: number[] = [];
  for (const r of rows) {
    if (r.start_date) dates.push(r.start_date.getTime());
    if (r.end_date) dates.push(r.end_date.getTime());
  }
  if (dates.length === 0) return null;
  return { start: new Date(Math.min(...dates)), end: new Date(Math.max(...dates)) };
}
