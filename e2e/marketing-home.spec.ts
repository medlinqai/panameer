import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * THE DIALOG CONTRACT ON `/`.
 *
 * ── WHAT THIS IS FOR ─────────────────────────────────────────────────────────
 *
 * `P1-J0-E097` shipped a <button> inside a <button>. Every logic harness in the
 * repo passed. It was a real defect — invisible to assistive tech, unreachable
 * by pointer, still in the tab order, and it silently ate the Enter keypress
 * that opens the card — and it was found by a human noticing a hydration
 * warning, which is not a process. §11 and §12 below are that class of bug
 * turned into a gate.
 *
 * ── HOW TO READ A FAILURE ────────────────────────────────────────────────────
 *
 * Test names are numbered to the brief's twelve-point contract, so a red line
 * in the output names the clause that broke rather than the file.
 *
 * ── THE RULES THIS SUITE LIVES BY (WS-3) ─────────────────────────────────────
 *
 * No `waitForTimeout`, anywhere. No retries in the config. Every wait is a
 * web-first assertion that retries a CONDITION, so the suite either states
 * something true or fails — it never sleeps and hopes. A suite that goes flaky
 * is a suite that gets ignored, and an ignored gate is worse than no gate.
 */

type Card = {
  /** Heading on the card, which is also how a human would point at it. */
  name: string;
  /** The dialog's accessible name — `EXAMPLES[].label` / `DOORS[].label`. */
  dialog: string;
  /**
   * The grid the card lives in. Two sections now use the same doorway
   * mechanism, and the contract is identical for both — so the grid is a field
   * rather than a second copy of the whole describe block.
   */
  grid: string;
};

const CARDS: Card[] = [
  // ErpPackages — the four agent categories.
  { grid: ".erp-grid", name: "Reports & Dashboards", dialog: "Spend Overview dashboard" },
  { grid: ".erp-grid", name: "Price Alerts", dialog: "Price alert email" },
  { grid: ".erp-grid", name: "Document Validation", dialog: "W-9 document validation" },
  { grid: ".erp-grid", name: "Extend Your Apps", dialog: "Work request with matched experts" },
  // ErpIntegration — the two flow doorways (brief_home_erp_integration WS-4).
  { grid: ".erpx-doors", name: "Fulfillment", dialog: "Service procurement fulfillment flow" },
  { grid: ".erpx-doors", name: "Settlement", dialog: "Service procurement settlement flow" },
];

/** Everything the browser will hand focus to. Mirrors the app's own trap query. */
const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

/**
 * ⚠ LOCATED BY POSITION AND TEXT, NEVER BY TAG.
 *
 * §1 asserts the card IS a <button>. Selecting it with `button.erp-card` would
 * make that assertion circular — the test could only ever pass. Grid child +
 * heading text is how a person finds the card, and it still finds it if someone
 * regresses it to a <div>, which is the case worth catching.
 */
function cardFor(page: Page, c: Card): Locator {
  return page.locator(`${c.grid} > *`).filter({ hasText: c.name });
}

/** Is the real, live focus inside the open dialog? Asked of the DOM, not inferred. */
function focusIsInDialog(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    return !!d && !!document.activeElement && d.contains(document.activeElement);
  });
}

/**
 * ⚠ WHY THE OPEN IS WRAPPED IN `toPass`, AND WHY THAT IS NOT A SLEEP.
 *
 * A click that lands before React hydrates does nothing at all, and no
 * web-first assertion can rescue it because the event is already gone. The
 * documented fix is to retry the ACTION, not to pause before it. `toPass`
 * re-clicks until the dialog appears and then fails hard at the ceiling — so a
 * card that genuinely never opens still fails, which a `waitForTimeout` would
 * have quietly papered over.
 */
