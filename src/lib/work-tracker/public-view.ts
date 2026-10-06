import { prisma } from "@/lib/prisma";
import { dayNumber as dayNumberInSiteZone } from "@/lib/work-tracker/public-time";
import { JOURNEY_COPY } from "./journey-copy";
import { TICKETS_TERMINAL_STATUSES } from "@/lib/support";
import {
  GATES,
  PHASES,
  TASKS,
  isJourneyStage,
  journeyTasks,
  isTaskStatus,
  percentDone,
  rollupStatus,
  stagesForPhase,
  type JourneyStage,
  type TaskStatus,
} from "./catalog";

export type PublicGate = {
  id: string;
  title: string;
  after: string;
  criteriaCount: number;
  answered: number;
  passed: boolean;
};

export type PublicStage = {
  name: string;
  status: TaskStatus | "Not Started";
  percent: number | null;
  taskCount: number;
};

export type PublicPhase = {
  name: string;
  purpose: string;
  outcome: string;
  percent: number | null;
  taskCount: number;
  start: string | null;
  end: string | null;
  current: boolean;
};

export type PublicJourney = {
  name: string;
  description: string;
  status: TaskStatus | "Not Started";
  stage: JourneyStage | null;
};

export type PublicRelease = {
  code: string | null;
  name: string;
  summary: string | null;
  date: string | null;
  status: string;
  percent: number | null;
  taskCount: number;
  doneCount: number;
  journeys: string[];
};

export type PublicShipped = {
  date: string;
  tag: string | null;
  title: string;
  body: string | null;
};

export type PublicSupport = {
  open: number;
  resolved: number;
  resolvedThisWeek: number;
};

export type PublicTracker = {
  generatedAt: string;
  overallPercent: number | null;
  taskCount: number;
  doneCount: number;
  movingCount: number;
  phases: PublicPhase[];
  gates: PublicGate[];
  currentPhase: string | null;
  currentPhaseStages: PublicStage[];
  journeys: PublicJourney[];
  releases: PublicRelease[];
  currentRelease: PublicRelease | null;
  shipped: PublicShipped[];
  dayNumber: number | null;
  support: PublicSupport;
};

export function releaseName(code: string | null, title: string): string {
  if (!code) return title;
  const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const prefix = new RegExp(`^\\s*${escaped}\\s*[—–-]\\s*`, "i");
  return title.replace(prefix, "").trim() || title;
}

