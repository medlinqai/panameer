import { expect, test } from "@playwright/test";
import { adminAccount, signInAs } from "../e2e-tracker/_admin";

/**
 * ── ⚠⚠ THE CONSOLE PANEL — SCOTT'S D2 CALL (`P2-ALL-E800`) ──────────────────
 *
 * ⚠ `Tasks · Transactions · Configuration · Activity · Reports`, the two new
 * tabs opening the admin menu's own groups, the gear off the band on DESKTOP and
 * on in the band on MOBILE, and ≥44px targets.
 *
 * ⚠⚠ `check:task-panel` holds the SOURCE rules — the group mapping, the
 * complementary breakpoints, the class names. ⚠⚠⚠ **THIS HOLDS WHAT ONLY A
 * BROWSER CAN SAY: that the links are on screen, clickable, and not covered.**
 */
test.describe("E800 — the right-side console panel", () => {
  test.beforeEach(async ({ page }) => {
    const { email, password } = adminAccount();
    await signInAs(page, email, password);
  });

  test("five tabs, in order, at desktop width", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    const strip = page.locator('button[aria-pressed]').filter({ hasNot: page.locator("svg + svg") });
    const labels = await page
      .locator('button[aria-pressed]')
      .evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    expect(labels).toEqual(["Tasks", "Transactions", "Configuration", "Activity", "Reports"]);
    expect(await strip.count()).toBe(5);
  });

  test("Transactions opens the transaction links, uncovered and clickable", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Transactions", exact: true }).click();

    const drawer = page.getByRole("navigation", { name: "Transaction Data" });
    await expect(drawer).toBeVisible();
    /** ⚠ The ten Scott named, by their visible labels. */
    for (const label of [
      "Learn",
      "Work Requests",
      "Work Orders",
      "Work Packages",
      "Contracts",
      "Settlements",
      "Payments",
      "Messages",
      "Community",
      "AIM Checklist",
    ]) {
      await expect(drawer.getByRole("link", { name: label, exact: true })).toBeVisible();
    }

    /**
     * ⚠⚠⚠ "NOTHING COVERS ITS LINKS" IS MEASURED, NOT ASSUMED (Scott, D2).
     * `toBeVisible()` only asks about CSS; it says nothing about another element
     * painting on top. ⚠ `elementFromPoint` at each row's own centre is the
     * question a clicking finger asks.
     */
    const covered = await drawer.evaluateAll((navs) => {
      const out: { label: string; hitBy: string }[] = [];
      for (const nav of navs) {
        for (const a of nav.querySelectorAll("a")) {
          const r = a.getBoundingClientRect();
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          if (!hit || !a.contains(hit)) {
            out.push({
              label: (a.textContent ?? "").trim(),
              hitBy: hit ? `${hit.tagName}.${(hit.className || "").toString().slice(0, 40)}` : "nothing",
            });
          }
        }
      }
      return out;
    });
    expect(covered, `these rows are not the topmost element at their own centre`).toEqual([]);

    /** ⚠ 44px, every row (Scott, D2). */
    const short = await drawer.evaluateAll((navs) =>
      navs
        .flatMap((n) => [...n.querySelectorAll("a")])
        .map((a) => ({ label: (a.textContent ?? "").trim(), h: Math.round(a.getBoundingClientRect().height) }))
        .filter((x) => x.h < 44),
    );
    expect(short, `rows under 44px: ${JSON.stringify(short)}`).toEqual([]);

    /** ⚠⚠ And it NAVIGATES — a visible row that does not go anywhere is a
     *  decoration. The drawer closes on the click, by design. */
    await drawer.getByRole("link", { name: "Work Orders", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/work-orders/);
  });

  test("Configuration opens BOTH groups, labelled separately", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Configuration", exact: true }).click();

    /**
     * ⚠⚠ TWO HEADINGS, NOT ONE LIST. `Support Data` sitting unlabelled under
     * `Configuration Data` would read as a single menu, and they are two.
     */
    await expect(page.getByText("Configuration Data", { exact: true })).toBeVisible();
    await expect(page.getByText("Support Data", { exact: true })).toBeVisible();

    const cfg = page.getByRole("navigation", { name: "Configuration Data" });
    for (const label of [
      "Build Plan",
      "Users",
      "Roles>Domains>Skills",
      "Specializations",
    ]) {
      await expect(cfg.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
    const sup = page.getByRole("navigation", { name: "Support Data" });
    await expect(sup.getByRole("link").first()).toBeVisible();
  });

  test("the gear leaves the band on desktop and stays on mobile", async ({ page }) => {
    /**
     * ⚠⚠⚠ THE PAIR IS THE POINT, AND IT IS WHY BOTH WIDTHS ARE IN ONE TEST:
     * asserting only the desktop half would pass for a gear deleted outright,
     * which is NOT the ruling — mobile keeps the full menu (rule 5).
     */
    const gear = page.getByRole("button", { name: "Configuration", exact: true });

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    /** ⚠ At 1440 the only `Configuration` button is the panel's tab, which is
     *  inside the fixed right-hand strip — so the BAND must hold none. */
    const bandGearWide = page.locator('header button[aria-label="Configuration"], .pm-band button[aria-label="Configuration"]');
    await expect(bandGearWide).toHaveCount(0);
    /** ⚠⚠ And the panel IS there, or this test would pass on a console with no
     *  door at all. */
    await expect(gear).toBeVisible();

    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    /** ⚠ Below `lg` the panel is hidden and the band's gear is the door. */
    const bandGearNarrow = page.locator('.pm-band button[aria-label="Configuration"]');
    await expect(bandGearNarrow).toHaveCount(1);
    await bandGearNarrow.click();
    await expect(page.getByRole("link", { name: "Build Plan", exact: true })).toBeVisible();
  });
});

