import { expect, test, type Locator, type Page } from "@playwright/test";
/*
  ⚠ THE SOURCE OF TRUTH, IMPORTED — NOT RETYPED. `/optimize`'s five summaries are
  derived from `SPINE_STEPS`, and a test comparing the page to a typed literal
  would prove only that somebody typed the same thing twice. `spine-steps.ts` has
  no imports of its own, so pulling it in here costs nothing.
*/
import { SPINE_STEPS } from "../src/lib/spine-steps";
/* The product's name, from its one source — see `ASSESSMENT_PRODUCT`'s note. */
import { ASSESSMENT_PRODUCT } from "../src/lib/brand";
/*
  ⚠ `/learn`'s five row labels, IMPORTED FROM THE SAME MODULE THE PAGE READS.
  `learn-steps.ts` is strings only and imports nothing, which is why it can be
  pulled into a Playwright spec at all — the panels are React and stay in
  `LearnPublic.tsx`.
*/
import {
  LEARN_STEPS,
  LEARN_SPINE_HEADING,
  LEARN_SPINE_TAGLINE,
} from "../src/lib/learn-steps";
/* `/hire-talent`'s five labels, from the module the page reads — same reason as
   `learn-steps.ts` above: strings only, no imports, so a spec can pull it in. */
import { TALENT_STEPS } from "../src/lib/talent-steps";
/* `/find-work`'s five labels, from the module the page reads. */
import { WORK_STEPS } from "../src/lib/work-steps";
import { SHOP_STEPS } from "../src/lib/shop-steps";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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
  {
    grid: ".erp-grid",
    name: "Reports & Dashboards",
    dialog: "Spend Overview dashboard",
    url: SHOP,
  },
  {
    grid: ".erp-grid",
    name: "Price Alerts",
    dialog: "Price alert email",
    url: SHOP,
  },
  {
    grid: ".erp-grid",
    name: "Document Validation",
    dialog: "W-9 document validation",
    url: SHOP,
  },
  {
    grid: ".erp-grid",
    name: "Extend Your Apps",
    dialog: "Work request with matched experts",
    url: SHOP,
  },
  // ErpIntegration — the two flow doorways. Now on /enterprise only.
  {
    grid: ".erpx-doors",
    name: "Fulfillment",
    dialog: "Service procurement fulfillment flow",
    url: ENTERPRISE,
  },
  {
    grid: ".erpx-doors",
    name: "Settlement",
    dialog: "Service procurement settlement flow",
    url: ENTERPRISE,
  },
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
    return (
      !!d && !!document.activeElement && d.contains(document.activeElement)
    );
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
      return (
        n.tagName.toLowerCase() + (cls ? `.${cls.split(/\s+/).join(".")}` : "")
      );
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
    if (msg.type() === "error")
      consoleErrors.push(`console.error: ${msg.text()}`);
  });
  page.on("pageerror", (err) =>
    consoleErrors.push(`pageerror: ${err.message}`),
  );
});

