/**
 * ── ⚠⚠⚠ WHAT TIME IT IS ON `/status` (`P2-ALL-E775`) ───────────────────────
 *
 * ⚠ **SCOTT, 2026-10-02:** the page said *"updated Oct 3"* while it was Oct 2
 * where he was sitting.
 *
 * ⚠⚠⚠ **THE CAUSE WAS NOT "THE PAGE FORMATS IN UTC" — IT IS THAT IT NAMED NO
 * ZONE AT ALL.** `toLocaleDateString("en-US", { month, day })` with no `timeZone`
 * uses the **server's** zone. That is ET on a developer's mac and **UTC on
 * Vercel**, so the page was right locally and wrong in production.
 * ⚠⚠ **A FIX "VERIFIED LOCALLY" WOULD HAVE PROVEN NOTHING**, which is why the
 * gate pins `TZ=UTC` and reproduces the production server before asserting.
 *
 * ── ⚠⚠⚠ AND THE TWO KINDS OF VALUE MUST NOT BE TREATED ALIKE ──────────────
 *
 * ⚠ **A TIMESTAMP** — "when was this page generated", "what day of the build is
 * it" — is a moment, and the reader wants it in THEIR day. Those go to
 * `America/New_York` (Scott's zone, and the project's working zone).
 *
 * ⚠⚠⚠ **A PURE DATE — a release target, a phase start — IS NOT A MOMENT AND MUST
 * NOT BE SHIFTED.** It is stored `@db.Date`, i.e. midnight UTC, so rendering
 * `2026-11-01T00:00:00Z` in `America/New_York` prints **Oct 31**. ⚠ Every date on
 * the page would move a day earlier, which is the bug this file exists to fix,
 * reintroduced in the opposite direction. **They stay `timeZone: "UTC"`.**
 */

/** ⚠ Scott's zone, and the one the whole project works in. */
export const SITE_TZ = "America/New_York";

/**
 * ⚠⚠ A TIMESTAMP, IN THE READER'S DAY. Used for *"updated Oct 2"*.
 */
export function formatInstant(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: SITE_TZ,
  });
}

/**
 * ⚠⚠⚠ A PURE DATE, PRINTED AS ITSELF. `ymd` is `YYYY-MM-DD` as stored.
 * ⚠ `timeZone: "UTC"` here is not a zone CHOICE — it is what stops a calendar
 * date being reinterpreted as a moment and moved.
 */
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
