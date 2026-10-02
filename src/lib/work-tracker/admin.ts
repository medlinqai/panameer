/**
 * ⚠⚠⚠ THE WORK TRACKER'S ONE WRITER (`P2-ALL-E752`).
 *
 * Every write to the four `WorkTracker*` tables goes through this module, and
 * every one of them validates against the CATALOG before it touches the
 * database: a `task_id` that is not in `aim-catalog.json` is refused, and so is
 * a status outside `TASK_STATUSES`. ⚠ The tables carry no foreign keys by
 * design, so this module **is** the referential integrity — there is nothing
 * underneath it to catch a bad id.
 *
 * ⚠⚠ **`updated_by` IS RESOLVED FROM THE SESSION, NEVER FROM THE CLIENT.** The
 * route passes a `Viewer` it got from `guardApi("canAdminister")`; no caller
 * supplies an id. That is load-bearing rule 5 applied here.
 *
 * ⚠ This module is ADMIN-ONLY and may read catalog text freely. The PUBLIC view
 * model lives in `public-view.ts` and shares none of these functions.
 */
import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { notifyFollowers } from "./followers";
import {
  GATES,
  PHASE_NAMES,
  TASKS,
  isGateValue,
  isJourneyStage,
  isTaskStatus,
  taskById,
  type GateValue,
  type JourneyStage,
  type TaskStatus,
} from "./catalog";

export class WorkTrackerError extends Error {
  constructor(message: string, public code: "INVALID" | "NOT_FOUND") {
    super(message);
    this.name = "WorkTrackerError";
  }
}

/* ── reads ──────────────────────────────────────────────────────────────── */

/**
 * ⚠⚠ ABSENT IS A VALUE, AND THE MAP IS WHERE THAT IS DECIDED ONCE.
 * A task with no row is `Not Started`. ⚠ Resolving that here means no caller
 * has to remember it, and the admin page and the public view cannot disagree
 * about what an untouched task means (`E585`).
 */
export type TaskState = {
  status: TaskStatus;
  owner: string | null;
  note: string | null;
  /** ⚠ `null` = no segments shown, never a guessed `design` (`E757`). */
  stage: JourneyStage | null;
  /** ⚠ `null` = not in any release, which is NOT the same as "in R1" (`E765`). */
  releaseId: string | null;
};

export async function taskStates(): Promise<Map<string, TaskState>> {
  const rows = await prisma.workTrackerTaskState.findMany();
  const byId = new Map<string, TaskState>();
  for (const r of rows) {
    /* ⚠ A row whose stored status is not one of the five is treated as
       `Not Started` rather than trusted — the column is a string, so nothing at
       the database level stops a bad value, and a loader is the wrong place to
       throw. */
    byId.set(r.task_id, {
      status: isTaskStatus(r.status) ? r.status : "Not Started",
      owner: r.owner,
      note: r.note,
      /* ⚠ An unrecognised stored stage reads as null — no segments — rather than
         being trusted. The column is a string; nothing at the DB level guards it. */
      stage: isJourneyStage(r.stage) ? r.stage : null,
      releaseId: r.release_id,
    });
  }
  return byId;
}

export function statusOf(states: Map<string, TaskState>, taskId: string): TaskStatus {
  return states.get(taskId)?.status ?? "Not Started";
}

/** ⚠ Keyed `"<gate_id>#<index>"`. ABSENT means UNANSWERED, which is not `No`. */
export async function gateStates(): Promise<Map<string, GateValue>> {
  const rows = await prisma.workTrackerGateState.findMany();
  const out = new Map<string, GateValue>();
  for (const r of rows) {
    if (isGateValue(r.value)) out.set(`${r.gate_id}#${r.criterion_index}`, r.value);
  }
  return out;
}

export async function phaseDates() {
  const rows = await prisma.workTrackerPhaseDate.findMany();
  return new Map(
    rows.map((r) => [r.phase, { start: r.start_date, end: r.end_date, isCurrent: r.is_current }]),
  );
}

/**
 * ⚠⚠ MILESTONES (`P2-ALL-E757`). ADMIN read — returns drafts too.
 * ⚠ Ordered by `sort` then `date`, because two milestones can share a date and
 * chronological is not always the reading order.
 */
export async function releases() {
  return prisma.workTrackerRelease.findMany({ orderBy: [{ sort: "asc" }, { date: "asc" }] });
}

