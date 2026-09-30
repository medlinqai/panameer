import { test, expect } from "@playwright/test";
import { signIn } from "../e2e-shell/_auth";
/* ⚠ STATIC import — a dynamic one is transformed to CJS require and throws at run time. */
import { db } from "../e2e-shell/_db";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * ── ⚠⚠⚠ `E716` — THE DOOR PROOF (rule 5) ─────────────────────────────────────
 *
 * ⚠ **REMOVING `What's Missing or Incomplete?` REMOVES AN ENTRANCE**, and rule 5 is explicit:
 * *"REMOVING A CARD CAN REMOVE A CAPABILITY'S ONLY ENTRANCE… a link that exists only behind a
 * flip is a hidden door."* ⚠⚠ So the replacement is not assumed to work — it is measured.
 *
 * ⚠⚠⚠ **THE BEFORE HREF IS WRITTEN TO DISK BY THE `before` RUN AND READ BACK BY THE `after`
 * RUN.** The comparison is therefore between **two measurements**, never between a
 * measurement and a string I typed into the spec from memory. ⚠ A hard-coded expected value
 * would pass even if the button had always pointed somewhere else.
 *
 * ⚠ It then CLICKS the new link and asserts where it lands — because an `href` that matches
 * proves the markup, and only a navigation proves the door.
 */
const PHASE = process.env.E716_PHASE ?? "after";
const OUT = join(process.cwd(), "e2e-e716", "shots");
const RECORD = join(process.cwd(), "e2e-e716", "before-href.json");

test.beforeAll(() => mkdirSync(OUT, { recursive: true }));

test(`E716 ${PHASE} — the score door`, async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
  await signIn(page);
  await page.goto("/profile", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  const rail = page.locator(".pm-cp3-rail");

  if (PHASE === "before") {
    /* ⚠ Found by its TEXT, the way a member finds it — not by a test id that would survive
       the button being replaced by something unrelated. */
    const btn = rail.getByRole("link", { name: /Missing or Incomplete/i }).first();
    await expect(btn, "the button this brief removes must exist BEFORE").toHaveCount(1);
    const href = await btn.getAttribute("href");
    const styles = await btn.evaluate((el) => {
      const s = getComputedStyle(el);
      return { bg: s.backgroundColor, color: s.color, radius: s.borderRadius };
    });
    writeFileSync(RECORD, JSON.stringify({ href, styles }, null, 1));
    console.log(`\nE716 BEFORE  "What's Missing or Incomplete?" href = ${href}`);
    console.log(`E716 BEFORE  its style = ${JSON.stringify(styles)}`);
    await page.close();
    return;
  }

  /* ─────────────────────────── AFTER ─────────────────────────── */
  expect(existsSync(RECORD), "run E716_PHASE=before first — nothing to compare against").toBe(
    true
  );
  const before = JSON.parse(readFileSync(RECORD, "utf8")) as {
    href: string;
    styles: { bg: string; color: string; radius: string };
  };

  /* ⚠⚠ THE BUTTON IS GONE — asserted, so "removed" is proved rather than reported. */
  await expect(
    rail.getByRole("link", { name: /Missing or Incomplete/i }),
    "the removed button is still on the page"
  ).toHaveCount(0);

  /* ⚠ The two new doors: the small-caps label and the items-left line. */
  const label = rail.getByRole("link", { name: /^Search Score$/i }).first();
  const items = rail.locator("[data-e716-items]").first();
  await expect(label, "the SEARCH SCORE label is not a link").toHaveCount(1);
  await expect(items, "the items-left line is not a link").toHaveCount(1);

  const labelHref = await label.getAttribute("href");
  const itemsHref = await items.getAttribute("href");
  const itemsText = (await items.innerText()).trim();

  console.log(`\nE716 AFTER   recorded BEFORE href  = ${before.href}`);
  console.log(`E716 AFTER   items-left link href   = ${itemsHref}   "${itemsText}"`);
  console.log(`E716 AFTER   SEARCH SCORE label href = ${labelHref}`);

  /* ⚠⚠⚠ THE BRIEF'S OWN REQUIREMENT: the same destination the removed button had. */
  expect(itemsHref, "the items-left link does NOT go where the removed button went").toBe(
    before.href
  );
  expect(labelHref, "the SEARCH SCORE label does NOT go where the removed button went").toBe(
    before.href
  );

  /* ⚠ The secondary button inherited the removed one's style — solid ink, white text. */
  const others = rail.getByRole("link", { name: /How Others See My Profile/i }).first();
  const otherStyles = await others.evaluate((el) => {
    const s = getComputedStyle(el);
    return { bg: s.backgroundColor, color: s.color, radius: s.borderRadius };
  });
  console.log(`E716 AFTER   "How Others See My Profile" style = ${JSON.stringify(otherStyles)}`);
  console.log(`E716 AFTER   the removed button's style        = ${JSON.stringify(before.styles)}`);
  expect(otherStyles.bg, "it did not inherit the solid ink fill").toBe(before.styles.bg);
  expect(otherStyles.color, "it did not inherit the white text").toBe(before.styles.color);

  /* ⚠⚠⚠ AND IT ACTUALLY LANDS. An href proves the markup; only a navigation proves the door. */
  await items.click();
  await page.waitForURL(/\/community\/score/, { timeout: 30_000 });
  const landed = new URL(page.url()).pathname;
  const heading = (await page.locator("h1, h2").first().innerText().catch(() => "")).trim();
  console.log(`E716 AFTER   clicked the items-left line → landed on ${landed}  (“${heading}”)`);
  expect(landed).toBe(new URL(before.href, "http://localhost:3100").pathname);
  /* ⚠ A 404 also has a pathname, so the landing is asserted on CONTENT too — `E586`'s rule:
     a check that cannot fail is not a check. */
  const bodyText = (await page.locator("body").innerText()).toLowerCase();
  expect(bodyText.includes("not found"), "the door lands on a 404").toBe(false);
  await page.screenshot({ path: join(OUT, "after-landed-on-score.png") });

  await page.close();
});