for (const [i, c] of CARDS.entries()) {
  test.describe(`card ${i + 1} — ${c.name} (${c.url})`, () => {
    /* ⚠ The card's OWN page. See the note on `Card.url`. */
    test.beforeEach(async ({ page }) => {
      await page.goto(c.url);
    });

    test("§1 the card is a <button> that advertises the dialog", async ({
      page,
    }) => {
      const card = cardFor(page, c);
      await expect(card).toHaveCount(1);
      await expect(card).toHaveJSProperty("tagName", "BUTTON");
      await expect(card).toHaveAttribute("aria-haspopup", "dialog");
    });

    test("§2 click opens a modal dialog with an accessible name", async ({
      page,
    }) => {
      await openByClick(page, cardFor(page, c));
      const dialog = page.getByRole("dialog", { name: c.dialog });
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveAttribute("aria-modal", "true");
    });

    test("§3 Enter opens it from keyboard focus — a nested button eats Enter", async ({
      page,
    }) => {
      await openByEnter(page, cardFor(page, c));
      await expect(page.getByRole("dialog", { name: c.dialog })).toBeVisible();
    });

    test("§4 focus moves into the dialog on open", async ({ page }) => {
      await openByClick(page, cardFor(page, c));
      await expect(page.getByRole("dialog")).toBeVisible();
      expect(await focusIsInDialog(page)).toBe(true);
    });

    test("§5 focus is trapped — Tab and Shift+Tab cycle, nothing behind is reachable", async ({
      page,
    }) => {
      await openByClick(page, cardFor(page, c));
      const dialog = page.getByRole("dialog");
      const stops = dialog.locator(FOCUSABLE);
      const n = await stops.count();
      expect(
        n,
        "a dialog with no focusable element cannot be escaped from OR used",
      ).toBeGreaterThan(0);

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
        expect(
          await focusIsInDialog(page),
          `focus escaped after ${k + 1} Tab(s)`,
        ).toBe(true);
      }
    });

    test("§6 Esc closes it and focus returns to the card that opened it", async ({
      page,
    }) => {
      const card = cardFor(page, c);
      await openByClick(page, card);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(card).toBeFocused();
    });

    test("§7 the backdrop closes it; a click inside the scene does not", async ({
      page,
    }) => {
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

  test("§9 Table view is a real <button> and reveals the table", async ({
    page,
  }) => {
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
    await expect(
      dialog.getByRole("button", { name: "Hide table" }),
    ).toBeVisible();
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
  test("§11 zero console errors on load and across every open/close", async ({
    page,
  }) => {
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
        await expect(
          page.getByRole("dialog", { name: c.dialog }),
        ).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toHaveCount(0);
      }
    }
    /*
      A React hydration mismatch arrives as a console error and nothing else.
      This is the check that would have caught E097 with no human reading a log.
    */
    expect(
      consoleErrors,
      `console output:\n${consoleErrors.join("\n")}`,
    ).toEqual([]);
  });

  test("§12 no interactive element is nested inside another — the E097 regression", async ({
    page,
  }) => {
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
        await expect(
          page.getByRole("dialog", { name: c.dialog }),
        ).toBeVisible();
        expect(
          await nestedInteractive(page),
          `with "${c.dialog}" open on ${url}`,
        ).toEqual([]);
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
    await expect(
      page.locator(".erp-grid"),
      "ErpPackages is back on /",
    ).toHaveCount(0);
    await expect(
      page.locator(".erpx-doors"),
      "ErpIntegration is back on /",
    ).toHaveCount(0);
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
  test("§13 flow-diagram SVG ids are unique and every marker resolves in its own svg", async ({
    page,
  }) => {
    /* The two flow diagrams are `.erpx-doors` crops — now on /enterprise only. */
    await page.goto(ENTERPRISE);
    const audit = () =>
      page.evaluate(() => {
        const svgs = Array.from(document.querySelectorAll("svg.flw-svg"));
        const ids: string[] = [];
        const stolen: string[] = [];
        for (const svg of svgs) {
          for (const el of svg.querySelectorAll("[id]")) ids.push(el.id);
          for (const el of svg.querySelectorAll(
            "[marker-end],[fill^='url('],[marker-start]",
          )) {
            for (const attr of ["marker-end", "marker-start", "fill"]) {
              const v = el.getAttribute(attr) ?? "";
              const m = v.match(/^url\(#(.+)\)$/);
              if (!m) continue;
              // The reference must be satisfiable from inside this same <svg>.
              if (!svg.querySelector(`#${CSS.escape(m[1])}`)) {
                stolen.push(
                  `${el.tagName}@${attr} -> #${m[1]} is not in its own svg`,
                );
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
      expect(
        open.stolen,
        `cross-svg marker references with "${c.dialog}" open`,
      ).toEqual([]);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
  });

  /** §14 — the crops are true-scale windows. A `scale()` would break that. */
  test("§14 neither ERP doorway crop applies a scale()", async ({ page }) => {
    await page.goto(ENTERPRISE);
    const transforms = await page
      .locator(".erpx-doors .crop-inner")
      .evaluateAll((els) =>
        els.map((el) => (el as HTMLElement).style.transform),
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
/**
 * ⚠⚠ RE-HOMED TO `/optimize` ON 2026-08-24 (`P1-J0-E298`). THE SUBJECT MOVED; NOT
 * ONE ASSERTION WAS WEAKENED TO FOLLOW IT.
 *
 * `AiRoadmapShot` is step 5's graphic. It rendered on `/` inside `SpineSteps`, and
 * `SpineSteps` came off `/` when the assessment journey stopped being on the site
 * twice. It now renders ONLY inside `/optimize`'s step-5 disclosure panel. Every
 * `.rm-*` assertion below is byte-for-byte what it was; only the page it opens and
 * the panel it opens changed.
 *
 * ⚠ THE PANEL IS FORCE-OPENED, AND THAT IS NOT BELT-AND-BRACES. Measured
 * 2026-08-24: Chromium still resolves rects and computed styles for `.rm-act`
 * inside a CLOSED `<details>` (width 118, `border-left-width: 2px`), so §15-§17
 * would have passed without opening it. ⚠ THAT IS EXACTLY WHY IT IS OPENED — the
 * pass would have depended on how one browser treats hidden content, and a
 * geometry assertion that survives its subject being invisible has stopped
 * measuring anything. `§28` already force-opens for the same reason.
 */
test.describe("the Step 5 roadmap grid", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/optimize");
    /* Not a click — all five, unconditionally, so a re-ordered step cannot make a
       test silently measure a closed panel. Same line as §28. */
    await page.evaluate(() =>
      document
        .querySelectorAll("details.stepd-d")
        .forEach((d) => d.setAttribute("open", "")),
    );
    /* The assertion below is the guard against this beforeEach going stale: if the
       roadmap ever stops rendering here, every test in the block fails loudly
       rather than passing on an empty locator. */
    await expect(page.locator(".rm-tot b").first()).toBeVisible();
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
            return cr.left + 0.5 < lr.right
              ? `row ${i + 1}: chip ${Math.round(cr.left)} < lane right ${Math.round(lr.right)}`
              : null;
          })
          .filter(Boolean),
      };
    });
    expect(m.chips, "one Request per row").toBe(5);
    expect(m.lanes, "one quarter lane per row").toBe(5);
    expect(
      m.insideLane,
      "a Request chip is nested inside the quarter lane",
    ).toBe(0);
    expect(
      m.overlapping,
      "a Request chip overlaps the quarter lane on screen",
    ).toEqual([]);
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
    const actHeader = await page
      .locator(".rm-hd .rm-act")
      .first()
      .textContent();
    expect(
      (actHeader ?? "").trim(),
      "the action column must carry no label",
    ).toBe("");
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
    const w = await page
      .locator(".rm-row .rm-act")
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).borderLeftWidth));
    expect(w, "the action column's left rule").toBeGreaterThan(1);
  });

  /**
   * ⚠ A BAND, NOT A POINT FIGURE (`decisions-01.md`, 2026-08-21). The danger was
   * never a wrong number — it was a precise one: a point total invites an audit
   * of the model, and the conversation is the product. This asserts the SHAPE, so
   * the illustrative figures stay free to change and a regression to any bare
   * `$n,nnn,nnn` fails.
   */
  test("§18 the Year-1 total is a directional band, not a point figure", async ({
    page,
  }) => {
    const total =
      (await page.locator(".rm-tot b").first().textContent())?.trim() ?? "";
    expect(total, "a bare $ figure is a point total").not.toMatch(/^\$[\d,]+$/);
    expect(total, "a band needs two ends").toMatch(/–|—|-/);
    const label = (
      await page.locator(".rm-tot span").first().textContent()
    )?.trim();
    expect(label, "the label above the band is unchanged").toBe(
      "Year-1 opportunity sequenced",
    );
    const qualifier = (
      await page.locator(".rm-tot-q").first().textContent()
    )?.trim();
    expect(qualifier, "the band has to say it is directional").toMatch(
      /directional/i,
    );
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
   *
   * ── ⚠⚠ THIS TEST NOW READS TWO PAGES, AND THE ALTERNATIVE WAS WORSE ─────────
   *
   * `P1-J0-E298` split the two subjects apart: the roadmap left `/` with
   * `SpineSteps` and lives in `/optimize`'s step-5 panel; the Work Tracker stayed
   * on `/`. The brief offered two ways out — read both pages, or assert the shared
   * SOURCE (`lib/roadmap-milestones.ts`) instead of the shared page.
   *
   * ⚠ ASSERTING THE SOURCE WOULD HAVE RE-ADMITTED THE ORIGINAL DEFECT, WHICH IS
   * WHY IT WAS REJECTED. The bug was NOT that the source disagreed with itself —
   * the source was fine. The bug was that `WorkTracker` HARD-CODED its own detail
   * string and BYPASSED `milestoneDetail` entirely. A test that reads
   * `roadmap-milestones.ts` and finds three correct nouns passes while a component
   * ignores the file completely. The whole value of this assertion is that it reads
   * what each component actually RENDERED.
   *
   * ⚠ SO IT NAVIGATES TWICE. Two pages is the honest cost of the two sections
   * living apart; a cheaper assertion here would be a different, weaker assertion.
   * ⚠ DO NOT "TIDY" THIS BACK INTO A ONE-PAGE TEST — there is no page that renders
   * both any more, and one that reads only the page it happens to be on would go
   * green while the other surface drifted.
   *
   * ⚠ THE `beforeEach` ALREADY PUT US ON `/optimize` WITH THE PANELS OPEN, so the
   * roadmap is read first and `/` is visited second, for the tracker.
   */
  test("§19 the roadmap and the tracker use one resource vocabulary", async ({
    page,
  }) => {
    const nouns = (lines: string[]) =>
      [
        ...new Set(
          lines.map((t) => t.trim().split("·")[0].trim()).filter(Boolean),
        ),
      ].sort();
    /* ── the roadmap, on `/optimize` (this block's page), panels already open ── */
    const roadmapLines = await page.locator(".rm-at > span").allTextContents();
    expect(
      roadmapLines.length,
      "no roadmap rows found on /optimize — the subject moved again",
    ).toBeGreaterThan(0);
    const roadmap = nouns(roadmapLines);

    /* ── the tracker, on `/` — a DIFFERENT PAGE since E298. See the note above. ── */
    await page.goto("/");
    const trackerLines = await page.locator(".trk-nm > span").allTextContents();
    expect(
      trackerLines.length,
      "no tracker rows found on / — WorkTracker was supposed to STAY",
    ).toBeGreaterThan(0);
    const tracker = nouns(trackerLines);
    const ALLOWED = ["Deliverable", "Deployable", "Expert\u2019s hours"].sort();
    expect(roadmap, "the roadmap's resource words").toEqual(ALLOWED);
    expect(
      tracker,
      "the tracker's resource words — a hard-coded detail string drifts here",
    ).toEqual(ALLOWED);
    for (const set of [roadmap, tracker]) {
      expect(
        set.join(" "),
        '"Deployment" is banned on this surface',
      ).not.toMatch(/Deployment/);
    }
  });

  test("§20 Load into Work Tracker is still the primary action", async ({
    page,
  }) => {
    await expect(page.locator(".rm-btn")).toHaveText(/Load into Work Tracker/);
    const [btn, chip] = await Promise.all([
      page
        .locator(".rm-btn")
        .first()
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
      page
        .locator(".rm-req")
        .first()
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    ]);
    expect(
      chip,
      "the per-line Request must stay smaller than the primary",
    ).toBeLessThan(btn);
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
/**
 * ⚠ THE SELECTORS IN THIS BLOCK SAY `.stepd-*` WHERE THEY USED TO SAY `.opt-*`,
 * AND THAT IS THE ONLY THING THAT CHANGED IN IT.
 *
 * `P1-J0-E281` moved the disclosure markup out of `OptimizeSteps.tsx` into the
 * shared `StepDisclosures`, which renamed the classes. NOT ONE ASSERTION'S
 * SUBSTANCE WAS TOUCHED — same counts, same derivation from `SPINE_STEPS`, same
 * keyboard contract, same scoping. The migration was measured before and after at
 * 1440 / 900 / 390 and every geometry number and the panel innerText hash are
 * identical, which is the actual proof the render did not move; these strings are
 * a class rename and nothing more.
 *
 * ⚠ THE PREFIX IS `stepd-`, NOT the `sd-` the brief named. `home.css:1550-1557`
 * already owns `.pm-home .sd-n` — the home spine's 64px numeral — and at (0,2,0)
 * it beat a bare `.sd-n` at (0,1,0) on `/optimize`, which renders inside
 * `.pm-home`. The numeral came out 23px wide instead of 40px. Caught by the
 * before/after measurement, not by eye: it was invisible at 1440 and 900 and only
 * moved the 390 numbers.
 */
test.describe("/optimize — the five steps as disclosures", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/optimize");
  });

  test("§21 exactly five disclosures, and every one closed at rest", async ({
    page,
  }) => {
    const d = page.locator("details.stepd-d");
    /* ⚠ FIVE, DERIVED — AND THE `+ 1` IS GONE (`P1-J0-E288`). This used to read
       `SPINE_STEPS.length + 1` because step 1 was `ProcessPicker`, hardcoded in
       `OptimizeSteps` and deliberately absent from the data. It is `SPINE_STEPS[0]`
       now, with `graphic: "process-picker"`, so the array IS the five. */
    await expect(d).toHaveCount(SPINE_STEPS.length);
    await expect(page.locator("details.stepd-d[open]")).toHaveCount(0);
  });

  /**
   * ── ⚠⚠ THE CONTRACT CHANGED ON PURPOSE (`P1-J0-E286`/`E288`) ───────────────
   *
   * This asserted the summary was DERIVED from the eyebrow by `summaryFor()`.
   * `summaryFor()` no longer exists: Scott asked for 3-4 word rows, and no rule
   * turns *"Submit Your Completed Assessment to Panameer's AI Platform (AIP)"* into
   * *"Submit to the AIP"* without inventing the second string. A short HANDLE and a
   * full EYEBROW are now deliberately two fields.
   *
   * ⚠ THIS IS NOT THE "STOP AND REPORT" CASE. The brief is replacing the contract
   * knowingly, which is the difference between a guard that has been outgrown and
   * one that is being weakened to make new work go green.
   *
   * ⚠ WHAT SURVIVES FROM THE OLD ASSERTION IS THE ANTI-CIRCULARITY LESSON, and it
   * is why the new one compares to the DATA rather than to a typed literal: the
   * first version of the old test put `summaryFor` on both sides, so making it
   * return "Provide Details" for every step kept the suite GREEN.
   *
   * ⚠⚠ AND THE `E275` HALF IS THE IMPORTANT ONE. Shortening the rows DELETED the
   * full eyebrow from the page, because `/optimize`'s panel never rendered it —
   * which would have re-introduced the exact backwards state `E275` fixed six days
   * earlier: `AIP` introduced in a label and expanded nowhere. The panel gained the
   * eyebrow in the same commit, and this asserts both expansions survive.
   */
  test("§22 rows are short handles, and every full eyebrow still renders", async ({
    page,
  }) => {
    const rendered = (
      await page.locator("summary.stepd-sum .stepd-t").allTextContents()
    ).map((t) => t.trim());

    /* ⚠ FIVE, AND STEP 1 IS NO LONGER AN EXCEPTION (`E288`) — it is `SPINE_STEPS[0]`
       now, with `graphic: "process-picker"`, so there is no `+ 1` here any more. */
    expect(rendered).toEqual(SPINE_STEPS.map((s) => s.summary));

    /* 1. Scott's rule: 3-4 words. Asserted as a ceiling, not an exact count. */
    for (const [i, got] of rendered.entries()) {
      expect(got, `row ${i + 1} is empty`).not.toBe("");
      expect(
        got.split(/\s+/).length,
        `row ${i + 1} "${got}" is longer than 4 words`,
      ).toBeLessThanOrEqual(4);
      expect(got, `row ${i + 1} kept a "Step N -" prefix`).not.toMatch(
        /^Step\s+\d/i,
      );
    }

    /* 3. The five render in order 1-5 — the numerals, not just the labels. */
    expect(
      await page.locator("summary.stepd-sum .stepd-n").allTextContents(),
    ).toEqual(["1", "2", "3", "4", "5"]);

    /*
      2. ⚠⚠ THE `E275` GUARD. Every full eyebrow must still render SOMEWHERE on the
      page — asserted against the data so a re-worded eyebrow follows automatically,
      and then the two expansions that do the actual work are asserted by literal,
      because those are the strings whose loss `E275` was about.
    */
    /*
      ⚠ THE ROWS ARE FORCE-OPENED FIRST, AND A FAILURE TAUGHT ME WHY. The eyebrows
      live INSIDE the panels, and `innerText` excludes content hidden by a closed
      `<details>` — so reading it closed reported every eyebrow missing. Reading
      `page.content()` instead would have passed, but it would only prove the string
      is in the MARKUP; `innerText` after opening proves it is RENDERED, which is
      what `E275` is actually about. Same force-open line as §28.
    */
    await page.evaluate(() =>
      document
        .querySelectorAll("details.stepd-d")
        .forEach((d) => d.setAttribute("open", "")),
    );
    /*
      ⚠ CASE-INSENSITIVE, AND A SECOND FAILURE TAUGHT ME WHY. `innerText` returns
      text as TRANSFORMED by CSS, and the eyebrow is `uppercase` — so the page reads
      "STEP 1 - SELECT A BUSINESS PROCESS" while the data says
      "Step 1 - Select a Business Process". The casing is a presentation choice; the
      STRING is the claim `E275` cares about, so the comparison folds case rather
      than the data being retyped in caps to match.
    */
    const body = (
      await page.evaluate(() => document.body.innerText)
    ).toLowerCase();
    for (const step of SPINE_STEPS) {
      expect(
        body.includes(step.eyebrow.toLowerCase()),
        `step ${step.n}'s full eyebrow is not rendered anywhere — E275`,
      ).toBe(true);
    }
    expect(
      body.includes("(transaction-level)"),
      "step 2's (Transaction-Level) is the part that does the work — E275",
    ).toBe(true);
    expect(
      body.includes("panameer's ai platform (aip)"),
      "AIP must be EXPANDED on the page, not just introduced in a label — E275",
    ).toBe(true);
  });

  test("§23 the summary takes focus and Enter toggles it", async ({ page }) => {
    const sum = page.locator("summary.stepd-sum").first();
    const det = page.locator("details.stepd-d").first();
    /*
      ⚠ TAB-REACHABLE, NOT MERELY `focus()`-ABLE — AND A BREAK IS WHY. Putting
      `tabIndex={-1}` on the summary left `el.focus()` working perfectly, so the
      first version of this test stayed green while the control had been removed
      from the keyboard entirely. A negative tabIndex is exactly the regression
      worth catching, so it is asserted directly.
    */
    const tabIndex = await sum.evaluate((el) => (el as HTMLElement).tabIndex);
    expect(
      tabIndex,
      "the summary was taken out of the tab order",
    ).toBeGreaterThanOrEqual(0);
    await sum.focus();
    await expect(
      sum,
      "the summary is the control and must be reachable by Tab",
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(det).toHaveAttribute("open", "");
    await page.keyboard.press("Enter");
    await expect(det).not.toHaveAttribute("open", "");
  });

  test("§24 Space toggles it too", async ({ page }) => {
    const sum = page.locator("summary.stepd-sum").nth(3);
    const det = page.locator("details.stepd-d").nth(3);
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
  test("§25 a closed panel's content is not keyboard-reachable; open, it is", async ({
    page,
  }) => {
    /*
      ⚠ SCOPED TO `.stepd-panel`, NOT TO `details .stepd-panel` — AND A BREAK IS WHY.
      Hoisting the panel OUT of its `<details>` is the regression this test exists
      to catch, and a selector that required the panel to be a descendant of a
      details simply stopped finding it: the test failed on its own vacuity guard
      instead of on the reachability claim. Page-scoped, the hoisted panel is
      still found and the real assertion is the one that fires.
    */
    const inPanel = ".stepd-panel a[href]";
    const count = await page.locator(inPanel).count();
    expect(
      count,
      "step 1's panel must contain something focusable, or this test is vacuous",
    ).toBeGreaterThan(0);

    const focusedWhileClosed = await page.evaluate((sel) => {
      const el = document.querySelector<HTMLElement>(sel);
      el?.focus();
      return el !== null && document.activeElement === el;
    }, inPanel);
    expect(focusedWhileClosed, "a link inside a CLOSED panel took focus").toBe(
      false,
    );

    await page.locator("summary.stepd-sum").first().click();
    await expect(page.locator("details.stepd-d").first()).toHaveAttribute(
      "open",
      "",
    );

    const focusedWhileOpen = await page.evaluate((sel) => {
      const el = document.querySelector<HTMLElement>(sel);
      el?.focus();
      return el !== null && document.activeElement === el;
    }, inPanel);
    expect(
      focusedWhileOpen,
      "a link inside an OPEN panel could not take focus",
    ).toBe(true);
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
  test("§26 no public page says the retired product name; the live one is present", async ({
    page,
  }) => {
    const PAGES = [
      "/",
      "/optimize",
      "/hire-talent",
      "/buy-services",
      "/enterprise",
    ];
    let sawLive = false;
    for (const url of PAGES) {
      await page.goto(url);
      const text = await page.evaluate(() => document.body.innerText);
      expect(text, `${url} still says the retired product name`).not.toContain(
        "AI Maturity Assessment",
      );
      if (text.includes(ASSESSMENT_PRODUCT)) sawLive = true;
    }
    /* Not vacuous: the new name has to actually be on the site somewhere. */
    expect(sawLive, `no public page renders "${ASSESSMENT_PRODUCT}"`).toBe(
      true,
    );
  });

  /**
   * ⚠ THE SUB-LINE IS GONE (`P1-J0-E243`). Asserted by the class AND by the
   * sentence, because the element could come back under a different class and the
   * string is what Scott removed.
   *
   * ── ⚠⚠ SPLIT IN TWO BY `P1-J0-E298`, AND IT GOT STRONGER, NOT WEAKER ────────
   *
   * This test used to loop over `["/", "/optimize"]` asserting the same three
   * things on each, including *"the heading above it is NOT in scope and must
   * still be there"* — a guard against the sub-line's deletion taking `.hiw-h2`
   * with it.
   *
   * ⚠ `HowItWorks` NO LONGER RENDERS ON `/` AT ALL. E298 took the whole component
   * off that page, so `.hiw-h2` is legitimately absent there and the old
   * `toHaveCount(1)` failed for the right reason. ⚠ THE FIX WAS NOT TO DROP THAT
   * HALF. The over-deletion guard still matters — it just only has a subject on
   * `/optimize` now.
   *
   * So: the STRING ban still runs on BOTH pages (it must never come back anywhere),
   * the heading guard runs on `/optimize` where the heading lives, and `/` gains a
   * NEW positive assertion that `HowItWorks` is entirely absent — which is E298's
   * own claim and was previously guarded by nothing at all.
   */
  test("§27 the sub-line is gone, and all three moved sections are off / but alive on /optimize", async ({
    page,
  }) => {
    /* The banned sentence must not appear on EITHER page, under any class. */
    for (const url of ["/", "/optimize"]) {
      await page.goto(url);
      await expect(
        page.locator(".hiw-sub"),
        `${url}: .hiw-sub is back`,
      ).toHaveCount(0);
      const text = await page.evaluate(() => document.body.innerText);
      expect(text, `${url}: the deleted sub-line is back`).not.toContain(
        "You spend under an hour",
      );
    }

    /*
      ⚠ `/optimize` KEEPS THE HEADING. This is the original over-deletion guard,
      unchanged in substance — only its page is now singular.
    */
    await page.goto("/optimize");
    await expect(
      page.locator(".hiw-h2"),
      "/optimize: the heading is not in scope and must still be there",
    ).toHaveCount(1);

    /*
      ⚠ AND `/` RENDERS NONE OF THE THREE SECTIONS THAT MOVED (`E298`) — the strip,
      the process picker and the spine. All three files are still on disk and still
      imported by `/optimize`; what must not come back is their RENDER here. Scott:
      *"let's REMOVE the ones we moved to optimize."*

      ⚠⚠ ALL THREE ARE LISTED BECAUSE A BREAK TEST PROVED TWO OF THEM WERE
      UNGUARDED. Re-adding `<HowItWorks />` to `page.tsx` failed this test — but
      re-adding `<SpineSteps />` left the whole 79-test suite GREEN. The assessment
      journey could have gone back to being on the site twice and nothing would have
      said so. `.pp` and `.spn` are here for that reason, not for symmetry.

      ⚠ THIS ASSERTS ABSENCE ON `/` ONLY. The same selectors MUST resolve on
      `/optimize`, which §21-§25 and §15-§20 depend on — so this cannot be
      "generalised" into a site-wide ban.
    */
    await page.goto("/");
    for (const sel of [
      ".hiw-h2",
      ".hiw-sub",
      "a.hiw-card",
      ".hiw",
      ".pp",
      ".spn",
    ]) {
      await expect(
        page.locator(sel),
        `/ still renders ${sel} — E298 removed it`,
      ).toHaveCount(0);
    }

    /*
      ⚠ NOT VACUOUS, AND THIS IS THE HALF THAT KEEPS IT HONEST. Every selector above
      has to still resolve SOMEWHERE, or the ban would pass by the components having
      been deleted rather than moved — which the brief explicitly forbids
      ("DELETING ANY FILE BREAKS /optimize").
    */
    await page.goto("/optimize");
    await expect(
      page.locator(".hiw-h2"),
      "/optimize lost the heading",
    ).toHaveCount(1);
    await page.evaluate(() =>
      document
        .querySelectorAll("details.stepd-d")
        .forEach((d) => d.setAttribute("open", "")),
    );
    await expect(
      page.locator(".pp"),
      "/optimize lost ProcessPicker",
    ).toHaveCount(1);
    /*
      ⚠ THE SPINE'S PROOF-OF-LIFE IS `.stepd-h2`, NOT `.spn`, AND A FAILED ASSERTION
      TAUGHT ME WHY. `.spn` is the SECTION WRAPPER `SpineSteps` emits, and
      `/optimize` never rendered it — its panels call `StepGraphic` directly, which
      is the same reason `#spine-step-2..5` are absent on that page (found in
      `brief_learn_walk2`'s WS4 test). So `.spn` only ever existed on `/`: banning
      it here is right, asserting it on `/optimize` was wrong.

      What actually moved is the four steps' HEADINGS AND GRAPHICS, and those are the
      four `.stepd-h2` panels. `§22` separately proves each summary derives from
      `SPINE_STEPS`, so the two together say the spine is alive and still sourced
      from the same data.
    */
    await expect(
      page.locator(".stepd-h2"),
      "/optimize lost the four spine step panels",
    ).toHaveCount(4);
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
  test("§28 the dashboard KPI and the roadmap total are the same band, not a point figure", async ({
    page,
  }) => {
    await page.goto("/optimize");
    /* Step 4 carries the dashboard; step 5 the roadmap. Open both. */
    await page.evaluate(() =>
      document
        .querySelectorAll("details.stepd-d")
        .forEach((d) => d.setAttribute("open", "")),
    );
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
    const roadmap =
      (await page.locator(".rm-tot b").first().textContent())?.trim() ?? "";
    for (const [name, v] of [
      ["the dashboard KPI", kpi],
      ["the roadmap total", roadmap],
    ] as const) {
      expect(v, `${name} is a bare $ figure — a point total`).not.toMatch(
        /^\$[\d,]+$/,
      );
      expect(v, `${name} is not a band`).toMatch(/–|—|-/);
    }
    /*
      ⚠ AND THEY AGREE. Two different bands for one set of findings is the same
      defect as two different totals, one step less obvious.
    */
    expect(
      kpi.replace(/\s/g, ""),
      "the dashboard and the roadmap state different bands",
    ).toBe(roadmap.replace(/\s/g, ""));
  });
});

/**
 * `/learn` — THE SPINE AS DISCLOSURES (`P1-J0-E281`, `E283`, `E280`, `E282`).
 *
 * ⚠ WHY THESE LIVE IN `marketing-home.spec.ts` AND NOT A NEW FILE: the component
 * under test is SHARED. `StepDisclosures` renders on `/optimize` and `/learn`, so
 * a change to it reaches both pages at once, and splitting the two pages' guards
 * across two specs is how a shared component drifts on one page without anybody
 * noticing. §21–§25 above and §29–§33 below assert the same shell.
 */
test.describe("/learn — the spine as five disclosures", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/learn");
  });

  /**
   * BREAK 1 — revert the spine to `SellSection` and this fails on the count.
   *
   * ⚠ IT ASSERTS THE ROWS EXIST **AND** THAT THE BANDS DID NOT COME BACK ALONGSIDE
   * THEM. A half-revert that renders both would otherwise pass a count-only test,
   * and "both" is the state that actually ships duplicate copy.
   */
  test("§29 exactly five disclosures, closed at rest, and the teaching bands are gone", async ({
    page,
  }) => {
    const d = page.locator("details.stepd-d");
    await expect(d).toHaveCount(LEARN_STEPS.length);
    await expect(page.locator("details.stepd-d[open]")).toHaveCount(0);

    /*
      ⚠ THE FIVE SELL SECTIONS BELOW ARE NOT IN SCOPE AND MUST STILL BE THERE.
      This is the assertion that stops "delete the bands" being read as "delete
      `SellSection`" — the spine's SEVEN went to disclosures; the sell five did
      not move. Counted by their own headings so it does not depend on a class.
    */
    /*
      ⚠⚠ INVERTED BY `P1-J0-E312`. THIS USED TO ASSERT THE FIVE SELL SECTIONS SURVIVE.

      It existed so "delete the teaching bands" could not be read as "delete
      `SellSection`" — three rows (`E281`, `E283`, `E297`) marked those five out of
      scope pending Scott's confirmation. ⚠ HE CONFIRMED BY DELETING THEM: *"REMOVE
      these sections."*

      ⚠ IT NOW ASSERTS THEIR ABSENCE, WHICH IS A STRONGER CLAIM. Each carried
      something already flagged — `One-on-one`'s present-tense messaging promise
      (contradicting step 2 in `E296`/`E306`/`E307`), `Free & certified`'s unkeepable
      *"get certified — free"*, `Learn together`'s *"Every course has a room"*. If one
      returns, its contradiction returns with it.

      ⚠ `Learning paths` IS DELIBERATELY NOT IN THIS LIST. It was one of the five
      headings, but the words also appear legitimately in the hero's stat card and in
      row 1's headline — banning the phrase would fail on copy that must stay.

      ⚠ `SellSection` ITSELF IS NOT DELETED and is still the shared band elsewhere.
    */
    /*
      ⚠ `One-on-one` IS DELIBERATELY NOT IN THIS LIST EITHER, AND A FAILURE PUT IT
      HERE. `E307`'s new row-2 headline says *"...book one-on-one time for direct
      training or support."*, and `E306`'s paid tier row is `Book time one-to-one`, so
      a substring ban on that phrase fails on Scott's own copy. The sell section it
      used to name is gone; what survives is the PANEL's promise, which is guarded by
      the tier list instead (see row 2's note).
    */
    for (const h of ["Free & certified", "Learn together", "Your brand"]) {
      await expect(
        page.getByText(h, { exact: false }),
        `the sell section "${h}" is back on /learn — E312 removed it`,
      ).toHaveCount(0);
    }

    /* ⚠ AND THE SPINE'S OWN HEADINGS MUST NOT ALSO APPEAR AS BANDS. `While You Are
       Learning` was §7's eyebrow; as a row label it is now `Meet Your Instructor`,
       so the old eyebrow appearing anywhere means the bands came back. */
    await expect(page.getByText("While You Are Learning")).toHaveCount(0);
    await expect(
      page.getByText("What Do You Do After the Training"),
    ).toHaveCount(0);
  });

  /**
   * BREAK 2 — hardcode a summary in `LearnPublic.tsx` instead of reading
   * `LEARN_STEPS[i].summary`, and this fails.
   *
   * ⚠ THE ORDER IS ASSERTED, NOT JUST THE SET. These are numbered steps; a page
   * that renders all five labels in the wrong sequence is wrong in the one way a
   * numbered list can be wrong, and a set comparison would call it green.
   *
   * ⚠ THE SECOND HALF IS THE PART THAT IS NOT A TYPED-TWICE COMPARISON. No row's
   * label may appear again INSIDE its own panel — that is `E275`'s duplication
   * rule, the same one that took the eyebrows off `/optimize`, and it is a
   * property of the render rather than of the data.
   */
  test("§30 each summary is its LEARN_STEPS label, in order, and no panel repeats it", async ({
    page,
  }) => {
    const rendered = (
      await page.locator("summary.stepd-sum .stepd-t").allTextContents()
    ).map((t) => t.trim());
    expect(rendered).toEqual(LEARN_STEPS.map((s) => s.summary));

    /*
      ⚠⚠ REWRITTEN BY `P1-J0-E305`, NOT RELAXED — READ WHY BEFORE "RESTORING" IT.

      It used to assert a panel's text NEVER contains its own row label, which was
      `E275`'s duplication rule. `E305` gave every panel `/optimize`'s format, whose
      first element is an eyebrow reading `STEP N - <THE ROW LABEL>`. The label now
      appears inside the panel BY DESIGN, so the old form was asserting the absence of
      the thing Scott asked for.

      ⚠ `E275` IS NOT VIOLATED. That row was about printing a `Step N - ` prefix INSIDE
      a label that already carried one — "1  Step 2 - Provide…". This eyebrow is a
      separate element from the summary and is exactly what `/optimize` draws.

      ⚠ SO THE ASSERTION MOVED UP A LEVEL AND GOT STRICTER: the eyebrow must be
      DERIVED — byte-equal to `Step {n} - {label}` — and the HEADLINE beneath must still
      not repeat the label. A hand-typed eyebrow and a self-restating headline both fail.
    */
    for (const [i, step] of LEARN_STEPS.entries()) {
      const panel = page
        .locator("details.stepd-d")
        .nth(i)
        .locator(".stepd-panel");

      const eyebrow = (
        (await panel.locator("p").first().textContent()) ?? ""
      ).trim();
      expect(
        eyebrow,
        `row ${step.n}'s eyebrow must be derived from its label, not typed`,
      ).toBe(`Step ${step.n} - ${step.summary}`);

      const headline = (
        (await panel.locator("h2").first().textContent()) ?? ""
      ).replace(/\s+/g, " ");
      expect(
        headline.includes(step.summary),
        `row ${step.n}'s HEADLINE reprints its own label "${step.summary}" (E275)`,
      ).toBe(false);

      /* ⚠ AND NO PANEL CARRIES A BODY PARAGRAPH ANY MORE (`E305`). `/optimize`'s
         format has none; the moment one row has a paragraph the two pages have
         diverged again. */
      await expect(
        panel.locator("p.stepd-body"),
        `row ${step.n} grew a body paragraph back — E305 deleted all five`,
      ).toHaveCount(0);
    }

    /*
      ⚠⚠ ROW 3 IS ONE BLOCK NOW, AND THIS ASSERTION WAS INVERTED BY `P1-J0-E308`.

      It used to require TWO blocks. `E283` had merged a COURSE section and a LESSON
      section into one row and kept them visibly separate INSIDE the panel, precisely
      because collapsing them collapses a level this page was built to teach — and
      this assertion was the guard on that.

      ⚠ SCOTT COLLAPSED IT ANYWAY on 2026-08-24, into one sentence naming both, and
      removed `LessonShot` with it. So the guard now asserts the new shape: exactly
      one block, which is also what every other row has.

      ⚠ THE LEVEL THE OLD GUARD PROTECTED IS NOW PROTECTED ONLY BY THE SENTENCE —
      *"Courses and lessons explain..."* names both. That is weaker than two blocks
      and it is his call; it is reported rather than resisted.
    */
    await page.locator("summary.stepd-sum").nth(2).click();
    await expect(
      page.locator("details.stepd-d").nth(2).locator(".stepd-block"),
      "every row is a single block since E308 collapsed row 3",
    ).toHaveCount(1);
  });

  /**
   * BREAK 3 — put `"use client"` in `StepDisclosures.tsx` and this fails. ⚠ THIS
   * IS THE ONE THAT MATTERS: the shell is SHARED, so one directive reaches
   * `/optimize` and `/learn` at once.
   *
   * ⚠⚠ IT DOES **NOT** COST `/optimize` ITS `○`, AND THE BRIEF SAID IT WOULD.
   * Measured 2026-08-21 — the directive was added and `npm run build` printed
   * `○ /optimize` anyway, twice. Next prerenders client components; a route only
   * leaves `○` when it reads request-time data, which this one does not. The cost
   * is the JS bundle and the hydration — this component and its whole subtree
   * shipped to the browser to re-implement what `<details>` does with no script.
   * That is why the assertion below reads the FILE instead of the route table:
   * the route-mode proxy was tried and it does not fire.
   *
   * ⚠⚠ THE FIRST HALF IS A SOURCE ASSERTION, WHICH IS AGAINST THIS FILE'S WHOLE
   * PREMISE, AND IT IS DELIBERATE BECAUSE NO RUNTIME SIGNAL EXISTS. Two were
   * tried and both were dead ends: the build's route table does not move (above),
   * and Turbopack's dev chunks are named by DIRECTORY rather than by component,
   * so a client boundary is invisible in the served HTML and in the script tags —
   * verified against `/optimize`, not assumed. Reading the file is what is left.
   *
   * ⚠ THE SECOND HALF IS REAL RUNTIME. The five rows must be in the HTML THE
   * SERVER SENT, before any JavaScript runs. That is what a Server Component
   * buys, and a shell that started rendering its rows on the client would fail it
   * whatever the source said.
   */
  test("§31 the shared disclosure shell is a Server Component, and its rows are server-rendered", async ({
    page,
    request,
  }) => {
    const shell = readFileSync(
      join(process.cwd(), "src/components/marketing/StepDisclosures.tsx"),
      "utf8",
    );
    expect(
      /^\s*["']use client["']/m.test(shell),
      '"use client" in StepDisclosures.tsx spends /optimize\'s static render — nothing in it needs one',
    ).toBe(false);

    for (const url of ["/optimize", "/learn"]) {
      const html = await (await request.get(url)).text();
      for (const label of url === "/learn"
        ? LEARN_STEPS.map((s) => s.summary)
        : ["Select a Business Process"]) {
        expect(
          html,
          `${url} must send "${label}" in its server HTML`,
        ).toContain(label);
      }
    }
  });

  /**
   * BREAK 4 — restore `within 24 hours` to the tagline and this fails.
   *
   * ⚠ IT IS NOT A STRING BAN, IT IS AN SLA BAN. `b5f3923` put a HUMAN review gate
   * between passing a test and holding a credential, and there is no queue, no
   * timer and no alert behind it. Any duration attached to getting certified is a
   * promise nothing in the system keeps, so the pattern is matched rather than the
   * one phrase Scott happened to write.
   */
  test("§32 /learn attaches no turnaround time to getting certified", async ({
    page,
  }) => {
    const body = ((await page.locator("body").textContent()) ?? "").replace(
      /\s+/g,
      " ",
    );
    const sla =
      body.match(
        /within\s+\d+\s*(hours?|hrs?|days?|minutes?|business days?)/gi,
      ) ?? [];
    expect(
      sla,
      "there is no queue, no timer and no alert behind a certification SLA — see b5f3923",
    ).toEqual([]);
  });

  /**
   * ⚠⚠ REWRITTEN BY `P1-J0-E302` + `E304`, AND THE NEW SHAPE IS "NEVER TWO", NOT
   * "EXACTLY ONE".
   *
   * This asserted `/learn` states exactly ONE duration — `E243`'s defect was two
   * numbers for one signup on one page. On 2026-08-24 Scott replaced BOTH strings
   * that carried the claim: the hero's second sentence became `Check out the steps
   * below to see how it works.` (`E302`) and the tagline became
   * `From courses to certification in hours...` (`E304`).
   *
   * ⚠⚠ SO `under 3 minutes` NOW APPEARS NOWHERE ON `/learn`, and he had asked for
   * it to be STRESSED earlier the same day (`E295`). THAT LOSS IS REPORTED, NOT
   * ASSERTED AWAY — and it is why this test does not simply flip to expecting zero.
   *
   * ⚠ THE INVARIANT THAT SURVIVES IS THE ONE WORTH GUARDING: the page must never
   * state two DIFFERENT durations for one signup. Zero is allowed (today's state,
   * flagged); one is allowed (if he puts it back); two is `E243` and fails. Writing
   * it as "exactly zero" would make restoring his own claim a test failure.
   */
  test("§33 /learn never states two different signup durations", async ({
    page,
  }) => {
    const body = ((await page.locator("body").textContent()) ?? "").replace(
      /\s+/g,
      " ",
    );
    const durations = new Set(
      (body.match(/\b\d+\s*minutes?\b/gi) ?? []).map((m) =>
        m.replace(/\s+/g, " ").toLowerCase(),
      ),
    );
    expect(
      [...durations].length,
      "one signup, one duration — E243. Two different times on one page is the defect.",
    ).toBeLessThanOrEqual(1);

    /* The eyebrow and the promoted headline are the page's, from their one source. */
    await expect(
      page.getByText(LEARN_SPINE_HEADING, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(LEARN_SPINE_TAGLINE, { exact: true }),
    ).toBeVisible();
  });
});

/**
 * `/learn`'s HERO AND ITS HOW-IT-WORKS BLOCK (`P1-J0-E289`..`E296`, walk 2).
 *
 * ⚠ THESE FOUR GUARD THINGS SCOTT ASKED FOR THAT ARE EASY TO LOSE SILENTLY: a
 * graphic he had removed on purpose, a second CTA he explicitly kept, and five
 * labels that a DIFFERENT UNFIRED BRIEF still wants to overwrite.
 */
test.describe("/learn — walk 2: the hero and the how-it-works block", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/learn");
  });

  /**
   * ⚠ `P1-J0-E292`. `SixStepShot` used to render between the tagline and row 1 and
   * was pushing the five rows below the fold — Scott: *"it gets the accordion in
   * the main page and instantly visible."* Removing it was the objective.
   *
   * ⚠ THE ASSERTION IS GEOMETRIC, NOT BY SELECTOR. A test for "no `<SixStepShot>`"
   * would pass the moment somebody drops a DIFFERENT illustration into the same
   * gap, which is the same mistake in the same place. This asserts NO image of any
   * kind occupies the band between the tagline and the first row.
   */
  test("§34 nothing renders between the how-it-works tagline and row 1", async ({
    page,
  }) => {
    const tagline = page.getByText(LEARN_SPINE_TAGLINE, { exact: true });
    await expect(tagline).toBeVisible();

    const band = await page.evaluate((tagline) => {
      /* ⚠ `p, h2` BECAUSE `E304` PROMOTED THE TAGLINE FROM SUB-COPY TO THE BLOCK'S
         DISPLAY HEADLINE. It used to be a <p>; searching only <p> silently found
         nothing and the test passed its own null check instead of measuring. */
      const ps = [...document.querySelectorAll("p, h2")];
      const TAGLINE_HEAD = tagline;
      const tag = ps.find((e) => e.textContent?.trim() === TAGLINE_HEAD);
      const row1 = document.querySelector("li.stepd-item");
      if (!tag || !row1) return null;
      const top = tag.getBoundingClientRect().bottom;
      const bottom = row1.getBoundingClientRect().top;
      /* Every drawn thing on the page, then keep only what sits in the gap. */
      const drawn = [
        ...document.querySelectorAll("img, svg, canvas, picture, video"),
      ].filter((e) => {
        const r = e.getBoundingClientRect();
        return r.height > 4 && r.top >= top - 1 && r.bottom <= bottom + 1;
      });
      return {
        gap: Math.round(bottom - top),
        found: drawn.map((e) => e.tagName.toLowerCase()),
      };
    }, LEARN_SPINE_TAGLINE);
    expect(band, "tagline or row 1 not found").not.toBeNull();
    expect(
      band!.found,
      `an image is back in the gap between the tagline and row 1 (E292/E284/E293) — gap ${band!.gap}px`,
    ).toEqual([]);
  });

  /**
   * ⚠ `P1-J0-E284` CLOSED BY REMOVAL, AND THIS IS WHAT KEEPS IT CLOSED. The drawn
   * graphic numbered SIX steps on a page that lists five. The five rows carry
   * numerals 1-5, so the assertion is that no numbered sequence on this page
   * reaches 6 — which a restored six-step drawing would, wherever it was put.
   */
  test("§35 no numbered six-step sequence exists anywhere on /learn", async ({
    page,
  }) => {
    const numerals = await page.evaluate(() => {
      /* The disclosure numerals are the only legitimate numbered sequence here. */
      const rows = [...document.querySelectorAll(".stepd-n")].map((e) =>
        e.textContent?.trim(),
      );
      /* Any OTHER element whose entire text is a lone 1-9, anywhere on the page. */
      const stray = [...document.querySelectorAll("body *")]
        .filter(
          (e) => !e.classList.contains("stepd-n") && e.children.length === 0,
        )
        .map((e) => e.textContent?.trim() ?? "")
        .filter((t) => /^[1-9]$/.test(t));
      return { rows, stray };
    });
    expect(numerals.rows, "the five disclosure numerals").toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
    expect(
      numerals.stray.includes("6"),
      "something on /learn numbers a step 6 again — E284 closed by removing the six-step drawing",
    ).toBe(false);
  });

  /**
   * ⚠ BOTH BUTTONS AND THE FOOTNOTE. Scott, 2026-08-24: *"The two buttons that you
   * have there are great. keep those...add the rest."*
   *
   * ⚠ THIS IS A DIVERGENCE FROM `/optimize`, WHICH HAS ONE CTA, AND THE GUARD
   * EXISTS BECAUSE IT LOOKS LIKE DRIFT. Anybody "aligning" the two heroes would
   * delete `Browse the catalog` and the footnote with it — and the footnote is the
   * only place the page says what works without an account.
   */
  test("§36 the hero keeps both CTAs and the signed-out footnote", async ({
    page,
  }) => {
    const hero = page
      .locator("h1")
      .first()
      .locator("xpath=ancestor::section[1]");
    await expect(
      hero.getByRole("link", { name: "Create your free account" }),
    ).toBeVisible();
    await expect(
      hero.getByRole("link", { name: "Browse the catalog" }),
    ).toBeVisible();
    /*
      ⚠⚠ INVERTED BY `P1-J0-E301`. THIS USED TO ASSERT THE FOOTNOTE IS VISIBLE.

      Scott, 2026-08-24: *"remove this text. messes the feel."* The line read
      *"Browsing works signed out. Paths, progress, certificates and instructors need
      an account."* — and `E291` had kept it specifically because it was the only
      place the page said what works without an account.

      ⚠ IT IS NOW ASSERTED ABSENT, because he reversed himself within the hour and a
      DIFFERENT reworded version was drafted and killed too. Neither may ship.

      ⚠ THE PAGE NOW TELLS A SIGNED-OUT VISITOR NOTHING about what needs an account,
      and `Browse the Catalog` points at `/learn/courses`, which renders
      "This area is coming soon." — measured, reported, not fixed here.
    */
    await expect(
      page.getByText("Browsing works signed out", { exact: false }),
      "E301 deleted the signed-out footnote — neither version may return",
    ).toHaveCount(0);

    /*
      ⚠ AND THE TWO COLUMNS ARE REAL ABOVE 900, not a one-column grid that happens
      to look right. `HeroTwoUp` breaks at min-[901px] to match `home.css`'s hero,
      whose `max-width:900px` collapse INCLUDES 900.
    */
    const cols = await page.evaluate(() => {
      const h1 = document.querySelector("h1");
      const row = h1?.parentElement?.parentElement;
      return row
        ? getComputedStyle(row).gridTemplateColumns.split(" ").length
        : 0;
    });
    expect(cols, "the hero is two columns at 1280 wide").toBe(2);
  });

  /**
   * ⚠⚠ THIS ONE GUARDS AGAINST A BRIEF, NOT AGAINST A BUG.
   *
   * `P1-J0-E296` settled these five labels on 2026-08-24 and SUPERSEDED
   * `P1-J0-E287` in `brief_step_summaries_short_2026-08-24.md`, which is written
   * and unfired. If that brief runs later it will try to revert them. Its Learn
   * table has been corrected in the same commit — this asserts the outcome either
   * way, so the labels cannot regress silently even if a stale copy is followed.
   *
   * ⚠ `Get Certified!` KEEPS ITS EXCLAMATION. It is the only terminal punctuation
   * in the set and it is deliberate; the other four carry none, because what Scott
   * typed was prose punctuation in a sentence, not label punctuation.
   */
  test("§37 the five row labels are E296's, in order, with no terminal periods", async ({
    page,
  }) => {
    const rendered = (
      await page.locator("summary.stepd-sum .stepd-t").allTextContents()
    ).map((t) => t.trim());
    expect(rendered).toEqual(LEARN_STEPS.map((s) => s.summary));
    /*
      ⚠ `Get Expert Support` REPLACED `Tell Your Peers` (`P1-J0-E322`), AND THAT ROW
      SUPERSEDES TWO THAT RECORDED THE OLD LABEL AS SETTLED — `E296` and `E310`. The
      literal list is updated deliberately, in the same commit, which is exactly the
      procedure this assertion's own note prescribes for a real relabel.

      ⚠ IT ALSO CLOSED THE `E296` MISMATCH BY MOVING CONTENT, NOT COPY: step 5's
      certificate sentence folded UP into step 4, where issued/verified/published is
      one idea, and step 5 got a support panel that matches its label.
    */
    expect(rendered).toEqual([
      "Enroll in a Learning Path",
      "Connect with the Instructor",
      "Watch the Courses and Lessons",
      "Get Certified!",
      "Get Expert Support",
    ]);
    for (const label of rendered) {
      expect(
        label.endsWith("."),
        `"${label}" took a terminal period — labels do not carry one`,
      ).toBe(false);
    }
    expect(
      rendered.filter((l) => l.endsWith("!")),
      "exactly one label carries emphasis",
    ).toEqual(["Get Certified!"]);
  });

  /**
   * ── ⚠⚠ THE TERMINAL PERIOD IS GONE, AND SCOTT REVERSED HIMSELF (`P1-J0-E320`) ─
   *
   * This asserted the `/learn` `<h1>` ENDS IN A PERIOD. `P1-J0-E289` was Scott's own
   * request for one on this exact headline, and `E313` added it on that basis. He
   * then typed `Go from Zero to Hero…and Stay There` with no period, so the
   * assertion now asserts the opposite of what it was written for.
   *
   * ⚠ IT IS NOT DELETED, BECAUSE THE UNDERLYING QUESTION IS STILL OPEN. `/`,
   * `/optimize` and `/hire-talent` have no terminal period; `/find-work` and the
   * three PLACEHOLDER heroes do. That is a template decision Scott gets to make
   * once, and until he does, the useful guard is that THIS page's headline matches
   * what he last typed — not that it carries punctuation he removed.
   *
   * ⚠ SO IT ASSERTS THE STRING. A relabel is then a deliberate edit here, in the
   * same commit, which is the same procedure §37 uses for the row labels.
   */
  test("§38 the /learn h1 is the string Scott last typed", async ({ page }) => {
    const h1 = ((await page.locator("h1").first().textContent()) ?? "").trim();
    expect(h1, "the /learn h1 (E320)").toBe(
      "Go from Zero to Hero…and Stay There",
    );

    /*
      ⚠ AND IT CARRIES HIS ELLIPSIS AS A SINGLE CHARACTER, not three dots. Asserted
      separately because a prettier run or an editor's autocorrect turning `…` into
      `...` is a silent change to a verbatim string.
    */
    expect(
      h1.includes("…"),
      "his ellipsis is one character, not three dots",
    ).toBe(true);
    expect(h1.includes("..."), "three dots is not what he typed").toBe(false);
  });

  /**
   * ⚠⚠ THE FOOTER, GEOMETRICALLY (`P1-ALL-E013`).
   *
   * Scott, 2026-08-24: *"what is this? Guessing it is the footer and it is all goofed
   * up?"* The YouTube mark rendered 1440x1440 on `/learn`, filling the viewport.
   *
   * ── WHY THIS IS A GEOMETRIC GUARD AND NOT A SELECTOR ONE ─────────────────
   *
   * The cause was not the icon. Every rule `HomeFooter` needs is `.pm-home`-scoped
   * and `app/learn/layout.tsx` rendered it outside that scope AND without importing
   * `home.css` at all — so the grid, the chips and the background were unstyled too,
   * and the unsized `<svg>` (a `viewBox` and no intrinsic dimensions) simply expanded
   * to fill its parent. A test for `svg[width]` would have passed the next unsized
   * asset straight through.
   *
   * ⚠ SO IT ASSERTS THE SHAPE: nothing inside the footer exceeds a sane box, and the
   * footer's own grid is actually applied. Any future unsized asset — or a fourth
   * caller that forgets the scope — fails the same way.
   *
   * ⚠ ALL THREE PAGES, because the bug was visible on exactly one of them and that
   * asymmetry is what made it survive. `/` and `/optimize` were always correct.
   */
  test("§39 the footer renders sanely on every page that has one", async ({
    page,
  }) => {
    for (const url of ["/", "/optimize", "/learn"]) {
      await page.goto(url);
      const r = await page.evaluate(() => {
        const f = document.querySelector("footer");
        if (!f) return { missing: true } as const;
        const fh = f.getBoundingClientRect().height;
        const oversize = [...f.querySelectorAll("*")]
          .map((e) => {
            const q = e.getBoundingClientRect();
            return {
              tag: e.tagName.toLowerCase(),
              w: Math.round(q.width),
              h: Math.round(q.height),
            };
          })
          /*
            ⚠ THE THRESHOLD IS THE FOOTER'S OWN HEIGHT, NOT A CONSTANT. A first cut
            used a flat 420px and fired on `/` — the footer is 565px tall and its
            own column containers are legitimately taller than any constant I would
            have guessed. A descendant TALLER THAN ITS OWN FOOTER is the thing that
            cannot happen unless it escaped its box, which is exactly what E013 was:
            a 1440x1440 icon inside a footer that should have been 565 tall.
          */
          .filter((x) => x.h > fh + 1);
        const grid = getComputedStyle(
          f.querySelector(".foot") as HTMLElement,
        ).gridTemplateColumns;
        const svg = f.querySelector("svg")?.getBoundingClientRect();
        return {
          footH: Math.round(fh),
          oversize,
          grid,
          svg: svg
            ? `${Math.round(svg.width)}x${Math.round(svg.height)}`
            : "none",
        };
      });
      expect(r.missing, `${url} has no footer`).toBeUndefined();
      expect(
        r.oversize,
        `${url}: something in the footer escaped its box — E013`,
      ).toEqual([]);
      /* ⚠ NOT VACUOUS: the footer's own grid must be APPLIED, which is what proves
         the stylesheet reached it. `none` is the unstyled state the bug shipped. */
      expect(
        r.grid,
        `${url}: the footer's grid is not applied — E013`,
      ).not.toBe("none");
      expect(r.svg, `${url}: the social icon is unsized — E013`).toBe("16x16");
    }
  });
});

/**
 * `/hire-talent` AND `/`'s MACRO SECTION — TALENT WALK 1 (`P1-J1-E011`..`E015`,
 * `P1-J0-E314`).
 */
test.describe("talent walk 1 — the seller page and /'s macro section", () => {
  /**
   * ⚠ THE FIVE LABELS ARE SCOTT'S FINAL SET (`P1-J1-E012`) and they superseded an
   * earlier draft in the same work stream — chat's `Connect with Experts and
   * Buyers` and `Create Service Products or Job Requests` both lost their buyer
   * half. A guard by literal is what stops the earlier draft creeping back.
   *
   * ⚠ AND THE PANELS MUST STAY EMPTY. `brief_talent_spine_panels` has not fired;
   * Scott has given labels only. A panel that grows a paragraph before he writes
   * one is chat's words in his product, which is the failure this asserts against.
   */
  test("§40 /hire-talent renders the five-step spine with derived panels", async ({
    page,
  }) => {
    await page.goto("/hire-talent");
    const rows = (
      await page.locator("summary.stepd-sum .stepd-t").allTextContents()
    ).map((t) => t.trim());
    expect(rows).toEqual(TALENT_STEPS.map((s) => s.summary));
    expect(rows).toEqual([
      "Join Panameer",
      "Learn New Skills",
      "Connect with Experts",
      "Create Service Products",
      "Sell Direct to Oracle Licensees",
    ]);

    for (const [i, step] of TALENT_STEPS.entries()) {
      const panel = page
        .locator("details.stepd-d")
        .nth(i)
        .locator(".stepd-panel");
      /* The eyebrow is DERIVED, exactly as on /optimize and /learn. */
      expect(
        ((await panel.locator("p").first().textContent()) ?? "").trim(),
        `step ${step.n}'s eyebrow must be derived, not typed`,
      ).toBe(`Step ${step.n} - ${step.summary}`);
      /*
        ⚠⚠ THIS HALF WAS INVERTED BY `P1-J1-E016`, WHICH IS THE BRIEF THAT FILLED
        THE PANELS. It used to require EXACTLY ONE element — the eyebrow — because
        Scott had given labels only and any second paragraph would have been chat
        copy in his product. He has now asked for the descriptions to be drafted.

        ⚠ SO IT ASSERTS THE NEW SHAPE, AND STILL BANS THE OLD DEFECT: exactly one
        `<h2>` carrying the description from `TALENT_STEPS`, and ZERO body
        paragraphs. `/learn`'s five bodies were deleted in `brief_learn_walk3`
        (`E305`); a body reappearing here is the same regression through a different
        door.
      */
      const h2s = panel.locator("h2");
      await expect(
        h2s,
        `step ${step.n} must carry exactly one description`,
      ).toHaveCount(1);
      expect(
        ((await h2s.first().textContent()) ?? "").trim(),
        `step ${step.n}'s description must come from TALENT_STEPS, not be typed here`,
      ).toBe(step.description);
      await expect(
        panel.locator("p.stepd-body"),
        `step ${step.n} grew a body paragraph — E305 banned them`,
      ).toHaveCount(0);
    }

    /*
      ⚠⚠ STEPS 3 AND 5 MUST HAVE NO GRAPHIC, AND THAT IS ASSERTED RATHER THAN LEFT
      TO A COMMENT (`P1-J1-E017`).

      A connections screen and a "your product sold" screen would both be pictures
      of software that does not exist — no `Connection`/`Conversation`/`Message`
      model, and `(app)/packages`, `(app)/services/offers`, `(app)/hire`,
      `(app)/search` all `ComingSoon` with no `Offer` model. ⚠ THE GAP IS THE
      HONEST STATE and this is what keeps somebody from filling it with a drawing.

      ⚠ AND STEPS 1, 2 AND 4 MUST HAVE ONE, or the assertion above would pass on a
      spine with no graphics at all.
    */
    const drawn = await page.evaluate(() =>
      [...document.querySelectorAll(".stepd-panel")].map(
        (e) => e.querySelectorAll("ul, dl, img, svg, canvas").length > 0,
      ),
    );
    expect(drawn, "steps 3 and 5 must ship with no graphic — E017").toEqual([
      true,
      true,
      false,
      true,
      false,
    ]);
  });

  /**
   * ⚠ THE BUYER FURNITURE IS GONE FROM THE SELLER PAGE (`P1-J1-E013`/`E014`).
   *
   * `Sell More than Just Your Resume` is seller copy, so the buyer eyebrow pill
   * (`For teams ready to hire`) and the Work-journey search box both came out.
   * ⚠ THE SEARCH BOX'S CAPTION — *"AI drafts your scoped Work Request"* — is what
   * made this read as the WORK page, which is the confusion Scott flagged.
   *
   * ⚠ `MarketingHero` IS NOT DELETED and still serves four other pages, so this
   * asserts absence on `/hire-talent` ONLY and non-vacuity on `/find-work`.
   */
  test("§41 /hire-talent drops the buyer pill and the Work-journey caption, keeps its control", async ({
    page,
  }) => {
    await page.goto("/hire-talent");
    /*
      ⚠⚠ THE SEARCH FORM IS ASSERTED PRESENT, NOT ABSENT, AND `E014`'s OWN
      CONDITION IS WHY. Scott: *"REMOVE the search box (unless it is a teaser to
      see sample profiles)."* The brief judged that unmeetable; it is met.
      Measured 2026-08-24: `/explore?mode=hire&q=oracle` returns 200 signed out and
      renders "22 experts found" with real provider cards, and this form posts
      exactly there. The `ComingSoon` routes the brief cited are all inside
      `(app)` — signed-in surfaces a visitor never reaches.

      ⚠ IT IS ALSO THE HERO'S ONLY CONTROL, and `check:app-shell`'s PUBLIC HERO
      guard requires one: *"the hero offers nothing to click"*. Removing it turned
      that guard red, and the alternatives were to weaken it or to invent a CTA
      Scott has not named. Neither was acceptable.

      ⚠ IF HE OVERRIDES AND WANTS IT GONE, this assertion flips — but only
      alongside a named CTA, or the app-shell guard fails again.
    */
    await expect(
      page.locator('form[action="/explore"]'),
      "the hero's only control — see the note above before removing it",
    ).toHaveCount(1);
    const text = await page.evaluate(() => document.body.innerText);
    expect(text, "the buyer eyebrow pill is back — E014").not.toContain(
      "For teams ready to hire",
    );
    expect(
      text,
      "the Work-Request caption is back — it is what made this read as /work",
    ).not.toContain("AI drafts your scoped Work Request");
    expect(text, "the seller headline must be present").toContain(
      "Sell More than Just Your Resume",
    );

    /*
      ⚠ `MarketingHero` IS UNTOUCHED AND STILL SERVES THE PAGES THAT USE IT.
      `/hire-talent` composes its own hero; the shared one was not edited, so a
      change Scott made to one page cannot leak to pages he did not walk.

      ⚠ THIS CHECK USED TO POINT AT `/find-work` AND WAS RE-HOMED BY `P1-J4-E001`,
      which gave that page its own `FindWorkHero` too. `MarketingHero`'s remaining
      callers are `/buy-services`, `/enterprise` and `/why-panameer`; `/enterprise`
      is used here. ⚠ THE ASSERTION IS UNCHANGED IN SUBSTANCE — it still proves the
      shared hero was REPLACED ON A PAGE rather than deleted.
    */
    await page.goto("/enterprise");
    await expect(
      page.locator('form[action="/explore"]'),
      "MarketingHero was edited or deleted rather than left alone",
    ).toHaveCount(1);
    await expect(
      page.getByText("For teams ready to hire", { exact: false }),
      "the buyer pill must still exist where it belongs",
    ).toHaveCount(0);
  });

  /**
   * ⚠ `/`'s MACRO SECTION (`P1-J0-E314`), AND THE HONEST-TENSE GUARD WITH IT.
   *
   * The section's whole defensibility is that every line describes what a
   * provider can BUILD, never what a buyer can PURCHASE — `(app)/packages`,
   * `(app)/services/offers`, `(app)/hire` and `(app)/search` are all `ComingSoon`
   * and there is no `Offer` model.
   *
   * ⚠ SO THE BUYER-VERB BAN IS ASSERTED, NOT JUST THE SECTION'S PRESENCE. A future
   * edit that tightens the copy by dropping the development note, or that adds
   * "buyers order it", turns a positioning claim into a false one.
   */
  test("§42 / renders the macro section, and it makes no buyer-side promise", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator(".owtw-row")).toHaveCount(4);

    /* ⚠ THE NUMERAL IS A FIXED-WIDTH DISC. This is the `.sd-n` bug (`5d50135`)
       asserted against: a bare class lost to a `.pm-home ` one and the disc came
       out glyph-width. */
    const numW = await page
      .locator(".owtw-n")
      .first()
      .evaluate((e) => Math.round(e.getBoundingClientRect().width));
    expect(numW, "the numeral disc must not size to its glyph").toBe(30);

    const section = ((await page.locator(".owtw-grid").textContent()) ?? "")
      .replace(/\s+/g, " ")
      .toLowerCase();
    for (const banned of [
      "buy ",
      "purchase",
      "checkout",
      "order it",
      "hire them",
      "add to cart",
    ]) {
      expect(
        section.includes(banned),
        `the stack cannot be bought yet — "${banned}" is a buyer-side promise`,
      ).toBe(false);
    }

    /* ⚠ AND THE LIMIT MUST BE STATED. Deleting it is how the section becomes a lie. */
    await expect(
      page.locator(".owtw-note"),
      "the in-development note is what keeps the four rows defensible",
    ).toContainText(/still in development/i);

    /* ⚠ LINKEDIN IS NOT NAMED. Scott's framing names it; the page deliberately
       does not — a competitor's name in marketing copy is a risk he did not ask
       us to take. */
    const body = await page.evaluate(() => document.body.innerText);
    expect(
      /linkedin/i.test(body),
      "/ must not name a competitor — E314 records this decision",
    ).toBe(false);
  });
});

/**
 * PHASE B — SECTIONS LEAVE `/hire-talent` (`P1-J1-E020`, `P1-J1-E022`).
 */
test.describe("talent relocations — what left /hire-talent", () => {
  /**
   * ⚠ `ErpPunchout` MOVED TO `/enterprise` AND MUST BE ON EXACTLY ONE PAGE.
   * Scott: *"This needs to be moved to INTEGRATE."* Asserting both halves, because
   * a half-done move — added there, still here — is the state that looks fine on
   * whichever page you happen to open.
   */
  test("§43 ErpPunchout renders on /enterprise and not on /hire-talent", async ({
    page,
  }) => {
    await page.goto("/enterprise");
    await expect(page.locator("#punchout")).toHaveCount(1);
    await page.goto("/hire-talent");
    await expect(
      page.locator("#punchout"),
      "ErpPunchout moved to /enterprise — E020",
    ).toHaveCount(0);

    /*
      ⚠ AND THE FOOTER LINK FOLLOWS IT. `brand.txs`'s "Services Punch-Out" pointed
      at `/hire-talent#punchout`; the fragment left with the section, so the link
      was repointed in the same commit. Same defect class as the dead
      `/optimize#spine-step-N` fragments — a fragment whose target moved.
    */
    const href = await page
      .getByRole("link", { name: "Services Punch-Out" })
      .first()
      .getAttribute("href");
    expect(href, "the footer link must follow the section it targets").toBe(
      "/enterprise#punchout",
    );
  });

  /**
   * ⚠⚠ `FourBeats` AND `ClosingCta` ARE OFF `/hire-talent` (`E022`), AND BOTH MUST
   * STILL EXIST ELSEWHERE — `E164`. Scott: *"REMOVE both of these."*
   *
   * ⚠ THE NON-VACUITY HALF IS THE POINT: both components still serve `/find-work`,
   * so this cannot pass by them having been deleted rather than removed from a page.
   */
  test("§44 FourBeats and ClosingCta are off /hire-talent but alive on /find-work", async ({
    page,
  }) => {
    await page.goto("/hire-talent");
    const text = await page.evaluate(() => document.body.innerText);
    expect(text, "FourBeats is back on /hire-talent — E022").not.toContain(
      "How hiring works here",
    );
    expect(text, "ClosingCta is back on /hire-talent — E022").not.toContain(
      "Describe what you need",
    );

    await page.goto("/find-work");
    const work = await page.evaluate(() => document.body.innerText);
    expect(
      work.length,
      "/find-work must still render — the components were removed from a page, not deleted",
    ).toBeGreaterThan(500);
  });
});

/**
 * PHASE C — `/find-work` BECOMES THE BUYER'S PAGE (`P1-J4-E001`..`E006`).
 */
test.describe("work walk 1 — the buyer's page", () => {
  /**
   * ⚠ THE FIVE LABELS ARE BUYER VERBS: Create · Accept · Release · Approve · Pay.
   * That is what makes it one person's journey rather than a system diagram, and it
   * is the audience flip applied consistently. A step whose verb belongs to the
   * PROVIDER or to PANAMEER would break the whole point, so the literal list is
   * asserted alongside the module.
   *
   * ⚠⚠ ONE OF FIVE IS BUILT. Step 1 is a real wizard writing real `DRAFT` rows;
   * steps 2-5 have NO model at all — no `Proposal`, no `Offer`, no `WorkOrder`, no
   * `SettlementRequest`, no `Invoice`, no `Payment` — and `WorkRequest.status` never
   * advances past `POSTED`. Shipped because outstanding parts gate promotion, not
   * the build; steps 2-5 are on the pre-launch list as a BLOCK.
   */
  test("§45 /find-work renders the five buyer steps with derived panels", async ({
    page,
  }) => {
    await page.goto("/find-work");
    const rows = (
      await page.locator("summary.stepd-sum .stepd-t").allTextContents()
    ).map((t) => t.trim());
    expect(rows).toEqual(WORK_STEPS.map((s) => s.summary));
    expect(rows).toEqual([
      "Create Work Request",
      "Accept Proposal",
      "Release Work Order",
      "Approve Settlement Request",
      "Pay Panameer",
    ]);
    /* Scott's 3-4 word rule (`P1-J0-E286`): 3 / 2 / 3 / 3 / 2. */
    for (const r of rows) expect(r.split(/\s+/).length).toBeLessThanOrEqual(4);

    for (const [i, step] of WORK_STEPS.entries()) {
      const panel = page
        .locator("details.stepd-d")
        .nth(i)
        .locator(".stepd-panel");
      expect(
        ((await panel.locator("p").first().textContent()) ?? "").trim(),
        `step ${step.n}'s eyebrow must be derived, not typed`,
      ).toBe(`Step ${step.n} - ${step.summary}`);
      /*
        ⚠ INVERTED BY `P1-J4-E014`, WHICH IS THE BRIEF THAT FILLED THESE PANELS.
        It used to require exactly ONE node — the eyebrow — because Scott had given
        labels only. He then said *"you did not create suggested graphics and text
        for each step."* So each panel now carries exactly one `<h2>` from
        `WORK_STEPS`, and no body paragraph (`/learn`'s five were deleted in
        `brief_learn_walk3` and must not return through this door).
      */
      const h2s = panel.locator("h2");
      await expect(h2s, `step ${step.n} needs one description`).toHaveCount(1);
      expect(
        ((await h2s.first().textContent()) ?? "").trim(),
        `step ${step.n}'s description must come from WORK_STEPS, not be typed here`,
      ).toBe(step.description);
      await expect(
        panel.locator("p.stepd-body"),
        `step ${step.n} grew a body paragraph`,
      ).toHaveCount(0);
    }
  });

  /**
   * ⚠ `ThreeWays` AND `AiMatch` MOVED TO THE BUYER'S PAGE (`P1-J4-E005`), which
   * withdraws `P1-J1-E021`'s recommendation to RETIRE them — that was made because
   * the buyer's hiring story had no page. It has one now.
   *
   * ⚠ BOTH HALVES ASSERTED: a half-done move looks fine on whichever page you open.
   */
  test("§46 ThreeWays and AiMatch are on /find-work and not on /hire-talent", async ({
    page,
  }) => {
    await page.goto("/find-work");
    await expect(page.locator("#three-ways")).toHaveCount(1);
    await expect(page.locator("#ai-match")).toHaveCount(1);
    await page.goto("/hire-talent");
    await expect(
      page.locator("#three-ways"),
      "ThreeWays moved to /find-work — E005",
    ).toHaveCount(0);
    await expect(
      page.locator("#ai-match"),
      "AiMatch moved to /find-work — E005",
    ).toHaveCount(0);
  });

  /**
   * ⚠⚠ NO STAT ROW ON EITHER PAGE, AND THIS IS THE GUARD ON THAT.
   *
   * `P1-J1-E013` and `P1-J4-E001` both refused one: there is no honest count. The 85
   * `ProviderProfile` rows are SEED (`decisions-01.md` puts only the admin and three
   * experts in the protected set) and exactly ONE `Package` is published. A seed
   * count shipped as traction is the defect both rows already declined.
   *
   * ⚠ THE ROW IS ABSENT, NOT EMPTY. An empty row would read as a loading state.
   */
  /**
   * ⚠⚠ ONLY STEP 1 MAY CARRY A GRAPHIC (`P1-J4-E015`), AND THIS IS THE GUARD.
   *
   * Steps 2-5 have NO models — no `Proposal`/`Offer`, `WorkOrder`,
   * `SettlementRequest`, `Invoice` or `Payment`. A drawn "proposal accepted" card or
   * an "invoice paid" receipt is a claim STRONGER than the sentence above it,
   * because a reader takes a screenshot as evidence in a way they do not take prose.
   *
   * ⚠ THE FOUR ABSENCES ARE THE ANSWER, NOT A GAP. This is what stops someone
   * filling them in later because the row "looks empty".
   */
  test("§48 only the one built Work step carries a graphic", async ({
    page,
  }) => {
    await page.goto("/find-work");
    await page.evaluate(() =>
      document
        .querySelectorAll("details.stepd-d")
        .forEach((d) => d.setAttribute("open", "")),
    );
    const drawn = await page.evaluate(() =>
      [...document.querySelectorAll(".stepd-panel")].map(
        (e) => e.querySelectorAll("dl, ul, img, svg, canvas").length > 0,
      ),
    );
    expect(
      drawn,
      "steps 2-5 have no models; a drawn screen for them would be a false claim",
    ).toEqual([true, false, false, false, false]);
  });

  /**
   * ⚠ THE HERO HAS ONE JOB (`P1-J4-E009`..`E012`). Four things were removed because
   * they competed with the single action, and each would be easy to restore by
   * habit — the pill and the tags especially, since three sister pages have them.
   *
   * ⚠ THE CTA IS ALSO WHAT SATISFIES `check:app-shell`'s PUBLIC HERO GUARD. Removing
   * the search box left it as the hero's only control; deleting it too would turn
   * that guard red, which is the same dependency `/hire-talent` hit.
   */
  test("§49 /find-work's hero has exactly one job", async ({ page }) => {
    await page.goto("/find-work");
    const hero = page
      .locator("h1")
      .first()
      .locator("xpath=ancestor::section[1]");

    await expect(
      hero.getByRole("link", { name: "Create a Work Request" }),
      "the hero's only primary control — E010",
    ).toHaveCount(1);
    await expect(
      hero.locator("form"),
      "the search box posted mode=work and returned zero — E007 closed by removal",
    ).toHaveCount(0);
    const text = await hero.innerText();

    /*
      ⚠⚠ THIS ASSERTION WAS RE-HOMED, NOT WEAKENED (`P1-J4-E017`).

      It used to read `expect(text).not.toContain("Go Direct")` — a SUBSTRING
      standing in for "the pill is gone". `E017` makes `Go Direct` the second half
      of Scott's own `<h1>`, so the substring is now present ON PURPOSE and the
      proxy no longer expresses what it was protecting.

      ⚠ SO IT NOW ASSERTS THE PILL AS A THING RATHER THAN AS A WORD: the pill was
      a fully-rounded, filled, uppercase badge above the headline
      (`MarketingHero` still renders exactly that shape on four sister pages), and
      structure is what `E009` actually removed. The check got STRICTER — it now
      catches a pill carrying ANY text, where the old one only caught these two
      words.
    */
    const pills = await hero.evaluate(
      (el) =>
        [...el.querySelectorAll("*")].filter((n) => {
          const cs = getComputedStyle(n);
          const r = parseFloat(cs.borderTopLeftRadius);
          const bg = cs.backgroundColor;
          return (
            cs.textTransform === "uppercase" &&
            r >= 100 &&
            bg !== "transparent" &&
            !/rgba\(0, 0, 0, 0\)/.test(bg) &&
            (n.textContent || "").trim().length > 0
          );
        }).length,
    );
    expect(pills, "the GO DIRECT eyebrow pill — E009").toBe(0);

    /* And the headline that legitimately carries the phrase now — E017. */
    await expect(
      hero.locator("h1"),
      "Scott's own headline, double space normalised and terminal period added",
    ).toHaveText("Save Money. Go Direct.");

    expect(
      text,
      "the lockup conflicted with both five-step spines — E019 closed here",
    ).not.toContain("Learn. Connect. Create. Settle.");
    expect(text, "the résumé caption was provider copy — E009").not.toContain(
      "Drop your résumé",
    );
    await expect(
      hero.locator('a[href*="mode=work&q="]'),
      "the six tags filtered a search that no longer exists — E012",
    ).toHaveCount(0);
  });

  test("§47 neither seller nor buyer page ships a hero stat row", async ({
    page,
  }) => {
    for (const url of ["/hire-talent", "/find-work"]) {
      await page.goto(url);
      const inHero = await page.evaluate(() => {
        const h1 = document.querySelector("h1");
        const hero = h1?.closest("section");
        return hero ? hero.querySelectorAll("dl").length : -1;
      });
      expect(
        inHero,
        `${url} grew a hero stat row — no honest count exists`,
      ).toBe(0);
    }
  });

  /**
   * ── ⚠⚠ NOTHING COUNTED SECTIONS, SO A SECTION SHIPPED TWICE (`P1-J4-E016`) ──
   *
   * `aa28c0f` left `src/app/find-work/page.tsx` reading `<TwoPains /> <TwoPains />`
   * — on ONE line, separated by a space, which is why the diff read as the section
   * it replaced. `build`, `typecheck` and `lint` are all perfectly happy with a
   * second valid element. `P1-ALL-E014` was the same hole and shipped green too.
   *
   * ⚠ THIS DELIBERATELY DOES NOT HARD-CODE A LIST OF SECTIONS. A guard that names
   * the seven sections on this page is a guard that says nothing about the eighth.
   * Two page-wide invariants instead, both of which a pasted section breaks:
   *
   *   · NO DUPLICATE `id`. Half these sections carry one (`#pains`, `#monetization`,
   *     `#go-direct`, `#sequence`, `#three-ways`, `#ai-match`) and duplicate ids are
   *     invalid HTML besides — an in-page anchor lands on whichever came first.
   *   · NO REPEATED SECTION HEADING. That covers the ones with no id at all
   *     (`ProfileViz`, `AppShots`, `FourBeats`, `ClosingCta`).
   *
   * ⚠ RUN ON EVERY PUBLIC MARKETING PAGE, not just the one that was broken.
   */
  test("§50 no public page renders the same section twice", async ({
    page,
  }) => {
    for (const url of [
      "/",
      "/find-work",
      "/hire-talent",
      "/optimize",
      "/enterprise",
      "/buy-services",
      "/learn",
    ]) {
      await page.goto(url);

      const dupIds = await page.evaluate(() => {
        const seen = new Map<string, number>();
        for (const el of document.querySelectorAll("[id]")) {
          seen.set(el.id, (seen.get(el.id) ?? 0) + 1);
        }
        return [...seen]
          .filter(([, n]) => n > 1)
          .map(([id, n]) => `${id}×${n}`);
      });
      expect(dupIds, `${url} renders a duplicated element id — E016`).toEqual(
        [],
      );

      const dupHeads = await page.evaluate(() => {
        const seen = new Map<string, number>();
        for (const h of document.querySelectorAll("main h2, body > div h2")) {
          const t = (h.textContent || "").trim().toLowerCase();
          if (!t) continue;
          seen.set(t, (seen.get(t) ?? 0) + 1);
        }
        return [...seen].filter(([, n]) => n > 1).map(([t, n]) => `${t}×${n}`);
      });
      expect(
        dupHeads,
        `${url} renders the same section heading twice — E016`,
      ).toEqual([]);
    }
  });

  /**
   * ── ⚠⚠ THE 10.63MB THAT LOADED BEFORE ANYONE SCROLLED (`P1-J1-E018`) ───────
   *
   * Measured on `c962c56`, production build, DevTools Fast 3G: `/find-work` pulled
   * **11.01MB on first load, 10.63MB of it the four clips `VideoSequence` renders
   * BELOW THE FOLD**, first frames landing at 4.9s / 6.4s / 9.5s / 16.7s. The page
   * had no hero clip at all — the section nobody had reached cost more than a hero
   * would. After `LazyAutoplayVideo`: **0.39MB**.
   *
   * ⚠ THE GUARD IS IN TWO HALVES AND BOTH MATTER. "No bytes at load" alone is
   * satisfied by a broken video that never plays; "it plays" alone is satisfied by
   * the eager version this replaced.
   */
  test("§51 no clip downloads before it is approached, and every clip still plays", async ({
    page,
  }) => {
    for (const url of ["/find-work", "/hire-talent"]) {
      const clips = new Set<string>();
      const listener = (r: { url: () => string }) => {
        if (/\.mp4(\?|$)/.test(r.url())) clips.add(r.url().split("/").pop()!);
      };
      page.on("request", listener);

      await page.goto(url, { waitUntil: "load" });
      await page.waitForTimeout(1500);

      expect(
        [...clips],
        `${url} fetched video before the reader was anywhere near it — E018`,
      ).toEqual([]);

      const srcsAtLoad = await page.evaluate(() =>
        [...document.querySelectorAll("#sequence video")].map((v) =>
          v.getAttribute("src"),
        ),
      );
      expect(
        srcsAtLoad.length,
        `${url} lost the four-beat sequence entirely`,
      ).toBe(4);
      expect(
        srcsAtLoad.every((s) => s === null),
        `${url} shipped a src on a below-the-fold clip — E018`,
      ).toBe(true);

      /* ⚠ NOW WALK TO IT. A lazy clip that never arrives is a deleted clip. */
      await page.locator("#sequence").scrollIntoViewIfNeeded();
      await page.waitForFunction(
        () =>
          [...document.querySelectorAll("#sequence video")].every(
            (v) => (v as HTMLVideoElement).readyState >= 3,
          ),
        null,
        { timeout: 30_000 },
      );
      const playing = await page.evaluate(() =>
        [...document.querySelectorAll("#sequence video")].map((v) => {
          const el = v as HTMLVideoElement;
          return !el.paused && !el.ended && !!el.getAttribute("src");
        }),
      );
      expect(
        playing,
        `${url} left a clip loaded but not playing on approach`,
      ).toEqual([true, true, true, true]);

      page.off("request", listener);
    }
  });

  /**
   * ── ⚠⚠ THE HERO CLIP THAT WAS BUILT, MEASURED AND TAKEN BACK OUT (`E019`) ──
   *
   * Scott asked for a hero video. It was added via `HeroVideoBackdrop` exactly as
   * `/learn` and `/` do, and on a PRODUCTION build under Fast 3G the LCP element
   * became the `<video>` itself and the number went **1,636ms -> 5,772ms** at 1440,
   * 5,788 at 900, 5,616 at 390. The brief's stop condition is 4s at any width, so
   * it came out.
   *
   * ⚠ THE GUARD IS A BYTE BUDGET, NOT "NO VIDEO ALLOWED". It asserts this page
   * fetches NO media before a scroll — which is broken equally by re-adding
   * `panameer-office.mp4` to the hero and by undoing the lazy-load underneath it.
   * A future authorised hero clip SHOULD turn this red: that is the prompt to
   * re-measure, which is exactly what was missing the first time (`P1-J1-E011`,
   * where localhost showed LCP getting FASTER as bytes doubled).
   */
  test("§52 /find-work spends no media bytes before the reader scrolls", async ({
    page,
  }) => {
    let mediaBytes = 0;
    const seen: string[] = [];
    page.on("response", async (r) => {
      if (!/\.(mp4|webm|mov)(\?|$)/.test(r.url())) return;
      seen.push(r.url().split("/").pop()!);
      const len = Number(r.headers()["content-length"] ?? 0);
      mediaBytes += len;
    });

    await page.goto("/find-work", { waitUntil: "load" });
    await page.waitForTimeout(2000);

    expect(
      { seen, mediaBytes },
      "a hero clip or an eager sequence is back — RE-MEASURE LCP ON FAST 3G, E019",
    ).toEqual({ seen: [], mediaBytes: 0 });
  });
});

/**
 * ── ⚠⚠ THE FIFTH SPINE, AND THE FIRST WITH NOTHING BEHIND ANY STEP ─────────
 *
 * `/buy-services` (nav's `Shop`) replaced a hero whose kicker and `<h1>` literally
 * read `PLACEHOLDER — Shop` and `PLACEHOLDER — headline about packaged services
 * goes here.` on a top-level nav destination.
 */
test.describe("shop walk 1 — /buy-services", () => {
  /**
   * ⚠ ZERO OF FIVE STEPS ARE BUILT — no public `Package` listing, no `Offer`, no
   * `WorkOrder`, no `SettlementRequest`, no `Invoice`, no `Payment`. So EVERY panel
   * ships without a graphic, and that is the ANSWER rather than a gap
   * (`P1-J2-E005`). `/optimize` ships two empties and `/find-work` four; this page
   * ships five, and the guard exists so nobody fills one because a row "looks
   * empty".
   *
   * ⚠ IT ALSO ASSERTS THE PLACEHOLDERS ARE GONE. They were the loudest broken thing
   * on the public surface and they shipped for five days behind a nav item.
   */
  test("§53 /buy-services renders the five Shop steps, every panel graphic-free", async ({
    page,
  }) => {
    await page.goto("/buy-services");

    const body = await page.locator("body").innerText();
    expect(
      body,
      "the hero placeholders shipped on a nav destination",
    ).not.toContain("PLACEHOLDER");

    const rows = (
      await page.locator("summary.stepd-sum .stepd-t").allTextContents()
    ).map((t) => t.trim());
    expect(rows).toEqual(SHOP_STEPS.map((s) => s.summary));
    expect(rows).toEqual([
      "Shop Service Products",
      "Make Offer to Buy",
      "Accept Work Order",
      "Approve Payment Request",
      "Pay Panameer",
    ]);
    /* Scott's 3-4 word rule (`P1-J0-E286`): 3 / 4 / 3 / 3 / 2. */
    for (const r of rows) expect(r.split(/\s+/).length).toBeLessThanOrEqual(4);

    for (const [i, step] of SHOP_STEPS.entries()) {
      const panel = page
        .locator("details.stepd-d")
        .nth(i)
        .locator(".stepd-panel");
      expect(
        ((await panel.locator("p").first().textContent()) ?? "").trim(),
        `step ${step.n}'s eyebrow must be derived, not typed`,
      ).toBe(`Step ${step.n} - ${step.summary}`);
      const h2s = panel.locator("h2");
      await expect(h2s, `step ${step.n} needs one description`).toHaveCount(1);
      expect(
        ((await h2s.first().textContent()) ?? "").trim(),
        `step ${step.n}'s description must come from SHOP_STEPS, not be typed here`,
      ).toBe(step.description);
    }

    /* ⚠ FIVE EMPTIES. Same probe §48 uses on /find-work. */
    await page.evaluate(() =>
      document
        .querySelectorAll("details.stepd-d")
        .forEach((d) => d.setAttribute("open", "")),
    );
    const drawn = await page.evaluate(() =>
      [...document.querySelectorAll(".stepd-panel")].map(
        (e) => e.querySelectorAll("dl, ul, img, svg, canvas").length > 0,
      ),
    );
    expect(
      drawn,
      "zero of five Shop steps are built; any drawn screen here is a picture of software that does not exist",
    ).toEqual([false, false, false, false, false]);
  });

  /**
   * ── ⚠⚠ `Start Shopping Now` HAS NOWHERE TO GO (`P1-J2-E002`) ───────────────
   *
   * Checked live, signed out, rather than assumed: `(app)/packages` and
   * `(app)/services/offers` are `ComingSoon` AND 307 to `/login`;
   * `(app)/providers/[id]` — the ONLY page in the app that renders a published
   * `Package` — also 307s; `/explore` lists PEOPLE. `P1-J0-E316` is explicit that a
   * primary CTA landing on a `ComingSoon` is worse than no CTA.
   *
   * ⚠ SO IT SHIPS DISABLED, AND THIS GUARD IS WHAT MAKES THAT A DECISION RATHER
   * THAN A DRIFT: the day someone gives it an `href`, this turns red and the
   * destination has to be justified. It is not "no link allowed" — it is "prove the
   * catalog exists first".
   *
   * ⚠ AND IT MUST STAY A REAL CONTROL. `check:app-shell`'s PUBLIC HERO guard counts
   * `a[href], button, input` with real size; an `<a>` with no href would satisfy
   * neither that guard nor a keyboard.
   */
  test("§54 the Shop hero's button is a real control with no false destination", async ({
    page,
  }) => {
    await page.goto("/buy-services");
    const hero = page
      .locator("h1")
      .first()
      .locator("xpath=ancestor::section[1]");

    const btn = hero.getByRole("button", { name: "Start Shopping Now" });
    await expect(
      btn,
      "the hero must offer something — check:app-shell",
    ).toHaveCount(1);
    const box = await btn.boundingBox();
    expect(box?.width ?? 0, "a 0-size control is a hidden one").toBeGreaterThan(
      40,
    );

    await expect(
      hero.locator("a[href]"),
      "Start Shopping Now was given a destination — prove a PUBLIC package listing exists first (E002)",
    ).toHaveCount(0);
  });

  /**
   * ── ⚠⚠ ONE HEADLINE, ONE PAGE ─────────────────────────────────────────────
   *
   * `Deploy Faster. With Less Risk.` was `/find-work`'s (`P1-J4-E003`) until
   * `P1-J4-E017` replaced it there and `P1-J2-E001` moved it here. ⚠ RUN THOSE TWO
   * BRIEFS OUT OF ORDER AND THE SAME HEADLINE SITS ON TWO PAGES — which is a defect
   * nobody sees, because each page looks correct on its own.
   *
   * ⚠ ASSERTED ACROSS EVERY PUBLIC PAGE AND AS A COUNT, not as "it is on
   * /buy-services". Both halves matter: exactly one, and the right one.
   */
  test("§55 Deploy Faster. With Less Risk. renders on exactly one page", async ({
    page,
  }) => {
    const HEADLINE = "Deploy Faster. With Less Risk.";
    const hits: string[] = [];
    for (const url of [
      "/",
      "/find-work",
      "/hire-talent",
      "/buy-services",
      "/optimize",
      "/enterprise",
      "/learn",
      "/why-panameer",
    ]) {
      await page.goto(url);
      if ((await page.locator("body").innerText()).includes(HEADLINE)) {
        hits.push(url);
      }
    }
    expect(hits, "the moved headline is on the wrong number of pages").toEqual([
      "/buy-services",
    ]);
  });
});

/**
 * ── ⚠⚠ WHO LEARN IS SOLD TO — THREE SAVE, ONE MAKE (`P1-J0-E311`) ──────────
 *
 * Scott: *"3 can SAVE money, one can MAKE money."* ⚠ THE SPLIT IS THE SECTION'S
 * WHOLE IDEA and the brief forbids flattening it into four identical cards — so
 * the assertion is not "four rows exist", it is "four rows and EXACTLY ONE of them
 * is the MAKE side". A fourth SAVE card, or a second MAKE row, is the failure this
 * catches.
 */
test.describe("home — the four audiences LEARN is sold to", () => {
  test("§56 / renders four audience rows, exactly one on the MAKE side", async ({
    page,
  }) => {
    await page.goto("/");

    const rows = page.locator("[data-aud-side]");
    await expect(rows, "four parties, no more and no fewer").toHaveCount(4);

    const sides = await rows.evaluateAll((els) =>
      els.map((e) => e.getAttribute("data-aud-side")),
    );
    expect(
      sides.filter((s) => s === "make").length,
      "exactly one party MAKES money — three SAVE",
    ).toBe(1);
    expect(
      sides.filter((s) => s === "save").length,
      "the other three SAVE",
    ).toBe(3);

    /*
      ⚠ THE MAKE ROW MUST NOT BE INSIDE THE SAVE GRID. That is how "three, then one
      that is different" gets quietly flattened into a 2×2 — the markup would still
      report 4 rows and 1 make, and the idea would be gone.
    */
    const flattened = await page.evaluate(() => {
      const make = document.querySelector('[data-aud-side="make"]');
      return !!make?.closest(".aud-grid");
    });
    expect(
      flattened,
      "the MAKE row was moved into the SAVE grid — the split is structural, not a chip",
    ).toBe(false);

    /*
      ⚠⚠ THE RETAINER STOP, ASSERTED. `1-2 hours a month` and any retainer price
      are absent because NOTHING is built — zero `Conversation`/`Message` models, no
      booking, no scheduling, and `/messages` ships a disabled composer
      (`P1-J3-E014`). This is the half of the row that could not ship, so it is the
      half a future edit is most likely to restore.
    */
    const section = await page
      .locator("section.sd")
      .filter({ hasText: "One can make money" })
      .first()
      .innerText();
    for (const banned of [
      "1-2 hours",
      "1–2 hours",
      "hours a month",
      "retainer",
      "/month",
      "per month",
    ]) {
      expect(
        section.toLowerCase(),
        `the platform neither sells, schedules nor bills a retainer — "${banned}" cannot ship here`,
      ).not.toContain(banned.toLowerCase());
    }

    /*
      ⚠ AND NO CERTIFICATE CLAIM. Read live 2026-08-24: 8 `LearnAssessment` rows,
      ALL `DRAFT` — 0 of 23 paths can be tested, so no certificate can be earned
      today (`P1-J3-E030`). The three SAVE lines lean on "free", which IS
      unconditionally true; a certificate line would not be.
    */
    expect(
      section.toLowerCase(),
      "0 of 23 paths have a sittable test — nothing here may promise a certificate",
    ).not.toContain("certif");

    /* ⚠ NO INVENTED SAVINGS FIGURE. The brief forbids one for all three SAVE
       parties, and the simplest guard is that the section carries no currency at
       all. */
    expect(
      section,
      "no savings figure may be invented for any of the three SAVE parties",
    ).not.toMatch(/[$€£]\s?\d/);
  });

  /**
   * ⚠ THE SELF-IDENTIFICATION TEST, ENFORCED (`positioning_decision.md`,
   * 2026-08-24). Two of Scott's four party names FAIL it and a third is flagged,
   * with the instruction *"FIX BEFORE THE HOME SECTION IS BUILT"* attached to this
   * row. The labels shipped are the test's own replacements — so the guard is that
   * the failing ones never come back as page copy.
   *
   * ⚠ THEY REMAIN CORRECT AS INTERNAL VOCABULARY. This asserts the rendered
   * SECTION, not the codebase.
   */
  test("§57 no audience label is Panameer's word for the audience", async ({
    page,
  }) => {
    await page.goto("/");
    const section = (
      await page
        .locator("section.sd")
        .filter({ hasText: "One can make money" })
        .first()
        .innerText()
    ).toLowerCase();

    for (const jargon of ["external contact", "end-user", "end user"]) {
      expect(
        section,
        `"${jargon}" is a label from inside the system — nobody uses it about themselves`,
      ).not.toContain(jargon);
    }
    /* `student` is the flagged-not-failed one: nobody here calls themselves one. */
    expect(
      section,
      '"student" as an AUDIENCE LABEL — Scott\'s own row-4 sentence may say it, a heading may not',
    ).not.toMatch(/^\s*\w*students?\b/m);
  });
});