async function openByClick(page: Page, card: Locator) {
  await expect(async () => {
    await card.click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
}

/** Same, by keyboard. See §3 for why this one carries the weight it does. */
async function openByEnter(page: Page, card: Locator) {
  await expect(async () => {
    await card.focus();
    /*
      ⚠ THE CARD ITSELF MUST TAKE FOCUS, not something nested inside it. This is
      half of the E097 assertion: a control inside the crop steals the focus
      stop, and then Enter activates that control instead of opening the card.
    */
    await expect(card).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
}

/**
 * Interactive elements that sit inside another interactive element.
 *
 * ⚠ THIS IS THE E097 REGRESSION TEST (§12). Written against the whole document
 * rather than against the crop, so a future scene that adds a control anywhere
 * inside a card fails here immediately and by name.
 */
function nestedInteractive(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const INTERACTIVE = "button, a[href], input, select, textarea";
    const describe = (n: Element) => {
      // SVG elements carry an SVGAnimatedString, not a string, in `className`.
      const cls = typeof n.className === "string" ? n.className.trim() : "";
      return n.tagName.toLowerCase() + (cls ? `.${cls.split(/\s+/).join(".")}` : "");
    };
    return Array.from(document.querySelectorAll(INTERACTIVE))
      .map((el) => ({ el, host: el.parentElement?.closest(INTERACTIVE) }))
      .filter((p) => p.host)
      .map((p) => `<${describe(p.el)}> nested inside <${describe(p.host!)}>`);
  });
}

/*
  Console output is captured for EVERY test but asserted in exactly one (§11).
  Attaching the listeners here is the only way to catch what happens during the
  initial load; asserting here instead would turn one defect into thirty
  identical red lines and bury the clause that actually broke.
*/
let consoleErrors: string[];

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`console.error: ${msg.text()}`);
  });
  page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));
  await page.goto("/");
});

for (const [i, c] of CARDS.entries()) {
  test.describe(`card ${i + 1} — ${c.name}`, () => {
    test("§1 the card is a <button> that advertises the dialog", async ({ page }) => {
      const card = cardFor(page, c);
      await expect(card).toHaveCount(1);
      await expect(card).toHaveJSProperty("tagName", "BUTTON");
      await expect(card).toHaveAttribute("aria-haspopup", "dialog");
    });

    test("§2 click opens a modal dialog with an accessible name", async ({ page }) => {
      await openByClick(page, cardFor(page, c));
      const dialog = page.getByRole("dialog", { name: c.dialog });
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveAttribute("aria-modal", "true");
    });

    test("§3 Enter opens it from keyboard focus — a nested button eats Enter", async ({ page }) => {
      await openByEnter(page, cardFor(page, c));
      await expect(page.getByRole("dialog", { name: c.dialog })).toBeVisible();
    });

    test("§4 focus moves into the dialog on open", async ({ page }) => {
      await openByClick(page, cardFor(page, c));
      await expect(page.getByRole("dialog")).toBeVisible();
      expect(await focusIsInDialog(page)).toBe(true);
    });

    test("§5 focus is trapped — Tab and Shift+Tab cycle, nothing behind is reachable", async ({ page }) => {
      await openByClick(page, cardFor(page, c));
      const dialog = page.getByRole("dialog");
      const stops = dialog.locator(FOCUSABLE);
      const n = await stops.count();
      expect(n, "a dialog with no focusable element cannot be escaped from OR used").toBeGreaterThan(0);

      // Forward off the end wraps to the front.
      await stops.nth(n - 1).focus();
      await page.keyboard.press("Tab");
      await expect(stops.first()).toBeFocused();

      // Backward off the front wraps to the end.
      await stops.first().focus();
      await page.keyboard.press("Shift+Tab");
      await expect(stops.nth(n - 1)).toBeFocused();

      /*
        And the real requirement, which "focus starts inside" does not prove:
        keep tabbing past a full cycle and focus never lands on the page behind
        the dim.
      */
      for (let k = 0; k < n + 3; k++) {
        await page.keyboard.press("Tab");
        expect(await focusIsInDialog(page), `focus escaped after ${k + 1} Tab(s)`).toBe(true);
      }
    });

    test("§6 Esc closes it and focus returns to the card that opened it", async ({ page }) => {
      const card = cardFor(page, c);
      await openByClick(page, card);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(card).toBeFocused();
    });

    test("§7 the backdrop closes it; a click inside the scene does not", async ({ page }) => {
      await openByClick(page, cardFor(page, c));
      const dialog = page.getByRole("dialog");

      /*
        Inside the content first — a click that lands on the scene must NOT
        dismiss. Aimed at `.lb-box` rather than `.scene`, because `.scene` is
        not actually universal: PriceAlertScene's root is `.mail` on its own
        while the other three are `scene <x>`. The first run found that. The box
        is the dialog's own wrapper and holds whatever the scene turns out to
        be, so this stays true when a fifth scene arrives.
      */
      await dialog.locator(".lb-box").click({ position: { x: 4, y: 4 } });
      await expect(dialog).toBeVisible();

      /*
        Then the backdrop. `.lb-dim` is a centring flex container, so clicking
        its centre would hit the box; the top-left inside its padding is dim.
      */
      await page.mouse.click(6, 6);
      await expect(dialog).toHaveCount(0);
    });

    test("§8 no dialog remains in the DOM once closed", async ({ page }) => {
      await openByClick(page, cardFor(page, c));
      await page.keyboard.press("Escape");
      await expect(page.locator('[role="dialog"]')).toHaveCount(0);
      await expect(page.locator(".lb-dim")).toHaveCount(0);
    });
  });
}