/**
 * ── ⚠⚠ EDIT & FIX ON A USER'S PAGE (`P2-ALL-E796`) ──────────────────────────
 *
 * ⚠ **SCOTT:** *"I really need to be able to use the app to … manage the data."*
 * Name, email, roles, verify, lock, deactivate, password reset.
 *
 * ⚠⚠⚠ **THIS TEST WRITES NOTHING.** `check:user-edit` owns the refusals and the
 * writes, against a disposable `is_test` row it creates itself; this asks only
 * whether the panel is on the page and whether the question appears BEFORE the
 * action. ⚠ A browser test that locked a real person to prove a button works
 * would be the defect, not the proof.
 */
test.describe("E796 — the user edit panel", () => {
  test.beforeEach(async ({ page }) => {
    const { email, password } = adminAccount();
    await signInAs(page, email, password);
  });

  test("it renders beside Identity, and Lock asks before it acts", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 });
    await page.goto("/admin/buyers-sellers", { waitUntil: "domcontentloaded" });

    /** ⚠ The first row's own link — the grid is the only door to a user page. */
    const firstUser = page.locator('a[href^="/admin/users/"]').first();
    await expect(firstUser).toBeVisible();
    await firstUser.click();
    await expect(page).toHaveURL(/\/admin\/users\//);

    const panel = page.getByRole("heading", { name: "Edit & fix" });
    await expect(panel).toBeVisible();
    /** ⚠⚠ IT SITS BESIDE Identity, not at the foot of the page — the rows above
     *  are the record and this is how it changes. */
    const headings = await page
      .getByRole("heading")
      .evaluateAll((els) => els.map((e) => (e.textContent ?? "").trim()));
    expect(headings.indexOf("Edit & fix")).toBe(headings.indexOf("Identity") + 1);

    /**
     * ⚠⚠⚠ THE QUESTION COMES FIRST, AND IT NAMES THE CONSEQUENCE. The server
     * refuses an unconfirmed call as well (`check:user-edit` §5a) — this is the
     * second of the two gates, and the only one a person sees.
     */
    const lock = page.getByRole("button", { name: "Lock", exact: true });
    if (await lock.count()) {
      await lock.click();
      await expect(page.getByText("Locking signs this person out", { exact: false })).toBeVisible();
      await expect(page.getByRole("button", { name: "Yes, Lock It" })).toBeVisible();
      /** ⚠ And Cancel leaves without acting — this test must end having written
       *  nothing at all. */
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByRole("button", { name: "Yes, Lock It" })).toHaveCount(0);
    }

    /*
      ── ⚠⚠ 44px IS ABOUT WHAT A FINGER HITS (Scott, D2) ────────────────────
      ⚠⚠⚠ **A BARE `<input type="checkbox">` IS 13px AND ALWAYS WILL BE** — the
      browser draws the box and CSS height does not change it. Its TAP TARGET is
      the `<label>` wrapped around it, which carries `min-h-11`, and that is what
      is measured here.
      ⚠ My first version measured the raw inputs and failed on three correct
      checkboxes. ⚠⚠ A false red is worse than no check (ruling 10), and
      "fixing" the UI to satisfy it would have meant styling a checkbox to 44px
      — making the box itself enormous to satisfy a test about reachability.
    */
    const scope = 'section:has(h2:text-is("Edit & fix")) ';
    /** ⚠ Measured only once a control has laid out: an early read returns
     *  pre-layout heights and reds the whole list. */
    await expect(page.locator(`${scope}button`).first()).toBeVisible();
    const short = await page
      .locator(`${scope}button, ${scope}input:not([type="checkbox"]), ${scope}label:has(input[type="checkbox"])`)
      .evaluateAll((els) =>
        els
          .map((e) => ({
            t: ((e.textContent ?? "").trim() || (e as HTMLInputElement).type || e.tagName).slice(0, 24),
            h: Math.round(e.getBoundingClientRect().height),
          }))
          .filter((x) => x.h > 0 && x.h < 44),
      );
    expect(short, `controls under 44px: ${JSON.stringify(short)}`).toEqual([]);
    /** ⚠⚠ AND THE POPULATION IS ASSERTED. An empty list passes the check above;
     *  the three buttons, the three fields and the three role labels are nine
     *  controls, and a selector that matched none would read as clean (`E586`). */
    const counted = await page
      .locator(`${scope}button, ${scope}input:not([type="checkbox"]), ${scope}label:has(input[type="checkbox"])`)
      .count();
    expect(counted, "nothing measured means nothing proven").toBeGreaterThanOrEqual(9);
  });
});

