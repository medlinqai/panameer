/**
 * ⚠⚠⚠ THE PLAN TOOL'S ONE WRITER (`P2-ALL-E783`).
 *
 * Every write to `plans` / `plan_rows` goes through this module. ⚠⚠ **`updated_by`
 * IS RESOLVED FROM THE SESSION, NEVER ACCEPTED FROM THE CLIENT** — the caller
 * hands in a `Viewer` it got from `guardApi`, exactly as `work-tracker/admin.ts`
 * does (load-bearing rule 5).
 *
 * ⚠⚠ THE STRUCTURAL RULES LIVE HERE AND NOWHERE ELSE, because the database
 * cannot express them: two levels only, a milestone is never a parent, and a
 * row never moves between plans. ⚠ `parent_id` has a real FK with
 * `onDelete: Cascade`, so a deleted phase takes its tasks with it — that part
 * the database does guarantee.
 *
 * ⚠ `sort` IS RENORMALISED TO DENSE `0..n-1` WITHIN A PARENT ON EVERY
 * STRUCTURAL CHANGE. Fractional or gapped sorts drift, and after enough drags
 * two rows compare equal and the order of a plan becomes arbitrary. A plan is
 * tens of rows, so rewriting the siblings costs nothing and the invariant is
 * worth more than the writes.
 */
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { Viewer } from "@/lib/access";
import {
  PLAN_OWNER_PANAMEER,
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

/**
 * ⚠ Returns null rather than creating anything. A read that silently creates a
 * plan would mint one from a public page view, and `/status` reads this.
 */
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

export const getPanameerPlan = () => getPlan(PLAN_OWNER_PANAMEER);

/* ── the plan itself ────────────────────────────────────────────────────── */

/**
 * ⚠⚠ IDEMPOTENT, AND IT CREATES NO ROWS. "The Panameer plan record (empty)" is
 * the brief's wording and it is literal: an empty plan is the honest starting
 * state, and the template is a button Scott presses — **never a seed.** The
 * database is shared with production (ruling 38), so content created at deploy
 * time is content nobody chose.
 */
export async function ensurePlan(ownerKey: string, title: string, viewer?: Viewer) {
  return prisma.plan.upsert({
    where: { owner_key: ownerKey },
    create: { owner_key: ownerKey, title, updated_by: viewer?.userId ?? null },
    /** ⚠ An existing plan's title is NOT overwritten — `ensure` means "exists",
     *  not "reset". Renaming is `renamePlan`, which somebody has to ask for. */
    update: {},
  });
}

export const ensurePanameerPlan = (viewer?: Viewer) =>
  ensurePlan(PLAN_OWNER_PANAMEER, "Panameer build", viewer);

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
        /** ⚠ A temporary slot past the end; `writeOrder` below puts it where it
         *  belongs. Computing the final sort here as well would be two answers
         *  to one question (`E585`). */
        sort: siblings.length,
        type,
        /** ⚠⚠ AN EMPTY TITLE IS ALLOWED AND IS THE WHOLE POINT OF AN OUTLINE
         *  EDITOR: Enter makes the next row and the cursor lands in it. A
         *  `title` the writer refused would make the editor unusable. */
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
    /** ⚠⚠ A ROW WITH CHILDREN CANNOT BECOME A MILESTONE. A milestone is a date,
     *  not a container; allowing it would put tasks under a diamond and make
     *  the numbering unreadable. */
    if (patch.type === "milestone" && (await childCount(row.id)) > 0) {
      throw new PlanError("Move or delete the rows underneath before making this a milestone.", "INVALID");
    }
    data.type = patch.type;
  }
  /**
   * ⚠⚠ DATES ARE SET INDEPENDENTLY AND AN END BEFORE A START IS REFUSED — but
   * only when BOTH are known after the patch. ⚠ Half a range is a normal state
   * in an outline editor (you type the start, then the end), so a validation
   * that demanded both would reject the first keystroke of every row.
   */
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

/* ── structure ──────────────────────────────────────────────────────────── */

/**
 * ⚠⚠ INDENT MEANS "BECOME A CHILD OF THE ROW ABOVE", and the row above must be
 * a top-level non-milestone. Everything else is refused with a reason rather
 * than silently ignored — Tab doing nothing with no explanation is the defect
 * `E539`'s sticky error was about.
 */