export const RELEASE_STATUSES = ["Planned", "In progress", "Released"] as const;
export type ReleaseStatus = (typeof RELEASE_STATUSES)[number];

function isReleaseStatus(v: unknown): v is ReleaseStatus {
  return typeof v === "string" && (RELEASE_STATUSES as readonly string[]).includes(v);
}

export type ReleaseInput = {
  code?: unknown;
  summary?: unknown;
  start?: unknown;
  title?: unknown;
  description?: unknown;
  date?: unknown;
  status?: unknown;
  sort?: unknown;
  published?: unknown;
};

export async function createRelease(viewer: Viewer, input: ReleaseInput) {
  const title = trimToNull(input.title);
  if (!title) throw new WorkTrackerError("A milestone needs a title", "INVALID");
  const date = toDateOrNull(input.date, "date");
  /* ⚠⚠ THE DATE IS REQUIRED AND THAT IS THE POINT OF THE TABLE — a milestone
     with no date cannot be placed on the Build Line, which is why it exists. */
  if (!date) throw new WorkTrackerError("A milestone needs a date", "INVALID");
  if (input.status !== undefined && !isReleaseStatus(input.status)) {
    throw new WorkTrackerError(`"${String(input.status)}" is not a milestone status`, "INVALID");
  }
  return prisma.workTrackerRelease.create({
    data: {
      title,
      description: trimToNull(input.description),
      date,
      status: isReleaseStatus(input.status) ? input.status : "Planned",
      code: trimToNull(input.code),
      summary: trimToNull(input.summary),
      start_date: toDateOrNull(input.start, "start_date"),
      /* ⚠ `target_date` is the new field; `date` is kept in step so the legacy
         column never goes stale while both exist (see the schema). */
      target_date: date,
      sort: Number.isInteger(Number(input.sort)) ? Number(input.sort) : 0,
      /* ⚠ A new milestone is a DRAFT, for the same reason a Shipped entry is:
         Scott approves what the public sees. `published` is ignored on create. */
      published: false,
      updated_by: viewer.userId,
    },
  });
}

export async function updateRelease(viewer: Viewer, id: string, input: ReleaseInput) {
  const existing = await prisma.workTrackerRelease.findUnique({ where: { id } });
  if (!existing) throw new WorkTrackerError("No such milestone", "NOT_FOUND");
  const title = input.title === undefined ? undefined : trimToNull(input.title);
  if (input.title !== undefined && !title) {
    throw new WorkTrackerError("A milestone needs a title", "INVALID");
  }
  const date = input.date === undefined ? undefined : toDateOrNull(input.date, "date");
  if (input.date !== undefined && !date) {
    throw new WorkTrackerError("A milestone needs a date", "INVALID");
  }
  if (input.status !== undefined && !isReleaseStatus(input.status)) {
    throw new WorkTrackerError(`"${String(input.status)}" is not a milestone status`, "INVALID");
  }
  /* ⚠ A milestone announces when its STATE moves while it is public — not when
     its wording is corrected, and not while it is still a draft. */
  const stateMoved =
    input.status !== undefined && input.status !== existing.status && existing.published;
  const becomingPublic = input.published === true && existing.published === false;

  const updated = await prisma.workTrackerRelease.update({
    where: { id },
    data: {
      ...(title ? { title } : {}),
      ...(input.description !== undefined ? { description: trimToNull(input.description) } : {}),
      ...(date ? { date } : {}),
      ...(input.status !== undefined ? { status: input.status as ReleaseStatus } : {}),
      ...(input.sort !== undefined && Number.isInteger(Number(input.sort)) ? { sort: Number(input.sort) } : {}),
      ...(input.published !== undefined ? { published: input.published === true } : {}),
      ...(input.code !== undefined ? { code: trimToNull(input.code) } : {}),
      ...(input.summary !== undefined ? { summary: trimToNull(input.summary) } : {}),
      ...(input.start !== undefined ? { start_date: toDateOrNull(input.start, "start_date") } : {}),
      ...(date ? { target_date: date } : {}),
      updated_by: viewer.userId,
    },
  });

  if (stateMoved || becomingPublic) {
    try {
      await notifyFollowers(
        "work_tracker.milestone",
        { title: updated.title, description: updated.description },
        `work_tracker.milestone:${updated.id}:${updated.status}`
      );
    } catch (e) {
      console.error("[work-tracker] follower fan-out failed:", e);
    }
  }
  return updated;
}

