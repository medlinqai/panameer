import { expect, test, type Locator, type Page } from "@playwright/test";
/*
  ⚠ THE SOURCE OF TRUTH, IMPORTED — NOT RETYPED. `/optimize`'s five summaries are
  derived from `SPINE_STEPS`, and a test comparing the page to a typed literal
  would prove only that somebody typed the same thing twice. `spine-steps.ts` has
  no imports of its own, so pulling it in here costs nothing.
*/
import { SPINE_STEPS, summaryFor } from "../src/lib/spine-steps";
/* The product's name, from its one source — see `ASSESSMENT_PRODUCT`'s note. */
import { ASSESSMENT_PRODUCT } from "../src/lib/brand";

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
  /**
   * ── ⚠ THE PAGE THIS CARD LIVES ON (P1-J0-E255 / E273) ─────────────────────
   *
   * All six used to be on `/` and the file did one `goto("/")` in `beforeEach`.
   * Both ERP sections came off the home page on 2026-08-21 — they were rendering
   * twice — so the cards moved address and this suite moved with them. It is a
   * field rather than two forked describe blocks because the CONTRACT is
   * identical wherever a doorway lives; only the address changed.
   *
   * ⚠ NOTHING WAS DELETED OR SKIPPED TO GET A GREEN RUN. Same six cards, same
   * eight assertions each, same whole-page checks — asserted where the sections
   * actually are. Deleting coverage is what let `E097` ship.
   */
  url: string;
};

/**
 * ⚠ `/buy-services` IS `ErpPackages`' ONLY HOME NOW, and it is that page's entire
 * body — the `Shop` nav item's whole reason to exist. `/enterprise` is
 * `ErpIntegration`'s, and it is the `Integrate` nav item's destination (E245).
 *
 * ⚠ BOTH PAGES WRAP THEIR PAYLOAD IN AN EXPLICIT `<div className="pm-home">`
 * where `/` carried `.pm-home` page-wide. Every rule these dialogs rely on is
 * `.pm-home`-prefixed in `home.css`, so a passing test on `/` proved nothing
 * about either — which is exactly why these tests now run there.
 */
const SHOP = "/buy-services";
const ENTERPRISE = "/enterprise";

const CARDS: Card[] = [
  // ErpPackages — the four agent categories. Now on /buy-services only.
  { grid: ".erp-grid", name: "Reports & Dashboards", dialog: "Spend Overview dashboard", url: SHOP },
  { grid: ".erp-grid", name: "Price Alerts", dialog: "Price alert email", url: SHOP },
  { grid: ".erp-grid", name: "Document Validation", dialog: "W-9 document validation", url: SHOP },
  { grid: ".erp-grid", name: "Extend Your Apps", dialog: "Work request with matched experts", url: SHOP },
  // ErpIntegration — the two flow doorways. Now on /enterprise only.
  { grid: ".erpx-doors", name: "Fulfillment", dialog: "Service procurement fulfillment flow", url: ENTERPRISE },
  { grid: ".erpx-doors", name: "Settlement", dialog: "Service procurement settlement flow", url: ENTERPRISE },
];

/** The distinct pages the cards live on, in a stable order. */
const CARD_PAGES = [...new Set(CARDS.map((c) => c.url))];

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
    /*
      ⚠ `summary` IS IN THIS LIST, AND IT WAS NOT UNTIL A BREAK PROVED IT HAD TO
      BE (P1-J0-E259 WS5, break 4). A `<button>` inside a `<summary>` is `E097`
      wearing a different tag — the summary IS the control, and a control inside
      it eats the Enter that opens the panel — but the audit did not recognise a
      summary as a host, so nesting one sailed through. Widening the list can only
      make this catch more, never less.
    */
    const INTERACTIVE = "button, a[href], input, select, textarea, summary";
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

/*
  ⚠ THE LISTENERS ATTACH HERE; THE NAVIGATION DOES NOT ANY MORE.

  This used to end `await page.goto("/")`, which was the single assumption that
  the whole file lived on one page. With the cards on three different addresses,
  each test says where it goes — and the listeners still attach BEFORE any
  navigation, which is the only way to catch what happens during a load.
*/
test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`console.error: ${msg.text()}`);
  });
  page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));
});

