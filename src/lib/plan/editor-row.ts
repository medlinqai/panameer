import type { PlanRowLike } from "./model";

export type EditorRow = {
  id: string;
  plan_id: string;
  parent_id: string | null;
  sort: number;
  type: string;
  title: string;
  /** `YYYY-MM-DD` or `""` — what `<input type="date">` reads and writes. */
  start_date: string;
  end_date: string;
  status: string;
  owner: string;
  hours: number | null;
  release_id: string | null;
  public_note: string;
  admin_note: string;
};

export function toEditorRow(
  r: PlanRowLike & { plan_id?: string; admin_note?: string | null; owner?: string | null },
): EditorRow {
  return {
    id: r.id,
    plan_id: r.plan_id ?? "",
    parent_id: r.parent_id,
    sort: r.sort,
    type: r.type,
    title: r.title,
    start_date: iso(r.start_date),
    end_date: iso(r.end_date),
    status: r.status,
    owner: r.owner ?? "",
    hours: r.hours ?? null,
    release_id: r.release_id ?? null,
    public_note: r.public_note ?? "",
    admin_note: r.admin_note ?? "",
  };
}

export function toModelRow(r: EditorRow): PlanRowLike {
  return {
    id: r.id,
    parent_id: r.parent_id,
    sort: r.sort,
    type: r.type,
    title: r.title,
    start_date: r.start_date ? new Date(`${r.start_date}T00:00:00.000Z`) : null,
    end_date: r.end_date ? new Date(`${r.end_date}T00:00:00.000Z`) : null,
    status: r.status,
    owner: r.owner,
    hours: r.hours,
    release_id: r.release_id,
    public_note: r.public_note,
  };
}

/** Parsed and printed in UTC: these are pure dates and a local-midnight round */
function iso(d: Date | string | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}