export async function deleteRelease(id: string) {
  const existing = await prisma.workTrackerRelease.findUnique({ where: { id } });
  if (!existing) throw new WorkTrackerError("No such milestone", "NOT_FOUND");
  return prisma.workTrackerRelease.delete({ where: { id } });
}

/** ⚠ ADMIN read — returns drafts too. The public reader filters in the WHERE. */
export async function shippedEntries() {
  return prisma.workTrackerShipped.findMany({ orderBy: [{ date: "desc" }, { created_at: "desc" }] });
}

/* ── writes ─────────────────────────────────────────────────────────────── */

export async function setTaskState(
  viewer: Viewer,
  taskId: string,
  input: { status?: unknown; owner?: unknown; note?: unknown; stage?: unknown }
) {
  if (!taskById(taskId)) {
    throw new WorkTrackerError(`No catalog task "${taskId}"`, "NOT_FOUND");
  }
  if (input.status !== undefined && !isTaskStatus(input.status)) {
    throw new WorkTrackerError(`"${String(input.status)}" is not a task status`, "INVALID");
  }
  /* ⚠⚠ `stage` ACCEPTS `null` DELIBERATELY — clearing it back to "no segments"
     must be possible, or a mis-click is permanent. Empty string and null both
     clear; anything else must be one of the four. */
  if (input.stage !== undefined && input.stage !== null && input.stage !== "" && !isJourneyStage(input.stage)) {
    throw new WorkTrackerError(`"${String(input.stage)}" is not a journey stage`, "INVALID");
  }
  const stage = input.stage === undefined ? undefined : isJourneyStage(input.stage) ? input.stage : null;
  const owner = trimToNull(input.owner);
  const note = trimToNull(input.note);
  const data = {
    ...(input.status !== undefined ? { status: input.status as TaskStatus } : {}),
    ...(input.owner !== undefined ? { owner } : {}),
    ...(input.note !== undefined ? { note } : {}),
    ...(stage !== undefined ? { stage } : {}),
    updated_by: viewer.userId,
  };
  return prisma.workTrackerTaskState.upsert({
    where: { task_id: taskId },
    update: data,
    create: { task_id: taskId, status: "Not Started", ...data },
  });
}

/**
 * ⚠⚠ BULK SET BY STAGE — the brief's one bulk affordance.
 * ⚠ It writes only the tasks the CATALOG puts in that stage, so a stage name
 * that does not exist changes nothing rather than matching everything.
 */
export async function setStageStatus(
  viewer: Viewer,
  phase: string,
  stage: string,
  status: unknown
): Promise<number> {
  if (!isTaskStatus(status)) {
    throw new WorkTrackerError(`"${String(status)}" is not a task status`, "INVALID");
  }
  const ids = TASKS.filter((t) => t.phase === phase && t.stage === stage).map((t) => t.id);
  if (ids.length === 0) {
    throw new WorkTrackerError(`No catalog tasks in ${phase} / ${stage}`, "NOT_FOUND");
  }
  for (const id of ids) {
    await prisma.workTrackerTaskState.upsert({
      where: { task_id: id },
      update: { status, updated_by: viewer.userId },
      create: { task_id: id, status, updated_by: viewer.userId },
    });
  }
  return ids.length;
}

