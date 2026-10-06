import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { Viewer } from "@/lib/access";
import {
  planOwnerKey,
  isRowStatus,
  isRowType,
  type RowStatus,
  type RowType,
} from "./model";

export class PlanError extends Error {
  constructor(message: string, public code: "INVALID" | "NOT_FOUND") {
    super(message);
    this.name = "PlanError";
  }
}

const ROW_SELECT = {
  id: true,
  plan_id: true,
  parent_id: true,
  sort: true,
  type: true,
  title: true,
  start_date: true,
  end_date: true,
  status: true,
  owner: true,
  hours: true,
  release_id: true,
  public_note: true,
  admin_note: true,
} satisfies Prisma.PlanRowSelect;

export type StoredRow = Prisma.PlanRowGetPayload<{ select: typeof ROW_SELECT }>;

/* ── reads ──────────────────────────────────────────────────────────────── */

export async function getPlan(ownerKey: string) {
  const plan = await prisma.plan.findUnique({ where: { owner_key: ownerKey } });
  if (!plan) return null;
  const rows = await prisma.planRow.findMany({
    where: { plan_id: plan.id },
    select: ROW_SELECT,
    orderBy: [{ sort: "asc" }, { id: "asc" }],
  });
  return { plan, rows };
}

export const getPanameerPlan = () => getPlan(planOwnerKey());

/* ── the plan itself ────────────────────────────────────────────────────── */

export async function ensurePlan(ownerKey: string, title: string, viewer?: Viewer) {
  return prisma.plan.upsert({
    where: { owner_key: ownerKey },
    create: { owner_key: ownerKey, title, updated_by: viewer?.userId ?? null },
    update: {},
  });
}

export const ensurePanameerPlan = (viewer?: Viewer) =>
  ensurePlan(planOwnerKey(), "Panameer build", viewer);

export async function renamePlan(planId: string, title: string, viewer: Viewer) {
  const clean = title.trim();
  if (!clean) throw new PlanError("A plan needs a title.", "INVALID");
  return prisma.plan.update({
    where: { id: planId },
    data: { title: clean, updated_by: viewer.userId },
  });
}

/* ── rows ───────────────────────────────────────────────────────────────── */

export type AddRowInput = {
  planId: string;
  type?: RowType;
  /** null/absent = top level. */
  parentId?: string | null;
  /** Insert directly after this sibling; absent = append to the end. */
  afterId?: string | null;
  title?: string;
};

export async function addRow(input: AddRowInput, viewer: Viewer): Promise<StoredRow> {
  const type: RowType = input.type ?? "task";
  if (!isRowType(type)) throw new PlanError(`Unknown row type: ${type}`, "INVALID");

  const parentId = input.parentId ?? null;
  if (parentId) await assertCanParent(parentId, input.planId);

  return prisma.$transaction(async (tx) => {
    const siblings = await siblingsOf(tx, input.planId, parentId);
    const created = await tx.planRow.create({
      data: {
        plan_id: input.planId,
        parent_id: parentId,
        /** A temporary slot past the end; `writeOrder` below puts it where it */
        sort: siblings.length,
        type,
        /** AN EMPTY TITLE IS ALLOWED AND IS THE WHOLE POINT OF AN OUTLINE */
        title: (input.title ?? "").trim(),
        updated_by: viewer.userId,
      },
      select: ROW_SELECT,
    });
    await writeOrder(tx, insertAfter(siblings, created, input.afterId ?? null));
    return created;
  });
}

export type RowPatch = {
  title?: string;
  start_date?: Date | null;
  end_date?: Date | null;
  status?: RowStatus;
  owner?: string | null;
  hours?: number | null;
  release_id?: string | null;
  public_note?: string | null;
  admin_note?: string | null;
  type?: RowType;
};

