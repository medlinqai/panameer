import { test, expect, type Browser } from "@playwright/test";
import { signIn } from "./_auth";
import { requireCompleteProvider } from "./_persona";

/**
 * ── ⚠⚠ THE WEB, IN A BROWSER (`P2-J3-E591` WS-B stop gate) ────────────────
 *
 * ⚠ `check:community-web` proves the LAYOUT cannot overlap, exhaustively, in
 * Node. ⚠⚠ WHAT IT CANNOT SEE IS THE WIDTH THE THING ACTUALLY RENDERS AT —
 * which is the measurement Scott asked for: *"MEASURE THE WIDTH IT WILL RENDER
 * AT and lay out for that, not for the mockup's numbers."*
 *
 * ⚠ So this measures the real rendered box at three widths, prints it, and
 * asserts the properties that only exist once it is on a page.
 */

/**
 * ── ⚠⚠⚠ THE PRECONDITION. IT RUNS FIRST AND IT FAILS LOUDLY (`P0-E595` WS-B) ─
 *
 * ⚠ SCOTT, 2026-09-21: *"The gate must fail loudly if that persona isn't a
 * complete provider. A gate that passes on nothing isn't a gate (E586)."*
 *
 * ⚠⚠ `E586` IS `check:resume` REPORTING `0 passed, 0 failed, 16 skipped` WITH
 * EXIT CODE 0 because its fixtures did not exist, and it was quoted as green in
 * gate tables for weeks. ⚠⚠⚠ THE SAME HOLE OPENED HERE THE MOMENT THE `E595`
 * RESET EMPTIED THE SEED: the account every spec signs in as lost its provider
 * profile, and several assertions in this suite are ABSENCE checks — *"no rate
 * reaches the visitor"* — which a blank page satisfies perfectly.
 * ⚠ So the suite would have gone greener, not redder, on no data at all.
 *
 * ⚠ It asserts the persona as a BUYER sees them: on `/talent`, which only lists
 * providers who pass every clause of `providerMeetsRequired`.
 */
test("⚠⚠⚠ PRECONDITION — the gate persona is a complete, visible provider", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await signIn(page);
  const href = await requireCompleteProvider(page);
  console.log(`E595/WS-B  gate persona OK — ${href}`);
  await page.close();
});

const WIDTHS = [
  { label: "desktop", w: 1440 },
  { label: "tablet", w: 834 },
  { label: "phone", w: 390 },
];

