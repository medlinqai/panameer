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
  mark: string;
  title: string;
  type: string;
  status: string;
  late: boolean;
  start: string | null;
  end: string | null;
  note: string | null;
  owner: string | null;
  releaseId: string | null;
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
    note: node.public_note ?? null,
    owner: node.owner ?? null,
    releaseId: node.release_id ?? null,
    progress:
      (node.children ?? []).length > 0 ? subtreeReadiness(node, allRows) : null,
    children: (node.children ?? []).map((c) => shape(c, today, allRows)),
  };
}

function day(d: Date): string {
  return d.toISOString().slice(0, 10);
}

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