export async function updateRow(rowId: string, patch: RowPatch, viewer: Viewer): Promise<StoredRow> {
  const row = await requireRow(rowId);
  const data: Prisma.PlanRowUpdateInput = { updated_by: viewer.userId };

  if (patch.title !== undefined) data.title = patch.title.trim();
  if (patch.status !== undefined) {
    if (!isRowStatus(patch.status)) throw new PlanError(`Unknown status: ${patch.status}`, "INVALID");
    data.status = patch.status;
  }
  if (patch.type !== undefined) {
    if (!isRowType(patch.type)) throw new PlanError(`Unknown row type: ${patch.type}`, "INVALID");
    /** A ROW WITH CHILDREN CANNOT BECOME A MILESTONE. A milestone is a date */
    if (patch.type === "milestone" && (await childCount(row.id)) > 0) {
      throw new PlanError("Move or delete the rows underneath before making this a milestone.", "INVALID");
    }
    data.type = patch.type;
  }
  /** DATES ARE SET INDEPENDENTLY AND AN END BEFORE A START IS REFUSED — but */
  const nextStart = patch.start_date !== undefined ? patch.start_date : row.start_date;
  const nextEnd = patch.end_date !== undefined ? patch.end_date : row.end_date;
  if (nextStart && nextEnd && nextEnd.getTime() < nextStart.getTime()) {
    throw new PlanError("The end date is before the start date.", "INVALID");
  }
  if (patch.start_date !== undefined) data.start_date = patch.start_date;
  if (patch.end_date !== undefined) data.end_date = patch.end_date;

  if (patch.owner !== undefined) data.owner = emptyToNull(patch.owner);
  if (patch.public_note !== undefined) data.public_note = emptyToNull(patch.public_note);
  if (patch.admin_note !== undefined) data.admin_note = emptyToNull(patch.admin_note);
  if (patch.release_id !== undefined) data.release_id = patch.release_id;
  if (patch.hours !== undefined) {
    if (patch.hours !== null && (!Number.isFinite(patch.hours) || patch.hours < 0)) {
      throw new PlanError("Hours must be zero or more.", "INVALID");
    }
    data.hours = patch.hours;
  }

  return prisma.planRow.update({ where: { id: rowId }, data, select: ROW_SELECT });
}

/** How deep a row sits: 0 top level, 1 under a release or a phase, 2 a task under */
export const MAX_DEPTH = 2;

async function depthOf(row: { parent_id: string | null }): Promise<number> {
  let depth = 0;
  let parentId = row.parent_id;
  while (parentId && depth <= MAX_DEPTH + 1) {
    const parent = await prisma.planRow.findUnique({
      where: { id: parentId },
      select: { parent_id: true },
    });
    if (!parent) break;
    depth += 1;
    parentId = parent.parent_id;
  }
  return depth;
}

/** The deepest descendant below a row, relative to it (0 when it has none). */
async function subtreeHeight(rowId: string): Promise<number> {
  const kids = await prisma.planRow.findMany({ where: { parent_id: rowId }, select: { id: true } });
  if (kids.length === 0) return 0;
  let max = 0;
  for (const k of kids) max = Math.max(max, 1 + (await subtreeHeight(k.id)));
  return max;
}

/* ── structure ──────────────────────────────────────────────────────────── */

/** INDENT MEANS "BECOME A CHILD OF THE ROW ABOVE", and the row above must be */
export async function indentRow(rowId: string, viewer: Viewer): Promise<StoredRow> {
  const row = await requireRow(rowId);
  const depth = await depthOf(row);
  /* THREE LEVELS (`E807`): release → phase → task. The row ends one deeper, and
     everything under it comes along, so both have to fit. */
  if (depth >= MAX_DEPTH) {
    throw new PlanError("A plan is three levels deep, so this row is already as far in as it goes.", "INVALID");
  }
  if (depth + 1 + (await subtreeHeight(row.id)) > MAX_DEPTH) {
    throw new PlanError("A plan is three levels deep — move the rows underneath out first.", "INVALID");
  }
  const siblings = await siblingsOf(prisma, row.plan_id, row.parent_id);
  const index = siblings.findIndex((s) => s.id === row.id);
  const previous = index > 0 ? siblings[index - 1] : null;
  if (!previous) throw new PlanError("There is no row above this one to go under.", "INVALID");
  if (previous.type === "milestone") {
    throw new PlanError("A milestone marks a date, so nothing goes under it.", "INVALID");
  }

  return prisma.$transaction(async (tx) => {
    const target = await siblingsOf(tx, row.plan_id, previous.id);
    const moved = await tx.planRow.update({
      where: { id: row.id },
      data: { parent_id: previous.id, sort: target.length, updated_by: viewer.userId },
      select: ROW_SELECT,
    });
    await renormalise(tx, row.plan_id, null);
    await renormalise(tx, row.plan_id, previous.id);
    return moved;
  });
}

