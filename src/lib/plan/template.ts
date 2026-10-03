/**
 * ── THE "PANAMEER BUILD" TEMPLATE (`P2-ALL-E783`) ───────────────────────────
 *
 * ⚠⚠⚠ A BUTTON, NOT A SEED. Scott presses it once and then edits or deletes
 * freely. ⚠ It must never run at deploy or migration time: the database is
 * shared by localhost, every preview and production (ruling 38), so content
 * created automatically is content nobody chose — and this writes to the plan
 * the public `/status` page reads.
 *
 * ⚠⚠ IT REFUSES TO RUN ON A PLAN THAT ALREADY HAS ROWS. A template that merged
 * into existing work would be unrecoverable by hand; "clear it first" is a
 * decision the person makes, visibly.
 */
import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { PlanError, type StoredRow } from "./store";
import type { RowType } from "./model";

/**
 * The ten journeys, in the order the rail presents them. ⚠ These are the
 * journey NAMES, not the AIM catalog's task ids — the template deliberately
 * borrows nothing from `aim-catalog.json`, so retiring that catalog later
 * cannot change what this button produces.
 */
export const TEMPLATE_JOURNEYS = [
  "Public",
  "Register",
  "Profile",
  "Connect",
  "Learn",
  "Hire",
  "Shop",
  "Order",
  "Pay",
  "Optimize",
] as const;

/**
 * ⚠⚠ `Learn` AND `Optimize` ARE NOT TAGGED TO R1 — Scott's call, and the shape
 * matters: **they are left UNTAGGED rather than pointed at an invented release
 * row.** Only R1 exists today, so "a later release" has no id to carry, and
 * writing one would be a fabricated foreign key. ⚠ An untagged row simply does
 * not count toward R1 readiness, which is exactly the intended effect.
 */
const NOT_IN_R1 = new Set<string>(["Learn", "Optimize"]);

type TemplateRow = {
  title: string;
  type: RowType;
  /** Matches `work_tracker_phase_dates.phase` when a date should be prefilled. */
  phaseKey?: string;
  children?: { title: string; inR1: boolean }[];
  /** The milestone takes its date from the release row. */
  fromRelease?: string;
};

export const TEMPLATE_PANAMEER: TemplateRow[] = [
  { title: "Define", type: "phase", phaseKey: "Define" },
  { title: "Design", type: "phase", phaseKey: "Design" },
  {
    title: "Build",
    type: "phase",
    phaseKey: "Build",
    children: TEMPLATE_JOURNEYS.map((j) => ({ title: j, inR1: !NOT_IN_R1.has(j) })),
  },
  { title: "Prove", type: "phase", phaseKey: "Prove" },
  { title: "R1 — Public beta", type: "milestone", fromRelease: "R1" },
  { title: "Launch", type: "phase" },
  { title: "Operate", type: "phase" },
];

/**
 * ⚠⚠ DATES COME FROM THE DATABASE OR THEY DO NOT COME AT ALL. Four phases have
 * real dates in `work_tracker_phase_dates` (Define, Design, Build, Prove);
 * `Launch` and `Operate` have none and are created **unscheduled**, which the
 * plan view renders as "not scheduled" rather than a guessed bar (`E769`).
 * ⚠ Inventing plausible dates for them would put fiction on a public page.
 */
export async function applyPanameerTemplate(planId: string, viewer: Viewer) {
  const existing = await prisma.planRow.count({ where: { plan_id: planId } });
  if (existing > 0) {
    throw new PlanError(
      "This plan already has rows. Clear it before starting from a template.",
      "INVALID",
    );
  }

  const [phaseDates, release] = await Promise.all([
    prisma.workTrackerPhaseDate.findMany({
      select: { phase: true, start_date: true, end_date: true },
    }),
    prisma.workTrackerRelease.findFirst({ where: { code: "R1" }, select: { id: true, date: true } }),
  ]);
  const dateFor = new Map(phaseDates.map((p) => [p.phase, p]));

  const created: StoredRow[] = [];
  await prisma.$transaction(async (tx) => {
    for (const [i, row] of TEMPLATE_PANAMEER.entries()) {
      const d = row.phaseKey ? dateFor.get(row.phaseKey) : undefined;
      /**
       * ⚠ The milestone's date is COPIED from the release at creation time and
       * is not a live link. Scott changing R1's date in the AIM admin does not
       * move this diamond — he edits the row. ⚠⚠ Said plainly here because the
       * opposite is the natural assumption, and `release_id` being present on
       * the row makes it look like one.
       */
      const milestoneDate = row.fromRelease && release ? release.date : null;
      const parent = await tx.planRow.create({
        data: {
          plan_id: planId,
          parent_id: null,
          sort: i,
          type: row.type,
          title: row.title,
          start_date: d?.start_date ?? milestoneDate ?? null,
          end_date: d?.end_date ?? milestoneDate ?? null,
          /** ⚠⚠ EVERY TEMPLATE ROW STARTS `Planned`, INCLUDING THE PHASES THAT
           *  ARE PLAINLY FINISHED. The template does not know what is done —
           *  only Scott does, and a status he did not set is a number on a
           *  public page that nobody measured. */
          status: "Planned",
          release_id: row.fromRelease ? (release?.id ?? null) : null,
          updated_by: viewer.userId,
        },
      });
      created.push(parent as StoredRow);
      for (const [j, child] of (row.children ?? []).entries()) {
        const made = await tx.planRow.create({
          data: {
            plan_id: planId,
            parent_id: parent.id,
            sort: j,
            type: "task",
            title: child.title,
            status: "Planned",
            release_id: child.inR1 ? (release?.id ?? null) : null,
            updated_by: viewer.userId,
          },
        });
        created.push(made as StoredRow);
      }
    }
    await tx.plan.update({ where: { id: planId }, data: { updated_by: viewer.userId } });
  });

  return { rows: created.length, r1: release?.id ?? null };
}