export async function indentRow(rowId: string, viewer: Viewer): Promise<StoredRow> {
  const row = await requireRow(rowId);
  if (row.parent_id) throw new PlanError("A plan is two levels deep, so this row is already as far in as it goes.", "INVALID");
  if ((await childCount(row.id)) > 0) {
    throw new PlanError("A plan is two levels deep — move the rows underneath out first.", "INVALID");
  }
  const siblings = await siblingsOf(prisma, row.plan_id, null);
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

  return prisma.$transaction(async (tx) => {
    const top = await siblingsOf(tx, row.plan_id, null);
    const moved = await tx.planRow.update({
      where: { id: row.id },
      data: { parent_id: null, updated_by: viewer.userId },
      select: ROW_SELECT,
    });
    /** ⚠⚠ THE ORDER IS BUILT FROM THE LIST AS IT WAS *BEFORE* THE ROW JOINED
     *  IT, so "directly after its old parent" means what it says. Reading the
     *  list back after the update and compacting it would renumber against a
     *  list that already contains the row, which is how a reorder turns into a
     *  reshuffle. */
    await writeOrder(tx, insertAfter(top, moved, parentId));
    await renormalise(tx, row.plan_id, parentId);
    return moved;
  });
}

/**
 * Reorder within the current parent. `delta` is -1 (up) or +1 (down); an
 * `index` moves straight to a slot, which is what a drag handle sends.
 */
export async function moveRow(
  rowId: string,
  to: { delta?: number; index?: number },
  viewer: Viewer,
): Promise<StoredRow> {
  const row = await requireRow(rowId);
  const siblings = await siblingsOf(prisma, row.plan_id, row.parent_id);
  const from = siblings.findIndex((s) => s.id === row.id);
  const raw = to.index !== undefined ? to.index : from + (to.delta ?? 0);
  /** ⚠ Clamped, not refused: dragging past the end means "last", and Up on the
   *  first row is a no-op the editor should not have to special-case. */
  const target = Math.max(0, Math.min(siblings.length - 1, raw));
  if (target === from) return row;

  const reordered = siblings.filter((s) => s.id !== row.id);
  reordered.splice(target, 0, row);

  return prisma.$transaction(async (tx) => {
    for (const [i, s] of reordered.entries()) {
      if (s.sort !== i) await tx.planRow.update({ where: { id: s.id }, data: { sort: i } });
    }
    await tx.planRow.update({ where: { id: row.id }, data: { updated_by: viewer.userId } });
    return (await tx.planRow.findUnique({ where: { id: row.id }, select: ROW_SELECT }))!;
  });
}

/**
 * ⚠⚠ DELETE RETURNS WHAT IT REMOVED, SO UNDO IS POSSIBLE AT ALL. The editor
 * offers "undo last delete", and an undo that cannot restore the children of a
 * deleted phase is not an undo — the FK cascade takes them, so they have to be
 * read back BEFORE the delete, not after.
 */
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

/**
 * Put back exactly what `deleteRow` returned — ⚠ including the original ids, so
 * a restored row is the same row and nothing that referenced it is left
 * pointing at a ghost. Parents are written before their children.
 */
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

/**
 * Copy every row of one plan into another owner key. ⚠⚠ ADMIN NOTES ARE COPIED
 * — a copy is for the same organisation and dropping them would lose work — but
 * `copyPlan` is admin-only, and the public payload strips `admin_note` at the
 * boundary (lane 3), never here. ⚠ One rule, one place.
 */
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
      /** ⚠ A child whose parent was not copied is skipped rather than written
       *  at the top level — silently promoting it would change the plan. */
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
  /** ⚠⚠ A ROW NEVER MOVES BETWEEN PLANS. Without this, a stale id from one
   *  plan's editor would graft a row onto another plan's tree. */
  if (parent.plan_id !== planId) throw new PlanError("That row belongs to another plan.", "INVALID");
  if (parent.parent_id) throw new PlanError("A plan is two levels deep.", "INVALID");
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

/**
 * The sibling list with `row` placed directly after `afterId` — or appended
 * when `afterId` is absent or not in the list. ⚠ Pure, so the gate can prove
 * the placement without a database.
 */
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