/** Outdent: becomes a top-level row immediately after its old parent. */
export async function outdentRow(rowId: string, viewer: Viewer): Promise<StoredRow> {
  const row = await requireRow(rowId);
  if (!row.parent_id) throw new PlanError("This row is already at the top level.", "INVALID");
  const parentId = row.parent_id;

  /* ONE LEVEL OUT, NOT ALL THE WAY TO THE TOP (`E807`). A task under a phase
     under a release becomes a sibling of that phase; before three levels existed
     the two were the same thing, and `parent_id: null` was correct. */
  const parent = await prisma.planRow.findUnique({
    where: { id: parentId },
    select: { parent_id: true },
  });
  const newParentId = parent?.parent_id ?? null;

  return prisma.$transaction(async (tx) => {
    const top = await siblingsOf(tx, row.plan_id, newParentId);
    const moved = await tx.planRow.update({
      where: { id: row.id },
      data: { parent_id: newParentId, updated_by: viewer.userId },
      select: ROW_SELECT,
    });
    /** THE ORDER IS BUILT FROM THE LIST AS IT WAS *BEFORE* THE ROW JOINED */
    await writeOrder(tx, insertAfter(top, moved, parentId));
    await renormalise(tx, row.plan_id, parentId);
    return moved;
  });
}

/** Reorder within the current parent. `delta` is -1 (up) or +1 (down); an */
export async function moveRow(
  rowId: string,
  to: { delta?: number; index?: number; parentId?: string | null },
  viewer: Viewer,
): Promise<StoredRow> {
  const row = await requireRow(rowId);
  /** MOVING ACROSS PARENTS . `parentId` undefined means "stay */
  const changingParent = to.parentId !== undefined && to.parentId !== row.parent_id;
  const newParentId = changingParent ? (to.parentId ?? null) : row.parent_id;

  if (changingParent && newParentId) {
    /** A ROW CANNOT BECOME ITS OWN DESCENDANT'S CHILD. Without this, dropping a */
    let cursor: string | null = newParentId;
    while (cursor) {
      if (cursor === row.id) {
        throw new PlanError("A row cannot move inside itself.", "INVALID");
      }
      const up: { parent_id: string | null } | null = await prisma.planRow.findUnique({
        where: { id: cursor },
        select: { parent_id: true },
      });
      cursor = up?.parent_id ?? null;
    }
    await assertCanParent(newParentId, row.plan_id);
    // The whole subtree has to fit inside three levels, not just this row.
    const landingDepth = await depthOf({ parent_id: newParentId });
    if (landingDepth + (await subtreeHeight(row.id)) > MAX_DEPTH) {
      throw new PlanError(
        "A plan is three levels deep — the rows underneath this one would not fit there.",
        "INVALID",
      );
    }
  }

  const siblings = await siblingsOf(prisma, row.plan_id, newParentId);
  /* When the parent changes the row is not in that list yet, so "from" is -1
     and the target index is simply where it is being inserted. */
  const from = siblings.findIndex((s) => s.id === row.id);
  const raw = to.index !== undefined ? to.index : from + (to.delta ?? 0);
  const ceiling = changingParent ? siblings.length : siblings.length - 1;
  /** Clamped, not refused: dragging past the end means "last", and Up on the */
  const target = Math.max(0, Math.min(ceiling, raw));
  if (!changingParent && target === from) return row;

  const reordered = siblings.filter((s) => s.id !== row.id);
  reordered.splice(target, 0, row);

  /* The row's old siblings close the gap it leaves behind. */
  const oldSiblings = changingParent
    ? (await siblingsOf(prisma, row.plan_id, row.parent_id)).filter((s) => s.id !== row.id)
    : [];

  return prisma.$transaction(async (tx) => {
    if (changingParent) {
      await tx.planRow.update({ where: { id: row.id }, data: { parent_id: newParentId } });
      for (const [i, s] of oldSiblings.entries()) {
        if (s.sort !== i) await tx.planRow.update({ where: { id: s.id }, data: { sort: i } });
      }
    }
    for (const [i, s] of reordered.entries()) {
      if (s.sort !== i || s.id === row.id) {
        await tx.planRow.update({ where: { id: s.id }, data: { sort: i } });
      }
    }
    await tx.planRow.update({ where: { id: row.id }, data: { updated_by: viewer.userId } });
    return (await tx.planRow.findUnique({ where: { id: row.id }, select: ROW_SELECT }))!;
  });
}

