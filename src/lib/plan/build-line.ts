import type { PublicPhase, PublicRelease } from "@/lib/work-tracker/public-view";
import { buildTree, readiness, type PlanRowLike } from "./model";

/** `YYYY-MM-DD`, the string form `BuildLine` reads. */
const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export type PlanBuildLine = {
  phases: PublicPhase[];
  releases: PublicRelease[];
};

export function planBuildLine(rows: readonly PlanRowLike[]): PlanBuildLine {
  const tree = buildTree(rows);

  const currentId = tree.find((n) => n.type !== "milestone" && n.status === "In progress")?.id ?? null;

  const phases: PublicPhase[] = tree
    .filter((n) => n.type !== "milestone")
    .map((n) => {
      const own = n.children.length > 0 ? readiness(n.children) : readiness([n]);
      return {
        name: n.title || "Untitled",
        purpose: "",
        outcome: "",
        percent: own.percent,
        taskCount: n.children.length,
        start: day(n.start_date),
        end: day(n.end_date),
        current: n.id === currentId,
      };
    });

  const releases: PublicRelease[] = tree
    .filter((n) => n.type === "milestone" && (n.start_date || n.end_date))
    .map((n) => ({
      code: null,
      name: n.title || "Milestone",
      summary: null,
      date: day(n.start_date ?? n.end_date),
      status: n.status,
      percent: null,
      taskCount: 0,
      doneCount: 0,
      journeys: [],
    }));

  return { phases, releases };
}
