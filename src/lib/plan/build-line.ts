/**
 * ── THE BUILD LINE, DRIVEN BY THE PLAN (`P2-ALL-E792`) ──────────────────────
 *
 * ⚠ **SCOTT, 2026-10-03:** keep the thin Build Line on `/status` — *"it is
 * cleaner."* ⚠⚠ But it must read the PLAN, not `work_tracker_phase_dates`: the
 * plan is what Scott maintains now, and a line drawn from the AIM phase dates
 * beside a timeline drawn from plan rows is two sources describing one build
 * (`E585`, and `E790`'s lesson one screen later).
 *
 * ⚠⚠⚠ **`BuildLine.tsx` IS NOT TOUCHED.** This is an ADAPTER: it produces the
 * shapes that component already takes, so its `E769` partial-date rules and its
 * `E777` label stagger keep working byte-for-byte and `assignRows` stays under
 * its own unit test. ⚠ Changing the component's props instead would have put
 * the plan's vocabulary inside a component that work orders will reuse.
 */
import type { PublicPhase, PublicRelease } from "@/lib/work-tracker/public-view";
import { buildTree, readiness, type PlanRowLike } from "./model";

/** `YYYY-MM-DD`, the string form `BuildLine` reads. */
const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export type PlanBuildLine = {
  phases: PublicPhase[];
  /** ⚠ The plan's MILESTONES, in the slot `BuildLine` draws flags from. */
  releases: PublicRelease[];
};

export function planBuildLine(rows: readonly PlanRowLike[]): PlanBuildLine {
  const tree = buildTree(rows);

  /**
   * ⚠⚠ ONE "current" AT MOST, AND IT IS THE FIRST IN PROGRESS. The plan allows
   * two phases to be In progress at once; the Build Line has a single travelling
   * dot, so a second would draw twice. ⚠ First in plan order wins, which is the
   * one furthest left — the honest reading of "where the build is".
   */
  const currentId = tree.find((n) => n.type !== "milestone" && n.status === "In progress")?.id ?? null;

  const phases: PublicPhase[] = tree
    .filter((n) => n.type !== "milestone")
    .map((n) => {
      /**
       * ⚠ A phase's percentage is its OWN countable set — its children when it
       * has them, itself when it does not — through the same `readiness` rule
       * the hero and the accordions use. ⚠⚠ Never a second definition.
       */
      const own = n.children.length > 0 ? readiness(n.children) : readiness([n]);
      return {
        name: n.title || "Untitled",
        /** ⚠⚠ EMPTY, NOT INVENTED. `purpose`/`outcome` are AIM catalog prose; a
         *  plan row has no equivalent and `BuildLine` renders them only in its
         *  tooltip, which is why empty strings are safe here. */
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
      /** ⚠ A plan milestone has no release code; `BuildLine` prints `name` and
       *  falls back cleanly when `code` is null. */
      code: null,
      name: n.title || "Milestone",
      summary: null,
      date: day(n.start_date ?? n.end_date),
      status: n.status,
      /** ⚠⚠ `null`, NOT 0 — a milestone is a date, not a countable set, and a 0
       *  here would print a measured zero that nobody measured (the counting
       *  rule). */
      percent: null,
      taskCount: 0,
      doneCount: 0,
      journeys: [],
    }));

  return { phases, releases };
}
