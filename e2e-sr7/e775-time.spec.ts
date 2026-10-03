import { test, expect } from "@playwright/test";
import { dayNumber, formatInstant, formatStoredDate, SITE_TZ } from "../src/lib/work-tracker/public-time";

/**
 * ── ⚠⚠⚠ `/status` TELLS THE TIME IN SCOTT'S DAY (`P2-ALL-E775`) ────────────
 *
 * ⚠⚠⚠ **THESE RUN WITH THE PROCESS PINNED TO UTC, WHICH IS WHAT VERCEL IS.**
 * The defect was invisible on a developer's mac — `toLocaleDateString` with no
 * `timeZone` uses the SERVER's zone, which is ET here and UTC there. ⚠ A test
 * that did not pin the zone would have passed against the bug.
 */
test.describe("P2-ALL-E775 — dates and times", () => {
  const TZ = process.env.TZ;
  test.beforeAll(() => {
    process.env.TZ = "UTC";
  });
  test.afterAll(() => {
    /* ⚠ Put the process back; other specs in a shared runner should not inherit
       a zone this file chose. */
    if (TZ === undefined) delete process.env.TZ;
    else process.env.TZ = TZ;
  });

  /**
   * ⚠⚠⚠ THE EXACT MOMENT SCOTT REPORTED: 00:35 UTC on 3 Oct is 8:35 PM ET on
   * 2 Oct. One instant, two calendars — and the page must print his.
   */
  const MOMENT = "2026-10-03T00:35:51.585Z";

  test("⚠⚠⚠ a timestamp is printed in the reader's day, not the server's", () => {
    expect(formatInstant(MOMENT), "updated should read Oct 2 at 8:35 PM ET").toBe("Oct 2");
    /* ⚠ And the control: the same instant formatted the OLD way (server zone,
       pinned to UTC here) is what production actually printed. */
    expect(
      new Date(MOMENT).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      "the old behaviour printed Oct 3 — this is the bug being reproduced"
    ).toBe("Oct 3");
  });

  /**
   * ⚠⚠⚠ A PURE DATE IS NOT A MOMENT AND MUST NOT MOVE. This is the trap in
   * "format everything in America/New_York": `2026-11-01T00:00:00Z` rendered in
   * ET is **Oct 31**, and every date on the page would go back a day.
   */
  test("⚠⚠⚠ a stored date prints as itself, in either direction", () => {
    expect(formatStoredDate("2026-11-01")).toBe("Nov 1");
    expect(formatStoredDate("2026-08-15")).toBe("Aug 15");
    expect(formatStoredDate("2026-01-01"), "a new-year date must not fall back to Dec 31").toBe("Jan 1");
    /* ⚠ The counter-case, stated so nobody "fixes" the UTC above into SITE_TZ. */
    expect(
      new Date("2026-11-01T00:00:00Z").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: SITE_TZ,
      }),
      "shifting a pure date to ET moves it a day earlier — this is why it must not be done"
    ).toBe("Oct 31");
  });

  /**
   * ⚠⚠ DAY N ROLLS AT MIDNIGHT IN SCOTT'S ZONE, NOT AT UTC MIDNIGHT. Measured
   * live at 8:36 PM ET on 2 Oct, the old form already said DAY 50.
   */
  test("⚠⚠ Day N counts calendar days in the site's zone", () => {
    const start = "2026-08-15";
    /* 8:35 PM ET on 2 Oct — still day 49 */
    expect(dayNumber(start, new Date(MOMENT))).toBe(49);
    /* 00:05 UTC is 8:05 PM ET the previous day: must NOT have rolled */
    expect(dayNumber(start, new Date("2026-10-03T00:05:00Z"))).toBe(49);
    /* 04:05 UTC IS past midnight ET: now it rolls */
    expect(dayNumber(start, new Date("2026-10-03T04:05:00Z"))).toBe(50);
    /* Day 1 is the start date itself, not day 0 */
    expect(dayNumber(start, new Date("2026-08-15T18:00:00Z"))).toBe(1);
  });

  test("⚠ and the live page agrees with the helper", async ({ page, request }) => {
    const api = (await (await request.get("/api/status")).json()) as {
      generatedAt: string;
      dayNumber: number | null;
    };
    await page.goto("/status", { waitUntil: "domcontentloaded" });
    const txt = await page.evaluate(() => document.body.innerText);
    expect(txt, "the hero's updated line").toContain(`updated ${formatInstant(api.generatedAt)}`);
    if (api.dayNumber !== null) expect(txt).toContain(`DAY ${api.dayNumber}`);
    console.log(`  generatedAt ${api.generatedAt} -> updated ${formatInstant(api.generatedAt)} · DAY ${api.dayNumber}`);
  });
});