for (const [i, c] of CARDS.entries()) {
  test.describe(`card ${i + 1} — ${c.name} (${c.url})`, () => {
    /* ⚠ The card's OWN page. See the note on `Card.url`. */
    test.beforeEach(async ({ page }) => {
      await page.goto(c.url);
    });

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
  /* CARDS[0] is a `.erp-grid` card, so its scene now lives on /buy-services. */
  test.beforeEach(async ({ page }) => {
    await page.goto(CARDS[0].url);
  });

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
    /*
      ⚠ EVERY PAGE THE CARDS LIVE ON, PLUS `/` ITSELF. The cards moved but the
      home page still has to load clean, and it is no longer visited by any card
      test — so it is loaded here explicitly or nothing would check it at all.
    */
    await page.goto("/");
    for (const url of CARD_PAGES) {
      await page.goto(url);
      for (const c of CARDS.filter((x) => x.url === url)) {
        await openByClick(page, cardFor(page, c));
        await expect(page.getByRole("dialog", { name: c.dialog })).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toHaveCount(0);
      }
    }
    /*
      A React hydration mismatch arrives as a console error and nothing else.
      This is the check that would have caught E097 with no human reading a log.
    */
    expect(consoleErrors, `console output:\n${consoleErrors.join("\n")}`).toEqual([]);
  });

  test("§12 no interactive element is nested inside another — the E097 regression", async ({ page }) => {
    /*
      ⚠ AT REST ON EVERY PAGE, NOT JUST THE ONE. `E097` was a `<button>` inside a
      `<button>` in a card crop; the crops are now on two pages and `/` still has
      its own controls. Auditing one page would leave two-thirds of the surface
      that produced the original defect unchecked.
    */
    /*
      ⚠ `/optimize` IS IN THIS LIST BECAUSE ITS SUMMARIES ARE CONTROLS. A
      `<button>` inside a `<summary>` is `E097` wearing a different tag — the
      summary is already the interactive element, and a control inside it eats
      the Enter that opens the panel.
    */
    for (const url of ["/", "/optimize", ...CARD_PAGES]) {
      await page.goto(url);
      expect(await nestedInteractive(page), `at rest on ${url}`).toEqual([]);
      for (const c of CARDS.filter((x) => x.url === url)) {
        await openByClick(page, cardFor(page, c));
        await expect(page.getByRole("dialog", { name: c.dialog })).toBeVisible();
        expect(await nestedInteractive(page), `with "${c.dialog}" open on ${url}`).toEqual([]);
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toHaveCount(0);
      }
    }
  });

  /**
   * ── ⚠ NEITHER ERP SECTION MAY COME BACK TO `/` (E255 / E273) ───────────────
   *
   * ⚠ THIS IS AN ABSENCE ASSERTION AND IT IS DELIBERATE. The brief left the
   * choice open and this is the side it lands on: E255 and E273 are decisions
   * that each section renders ONCE, and without this, re-adding either render to
   * `/` restores the duplicate silently — the re-homed card tests would still
   * pass, because they assert the sections on `/buy-services` and `/enterprise`,
   * not their absence here.
   *
   * ⚠ SO WS3's BREAK 1 — putting `<ErpPackages />` back on `/` — MUST FAIL, and
   * it is this test that fails it.
   *
   * ⚠ ASSERTED ON THE GRIDS, NOT ON A COMPONENT NAME, because a grid is what the
   * browser can see. `.erp-grid` and `.erpx-doors` are each rendered by exactly
   * one component.
   */
  test("§12b neither ERP section renders on / any more", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".erp-grid"), "ErpPackages is back on /").toHaveCount(0);
    await expect(page.locator(".erpx-doors"), "ErpIntegration is back on /").toHaveCount(0);
    /* And they are still on the pages that own them, so this is not vacuous. */
    await page.goto(SHOP);
    await expect(page.locator(".erp-grid")).toHaveCount(1);
    await page.goto(ENTERPRISE);
    await expect(page.locator(".erpx-doors")).toHaveCount(1);
  });

  /**
   * §13 — the SVG id collision the flow diagrams would otherwise have.
   *
   * `marker-end="url(#am)"` resolves against the WHOLE DOCUMENT and takes the
   * first match. Both flow scenes render their crop on page load, and opening a
   * dialog renders one of them a SECOND time — three `<defs>` blocks live at
   * once. With fixed ids every arrowhead on the page would resolve to whichever
   * parsed first, and closing that dialog would delete the node the survivors
   * point at.
   *
   * Two assertions, and the second is the one that matters: it is not enough
   * that ids are unique, each reference must land inside its OWN `<svg>`.
   */
  test("§13 flow-diagram SVG ids are unique and every marker resolves in its own svg", async ({ page }) => {
    /* The two flow diagrams are `.erpx-doors` crops — now on /enterprise only. */
    await page.goto(ENTERPRISE);
    const audit = () =>
      page.evaluate(() => {
        const svgs = Array.from(document.querySelectorAll("svg.flw-svg"));
        const ids: string[] = [];
        const stolen: string[] = [];
        for (const svg of svgs) {
          for (const el of svg.querySelectorAll("[id]")) ids.push(el.id);
          for (const el of svg.querySelectorAll("[marker-end],[fill^='url('],[marker-start]")) {
            for (const attr of ["marker-end", "marker-start", "fill"]) {
              const v = el.getAttribute(attr) ?? "";
              const m = v.match(/^url\(#(.+)\)$/);
              if (!m) continue;
              // The reference must be satisfiable from inside this same <svg>.
              if (!svg.querySelector(`#${CSS.escape(m[1])}`)) {
                stolen.push(`${el.tagName}@${attr} -> #${m[1]} is not in its own svg`);
              }
            }
          }
        }
        const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
        return { svgCount: svgs.length, dupes: [...new Set(dupes)], stolen };
      });

    // At rest: one crop per card, so both scenes are already in the DOM together.
    const rest = await audit();
    expect(rest.svgCount, "both card crops render a flow diagram").toBe(2);
    expect(rest.dupes, "duplicate ids at rest").toEqual([]);
    expect(rest.stolen, "cross-svg marker references at rest").toEqual([]);

    /*
      With a dialog open there are THREE instances — both crops plus the dialog,
      one scene duplicated. That is strictly harder than "two dialogs open",
      which the single-dialog Lightbox cannot produce, and it is the case that
      actually occurs.
    */
    for (const c of CARDS.filter((x) => x.grid === ".erpx-doors")) {
      await openByClick(page, cardFor(page, c));
      await expect(page.getByRole("dialog", { name: c.dialog })).toBeVisible();
      const open = await audit();
      expect(open.svgCount, `${c.name}: two crops + the dialog`).toBe(3);
      expect(open.dupes, `duplicate ids with "${c.dialog}" open`).toEqual([]);
      expect(open.stolen, `cross-svg marker references with "${c.dialog}" open`).toEqual([]);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
  });

  /** §14 — the crops are true-scale windows. A `scale()` would break that. */
  test("§14 neither ERP doorway crop applies a scale()", async ({ page }) => {
    await page.goto(ENTERPRISE);
    const transforms = await page.locator(".erpx-doors .crop-inner").evaluateAll((els) =>
      els.map((el) => (el as HTMLElement).style.transform)
    );
    expect(transforms).toHaveLength(2);
    for (const t of transforms) {
      expect(t, "crop transform").toMatch(/^translate\(/);
      expect(t, "crop must not scale").not.toContain("scale");
    }
  });
});

/**
 * ── ⚠ THE STEP-5 ROADMAP GRID (P1-J0-E254 + the 2026-08-21 dashboard decision) ─
 *
 * ── WHY THIS SUITE AND NOT ANOTHER ───────────────────────────────────────────
 *
 * All three claims below are about the RENDERED page and nothing else can state
 * them honestly:
 *
 *   · "Request is not inside a quarter" is a fact about DOM ancestry AND about
 *     geometry. A source scan can see the JSX nesting and would have passed the
 *     defect that prompted E254 — the chip was ALREADY a sibling of the lane and
 *     still read as part of Q4, because nothing was drawn between them.
 *   · "exactly four quarter headers" is a count of what the browser laid out.
 *   · "the total is not a point figure" is about the text a reader sees.
 *
 * `check:ui` already owns `/` and already runs Chromium against it, so this is
 * the nearest existing guard rather than a new harness with its own config.
 * `check:app-shell` is about shells and headers on five public pages and would be
 * the wrong subject; a `check:*` esbuild harness cannot measure a rect.
 *
 * ⚠ NOTHING IN THE `CARDS` CONTRACT ABOVE IS TOUCHED, WEAKENED OR RE-SCOPED.
 * This is additive: a new describe block on the same page. `P1-J0-E256` is the
 * case where a change DID collide with that list, and the instruction there was
 * to stop and report rather than edit the gate — that is not this.
 */
test.describe("the Step 5 roadmap grid", () => {
  /* ⚠ STILL `/`. The roadmap never moved; it only lost the file-wide `goto`. */
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  /**
   * ⚠ THE QUARTERS ARE A CONTINUOUS LANE, NOT FOUR CELLS, and the assertion is
   * written against that reality rather than against the mockup's flat-HTML
   * `repeat(4,1fr)`. `.rm-lane` is one grid cell with the dividers painted at
   * 25/50/75%, which is what lets a 4-week bar be visibly twice a 2-week one and
   * lets the two Q1 items overlap. So "inside a quarter" means "inside the lane".
   */
  test("§15 Request lives outside the quarter lane — by ancestry AND by geometry", async ({
    page,
  }) => {
    const m = await page.evaluate(() => {
      const chips = Array.from(document.querySelectorAll(".rm-req"));
      const lanes = Array.from(document.querySelectorAll(".rm-row .rm-lane"));
      return {
        chips: chips.length,
        lanes: lanes.length,
        /* ancestry: no chip may be a descendant of a lane */
        insideLane: chips.filter((c) => c.closest(".rm-lane")).length,
        /*
          geometry: every chip's LEFT edge is at or right of its row's lane's
          RIGHT edge. This is the half that catches "sibling in the DOM, sitting
          on top of Q4 on screen" — the state E254 was actually filed against.
        */
        overlapping: chips
          .map((c, i) => {
            const lane = lanes[i];
            if (!lane) return null;
            const cr = c.getBoundingClientRect();
            const lr = lane.getBoundingClientRect();
            return cr.left + 0.5 < lr.right ? `row ${i + 1}: chip ${Math.round(cr.left)} < lane right ${Math.round(lr.right)}` : null;
          })
          .filter(Boolean),
      };
    });
    expect(m.chips, "one Request per row").toBe(5);
    expect(m.lanes, "one quarter lane per row").toBe(5);
    expect(m.insideLane, "a Request chip is nested inside the quarter lane").toBe(0);
    expect(m.overlapping, "a Request chip overlaps the quarter lane on screen").toEqual([]);
  });

  /**
   * ⚠ FOUR, AND THE ACTION COLUMN IS NOT A FIFTH. A header over the action column
   * would read as another time bucket, which is precisely the misreading E254
   * exists to end — so its cell is present (the 2px rule has to run the full
   * height of the table) and deliberately empty.
   */
  test("§16 there are exactly four quarter headers, and the action column is unheaded", async ({
    page,
  }) => {
    const qs = await page.locator(".rm-hd .rm-q").allTextContents();
    expect(qs.map((t) => t.trim())).toEqual(["Q1", "Q2", "Q3", "Q4"]);
    const actHeader = await page.locator(".rm-hd .rm-act").first().textContent();
    expect((actHeader ?? "").trim(), "the action column must carry no label").toBe("");
  });

  /**
   * ⚠ THE DIVIDER IS THE FIX. The chip was already in its own grid column; what
   * was missing was a boundary that reads as a DIFFERENT KIND of boundary from
   * the three inside the lane. So this asserts the relationship — heavier than a
   * quarter divider — not a magic number.
   */
  test("§17 the action column is divided by a heavier rule than the quarters", async ({
    page,
  }) => {
    const w = await page.locator(".rm-row .rm-act").first().evaluate((el) =>
      parseFloat(getComputedStyle(el).borderLeftWidth)
    );
    expect(w, "the action column's left rule").toBeGreaterThan(1);
  });

  /**
   * ⚠ A BAND, NOT A POINT FIGURE (`decisions-01.md`, 2026-08-21). The danger was
   * never a wrong number — it was a precise one: a point total invites an audit
   * of the model, and the conversation is the product. This asserts the SHAPE, so
   * the illustrative figures stay free to change and a regression to any bare
   * `$n,nnn,nnn` fails.
   */
  test("§18 the Year-1 total is a directional band, not a point figure", async ({ page }) => {
    const total = (await page.locator(".rm-tot b").first().textContent())?.trim() ?? "";
    expect(total, "a bare $ figure is a point total").not.toMatch(/^\$[\d,]+$/);
    expect(total, "a band needs two ends").toMatch(/–|—|-/);
    const label = (await page.locator(".rm-tot span").first().textContent())?.trim();
    expect(label, "the label above the band is unchanged").toBe(
      "Year-1 opportunity sequenced"
    );
    const qualifier = (await page.locator(".rm-tot-q").first().textContent())?.trim();
    expect(qualifier, "the band has to say it is directional").toMatch(/directional/i);
  });

  /**
   * ⚠ `Load into Work Tracker` STAYS THE PRIMARY (`P1-J0-E250`). Pulling `Request`
   * out of the grid must not let it start competing, so the two are asserted
   * together: the section's argument is the button, and the per-line action is
   * secondary by construction.
   */
  /**
   * ⚠ THE VOCABULARY IS ONE VOCABULARY, ACROSS BOTH SECTIONS (E254's brief, WS2).
   *
   * The roadmap and the Work Tracker render the SAME five milestones from
   * `lib/roadmap-milestones.ts` — the plan, and that plan executing. When the
   * resource words changed to `Deliverable · Deployable · Expert's hours`, one
   * tracker row was found still saying `Agent · live` because it hard-coded its
   * own detail string and bypassed `milestoneDetail`. So `/` shipped two nouns for
   * one milestone, two sections apart, AND NO GATE IN THE REPO COULD SEE IT.
   *
   * This is that gate. It asserts the SET of nouns rather than a mapping, because
   * the two views order their rows differently — the tracker groups by quarter.
   *
   * ⚠ `Deployment` IS BANNED IN THIS SET — one letter from `Deployable` and the
   * opposite meaning: a deployable is the thing, a deployment is the act.
   */
  test("§19 the roadmap and the tracker use one resource vocabulary", async ({ page }) => {
    const nouns = (lines: string[]) =>
      [...new Set(lines.map((t) => t.trim().split("·")[0].trim()).filter(Boolean))].sort();
    const roadmap = nouns(await page.locator(".rm-at > span").allTextContents());
    const tracker = nouns(await page.locator(".trk-nm > span").allTextContents());
    const ALLOWED = ["Deliverable", "Deployable", "Expert\u2019s hours"].sort();
    expect(roadmap, "the roadmap's resource words").toEqual(ALLOWED);
    expect(tracker, "the tracker's resource words — a hard-coded detail string drifts here").toEqual(
      ALLOWED
    );
    for (const set of [roadmap, tracker]) {
      expect(set.join(" "), "\"Deployment\" is banned on this surface").not.toMatch(/Deployment/);
    }
  });

  test("§20 Load into Work Tracker is still the primary action", async ({ page }) => {
    await expect(page.locator(".rm-btn")).toHaveText(/Load into Work Tracker/);
    const [btn, chip] = await Promise.all([
      page.locator(".rm-btn").first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
      page.locator(".rm-req").first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    ]);
    expect(chip, "the per-line Request must stay smaller than the primary").toBeLessThan(btn);
  });
});


/**
 * ── ⚠ `/optimize` — THE DISCLOSURE CONTRACT (P1-J0-E259, WS5) ────────────────
 *
 * The five steps are NATIVE `<details>` / `<summary>`, which is the whole reason
 * the page prerenders `○` with no client island. Native gives keyboard operation,
 * screen-reader semantics and open-on-find-in-page for free — but "for free" is
 * a claim, and these are the assertions that make it one.
 *
 * ⚠ THE E097 HALF IS NOT HERE — it is `/optimize` joining §12's page list above,
 * so the nested-interactive audit that already exists covers this page too rather
 * than being written a second time.
 */
test.describe("/optimize — the five steps as disclosures", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/optimize");
  });

  test("§21 exactly five disclosures, and every one closed at rest", async ({ page }) => {
    const d = page.locator("details.opt-d");
    /* ⚠ FIVE, DERIVED: step 1 is ProcessPicker and is deliberately not in the data. */
    await expect(d).toHaveCount(SPINE_STEPS.length + 1);
    await expect(page.locator("details.opt-d[open]")).toHaveCount(0);
  });

  /**
   * ⚠ AGAINST THE DATA, NOT AGAINST A TYPED LITERAL. If someone re-words an
   * eyebrow in `spine-steps.ts`, this test follows them; if someone hand-types a
   * summary onto the page, it fails. That is the only version of this assertion
   * worth having — the whole point of `/optimize` deriving its strings is that it
   * cannot drift from `/`.
   */
  test("§22 each summary is its SPINE_STEPS eyebrow, minus the Step N prefix", async ({ page }) => {
    const rendered = (await page.locator("summary.opt-sum .opt-t").allTextContents()).map((t) => t.trim());
    expect(rendered).toHaveLength(SPINE_STEPS.length + 1);
    /* Step 1 is the one exception — ProcessPicker, not a SPINE_STEPS row. */
    expect(rendered[0]).toBe("Select a Business Process");

    /*
      ⚠ COMPARED TO THE **EYEBROW**, NOT TO `summaryFor(eyebrow)` — AND A BREAK IS
      WHY. The first version asserted `rendered === SPINE_STEPS.map(summaryFor)`,
      which puts the same function on both sides: making `summaryFor` return the
      literal "Provide Details" for every step kept the test GREEN, because the
      expectation broke identically. That is a circular assertion, which is the
      exact failure the file's own note about `button.erp-card` warns against.

      So this asserts the RELATIONSHIP to the data instead: the rendered summary
      must be a non-empty tail of its eyebrow, and must not have carried the
      prefix through. `summaryFor` is still used — as the thing under test, on one
      side only.
    */
    SPINE_STEPS.forEach((step, i) => {
      const got = rendered[i + 1];
      expect(got, `step ${step.n} rendered an empty summary`).not.toBe("");
      expect(
        step.eyebrow.endsWith(got),
        `step ${step.n}: "${got}" is not the tail of its eyebrow "${step.eyebrow}"`
      ).toBe(true);
      expect(got, `step ${step.n} kept its "Step N -" prefix`).not.toMatch(/^Step\s+\d/i);
      /* And the helper agrees with the page — the last link in the chain. */
      expect(got, `step ${step.n} does not match summaryFor()`).toBe(summaryFor(step.eyebrow));
    });
  });

  test("§23 the summary takes focus and Enter toggles it", async ({ page }) => {
    const sum = page.locator("summary.opt-sum").first();
    const det = page.locator("details.opt-d").first();
    /*
      ⚠ TAB-REACHABLE, NOT MERELY `focus()`-ABLE — AND A BREAK IS WHY. Putting
      `tabIndex={-1}` on the summary left `el.focus()` working perfectly, so the
      first version of this test stayed green while the control had been removed
      from the keyboard entirely. A negative tabIndex is exactly the regression
      worth catching, so it is asserted directly.
    */
    const tabIndex = await sum.evaluate((el) => (el as HTMLElement).tabIndex);
    expect(tabIndex, "the summary was taken out of the tab order").toBeGreaterThanOrEqual(0);
    await sum.focus();
    await expect(sum, "the summary is the control and must be reachable by Tab").toBeFocused();
    await page.keyboard.press("Enter");
    await expect(det).toHaveAttribute("open", "");
    await page.keyboard.press("Enter");
    await expect(det).not.toHaveAttribute("open", "");
  });

  test("§24 Space toggles it too", async ({ page }) => {
    const sum = page.locator("summary.opt-sum").nth(3);
    const det = page.locator("details.opt-d").nth(3);
    await sum.focus();
    await page.keyboard.press(" ");
    await expect(det).toHaveAttribute("open", "");
    await page.keyboard.press(" ");
    await expect(det).not.toHaveAttribute("open", "");
  });

  /**
   * ⚠ THE ASSERTION THAT SEPARATES A DISCLOSURE FROM A `display:none` TRICK.
   *
   * A closed panel's contents must be out of the tab order entirely — not merely
   * invisible. Step 1's panel is the one with a focusable descendant
   * (`ProcessPicker`'s card link), which is why it is the one tested: asserting
   * this on a panel with nothing focusable in it would pass forever.
   *
   * ⚠ FOCUS IS ATTEMPTED AND THEN THE DOM IS ASKED WHO HAS IT, rather than
   * counting elements. `el.focus()` on something inside a closed `<details>` is a
   * no-op, and that is exactly the behaviour being claimed.
   */
  test("§25 a closed panel's content is not keyboard-reachable; open, it is", async ({ page }) => {
    /*
      ⚠ SCOPED TO `.opt-panel`, NOT TO `details .opt-panel` — AND A BREAK IS WHY.
      Hoisting the panel OUT of its `<details>` is the regression this test exists
      to catch, and a selector that required the panel to be a descendant of a
      details simply stopped finding it: the test failed on its own vacuity guard
      instead of on the reachability claim. Page-scoped, the hoisted panel is
      still found and the real assertion is the one that fires.
    */
    const inPanel = ".opt-panel a[href]";
    const count = await page.locator(inPanel).count();
    expect(count, "step 1's panel must contain something focusable, or this test is vacuous").toBeGreaterThan(0);

    const focusedWhileClosed = await page.evaluate((sel) => {
      const el = document.querySelector<HTMLElement>(sel);
      el?.focus();
      return el !== null && document.activeElement === el;
    }, inPanel);
    expect(focusedWhileClosed, "a link inside a CLOSED panel took focus").toBe(false);

    await page.locator("summary.opt-sum").first().click();
    await expect(page.locator("details.opt-d").first()).toHaveAttribute("open", "");

    const focusedWhileOpen = await page.evaluate((sel) => {
      const el = document.querySelector<HTMLElement>(sel);
      el?.focus();
      return el !== null && document.activeElement === el;
    }, inPanel);
    expect(focusedWhileOpen, "a link inside an OPEN panel could not take focus").toBe(true);
  });
});


