import type { PublicPlanRow } from "@/lib/plan/public";
import { formatStoredDate } from "@/lib/work-tracker/public-time";

// /status phase card (Scott 2026-10-05): the phase executing tasks now, and days to the next release.
export type PhaseCard = {
  phase: { number: string; title: string; releaseTitle: string | null; percent: number | null; start: string | null; end: string | null; daysLeft: number | null } | null;
  release: { title: string; date: string; days: number } | null;
};

const DAY = 86_400_000;
/** Calendar days between two pure dates (YYYY-MM-DD); no zone involved. */
export const daysBetween = (fromYmd: string, toYmd: string) =>
  Math.round((Date.parse(`${toYmd}T00:00:00Z`) - Date.parse(`${fromYmd}T00:00:00Z`)) / DAY);

const hasTaskInProgress = (r: PublicPlanRow): boolean =>
  r.children.some((c) => (c.type !== "milestone" && c.status === "In progress" && c.children.length === 0) || hasTaskInProgress(c));

/** Phases = direct children of release rows (or top-level phases when the plan has no releases). */
function phasesOf(rows: readonly PublicPlanRow[]) {
  const out: { row: PublicPlanRow; release: PublicPlanRow | null }[] = [];
  for (const r of rows) {
    if (r.type === "release") for (const c of r.children) if (c.type !== "milestone") out.push({ row: c, release: r });
    if (r.type === "phase") out.push({ row: r, release: null });
  }
  return out;
}

export function phaseCard(rows: readonly PublicPlanRow[], todayYmd: string): PhaseCard {
  const live = phasesOf(rows)
    .filter((p) => hasTaskInProgress(p.row))
    .sort((a, b) => (a.row.start ?? "9999").localeCompare(b.row.start ?? "9999"));
  const pick = live[0] ?? null;

  const deploys = rows
    .filter((r) => r.type === "release")
    .flatMap((r) => r.children.filter((c) => c.type === "milestone" && c.status !== "Done" && (c.start ?? c.end)).map((c) => ({ release: r, date: (c.start ?? c.end)! })))
    .filter((d) => d.date >= todayYmd)
    .sort((a, b) => a.date.localeCompare(b.date));
  const next = deploys[0] ?? null;

  return {
    phase: pick
      ? {
          number: pick.row.number,
          title: pick.row.title,
          releaseTitle: pick.release?.title ?? null,
          percent: pick.row.progress?.percent ?? null,
          start: pick.row.start,
          end: pick.row.end,
          daysLeft: pick.row.end ? daysBetween(todayYmd, pick.row.end) : null,
        }
      : null,
    release: next ? { title: next.release.title, date: next.date, days: daysBetween(todayYmd, next.date) } : null,
  };
}

/** "35 days left", "1 day left", "Ends today", "3 days past due". */
export function phaseDaysLabel(d: number): string {
  if (d > 0) return `${d} day${d === 1 ? "" : "s"} left`;
  if (d === 0) return "Ends today";
  return `${-d} day${d === -1 ? "" : "s"} past due`;
}

export const shortDate = (ymd: string | null) => (ymd ? formatStoredDate(ymd) : "—");
