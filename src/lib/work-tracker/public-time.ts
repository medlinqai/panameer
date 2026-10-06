
export const SITE_TZ = "America/New_York";

export function formatInstant(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: SITE_TZ,
  });
}

export function formatStoredDate(ymd: string): string {
  return new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** The calendar date in a given zone, as `YYYY-MM-DD`. `en-CA` yields ISO. */
function ymdIn(d: Date, tz: string): string {
  return d.toLocaleDateString("en-CA", { timeZone: tz });
}

/** DAY N, COUNTED IN CALENDAR DAYS, NOT IN MILLISECONDS */
export function dayNumber(startYmd: string, now: Date = new Date()): number {
  const today = ymdIn(now, SITE_TZ);
  const a = Date.parse(`${startYmd}T00:00:00Z`);
  const b = Date.parse(`${today}T00:00:00Z`);
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
}

/** Today's calendar date in the site's zone, as `YYYY-MM-DD`. */
export function todayInSiteZone(now: Date = new Date()): string {
  return ymdIn(now, SITE_TZ);
}