export async function getPublicTracker(): Promise<PublicTracker> {
  const [
    taskRows,
    customRows,
    gateRows,
    dateRows,
    shippedRows,
    releaseRows,
    openTickets,
    resolvedTickets,
    resolvedThisWeek,
  ] = await Promise.all([
    prisma.workTrackerTaskState.findMany({
      select: { task_id: true, status: true, stage: true, release_id: true },
    }),
    // CUSTOM TASKS COUNT EVERYWHERE CATALOG TASKS COUNT — but only their
    prisma.workTrackerCustomTask.findMany({
      select: { status: true, release_id: true, phase: true },
    }),
    prisma.workTrackerGateState.findMany({
      select: { gate_id: true, value: true },
    }),
    prisma.workTrackerPhaseDate.findMany(),
    // A draft must be unreachable, not merely unrendered — the same shape the
    prisma.workTrackerShipped.findMany({
      where: { published: true },
      orderBy: [{ date: "desc" }, { created_at: "desc" }],
      take: 50,
      select: { date: true, journey_tag: true, title: true, body: true },
    }),
    // THE STATUS SETS COME FROM `support.ts`, NOT FROM A LIST RETYPED HERE.
    // must be unreachable, not merely unrendered.
    prisma.workTrackerRelease.findMany({
      where: { published: true },
      orderBy: [{ sort: "asc" }, { date: "asc" }],
      select: {
        id: true, code: true, title: true, summary: true, description: true,
        date: true, target_date: true, status: true,
      },
    }),
    prisma.supportTicket.count({
      where: { status: { notIn: TICKETS_TERMINAL_STATUSES } },
    }),
    prisma.supportTicket.count({
      where: { status: { in: TICKETS_TERMINAL_STATUSES } },
    }),
    // STATUS and cleared on reopen, so a re-opened ticket leaves this window
    prisma.supportTicket.count({
      where: {
        date_solved: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  const status = new Map<string, TaskStatus>();
  const stages = new Map<string, string | null>();
  for (const r of taskRows) {
    if (isTaskStatus(r.status)) status.set(r.task_id, r.status);
    stages.set(r.task_id, r.stage);
  }
  const statusOf = (id: string): TaskStatus => status.get(id) ?? "Not Started";
  // An unrecognised stored stage reads as null — no segments — rather than
  const stageOf = (id: string): string | null => stages.get(id) ?? null;

  const dates = new Map(dateRows.map((d) => [d.phase, { ...d, isCurrent: d.is_current }]));

  const phases: PublicPhase[] = PHASES.map((p) => {
    const ids = TASKS.filter((t) => t.phase === p.name).map((t) => t.id);
    const d = dates.get(p.name);
    return {
      name: p.name,
      purpose: p.purpose,
      outcome: p.outcome,
      percent: percentDone(ids.map(statusOf)),
      taskCount: ids.length,
      start: d?.start_date ? d.start_date.toISOString().slice(0, 10) : null,
      end: d?.end_date ? d.end_date.toISOString().slice(0, 10) : null,
      current: false,
    };
  });

  // THREE SOURCES, IN ORDER, AND THEY ARE NOT EQUALS (Scott, 2026-10-02)
  const adminNamed = phases.find((p) => dates.get(p.name)?.isCurrent === true) ?? null;

  const today = Date.now();
  const byDate =
    phases.find((p) => {
      const d = dates.get(p.name);
      if (!d?.start_date) return false;
      if (d.start_date.getTime() > today) return false;
      /* No end date means "still running", which is a fact and not a gap. */
      return !d.end_date || d.end_date.getTime() >= today;
    }) ?? null;

  const firstUnfinished =
    phases.find((p) => p.percent === null || p.percent < 100) ?? null;

  const current = adminNamed ?? byDate ?? firstUnfinished ?? phases[phases.length - 1] ?? null;
  if (current) current.current = true;

  // ONE STAGE IS HIDDEN FROM THE PUBLIC LIST ——————
  const PUBLIC_HIDDEN_STAGES = new Set(["Panameer Build"]);

  const currentPhaseStages: PublicStage[] = current
    ? stagesForPhase(current.name)
        .filter((stage) => !PUBLIC_HIDDEN_STAGES.has(stage))
        .map((stage) => {
        const ids = TASKS.filter(
          (t) => t.phase === current.name && t.stage === stage,
        ).map((t) => t.id);
        const ss = ids.map(statusOf);
        return {
          name: stage,
          status: rollupStatus(ss),
          percent: percentDone(ss),
          taskCount: ids.length,
        };
        })
    : [];

  // TEN JOURNEYS, NOT TWELVE (Scott, 2026-10-02). `PNM-011`/`PNM-012` are
  const journeys: PublicJourney[] = journeyTasks().map((t) => ({
    name: t.segment,
    /* PUBLIC COPY, NEVER `t.task` — see `JOURNEY_COPY` above. */
    description: JOURNEY_COPY[t.segment] ?? "",
    status: statusOf(t.id),
    stage: isJourneyStage(stageOf(t.id)) ? (stageOf(t.id) as JourneyStage) : null,
  }));

  const answeredByGate = new Map<string, { answered: number; yes: number }>();
  for (const r of gateRows) {
    const e = answeredByGate.get(r.gate_id) ?? { answered: 0, yes: 0 };
    e.answered += 1;
    if (r.value === "Yes" || r.value === "N/A") e.yes += 1;
    answeredByGate.set(r.gate_id, e);
  }

  const gates: PublicGate[] = GATES.map((g) => {
    const e = answeredByGate.get(g.id) ?? { answered: 0, yes: 0 };
    return {
      id: g.id,
      title: g.title,
      after: g.after,
      criteriaCount: g.criteria.length,
      answered: e.answered,
      // A GATE PASSES ONLY WHEN EVERY CRITERION IS ANSWERED AND NONE IS `No`.
      passed: e.answered === g.criteria.length && e.yes === g.criteria.length,
    };
  });

  // the "· Day N" clause entirely rather than printing `Day NaN` — and the reason
  // AND IT COUNTS IN THE SITE'S ZONE, NOT THE SERVER'S .
  const defineStart = dates.get(PHASES[0]?.name ?? "")?.start_date ?? null;
  const dayNumber = defineStart
    ? dayNumberInSiteZone(defineStart.toISOString().slice(0, 10))
    : null;

  // THE RELEASES, AND THEIR PERCENTAGES
  const releaseOfTask = new Map<string, string | null>();
  for (const r of taskRows) releaseOfTask.set(r.task_id, r.release_id);

  const releases: PublicRelease[] = releaseRows.map((r) => {
    /* Catalog tasks assigned to this release … */
    const catalogStatuses = TASKS.filter((t) => releaseOfTask.get(t.id) === r.id).map((t) =>
      statusOf(t.id),
    );
    /* … and the admin's own, which count identically. */
    const customStatuses = customRows
      .filter((c) => c.release_id === r.id)
      .map((c) => (isTaskStatus(c.status) ? c.status : "Not Started"));
    const all = [...catalogStatuses, ...customStatuses];
    const live = all.filter((x) => x !== "N/A");

    /* THE JOURNEYS IN THIS RELEASE — segment NAMES, never task text. */
    const journeyNames = journeyTasks()
      .filter((t) => releaseOfTask.get(t.id) === r.id)
      .map((t) => t.segment);

    return {
      code: r.code,
      name: releaseName(r.code, r.title),
      summary: r.summary ?? r.description,
      // existing row predates the rename and must keep working.
      date: (r.target_date ?? r.date)?.toISOString().slice(0, 10) ?? null,
      status: r.status,
      percent: live.length === 0 ? null : Math.round((live.filter((x) => x === "Done").length / live.length) * 100),
      taskCount: live.length,
      doneCount: live.filter((x) => x === "Done").length,
      journeys: journeyNames,
    };
  });

  // THE CURRENT RELEASE IS THE FIRST ONE NOT YET RELEASED, in the admin's own
  const currentRelease =
    releases.find((r) => r.status !== "Released") ?? releases[releases.length - 1] ?? null;

  const allStatuses = TASKS.map((t) => statusOf(t.id));

  return {
    generatedAt: new Date().toISOString(),
    overallPercent: percentDone(allStatuses),
    taskCount: allStatuses.filter((s) => s !== "N/A").length,
    doneCount: allStatuses.filter((s) => s === "Done").length,
    // Scott, walking `/status` 2026-10-02: *"'moving' count is wrong: it shows
    movingCount: allStatuses.filter((s) => s === "In Progress").length,
    phases,
    gates,
    currentPhase: current?.name ?? null,
    currentPhaseStages,
    journeys,
    releases,
    currentRelease,
    dayNumber,
    shipped: shippedRows.map((s) => ({
      date: s.date.toISOString().slice(0, 10),
      tag: s.journey_tag,
      title: s.title,
      body: s.body,
    })),
    support: { open: openTickets, resolved: resolvedTickets, resolvedThisWeek },
  };
}