export async function setGateCriterion(
  viewer: Viewer,
  gateId: string,
  criterionIndex: number,
  value: unknown
) {
  const gate = GATES.find((g) => g.id === gateId);
  if (!gate) throw new WorkTrackerError(`No catalog gate "${gateId}"`, "NOT_FOUND");
  if (!Number.isInteger(criterionIndex) || criterionIndex < 0 || criterionIndex >= gate.criteria.length) {
    throw new WorkTrackerError(`Criterion ${criterionIndex} is not in ${gateId}`, "NOT_FOUND");
  }
  /*
    ⚠⚠⚠ AN ADMIN CAN CLEAR AN ANSWER (Scott, 2026-10-02: *"yes, an admin can
    clear one"*). ⚠ `""` or `null` DELETES the row, which is what returns the
    criterion to UNANSWERED — and unanswered is a different fact from `No`, which
    is why it cannot be represented by writing a value.
    ⚠ `deleteMany` rather than `delete`: clearing something already clear must
    not throw. The admin pressed the button; the end state is what they asked for.
  */
  if (value === "" || value === null) {
    await prisma.workTrackerGateState.deleteMany({
      where: { gate_id: gateId, criterion_index: criterionIndex },
    });
    return null;
  }
  if (!isGateValue(value)) {
    throw new WorkTrackerError(`"${String(value)}" is not a gate value`, "INVALID");
  }
  const row = await prisma.workTrackerGateState.upsert({
    where: { gate_id_criterion_index: { gate_id: gateId, criterion_index: criterionIndex } },
    update: { value, updated_by: viewer.userId },
    create: { gate_id: gateId, criterion_index: criterionIndex, value, updated_by: viewer.userId },
  });

  /* ⚠⚠ A GATE PASSES WHEN EVERY CRITERION IS ANSWERED AND NONE IS `No` — the
     SAME definition the public page uses, so the notice and the page cannot
     disagree (`E585`). ⚠ Re-asserting a Yes on an already-passed gate dedupes on
     the gate id, so it announces once. */
  const answers = await prisma.workTrackerGateState.findMany({ where: { gate_id: gateId } });
  const passed =
    answers.length === gate.criteria.length &&
    answers.every((a) => a.value === "Yes" || a.value === "N/A");
  if (passed) {
    try {
      await notifyFollowers(
        "work_tracker.gate_passed",
        { gate: gate.id, gateTitle: gate.title },
        `work_tracker.gate_passed:${gate.id}`
      );
    } catch (e) {
      console.error("[work-tracker] follower fan-out failed:", e);
    }
  }
  return row;
}

/**
 * ⚠⚠⚠ THE ADMIN NAMES THE CURRENT PHASE (`P2-ALL-E757`, Scott 2026-10-02).
 *
 * ⚠ **AT MOST ONE PHASE MAY HOLD IT**, and that is enforced here rather than
 * hoped for: the clear and the set are one transaction, so there is no instant
 * where two phases are current and no way for a failed write to leave two.
 * ⚠⚠ Passing `null` clears the choice and hands the question back to the
 * fallbacks — which is a real action, not an absence.
 */
export async function setCurrentPhase(viewer: Viewer, phase: string | null) {
  if (phase !== null && !PHASE_NAMES.includes(phase)) {
    throw new WorkTrackerError(`No catalog phase "${phase}"`, "NOT_FOUND");
  }
  await prisma.$transaction(async (tx) => {
    await tx.workTrackerPhaseDate.updateMany({
      where: { is_current: true },
      data: { is_current: false },
    });
    if (phase) {
      /* ⚠ Upsert, because a phase can be named current before anybody has given
         it dates — the two facts are independent. */
      await tx.workTrackerPhaseDate.upsert({
        where: { phase },
        update: { is_current: true, updated_by: viewer.userId },
        create: { phase, is_current: true, updated_by: viewer.userId },
      });
    }
  });
}

/**
 * ⚠⚠⚠ ASSIGN WORK TO A RELEASE (`P2-ALL-E765`).
 *
 * ⚠ `releaseId` of `null` UNASSIGNS, which is a real action: a task that leaves a
 * release stops counting toward it, and the percentage moves. ⚠⚠ That is why the
 * column is nullable and why unassigned is not the same as "in R1".
 */
export async function setTaskRelease(viewer: Viewer, taskId: string, releaseId: string | null) {
  if (!taskById(taskId)) throw new WorkTrackerError(`No catalog task "${taskId}"`, "NOT_FOUND");
  await assertReleaseExists(releaseId);
  return prisma.workTrackerTaskState.upsert({
    where: { task_id: taskId },
    update: { release_id: releaseId, updated_by: viewer.userId },
    create: { task_id: taskId, status: "Not Started", release_id: releaseId, updated_by: viewer.userId },
  });
}

/**
 * ⚠⚠ BULK ASSIGN BY STAGE OR SEGMENT — Scott's example: *"all of Prototype 2 →
 * R1."* ⚠ It writes only the tasks the CATALOG puts in that group, so a name that
 * matches nothing changes nothing rather than matching everything.
 */