/** DELETE RETURNS WHAT IT REMOVED, SO UNDO IS POSSIBLE AT ALL. The editor */
export async function deleteRow(rowId: string, viewer: Viewer): Promise<StoredRow[]> {
  const row = await requireRow(rowId);
  const removed = await prisma.planRow.findMany({
    where: { OR: [{ id: row.id }, { parent_id: row.id }] },
    select: ROW_SELECT,
    orderBy: [{ sort: "asc" }, { id: "asc" }],
  });
  await prisma.$transaction(async (tx) => {
    await tx.planRow.delete({ where: { id: row.id } });
    await renormalise(tx, row.plan_id, row.parent_id);
    await tx.plan.update({ where: { id: row.plan_id }, data: { updated_by: viewer.userId } });
  });
  return removed;
}

/** Put back exactly what `deleteRow` returned — including the original ids, so */
export async function restoreRows(rows: readonly StoredRow[], viewer: Viewer): Promise<number> {
  if (rows.length === 0) return 0;
  const ordered = [...rows].sort((a, b) => Number(!!a.parent_id) - Number(!!b.parent_id));
  await prisma.$transaction(async (tx) => {
    for (const r of ordered) {
      await tx.planRow.create({ data: { ...r, updated_by: viewer.userId } });
    }
  });
  return ordered.length;
}

/* ── copy ───────────────────────────────────────────────────────────────── */

/** Copy every row of one plan into another owner key. ADMIN NOTES ARE COPIED */
export async function copyPlan(
  sourceOwnerKey: string,
  targetOwnerKey: string,
  title: string,
  viewer: Viewer,
) {
  const source = await getPlan(sourceOwnerKey);
  if (!source) throw new PlanError(`No plan called ${sourceOwnerKey}.`, "NOT_FOUND");
  const target = await ensurePlan(targetOwnerKey, title, viewer);
  const existing = await prisma.planRow.count({ where: { plan_id: target.id } });
  if (existing > 0) throw new PlanError("That plan already has rows. Clear it first.", "INVALID");

  const parents = source.rows.filter((r) => !r.parent_id);
  const idMap = new Map<string, string>();
  await prisma.$transaction(async (tx) => {
    for (const p of parents) {
      const created = await tx.planRow.create({
        data: { ...rowPayload(p), plan_id: target.id, parent_id: null, updated_by: viewer.userId },
        select: { id: true },
      });
      idMap.set(p.id, created.id);
    }
    for (const c of source.rows.filter((r) => r.parent_id)) {
      const parent = idMap.get(c.parent_id!);
      /** A child whose parent was not copied is skipped rather than written */
      if (!parent) continue;
      await tx.planRow.create({
        data: { ...rowPayload(c), plan_id: target.id, parent_id: parent, updated_by: viewer.userId },
      });
    }
  });
  return { plan: target, copied: idMap.size };
}

/** Strips identity and keeps content — used by copy and by the template. */
function rowPayload(r: StoredRow) {
  return {
    sort: r.sort,
    type: r.type,
    title: r.title,
    start_date: r.start_date,
    end_date: r.end_date,
    status: r.status,
    owner: r.owner,
    hours: r.hours,
    release_id: r.release_id,
    public_note: r.public_note,
    admin_note: r.admin_note,
  };
}

/* ── helpers ────────────────────────────────────────────────────────────── */

type Tx = Prisma.TransactionClient | typeof prisma;

async function requireRow(rowId: string): Promise<StoredRow> {
  const row = await prisma.planRow.findUnique({ where: { id: rowId }, select: ROW_SELECT });
  if (!row) throw new PlanError("That row is gone.", "NOT_FOUND");
  return row;
}

async function childCount(rowId: string) {
  return prisma.planRow.count({ where: { parent_id: rowId } });
}

async function assertCanParent(parentId: string, planId: string) {
  const parent = await prisma.planRow.findUnique({
    where: { id: parentId },
    select: { id: true, plan_id: true, parent_id: true, type: true },
  });
  if (!parent) throw new PlanError("That phase is gone.", "NOT_FOUND");
  /** A ROW NEVER MOVES BETWEEN PLANS. Without this, a stale id from one */
  if (parent.plan_id !== planId) throw new PlanError("That row belongs to another plan.", "INVALID");
  /* A parent may sit at depth 0 or 1 — three levels (`E807`). */
  if ((await depthOf(parent)) >= MAX_DEPTH) {
    throw new PlanError("A plan is three levels deep.", "INVALID");
  }
  if (parent.type === "milestone") {
    throw new PlanError("A milestone marks a date, so nothing goes under it.", "INVALID");
  }
}

