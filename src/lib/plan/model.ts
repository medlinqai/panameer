
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

/** LATE IS COMPUTED, AND IT NEEDS `today` PASSED IN. A function that reached */
export function isLate(row: PlanRowLike, today: Date): boolean {
  if (row.status === "Done") return false;
  if (!row.end_date) return false;
  return row.end_date.getTime() < startOfUtcDay(today).getTime();
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** The brief says *"overall % (rows Done ÷ rows)"*. "Rows" HAD TO BE PINNED */
export type Readiness = {
  done: number;
  /** `In progress` rows, returned so a surface never recounts them (`E585`). */
  moving: number;
  total: number;
  percent: number | null;
};

/** HALF CREDIT FOR WORK IN PROGRESS — SCOTT, 2026-10-03 */
export function readiness<T extends PlanRowLike>(rows: readonly T[]): Readiness {
  const counted = countableRows(rows);
  const done = counted.filter((r) => r.status === "Done").length;
  const moving = counted.filter((r) => r.status === "In progress").length;
  /** oversight: neither has produced anything yet. */
  const credit = done + moving / 2;
  /** AN EMPTY PLAN RETURNS `percent: null`, NOT `0`. A plan with no rows is */
  return {
    done,
    moving,
    total: counted.length,
    percent: counted.length === 0 ? null : Math.round((credit / counted.length) * 100),
  };
}

/** Readiness over ONE SUBTREE — a release heading or a phase . */
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

/** The same rule, for one release's rows. A release nobody has tagged is */
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

/** WHEN THE FIRST WORK WAS RELEASED, from the plan . */
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

/** The window the timeline draws. Returns null when no row carries a date — */
export function planSpan(rows: readonly PlanRowLike[]): { start: Date; end: Date } | null {
  const dates: number[] = [];
  for (const r of rows) {
    if (r.start_date) dates.push(r.start_date.getTime());
    if (r.end_date) dates.push(r.end_date.getTime());
  }
  if (dates.length === 0) return null;
  return { start: new Date(Math.min(...dates)), end: new Date(Math.max(...dates)) };
}