export async function bulkAssignRelease(
  viewer: Viewer,
  by: { phase?: string; stage?: string; segment?: string },
  releaseId: string | null,
): Promise<number> {
  await assertReleaseExists(releaseId);
  const ids = TASKS.filter(
    (t) =>
      (by.phase ? t.phase === by.phase : true) &&
      (by.stage ? t.stage === by.stage : true) &&
      (by.segment ? t.segment === by.segment : true),
  ).map((t) => t.id);
  if (ids.length === 0) throw new WorkTrackerError("That group has no catalog tasks", "NOT_FOUND");
  /* ⚠ A bulk write that half-lands leaves a release's percentage wrong and
     nobody knows which half, so it is one transaction. */
  await prisma.$transaction(async (tx) => {
    for (const id of ids) {
      await tx.workTrackerTaskState.upsert({
        where: { task_id: id },
        update: { release_id: releaseId, updated_by: viewer.userId },
        create: { task_id: id, status: "Not Started", release_id: releaseId, updated_by: viewer.userId },
      });
    }
  });
  return ids.length;
}

async function assertReleaseExists(releaseId: string | null) {
  if (releaseId === null) return;
  const hit = await prisma.workTrackerRelease.findUnique({ where: { id: releaseId } });
  /* ⚠⚠ THE TABLES HAVE NO FOREIGN KEYS, SO THIS IS THE REFERENTIAL INTEGRITY. A
     bad id would otherwise sit there forever pointing at nothing, and the admin
     page — which iterates real releases — would never show it. */
  if (!hit) throw new WorkTrackerError("No such release", "NOT_FOUND");
}

/** ⚠ Admin-added work. The TITLE is admin-only and never reaches the public. */
export async function createCustomTask(
  viewer: Viewer,
  input: { title?: unknown; phase?: unknown; stage?: unknown; releaseId?: unknown },
) {
  const title = trimToNull(input.title);
  if (!title) throw new WorkTrackerError("A task needs a title", "INVALID");
  const phase = String(input.phase ?? "");
  if (!PHASE_NAMES.includes(phase)) throw new WorkTrackerError(`No catalog phase "${phase}"`, "NOT_FOUND");
  const releaseId = input.releaseId ? String(input.releaseId) : null;
  await assertReleaseExists(releaseId);
  return prisma.workTrackerCustomTask.create({
    data: {
      title,
      phase,
      stage: isJourneyStage(input.stage) ? input.stage : null,
      release_id: releaseId,
      updated_by: viewer.userId,
    },
  });
}

export async function updateCustomTask(
  viewer: Viewer,
  id: string,
  input: { status?: unknown; owner?: unknown; note?: unknown; releaseId?: unknown; title?: unknown },
) {
  const existing = await prisma.workTrackerCustomTask.findUnique({ where: { id } });
  if (!existing) throw new WorkTrackerError("No such task", "NOT_FOUND");
  if (input.status !== undefined && !isTaskStatus(input.status)) {
    throw new WorkTrackerError(`"${String(input.status)}" is not a task status`, "INVALID");
  }
  if (input.releaseId !== undefined) {
    await assertReleaseExists(input.releaseId ? String(input.releaseId) : null);
  }
  return prisma.workTrackerCustomTask.update({
    where: { id },
    data: {
      ...(input.status !== undefined ? { status: input.status as TaskStatus } : {}),
      ...(input.owner !== undefined ? { owner: trimToNull(input.owner) } : {}),
      ...(input.note !== undefined ? { note: trimToNull(input.note) } : {}),
      ...(input.title !== undefined && trimToNull(input.title) ? { title: trimToNull(input.title)! } : {}),
      ...(input.releaseId !== undefined
        ? { release_id: input.releaseId ? String(input.releaseId) : null }
        : {}),
      updated_by: viewer.userId,
    },
  });
}

export async function deleteCustomTask(id: string) {
  const existing = await prisma.workTrackerCustomTask.findUnique({ where: { id } });
  if (!existing) throw new WorkTrackerError("No such task", "NOT_FOUND");
  return prisma.workTrackerCustomTask.delete({ where: { id } });
}

export async function customTasks() {
  return prisma.workTrackerCustomTask.findMany({ orderBy: [{ sort: "asc" }, { created_at: "asc" }] });
}

export async function setPhaseDates(
  viewer: Viewer,
  phase: string,
  input: { start?: unknown; end?: unknown }
) {
  if (!PHASE_NAMES.includes(phase)) {
    throw new WorkTrackerError(`No catalog phase "${phase}"`, "NOT_FOUND");
  }
  const start = toDateOrNull(input.start, "start_date");
  const end = toDateOrNull(input.end, "end_date");
  const data = {
    ...(input.start !== undefined ? { start_date: start } : {}),
    ...(input.end !== undefined ? { end_date: end } : {}),
    updated_by: viewer.userId,
  };
  return prisma.workTrackerPhaseDate.upsert({
    where: { phase },
    update: data,
    create: { phase, ...data },
  });
}

