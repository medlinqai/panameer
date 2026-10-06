import type { RowPatch, StoredRow } from "@/lib/plan/store";
import { isRowStatus, isRowType } from "@/lib/plan/model";

// Request parsing shared by every plan endpoint (admin build plan, work-order plans).
export function asId(v: unknown): string | null {
  return typeof v === "string" && v ? v : null;
}

/** these are pure dates, and a local-midnight parse shifts them a day in */
export function asDate(v: unknown): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const d = new Date(`${v}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function readPatch(body: Record<string, unknown>): RowPatch {
  const patch: RowPatch = {};
  if (typeof body.title === "string") patch.title = body.title;
  if (isRowStatus(body.status)) patch.status = body.status;
  if (isRowType(body.type)) patch.type = body.type;
  if (body.owner !== undefined) patch.owner = body.owner === null ? null : String(body.owner);
  if (body.publicNote !== undefined) patch.public_note = body.publicNote === null ? null : String(body.publicNote);
  if (body.adminNote !== undefined) patch.admin_note = body.adminNote === null ? null : String(body.adminNote);
  if (body.releaseId !== undefined) patch.release_id = asId(body.releaseId);
  if (body.hours !== undefined) {
    patch.hours = body.hours === null || body.hours === "" ? null : Number(body.hours);
  }
  const start = asDate(body.startDate);
  if (start !== undefined) patch.start_date = start;
  const end = asDate(body.endDate);
  if (end !== undefined) patch.end_date = end;
  return patch;
}

/** Accept a row back only if it is shaped right AND belongs to this plan. */
export function sanitiseRow(raw: unknown, planId: string): StoredRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || r.plan_id !== planId) return null;
  if (!isRowType(r.type) || !isRowStatus(r.status)) return null;
  const start = asDate(typeof r.start_date === "string" ? r.start_date.slice(0, 10) : r.start_date);
  const end = asDate(typeof r.end_date === "string" ? r.end_date.slice(0, 10) : r.end_date);
  return {
    id: r.id,
    plan_id: planId,
    parent_id: asId(r.parent_id),
    sort: typeof r.sort === "number" ? r.sort : 0,
    type: r.type,
    title: typeof r.title === "string" ? r.title : "",
    start_date: start ?? null,
    end_date: end ?? null,
    status: r.status,
    owner: r.owner === null || r.owner === undefined ? null : String(r.owner),
    hours: typeof r.hours === "number" ? r.hours : null,
    release_id: asId(r.release_id),
    public_note: r.public_note === null || r.public_note === undefined ? null : String(r.public_note),
    admin_note: r.admin_note === null || r.admin_note === undefined ? null : String(r.admin_note),
  };
}