/**
 * ── ⚠⚠⚠ THE OPEN STATE OF EVERY SECTION AT LOAD, BOTH PERSONAS ───────────────────────
 *
 * ⚠ **SCOTT: Skills, Specializations, Certifications, Education and Languages load CLOSED;
 * Work History and everything below it load OPEN. Same for the owner and the visitor.**
 * ⚠⚠ **THE VISITOR HALF IS NOT A FORMALITY:** `/providers/[id]` renders the SAME component,
 * and `open` is passed at one call site per section with no persona branch — but *"there is
 * no branch"* is an argument, and this is the measurement. `E713` shipped a rail whose
 * computed styles all passed while three cards still had borders.
 * ⚠⚠⚠ **IT ASSERTS, IT DOES NOT ONLY PRINT.** A test that logs a table and passes regardless
 * is `E586` wearing a report's clothing.
 */
const MUST_BE_CLOSED = ["skills", "specializations", "certifications", "education", "languages"];

async function sectionStates(page: import("@playwright/test").Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("details.pm-clean-sec")].map((d) => ({
      id: d.id || null,
      title: (d.querySelector("summary h2")?.textContent ?? "").trim(),
      open: (d as HTMLDetailsElement).open,
    }))
  );
}

test(`E716 ${PHASE} — open state at load, owner and visitor`, async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
  await signIn(page);

  await page.goto("/profile", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const owner = await sectionStates(page);
  console.log(`\n══ E716 ${PHASE} · OWNER /profile — open state at load ══`);
  for (const s of owner) console.log(`   ${s.open ? "OPEN  " : "closed"}  ${s.title}`);

  /*
    ── ⚠⚠⚠ THE VISITOR HALF IS MEASURED ON THE RICHEST PROFILE, NOT THE OWNER'S OWN ─────

    ⚠⚠ **MEASURED FIRST AND IT MATTERED:** the gate persona's public page renders **exactly
    ONE section** — a visitor is shown nothing where a section is empty (`E713`'s rule), and
    that provider has only Skills. ⚠⚠⚠ **SO "SAME FOR THE VISITOR" WOULD HAVE BEEN PROVED ON
    ONE CLOSED SECTION AND NO OPEN ONE** — an assertion that cannot distinguish the change
    from its opposite, which is `E586` wearing a passing test's clothing.
    ⚠ The profile with the most employers is used instead, so the visitor set contains BOTH a
    section that must close and a section that must stay open. Found at runtime; an id pasted
    into a spec rots the first time the data moves.
  */
  const rich = await db().providerProfile.findFirst({
    where: { employers: { some: {} } },
    select: { id: true },
    orderBy: { employers: { _count: "desc" } },
  });
  const href = rich
    ? `/providers/${rich.id}`
    : await page.evaluate(() => {
        const a = [...document.querySelectorAll("a")].find((x) =>
          /^\/providers\//.test(x.getAttribute("href") ?? "")
        );
        return a?.getAttribute("href") ?? null;
      });
  let visitor: Awaited<ReturnType<typeof sectionStates>> = [];
  if (href) {
    await page.goto(href, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    visitor = await sectionStates(page);
    console.log(`\n══ E716 ${PHASE} · VISITOR ${href} — open state at load ══`);
    for (const s of visitor) console.log(`   ${s.open ? "OPEN  " : "closed"}  ${s.title}`);
  }

  if (PHASE !== "before") {
    for (const set of [
      { name: "owner", rows: owner },
      { name: "visitor", rows: visitor },
    ]) {
      for (const row of set.rows) {
        const shouldClose = row.id != null && MUST_BE_CLOSED.includes(row.id);
        expect(
          row.open,
          `${set.name}: "${row.title}" should load ${shouldClose ? "CLOSED" : "OPEN"}`
        ).toBe(!shouldClose);
      }
    }
    /* ⚠ And the five were actually PRESENT to be closed — otherwise "all closed" is satisfied
       by a page that renders none of them (`E586`). */
    const ownerIds = owner.map((r) => r.id);
    for (const id of MUST_BE_CLOSED) {
      expect(ownerIds, `the owner's page never rendered "${id}" at all`).toContain(id);
    }
  }
  await page.close();
});

/**
 * ── ⚠⚠⚠ THE FOCUS RING — MOUSE vs KEYBOARD, MEASURED ─────────────────────────────────
 *
 * ⚠ **SCOTT: a clicked section title draws a heavy blue box; replace it with a thin ink
 * outline, keyboard only.** ⚠⚠ **THE TWO HALVES MUST BE MEASURED SEPARATELY OR THE FIX IS
 * INDISTINGUISHABLE FROM `outline: none`** — which would delete the keyboard user's only
 * indication of where they are, on a page whose sections are all reached by Tab.
 * ⚠⚠⚠ So this clicks one summary and reads its outline, then focuses another **by keyboard**
 * and reads that one. **The first must have no ring and the second must have an ink one.**
 */
test(`E716 ${PHASE} — focus ring: none on click, ink on keyboard`, async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
  await signIn(page);
  await page.goto("/profile", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  const read = () =>
    page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el.tagName.toLowerCase() !== "summary") return { focused: false } as const;
      const s = getComputedStyle(el);
      return {
        focused: true as const,
        on: (el.querySelector("h2")?.textContent ?? "").trim(),
        style: s.outlineStyle,
        color: s.outlineColor,
        width: s.outlineWidth,
      };
    });

  const summary = page.locator("details.pm-clean-sec > summary").first();
  await summary.click();
  const afterMouse = await read();
  console.log(`\nE716  after MOUSE click:    ${JSON.stringify(afterMouse)}`);

  /* ⚠ Keyboard focus, reached the way a keyboard user reaches it. `focus()` in JS does NOT
     reliably set `:focus-visible`; a real Tab does. */
  await page.keyboard.press("Tab");
  await page.waitForTimeout(150);
  let afterKeys = await read();
  for (let i = 0; i < 25 && !afterKeys.focused; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(80);
    afterKeys = await read();
  }
  console.log(`E716  after KEYBOARD Tab:   ${JSON.stringify(afterKeys)}`);

  if (PHASE !== "before") {
    expect(afterMouse.focused, "the click did not land on a summary").toBe(true);
    expect(
      afterMouse.focused && afterMouse.style,
      "a mouse click still draws an outline"
    ).toBe("none");
    expect(afterKeys.focused, "could not reach a section summary by keyboard").toBe(true);
    /* ⚠⚠ INK, NOT THE PLATFORM BLUE — the colour is asserted, not just the presence of a
       ring, because "some outline" is exactly what was wrong before. */
    expect(afterKeys.focused && afterKeys.style, "keyboard focus draws no outline").not.toBe(
      "none"
    );
    expect(afterKeys.focused && afterKeys.color, "the keyboard ring is not ink").toBe(
      "rgb(39, 35, 52)"
    );
  }
  await page.close();
});