export type ShippedInput = {
  date?: unknown;
  journeyTag?: unknown;
  title?: unknown;
  body?: unknown;
  published?: unknown;
};

export async function createShipped(viewer: Viewer, input: ShippedInput) {
  const title = trimToNull(input.title);
  if (!title) throw new WorkTrackerError("A Shipped entry needs a title", "INVALID");
  const date = toDateOrNull(input.date, "date");
  if (!date) throw new WorkTrackerError("A Shipped entry needs a date", "INVALID");
  return prisma.workTrackerShipped.create({
    data: {
      date,
      journey_tag: trimToNull(input.journeyTag),
      title,
      body: trimToNull(input.body),
      /* ⚠⚠⚠ A NEW ENTRY IS A DRAFT, FULL STOP. `published` is ignored on create
         on purpose: Scott approves each entry, and an API that could create one
         already published would make that approval optional. */
      published: false,
      updated_by: viewer.userId,
    },
  });
}

export async function updateShipped(viewer: Viewer, id: string, input: ShippedInput) {
  const existing = await prisma.workTrackerShipped.findUnique({ where: { id } });
  if (!existing) throw new WorkTrackerError("No such Shipped entry", "NOT_FOUND");
  const title = input.title === undefined ? undefined : trimToNull(input.title);
  if (input.title !== undefined && !title) {
    throw new WorkTrackerError("A Shipped entry needs a title", "INVALID");
  }
  const date = input.date === undefined ? undefined : toDateOrNull(input.date, "date");
  if (input.date !== undefined && !date) {
    throw new WorkTrackerError("A Shipped entry needs a date", "INVALID");
  }
  /* ⚠ The two guards above already refused a blank title and an unreadable date,
     so these are non-null HERE — but `trimToNull`/`toDateOrNull` return nullable
     types and the columns are not nullable. Narrowing at the call rather than
     loosening the helpers keeps the refusal in one place. */
  /* ⚠⚠⚠ NOTIFY ON THE TRANSITION TO PUBLISHED, NOT ON EVERY SAVE. An admin
     fixing a typo on an already-published entry must not re-announce it, and an
     unpublish must not announce anything at all. ⚠ `dedupeKey` is the row id, so
     even a publish → unpublish → publish lands one notification. */
  const becomingPublic = input.published === true && existing.published === false;

  const updated = await prisma.workTrackerShipped.update({
    where: { id },
    data: {
      ...(date ? { date } : {}),
      ...(input.journeyTag !== undefined ? { journey_tag: trimToNull(input.journeyTag) } : {}),
      ...(title ? { title } : {}),
      ...(input.body !== undefined ? { body: trimToNull(input.body) } : {}),
      ...(input.published !== undefined ? { published: input.published === true } : {}),
      updated_by: viewer.userId,
    },
  });

  if (becomingPublic) {
    /* ⚠ Failure to notify must not fail the publish — the entry is live and a
       notification outage is not an editing outage. Logged, not rethrown. */
    try {
      await notifyFollowers(
        "work_tracker.shipped",
        { title: updated.title, body: updated.body },
        `work_tracker.shipped:${updated.id}`
      );
    } catch (e) {
      console.error("[work-tracker] follower fan-out failed:", e);
    }
  }
  return updated;
}

export async function deleteShipped(id: string) {
  const existing = await prisma.workTrackerShipped.findUnique({ where: { id } });
  if (!existing) throw new WorkTrackerError("No such Shipped entry", "NOT_FOUND");
  return prisma.workTrackerShipped.delete({ where: { id } });
}

/* ── helpers ────────────────────────────────────────────────────────────── */

function trimToNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

/**
 * ⚠⚠ A DATE WE COULD NOT READ IS REFUSED, NEVER SILENTLY TREATED AS TODAY.
 * ⚠ That is `E549`'s ruling applied here: *"a parse failure must never silently
 * extend a job to today"* — the same mistake on a phase date would print a
 * start that nobody chose.
 */
function toDateOrNull(v: unknown, field: string): Date | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v !== "string") throw new WorkTrackerError(`${field} must be a date string`, "INVALID");
  const d = new Date(`${v}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new WorkTrackerError(`${field} "${v}" is not a date`, "INVALID");
  return d;
}
