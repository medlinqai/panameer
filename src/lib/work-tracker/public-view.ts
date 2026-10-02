import { prisma } from "@/lib/prisma";
import {
  GATES,
  PHASES,
  TASKS,
  isTaskStatus,
  percentDone,
  rollupStatus,
  stagesForPhase,
  type TaskStatus,
} from "./catalog";

/**
 * ⚠⚠⚠ THE PUBLIC WORK TRACKER VIEW MODEL (`P2-ALL-E753`).
 *
 * ⚠⚠ **SCOTT'S RULE, AND IT IS THE REASON THIS MODULE EXISTS SEPARATELY:**
 * *"I do not want to give a 'how to recreate Panameer' cookbook to the
 * competition."* The public page shows **two levels only** — phases, gates
 * (titles and passed/open), the current phase's stages, journeys, milestones,
 * a published Shipped log and support counts.
 *
 * ⚠⚠⚠ **TASK TEXT, TASK IDS, GATE CRITERION TEXT, NOTES AND OWNERS NEVER APPEAR
 * IN THE RETURN VALUE.** That is enforced by the TYPES below, not by a template:
 * `PublicPhase` and `PublicStage` have no field that could carry them, so a
 * future caller cannot spread a catalog object into one by accident. ⚠ This is
 * `E738`'s masking shape — the type is the gate, the template is not.
 *
 * ⚠ **NOTHING HERE SPREADS.** Every object is built field by field. A `...task`
 * anywhere in this file would defeat the whole module.
 */

export type PublicGate = {
  id: string;
  title: string;
  after: string;
  /* ⚠⚠ A COUNT AND A VERDICT, NEVER THE CRITERIA. `answered` lets the page say
     "3 of 5 answered" without naming one. */
  criteriaCount: number;
  answered: number;
  passed: boolean;
};

