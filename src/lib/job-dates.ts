import type { WorkRequestDuration } from "@prisma/client";

// CA-E001: the job's dates fix the work; How Long is read from them.
const DAY = 86_400_000;
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);
export function durationBucket(start: string, end: string): WorkRequestDuration {
  const d = daysBetween(start, end);
  return d < 30 ? "LT_1_MONTH" : d < 92 ? "ONE_TO_3_MONTHS" : d < 183 ? "THREE_TO_6_MONTHS" : "GT_6_MONTHS";
}
/** "≈ 3 months" / "≈ 2 weeks" from two YYYY-MM-DD dates. */
export function howLongText(start: string, end: string): string {
  const d = daysBetween(start, end);
  if (d < 14) return `${d} day${d === 1 ? "" : "s"}`;
  if (d < 60) return `≈ ${Math.round(d / 7)} weeks`;
  const m = Math.round(d / 30.4);
  return m < 24 ? `≈ ${m} months` : `≈ ${Math.round(d / 365)} years`;
}
const DURATION_DAYS: Record<WorkRequestDuration, number> = { LT_1_MONTH: 28, ONE_TO_3_MONTHS: 91, THREE_TO_6_MONTHS: 182, GT_6_MONTHS: 365 };
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
/** Defaults when the posting gave no dates: Start two weeks out, End = Start + the posting's duration (else 3 months). */
export function defaultDates(sd: { startDate: string; endDate: string; duration: WorkRequestDuration | null }, now = Date.now()): { startDate: string; endDate: string } {
  const startDate = sd.startDate || iso(now + 14 * DAY);
  const endDate = sd.endDate && sd.endDate > startDate ? sd.endDate : iso(Date.parse(startDate) + DURATION_DAYS[sd.duration ?? "ONE_TO_3_MONTHS"] * DAY);
  return { startDate, endDate };
}