/** ⚠ The left column at both widths, which is what the brief asks to see. */
test(`E716 ${PHASE} — the left column at 1280 and 390`, async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
  await signIn(page);
  await page.goto("/profile", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const rail = page.locator(".pm-cp3-rail").first();
  await rail.screenshot({ path: join(OUT, `${PHASE}-rail-1280.png`) });

  /* ⚠⚠ AT 390 THE RAIL IS `display: contents` — it has NO BOX OF ITS OWN, so screenshotting
     the element returns nothing useful. The page is shot instead and the column is the whole
     width there. */
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto("/profile", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: join(OUT, `${PHASE}-rail-390.png`) });
  await page.close();
});

/**
 * ── ⚠⚠⚠ THE VISIBILITY COPY, BOTH STATES — AND NOTHING IS WRITTEN ────────────────────
 *
 * ⚠ **SCOTT NAMED TWO SENTENCES**, one for each switch position, so both must be SEEN. The
 * ON line renders on load; the OFF line only exists after the switch moves.
 * ⚠⚠⚠ **THE SAVE IS INTERCEPTED SO THE DATABASE IS NEVER TOUCHED.** Flipping this switch for
 * real would take a live provider out of the marketplace, and a screenshot is not worth a
 * data change — the standing rule is no reseed, no reset, no money moves, and this is the
 * same instinct. `page.route` fulfils `/api/settings/profile` locally, so the optimistic flip
 * happens, the copy re-renders, and **`paused_at` is never written.**
 * ⚠⚠ It also proves the wiring `E716` added: the sentence follows the SWITCH, not the prop.
 * With the old code this test would show the ON line under an OFF switch.
 */