async function siblingsOf(tx: Tx, planId: string, parentId: string | null) {
  return tx.planRow.findMany({
    where: { plan_id: planId, parent_id: parentId },
    select: ROW_SELECT,
    orderBy: [{ sort: "asc" }, { id: "asc" }],
  });
}

/** The sibling list with `row` placed directly after `afterId` — or appended */
export function insertAfter<T extends { id: string }>(
  siblings: readonly T[],
  row: T,
  afterId: string | null,
): T[] {
  const without = siblings.filter((s) => s.id !== row.id);
  const index = afterId ? without.findIndex((s) => s.id === afterId) : -1;
  if (index < 0) return [...without, row];
  return [...without.slice(0, index + 1), row, ...without.slice(index + 1)];
}

/** Write dense `0..n-1` in the given order, touching only rows that move. */
async function writeOrder(tx: Tx, ordered: readonly { id: string; sort: number }[]) {
  for (const [i, r] of ordered.entries()) {
    if (r.sort !== i) await tx.planRow.update({ where: { id: r.id }, data: { sort: i } });
  }
}

/** Rewrite one sibling list to dense `0..n-1`, preserving current order. */
async function renormalise(tx: Tx, planId: string, parentId: string | null) {
  const rows = await siblingsOf(tx, planId, parentId);
  for (const [i, r] of rows.entries()) {
    if (r.sort !== i) await tx.planRow.update({ where: { id: r.id }, data: { sort: i } });
  }
}

function emptyToNull(v: string | null) {
  if (v === null) return null;
  const clean = v.trim();
  return clean === "" ? null : clean;
}

/* ── import ─────────────────────────────────────────────────────────────── */

export type ImportMode = "replace" | "append";

/** Write imported rows into a plan. */
export async function writeImportedRows(
  planId: string,
  imported: readonly {
    level: 1 | 2; title: string; type: string; start: string | null; end: string | null;
    status: string; owner: string | null; hours: number | null; release?: string | null;
  }[],
  mode: ImportMode,
  viewer: Viewer,
): Promise<{ written: number; replaced: number; unknownReleases: string[] }> {
  if (imported.length === 0) throw new PlanError("Nothing in that file could be imported.", "INVALID");

  /** THE RELEASE CODE IS RESOLVED HERE */
  const releases = await prisma.workTrackerRelease.findMany({ select: { id: true, code: true } });
  const byCode = new Map(releases.filter((r) => r.code).map((r) => [r.code!.toUpperCase(), r.id]));
  const unknownReleases = [
    ...new Set(
      imported
        .map((r) => (r.release ?? "").trim().toUpperCase())
        .filter((c) => c && !byCode.has(c)),
    ),
  ];

  return prisma.$transaction(async (tx) => {
    let replaced = 0;
    if (mode === "replace") {
      const { count } = await tx.planRow.deleteMany({ where: { plan_id: planId } });
      replaced = count;
    }
    /** Appended rows start after the existing top-level rows, so an append */
    const base = mode === "append"
      ? await tx.planRow.count({ where: { plan_id: planId, parent_id: null } })
      : 0;

    let topSort = base;
    let childSort = 0;
    let parentId: string | null = null;
    let written = 0;

    for (const r of imported) {
      const date = (v: string | null) => (v ? new Date(`${v}T00:00:00.000Z`) : null);
      const data = {
        plan_id: planId,
        type: r.type,
        title: r.title,
        start_date: date(r.start),
        end_date: date(r.end),
        status: r.status,
        owner: r.owner,
        hours: r.hours,
        /** THE RELEASE SURVIVES THE ROUND TRIP . An unrecognised code */
        release_id: r.release ? byCode.get(r.release.trim().toUpperCase()) ?? null : null,
        updated_by: viewer.userId,
      };
      if (r.level === 1) {
        const made = await tx.planRow.create({
          data: { ...data, parent_id: null, sort: topSort++ },
          select: { id: true, type: true },
        });
        /** A MILESTONE IS NEVER A PARENT, so a level-2 row after one has no */
        parentId = made.type === "milestone" ? null : made.id;
        childSort = 0;
      } else {
        await tx.planRow.create({ data: { ...data, parent_id: parentId, sort: childSort++ } });
      }
      written++;
    }

    await tx.plan.update({ where: { id: planId }, data: { updated_by: viewer.userId } });
    return { written, replaced, unknownReleases };
  });
}