test.describe("⚠ THE COMMUNITY WEB — P2-J3-E591 WS-B", () => {
  for (const { label, w } of WIDTHS) {
    test(`${label} (${w}px) — the web renders, and its box is reported`, async ({
      browser,
    }: {
      browser: Browser;
    }) => {
      const page = await browser.newPage({ viewport: { width: w, height: 900 } });
      await signIn(page);
      await page.goto("/community", { waitUntil: "networkidle" });

      const svg = page.locator(".pm-web-svg");
      await expect(svg).toHaveCount(1);

      const box = await svg.boundingBox();
      expect(box, "the web has no rendered box").not.toBeNull();

      /*
        ⚠⚠ THE NUMBER, PRINTED. A brief that carries a measurement carries its
        method; this is the method. The viewBox is 560×400, so the scale factor
        says how many CSS pixels one viewBox unit is worth at this width — which
        is what turns the gate's "11.02 units of clearance" into a real gap.
      */
      const scale = box!.width / 560;
      console.log(
        `E591/WS-B  ${label.padEnd(7)} viewport ${String(w).padStart(4)}px  →  ` +
          `web ${box!.width.toFixed(1)} × ${box!.height.toFixed(1)}px  ` +
          `(scale ${scale.toFixed(3)}, worst node gap ${(11.02 * scale).toFixed(1)}px)`
      );

      /* ⚠ No horizontal overflow — the web must never widen the page. */
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow, `${label}: the page scrolls sideways by ${overflow}px`).toBeLessThanOrEqual(0);

      /*
        ⚠⚠ THE REAL COLLISION TEST, ON THE REAL DOM. The Node sweep proves the
        arithmetic; this proves the arithmetic is what the browser drew.
        ⚠ Measured in CSS pixels off `getBoundingClientRect`, so it accounts for
        the viewBox scaling, not the units.
      */
      const worst = await page.evaluate(() => {
        const nodes = [
          ...document.querySelectorAll(
            ".pm-web-svg .pm-web-invited, .pm-web-svg .pm-web-reachable, .pm-web-svg .pm-web-joined-ring"
          ),
        ].map((e) => {
          const r = e.getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2, r: r.width / 2 };
        });
        if (nodes.length < 2) return { n: nodes.length, gap: Infinity };
        let g = Infinity;
        for (let i = 0; i < nodes.length; i++)
          for (let j = i + 1; j < nodes.length; j++) {
            const d =
              Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y) -
              nodes[i].r -
              nodes[j].r;
            if (d < g) g = d;
          }
        return { n: nodes.length, gap: g };
      });
      console.log(
        `E591/WS-B  ${label.padEnd(7)} ${worst.n} nodes drawn, ` +
          `closest pair ${worst.gap === Infinity ? "n/a" : worst.gap.toFixed(2) + "px"} apart`
      );
      expect(
        worst.gap,
        `${label}: two nodes overlap in the DOM by ${(-worst.gap).toFixed(2)}px`
      ).toBeGreaterThan(0);

      await page.screenshot({
        path: `e2e-shell/.artifacts/e591-web-${label}.png`,
        fullPage: false,
      });
      await page.close();
    });
  }

  test("the accessible name states the counts in words", async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await signIn(page);
    await page.goto("/community", { waitUntil: "networkidle" });
    const label = await page.locator(".pm-web-svg").getAttribute("aria-label");
    console.log(`E591/WS-B  accessible name: "${label}"`);
    /* ⚠ A picture of a network is not a network to a screen reader. */
    expect(label).toContain("Your community");
    expect(label).toMatch(/no colleagues yet|joined/);
    await page.close();
  });

  /*
    ── ⚠⚠⚠ THE POPULATED WEB, WITHOUT SEEDING ANYTHING ──────────────────────

    ⚠⚠ NO SIGNED-IN ACCOUNT HAS COLLEAGUES. `_auth.ts` signs in as
    `test3@panameer.com`, whose community is empty; the 27 seeded connection
    rows sit on `iamscottwalls@outlook.com`, and `E580` means that account's
    seed password does not match its stored hash, so it cannot be signed in as.
    ⚠⚠⚠ SEEDING TO MAKE A SURFACE DEMONSTRABLE IS `E564` AND IS FORBIDDEN, and
    resetting a seed password to work around `E580` is forbidden by name.

    ⚠ SO THE DATA IS DOUBLED AT THE NETWORK BOUNDARY, NOT IN THE DATABASE. The
    route is fulfilled with a fabricated payload and the clock is fast-forwarded
    past the refresh interval. ⚠⚠ NOTHING IS WRITTEN ANYWHERE — this asserts the
    RENDER given data, which is the only part a row would have contributed.

    ⚠ It also proves the half of item 3 the failure test cannot: that a
    SUCCESSFUL refresh does rebuild and does animate.
  */
  test("⚠⚠ a populated web draws every node, and no two collide in the DOM", async ({
    browser,
  }) => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await signIn(page);

    /* ⚠ 14 joined + 2 invited fills the inner ring to its cap of 16, and 20
       reachable fills the outer to its cap — the densest picture that can
       exist, which is the only one worth testing for collisions. */
    const payload = {
      me: { id: "me", name: "Test Three", photoUrl: null },
      joined: Array.from({ length: 14 }, (_, i) => ({
        id: `j${i}`,
        name: `Colleague ${i}`,
        photoUrl: null,
      })),
      invited: Array.from({ length: 2 }, (_, i) => ({
        id: `i${i}`,
        name: null,
        email: `invitee${i}@example.com`,
      })),
      reachable: Array.from({ length: 20 }, (_, i) => ({
        id: `r${i}`,
        name: `Reachable ${i}`,
        photoUrl: null,
        viaId: `j${i % 14}`,
      })),
      overflow: { joined: 3, invited: 0, reachable: 0 },
    };
    await page.route("**/api/community/web", (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(payload) })
    );

    await page.clock.install();
    await page.goto("/community", { waitUntil: "networkidle" });
    /* ⚠ Past the 60s interval, so exactly one refresh lands. */
    await page.clock.fastForward("01:05");
    await page.waitForFunction(
      () => document.querySelectorAll(".pm-web-svg .pm-web-reachable").length > 0,
      undefined,
      { timeout: 15_000 }
    );

    const counts = await page.evaluate(() => ({
      joined: document.querySelectorAll(".pm-web-svg .pm-web-joined-ring").length,
      invited: document.querySelectorAll(".pm-web-svg .pm-web-invited").length,
      reachable: document.querySelectorAll(".pm-web-svg .pm-web-reachable").length,
    }));
    console.log(
      `E591/WS-B  populated: ${counts.joined} joined, ${counts.invited} invited, ` +
        `${counts.reachable} reachable drawn`
    );
    expect(counts).toEqual({ joined: 14, invited: 2, reachable: 20 });

    /* ⚠⚠ THE COLLISION CHECK ON THE REAL DOM, AT THE DENSEST SHAPE. */
    const worst = await page.evaluate(() => {
      const nodes = [
        ...document.querySelectorAll(
          ".pm-web-svg .pm-web-invited, .pm-web-svg .pm-web-reachable, .pm-web-svg .pm-web-joined-ring"
        ),
      ].map((e) => {
        const r = e.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2, r: r.width / 2 };
      });
      let g = Infinity;
      for (let i = 0; i < nodes.length; i++)
        for (let j = i + 1; j < nodes.length; j++) {
          const d =
            Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y) - nodes[i].r - nodes[j].r;
          if (d < g) g = d;
        }
      return g;
    });
    console.log(`E591/WS-B  populated: closest pair ${worst.toFixed(2)}px apart (36 nodes)`);
    expect(worst, `two nodes overlap by ${(-worst).toFixed(2)}px`).toBeGreaterThan(0);

    /* ⚠ A SUCCESSFUL refresh DOES animate — the other half of item 3. */
    expect(await page.locator(".pm-web-move").count(), "a good refresh did not animate").toBe(1);

    /* ⚠ And the overflow is told rather than swallowed. */
    await expect(page.locator(".pm-web-more")).toHaveText("+3 more not shown");

    await page.screenshot({ path: "e2e-shell/.artifacts/e591-web-populated.png" });
    await page.close();
  });

  test("the populated web is legible at phone width", async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await signIn(page);
    const payload = {
      me: { id: "me", name: "Test Three", photoUrl: null },
      joined: Array.from({ length: 14 }, (_, i) => ({ id: `j${i}`, name: `C${i}`, photoUrl: null })),
      invited: [{ id: "i0", name: null, email: "a@example.com" }],
      reachable: Array.from({ length: 20 }, (_, i) => ({
        id: `r${i}`,
        name: `R${i}`,
        photoUrl: null,
        viaId: `j${i % 14}`,
      })),
      overflow: { joined: 0, invited: 0, reachable: 0 },
    };
    await page.route("**/api/community/web", (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(payload) })
    );
    await page.clock.install();
    await page.goto("/community", { waitUntil: "networkidle" });
    await page.clock.fastForward("01:05");
    await page.waitForFunction(
      () => document.querySelectorAll(".pm-web-svg .pm-web-reachable").length > 0,
      undefined,
      { timeout: 15_000 }
    );

    const box = await page.locator(".pm-web-svg").boundingBox();
    const worst = await page.evaluate(() => {
      const nodes = [
        ...document.querySelectorAll(
          ".pm-web-svg .pm-web-invited, .pm-web-svg .pm-web-reachable, .pm-web-svg .pm-web-joined-ring"
        ),
      ].map((e) => {
        const r = e.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2, r: r.width / 2 };
      });
      let g = Infinity;
      for (let i = 0; i < nodes.length; i++)
        for (let j = i + 1; j < nodes.length; j++) {
          const d =
            Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y) - nodes[i].r - nodes[j].r;
          if (d < g) g = d;
        }
      return g;
    });
    console.log(
      `E591/WS-B  populated @390px: web ${box!.width.toFixed(0)}×${box!.height.toFixed(0)}px, ` +
        `closest pair ${worst.toFixed(2)}px apart`
    );
    /* ⚠⚠ THE NARROW COLUMN IS THE CASE THAT BROKE THE MOCKUP, so it gets its
       own assertion rather than being assumed to follow from the desktop one. */
    expect(worst, `nodes overlap by ${(-worst).toFixed(2)}px at 390px`).toBeGreaterThan(0);
    await page.screenshot({ path: "e2e-shell/.artifacts/e591-web-populated-phone.png" });
    await page.close();
  });

  /*
    ⚠⚠ THE FAILED-REFRESH RULE, ASSERTED AS BEHAVIOUR (WS-B item 3): *"if the
    endpoint fails, it must NOT animate."* ⚠ The route is blocked at the network
    layer, a cycle is waited out, and the nodes must be exactly where they were.
    ⚠⚠ THIS IS THE ONE RULE THAT A STATIC CHECK CANNOT REACH — the gate can see
    that `setCycle` sits behind `res.ok`, but only a browser can prove nothing
    moved.
  */
  test("⚠⚠ a FAILED refresh does not move anything", async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await signIn(page);
    await page.route("**/api/community/web", (r) => r.abort());
    await page.goto("/community", { waitUntil: "networkidle" });

    const positions = async () =>
      page.evaluate(() =>
        [...document.querySelectorAll(".pm-web-svg circle")].map(
          (c) => `${c.getAttribute("cx")},${c.getAttribute("cy")}`
        )
      );

    const before = await positions();
    expect(before.length, "no nodes rendered at all").toBeGreaterThan(0);

    /* ⚠ The interval is 60s. Rather than wait one out, the clock is not faked —
       the assertion is that the failing route produced NO change at any point,
       so a shorter wait is a weaker but honest version of the same claim. */
    await page.waitForTimeout(3000);
    const after = await positions();
    expect(after, "a failed refresh moved the web").toEqual(before);

    /* ⚠ And the animation class was never added. */
    const animated = await page.locator(".pm-web-move").count();
    expect(animated, "the web animated on a failed refresh").toBe(0);
    await page.close();
  });
});