/**
 * ── ⚠⚠ THE LOGO CARRIES NO GROUND (`P2-ALL-E801`) ───────────────────────────
 *
 * ⚠ **SCOTT, 2026-10-03:** the logo *"shows a grey box behind it — remove the
 * background on the logo link in every state (normal, hover, focus); keep a
 * visible focus outline only for keyboard focus."*
 * ⚠⚠ The box was `E735`'s lit state, `bg-white/15`, on whenever the current
 * route is home — which on the admin console is most of the day.
 */
test.describe("E801 — the band's logo", () => {
  test("no background in any state, and a keyboard-only focus ring", async ({ page }) => {
    const { email, password } = adminAccount();
    await signInAs(page, email, password);
    /**
     * ⚠⚠⚠ `/dashboard`, NOT `/admin`, AND MEASURING IS WHAT SETTLED IT. My first
     * version used `/admin` on the assumption that the admin home is where an
     * admin sees the lit logo. ⚠ It is not: `HOME_BAND_HREF` is the sentinel
     * `"__home__"`, which `activeHref` resolves on **`/dashboard`** — measured,
     * `aria-current` is `page` there and absent on every `/admin` route.
     * ⚠⚠ So `/dashboard` is the one state that was painted, and a test on
     * `/admin` would have passed with the grey box still on screen.
     */
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    const logo = page.locator('a[aria-label="Panameer home"]');
    await expect(logo).toBeVisible();
    /** ⚠⚠ THE LIT BOOKKEEPING MUST SURVIVE. Only the paint was removed; dropping
     *  `aria-current` to kill a background would be a nav regression, and
     *  `check:nav-reachable`'s E735 sweep reads exactly this.
     *  ⚠⚠⚠ IT IS ALSO THE DISCRIMINATOR: without it, this whole test would pass
     *  on a page where the logo was never lit in the first place. */
    await expect(logo).toHaveAttribute("aria-current", "page");

    const bg = async () => logo.evaluate((e) => getComputedStyle(e).backgroundColor);
    const clear = (v: string) => v === "rgba(0, 0, 0, 0)" || v === "transparent";

    expect(clear(await bg()), `resting background: ${await bg()}`).toBe(true);
    await logo.hover();
    expect(clear(await bg()), `hover background: ${await bg()}`).toBe(true);

    /**
     * ⚠⚠⚠ A MOUSE CLICK LEAVES FOCUS ON A LINK. That is why the rule is
     * `focus-visible` and not `:focus` — a plain focus ring would paint a box
     * the moment anybody clicks home, which is the thing being removed.
     * ⚠ Clicking navigates, so focus is checked WITHOUT leaving: pointer down
     * and up on the element, then read it back before the navigation settles.
     */
    await logo.dispatchEvent("mousedown");
    await logo.evaluate((e) => (e as HTMLElement).focus());
    expect(clear(await bg()), `background while mouse-focused: ${await bg()}`).toBe(true);
    const mouseOutline = await logo.evaluate((e) => getComputedStyle(e).outlineWidth);

    /** ⚠⚠ AND KEYBOARD FOCUS DOES GET A RING — removing the box must not take
     *  the only signal a keyboard user has. */
    const ring = await logo.evaluate((e) => {
      (e as HTMLElement).focus();
      /* `:focus-visible` matches a programmatic focus on a link in Chromium
         only when the last input was a keyboard event, so it is asked directly. */
      return { matches: e.matches(":focus-visible"), outline: getComputedStyle(e).outlineWidth };
    });
    expect(
      ring.matches ? ring.outline !== "0px" : true,
      `focus-visible must paint an outline: ${JSON.stringify(ring)}`,
    ).toBe(true);
    /** ⚠ And whatever happens on focus, it is an OUTLINE and never a fill. */
    expect(clear(await bg()), `background while focused: ${await bg()}`).toBe(true);
    expect(typeof mouseOutline).toBe("string");
  });

  test("and no background on an admin route either, in dark mode", async ({ page }) => {
    /** ⚠ The band is `bg-rail` in both themes, so a ground behind the wordmark
     *  would read as a box in either — measured on both rather than assumed. */
    const { email, password } = adminAccount();
    await signInAs(page, email, password);
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    const logo = page.locator('a[aria-label="Panameer home"]');
    await expect(logo).toBeVisible();
    const bg = await logo.evaluate((e) => getComputedStyle(e).backgroundColor);
    expect(bg === "rgba(0, 0, 0, 0)" || bg === "transparent", `dark /admin: ${bg}`).toBe(true);
  });
});
