import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { PlanError, type StoredRow } from "./store";
import type { RowType } from "./model";

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