test(`E716 ${PHASE} — visibility copy: on and off, no write`, async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
  await signIn(page);

  let posted = 0;
  await page.route("**/api/settings/profile", async (route) => {
    posted += 1;
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.goto("/profile", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  const help = page.locator(".pm-cp3-rail section", { hasText: "Visible to buyers" }).locator("p").last();
  const on = (await help.innerText()).trim();
  console.log(`\nE716  visibility ON  → "${on}"`);
  await page.locator(".pm-cp3-rail").screenshot({ path: join(OUT, "visibility-on.png") });

  await page.locator('.pm-cp3-rail [role="switch"]').first().click();
  await page.waitForTimeout(600);
  const off = (await help.innerText()).trim();
  console.log(`E716  visibility OFF → "${off}"`);
  console.log(`E716  POSTs intercepted (never reached the server): ${posted}`);
  await page.locator(".pm-cp3-rail").screenshot({ path: join(OUT, "visibility-off.png") });

  if (PHASE !== "before") {
    expect(on, "the ON line still says 'Pausing'").not.toMatch(/Pausing/i);
    expect(on).toContain("Turning visibility off hides your profile without deleting anything");
    expect(off).toContain("Buyers can’t find you right now");
    expect(off).toContain("Turn visibility on to show your profile again");
    expect(off).toContain("Nothing has been deleted");
    expect(posted, "the switch never posted — the flip did not happen").toBeGreaterThan(0);
  }
  await page.close();
});