export type PublicStage = {
  /** ⚠ The stage NAME is a heading in the method, not build detail. */
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

export type PublicJourney = { name: string; status: TaskStatus | "Not Started" };

export type PublicShipped = { date: string; tag: string | null; title: string; body: string | null };

/**
 * ⚠⚠ SUPPORT COUNTS — AND TWO OF THE THREE THE BRIEF ASKED FOR CANNOT BE
 * COUNTED, WHICH IS REPORTED RATHER THAN APPROXIMATED.
 *
 * ⚠⚠⚠ **`SupportTicket` HAS NO `resolved_at` AND NO FIRST-REPLY COLUMN.** The
 * writer test (`decisions_2026-09-23.md` §1) says a figure is countable when the
 * state it counts has a writer — not when something upstream of it does:
 *   · *"resolved this week"* — `status` has a writer, but WHEN it was resolved
 *     does not. `updated_at` moves on any write, so a re-opened or edited ticket
 *     would land in the wrong week. **UNCOUNTABLE.**
 *   · *"median first reply"* — nothing records a first reply, and the table
 *     holds one message in total. **UNCOUNTABLE.**
 *
 * ⚠ So each carries its REASON, and the reason comes from the TYPE: a `null`
 * figure cannot be printed without the string beside it. ⚠⚠ **A real zero and an
 * uncountable figure must not look the same.** `open` and `resolved` are real
 * counts and render as numbers, including 0.
 *
 * ⚠ **THIS IS A RECORDED LIMIT, NOT A DECISION TO LEAVE IT THERE.** Adding
 * `resolved_at` and `first_reply_at` is additive and cheap; what it is NOT is
 * something to infer from a column that means something else.
 */
export type PublicSupport = {
  open: number;
  resolved: number;
  resolvedThisWeek: null;
  resolvedThisWeekReason: string;
  medianFirstReplyHours: null;
  medianFirstReplyReason: string;
};

export type PublicTracker = {
  generatedAt: string;
  overallPercent: number | null;
  taskCount: number;
  doneCount: number;
  phases: PublicPhase[];
  gates: PublicGate[];
  currentPhase: string | null;
  currentPhaseStages: PublicStage[];
  journeys: PublicJourney[];
  shipped: PublicShipped[];
  support: PublicSupport;
};

/** ⚠ `PNM-*` are the Panameer build items — the journeys the public page names. */
const JOURNEY_PREFIX = "PNM-";

export async function getPublicTracker(): Promise<PublicTracker> {
  const [taskRows, gateRows, dateRows, shippedRows, openTickets, resolvedTickets] = await Promise.all([
    prisma.workTrackerTaskState.findMany({ select: { task_id: true, status: true } }),
    prisma.workTrackerGateState.findMany({ select: { gate_id: true, value: true } }),
    prisma.workTrackerPhaseDate.findMany(),
    /* ⚠⚠⚠ `published: true` IS IN THE WHERE CLAUSE, NOT IN AN `if` AFTERWARDS.
       A draft must be unreachable, not merely unrendered — the same shape the
       masked profile uses, so a forgotten branch cannot leak one. */
    prisma.workTrackerShipped.findMany({
      where: { published: true },
      orderBy: [{ date: "desc" }, { created_at: "desc" }],
      take: 50,
      select: { date: true, journey_tag: true, title: true, body: true },
    }),
    prisma.supportTicket.count({ where: { status: { in: ["Open", "In Progress", "Waiting on Reporter"] } } }),
    prisma.supportTicket.count({ where: { status: { in: ["Resolved", "Closed"] } } }),
  ]);

  const status = new Map<string, TaskStatus>();
  for (const r of taskRows) if (isTaskStatus(r.status)) status.set(r.task_id, r.status);
  const statusOf = (id: string): TaskStatus => status.get(id) ?? "Not Started";

  const dates = new Map(dateRows.map((d) => [d.phase, d]));

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

  /* ⚠⚠ THE CURRENT PHASE IS THE FIRST ONE NOT FINISHED, IN METHOD ORDER — never
     "the one with the most recent date", which would jump backwards the moment
     an admin corrected an old phase's end date. ⚠ All phases complete → the last
     phase is current, because `Operate` does not end. */
  const firstUnfinished = phases.find((p) => p.percent === null || p.percent < 100);
  const current = firstUnfinished ?? phases[phases.length - 1] ?? null;
  if (current) current.current = true;

  const currentPhaseStages: PublicStage[] = current
    ? stagesForPhase(current.name).map((stage) => {
        const ids = TASKS.filter((t) => t.phase === current.name && t.stage === stage).map((t) => t.id);
        const ss = ids.map(statusOf);
        return { name: stage, status: rollupStatus(ss), percent: percentDone(ss), taskCount: ids.length };
      })
    : [];

  /* ⚠ A journey is named by its SEGMENT, not by its task text. `PNM-001`'s text
     lists the public site's pages — that is build detail and stays private. */
  const journeys: PublicJourney[] = TASKS.filter((t) => t.id.startsWith(JOURNEY_PREFIX)).map((t) => ({
    name: t.segment,
    status: statusOf(t.id),
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
      /* ⚠⚠ A GATE PASSES ONLY WHEN EVERY CRITERION IS ANSWERED AND NONE IS `No`.
         ⚠ An UNANSWERED criterion is not a pass — "0 of 5 answered" would
         otherwise read as passed, which is the most expensive thing this page
         could get wrong. */
      passed: e.answered === g.criteria.length && e.yes === g.criteria.length,
    };
  });

  const allStatuses = TASKS.map((t) => statusOf(t.id));

  return {
    generatedAt: new Date().toISOString(),
    overallPercent: percentDone(allStatuses),
    taskCount: allStatuses.filter((s) => s !== "N/A").length,
    doneCount: allStatuses.filter((s) => s === "Done").length,
    phases,
    gates,
    currentPhase: current?.name ?? null,
    currentPhaseStages,
    journeys,
    shipped: shippedRows.map((s) => ({
      date: s.date.toISOString().slice(0, 10),
      tag: s.journey_tag,
      title: s.title,
      body: s.body,
    })),
    support: {
      open: openTickets,
      resolved: resolvedTickets,
      resolvedThisWeek: null,
      resolvedThisWeekReason: "Nothing records when a ticket was resolved",
      medianFirstReplyHours: null,
      medianFirstReplyReason: "Nothing records a first reply",
    },
  };
}
