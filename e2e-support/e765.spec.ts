import { test, expect } from "@playwright/test";

/** `P2-ALL-E765` — releases you can configure. */
test("E765 — the hero reports the release, and Releases replaces Milestones", async ({ page, request }) => {
  for (const [w, scheme] of [[1440, "light"], [1440, "dark"], [390, "light"], [390, "dark"]] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: w, height: 1200 });
    await page.goto("/status");

    /* ⚠ The hero names the release, not the plan. */
    await expect(page.getByText(/R1 — Public beta/).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Releases" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Milestones" })).toHaveCount(0);

    const body = (await (await request.get("/api/status")).json()) as {
      currentRelease: { code: string; percent: number | null; taskCount: number; journeys: string[] } | null;
      overallPercent: number | null;
      releases: unknown[];
    };
    expect(body.currentRelease?.code).toBe("R1");
    expect(body.currentRelease?.journeys.sort()).toEqual(["Connect", "Profile", "Register"]);

    /* ⚠⚠ THE PLAN FIGURE SURVIVES AS THE SECONDARY LINE — it is still true, it is
       just no longer the headline. */
    await expect(page.getByText(/% of the whole plan/)).toBeVisible();

    const o = await page.evaluate(() => ({
      s: document.documentElement.scrollWidth,
      c: document.documentElement.clientWidth,
    }));
    expect(o.s).toBeLessThanOrEqual(o.c);
    console.log(
      `  ${w} ${scheme}: R1 ${body.currentRelease?.percent}% of ${body.currentRelease?.taskCount} · ` +
        `plan ${body.overallPercent}% · releases ${body.releases.length} · scrollW ${o.s}/${o.c}`
    );
    await page.screenshot({ path: `e2e-support/shots/e765-${w}-${scheme}.png`, fullPage: false });
  }
});
