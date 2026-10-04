
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

/** ⚠ The calendar date in a given zone, as `YYYY-MM-DD`. `en-CA` yields ISO. */
function ymdIn(d: Date, tz: string): string {
  return d.toLocaleDateString("en-CA", { timeZone: tz });
}

/**
 * ── ⚠⚠ DAY N, COUNTED IN CALENDAR DAYS, NOT IN MILLISECONDS ────────────────
 *
 * ⚠⚠⚠ **THE OLD FORM DIVIDED BY 86_400_000 FROM A MIDNIGHT-UTC DATE, SO IT
 * ROLLED OVER AT UTC MIDNIGHT** — measured at 8:36 PM ET on 2 Oct, the page
 * already said **DAY 50** when ET was still on day 49.
 * ⚠ Counting CALENDAR days between two `YYYY-MM-DD` strings has no hours in it
 * at all, so there is no instant left to round the wrong way. ⚠⚠ Day 1 is the
 * start date itself, which is why the difference is `+ 1`.
 */
export function dayNumber(startYmd: string, now: Date = new Date()): number {
  const today = ymdIn(now, SITE_TZ);
  const a = Date.parse(`${startYmd}T00:00:00Z`);
  const b = Date.parse(`${today}T00:00:00Z`);
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
}

/**
 * Today's calendar date in the site's zone, as `YYYY-MM-DD`.
 *
 * ⚠⚠ **IT EXISTS SO ONE VALUE FEEDS EVERY "IS THIS LATE / IS THIS NOW" ANSWER
 * ON A PAGE** (`P2-ALL-E785`). The plan's Today line, its `Past due` marks and
 * `Day N` must agree, and the only way they can is if the page resolves the day
 * once and passes it down. ⚠ A component calling `new Date()` for itself lands
 * on the server's zone — ET on this mac, **UTC on Vercel** — which is the exact
 * defect `E775` fixed for the `updated` line.
 */
export function todayInSiteZone(now: Date = new Date()): string {
  return ymdIn(now, SITE_TZ);
}