/**
 * ── ⚠ OPTIMIZE WALK 1 (E274 · E243 · E257) ──────────────────────────────────
 *
 * Three renamings-and-removals that a source scan could see but only a browser can
 * prove landed on every surface that renders them. All three are asserted against
 * the RENDERED page, so a literal that arrives from a component nobody thought to
 * grep still fails.
 */
test.describe("optimize walk 1 — the product name, the sub-line, the total", () => {
  /**
   * ⚠ THE RETIRED NAME APPEARS ON NO PUBLIC PAGE, AND THE LIVE NAME COMES FROM
   * ONE SOURCE (`P1-J0-E274`, superseding `E162`).
   *
   * E162's defect was FOUR literals in four files — one product, several
   * spellings, nowhere to change it. So this asserts the absence of the retired
   * name and the presence of the constant, rather than checking file by file.
   *
   * ⚠ `DashboardShot.tsx` STILL CONTAINS IT AND THAT IS DELIBERATE — an
   * unimported stale file (`E159`) Scott is repurposing from. Unimported means it
   * renders nowhere, so this rendered assertion is unaffected by it, which is
   * exactly why the assertion is made here and not against the source tree.
   */
  test("§26 no public page says the retired product name; the live one is present", async ({ page }) => {
    const PAGES = ["/", "/optimize", "/hire-talent", "/buy-services", "/enterprise"];
    let sawLive = false;
    for (const url of PAGES) {
      await page.goto(url);
      const text = await page.evaluate(() => document.body.innerText);
      expect(text, `${url} still says the retired product name`).not.toContain("AI Maturity Assessment");
      if (text.includes(ASSESSMENT_PRODUCT)) sawLive = true;
    }
    /* Not vacuous: the new name has to actually be on the site somewhere. */
    expect(sawLive, `no public page renders "${ASSESSMENT_PRODUCT}"`).toBe(true);
  });

  /**
   * ⚠ THE SUB-LINE IS GONE FROM BOTH PAGES (`P1-J0-E243`). `HowItWorks` renders on
   * `/` AND `/optimize` today, so the removal has to be true on both or it is half
   * done. Asserted by the class AND by the sentence, because the element could be
   * re-added under a different class and the string is what Scott removed.
   */
  test("§27 the HowItWorks sub-line is gone from / and /optimize", async ({ page }) => {
    for (const url of ["/", "/optimize"]) {
      await page.goto(url);
      await expect(page.locator(".hiw-sub"), `${url}: .hiw-sub is back`).toHaveCount(0);
      const text = await page.evaluate(() => document.body.innerText);
      expect(text, `${url}: the deleted sub-line is back`).not.toContain("You spend under an hour");
      /* The heading above it is NOT in scope and must still be there. */
      await expect(page.locator(".hiw-h2")).toHaveCount(1);
    }
  });

  /**
   * ⚠ THE YEAR-1 TOTAL IS A BAND, ON BOTH SURFACES THAT STATE IT (`P1-J0-E257`).
   *
   * The dashboard's KPI and the roadmap's total describe the SAME five findings,
   * and the findings overlap — invoice matching, PO price alerts and rogue-spend
   * all read the same lines — so their sum double-counts. The shape is asserted,
   * not the digits, so the illustrative figures stay free to change and a
   * regression to any bare `$n,nnn,nnn` fails.
   */
  test("§28 the dashboard KPI and the roadmap total are the same band, not a point figure", async ({ page }) => {
    await page.goto("/optimize");
    /* Step 4 carries the dashboard; step 5 the roadmap. Open both. */
    await page.evaluate(() => document.querySelectorAll("details.opt-d").forEach((d) => d.setAttribute("open", "")));
    /*
      ⚠ THE SAVINGS KPI, NOT `.osd-kv` FIRST. There are THREE KPIs on the shot —
      a maturity delta, an opportunity count and the savings figure — and
      `.first()` picked the delta, so the first version of this test failed
      claiming "-31 pts" was not a band. Selected by its own label instead, which
      is what a reader would use.
    */
    const kpiTexts = await page.locator(".osd-kv").allTextContents();
    const kpi = (kpiTexts.find((t) => t.trim().startsWith("$")) ?? "").trim();
    expect(kpi, "no savings KPI found on the dashboard shot").not.toBe("");
    const roadmap = (await page.locator(".rm-tot b").first().textContent())?.trim() ?? "";
    for (const [name, v] of [["the dashboard KPI", kpi], ["the roadmap total", roadmap]] as const) {
      expect(v, `${name} is a bare $ figure — a point total`).not.toMatch(/^\$[\d,]+$/);
      expect(v, `${name} is not a band`).toMatch(/–|—|-/);
    }
    /*
      ⚠ AND THEY AGREE. Two different bands for one set of findings is the same
      defect as two different totals, one step less obvious.
    */
    expect(kpi.replace(/\s/g, ""), "the dashboard and the roadmap state different bands").toBe(
      roadmap.replace(/\s/g, "")
    );
  });
});