test.describe("card 1 scene — the dashboard stays live inside the dialog", () => {
  test("§9 Table view is a real <button> and reveals the table", async ({ page }) => {
    await openByClick(page, cardFor(page, CARDS[0]));
    const dialog = page.getByRole("dialog");

    const toggle = dialog.getByRole("button", { name: "Table view" });
    await expect(toggle).toBeVisible();
    /*
      ⚠ A REAL <button>, not the inert <span> the decorative card crop renders.
      This is the other side of E097: the control has to be missing from the
      crop AND present in the dialog. Asserting only one of those lets a fix
      that deletes the control outright pass.
    */
    await expect(toggle).toHaveJSProperty("tagName", "BUTTON");

    await toggle.click();
    await expect(dialog.locator(".sv-tables")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Hide table" })).toBeVisible();
  });

  test("§10 hovering a chart bar shows the tooltip", async ({ page }) => {
    await openByClick(page, cardFor(page, CARDS[0]));
    const dialog = page.getByRole("dialog");
    /*
      Hover the painted <rect>, not the <g> that carries the handler: pointer
      events on SVG fire over geometry, and a group's bounding-box centre is
      often empty space. The event bubbles to the group either way.
    */
    await dialog.locator(".sv-chart g.seg rect").first().hover();
    await expect(dialog.locator(".sv-tip")).toBeVisible();
  });
});

test.describe("the page as a whole", () => {
  test("§11 zero console errors on load and across every open/close", async ({ page }) => {
    for (const c of CARDS) {
      await openByClick(page, cardFor(page, c));
      await expect(page.getByRole("dialog", { name: c.dialog })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
    /*
      A React hydration mismatch arrives as a console error and nothing else.
      This is the check that would have caught E097 with no human reading a log.
    */
    expect(consoleErrors, `console output:\n${consoleErrors.join("\n")}`).toEqual([]);
  });

  test("§12 no interactive element is nested inside another — the E097 regression", async ({ page }) => {
    expect(await nestedInteractive(page), "at rest").toEqual([]);

    for (const c of CARDS) {
      await openByClick(page, cardFor(page, c));
      await expect(page.getByRole("dialog", { name: c.dialog })).toBeVisible();
      expect(await nestedInteractive(page), `with "${c.dialog}" open`).toEqual([]);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
  });
});
