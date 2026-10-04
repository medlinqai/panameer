
export const PLAN_OWNER_PANAMEER = "panameer-build";

export function planOwnerKey(): string {
  const override = process.env.PLAN_OWNER_KEY?.trim();
  if (!override) return PLAN_OWNER_PANAMEER;
  if (process.env.VERCEL_ENV === "production") {
    throw new Error(
      "PLAN_OWNER_KEY must not be set in production — /status renders the live plan.",
    );
  }
  if (override === PLAN_OWNER_PANAMEER) {
    throw new Error("PLAN_OWNER_KEY must not be the live plan's key.");
  }
  return override;
}

export const ROW_TYPES = ["release", "phase", "task", "milestone"] as const;
export type RowType = (typeof ROW_TYPES)[number];

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
  /** The outline position: `"1"`, `"1.3"`, `"1.3.2"` — every level, every row. */
  number: string;
  /** What a number column prints: the outline number, or `◆` for a milestone. */
  mark: string;
  depth: 0 | 1 | 2;
  children: PlanNode<T>[];
};

export const MILESTONE_MARK = "◆";

export function buildTree<T extends PlanRowLike>(rows: readonly T[]): PlanNode<T>[] {
  const byParent = new Map<string | null, T[]>();
  for (const r of rows) {
    const key = r.parent_id ?? null;
    const list = byParent.get(key);
    if (list) list.push(r);
    else byParent.set(key, [r]);
  }
  const ordered = (key: string | null) =>
    (byParent.get(key) ?? []).slice().sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id));

  const walk = (parentId: string | null, prefix: string, depth: 0 | 1 | 2): PlanNode<T>[] =>
    ordered(parentId).map((row, i) => {
      const number = prefix ? `${prefix}.${i + 1}` : String(i + 1);
      return {
        ...row,
        number,
        /** What a surface prints in a number column: ◆ for a milestone. */
        mark: row.type === "milestone" ? MILESTONE_MARK : number,
        depth,
        children: depth < 2 ? walk(row.id, number, (depth + 1) as 1 | 2) : [],
      };
    });

  return walk(null, "", 0);
}

/** Depth-first, parents before their children — the order the page renders in. */
export function flattenTree<T extends PlanRowLike>(tree: readonly PlanNode<T>[]): PlanNode<T>[] {
  const out: PlanNode<T>[] = [];
  const walk = (nodes: readonly PlanNode<T>[]) => {
    for (const node of nodes) {
      out.push(node);
      /* Recursive since `E807`: a two-level loop silently dropped every task
         under a release's phases. */
      walk(node.children);
    }
  };
  walk(tree);
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

/**
 * Readiness over ONE SUBTREE — a release heading or a phase (`P2-ALL-E807`).
 *
 * Scott, 2026-10-03: "Each release heading shows its own % (Done + ½ In
 * progress)". It is the same rule as `readiness()`, applied to the rows beneath
 * one node, so a release's figure and the plan's cannot be computed two
 * different ways (`E585`).
 */
export function subtreeReadiness<T extends PlanRowLike>(
  node: { id: string; children?: readonly unknown[] },
  all: readonly T[],
): Readiness {
  const descendants: T[] = [];
  const walk = (parentId: string) => {
    for (const r of all) {
      if (r.parent_id !== parentId) continue;
      descendants.push(r);
      walk(r.id);
    }
  };
  walk(node.id);
  return readiness(descendants);
}

/** The same rule, for one release's rows. ⚠ A release nobody has tagged is
 *  uncountable, which is why this returns the same nullable shape. */
export function releaseReadiness<T extends PlanRowLike>(rows: readonly T[], releaseId: string): Readiness {
  return readiness(rows.filter((r) => r.release_id === releaseId));
}

export function countableRows<T extends PlanRowLike>(rows: readonly T[]): T[] {
  const hasChildren = new Set(rows.map((r) => r.parent_id).filter((v): v is string => !!v));
  /* A RELEASE IS NEVER COUNTED (`E807`), even with no phases under it yet: it is
     a heading, and counting it would add a unit of "work" nobody does. A
     container is already excluded by `hasChildren`; this covers the empty one. */
  return rows.filter(
    (r) => r.type !== "milestone" && r.type !== "release" && !hasChildren.has(r.id),
  );
}

/**
 * WHEN THE FIRST WORK WAS RELEASED, from the plan (`P2-ALL-E810`).
 *
 * Scott, 2026-10-03: the support section on `/status` shows only for RELEASED
 * work — "until a phase's Deploy ◆ is marked Done, hide the section entirely."
 *
 * A Deploy milestone marked `Done` is the plan's own statement that a release
 * went out, so this reads that rather than a separate flag somebody has to
 * remember to set. `null` means nothing has shipped yet, which is a different
 * answer from "no tickets" and the caller must treat it as such.
 */
export function firstReleasedAt(rows: readonly PlanRowLike[]): Date | null {
  const dates = rows
    .filter((r) => r.type === "milestone" && r.status === "Done")
    /* Its own date: a milestone's start and end are the same day, and either
       may be the one that was filled in. */
    .map((r) => r.start_date ?? r.end_date)
    .filter((d): d is Date => d !== null);
  if (dates.length === 0) return null;
  return new Date(Math.min(...dates.map((d) => d.getTime())));
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
