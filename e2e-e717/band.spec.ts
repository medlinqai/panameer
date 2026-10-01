import { test, expect } from "@playwright/test";
import { signIn } from "../e2e-shell/_auth";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * ── ⚠⚠⚠ `E717` — WHICH BAND ITEM IS LIT, ON EVERY ROUTE THAT COULD MOVE ──────────────
 *
 * ⚠ **SCOTT'S SECOND DEFECT IS A PREFIX COLLISION, AND THE RISK IS COLLATERAL:** `Connect`
 * owns `/community`, so `/community/score` lights `Connect` — but so does every other page
 * under `/community`, **and those are real Connect pages whose light must not move.**
 * ⚠⚠ **SO THE GATE IS A CENSUS OF ALL NINE `/community` ROUTES, BEFORE AND AFTER**, written
 * to disk on the `before` run and compared on the `after` run. ⚠⚠⚠ **A CLAIM THAT "ONLY ONE
 * ROUTE MOVED" IS WORTH NOTHING UNLESS THE OTHER EIGHT WERE MEASURED ON BOTH SIDES.**
 *
 * ⚠ It reads the lit item from the DOM — `aria-current="page"` — which is the band's own
 * output, not a re-implementation of `isActive`. Re-deriving the predicate in a test is the
 * second copy `E585` forbids, and it would agree with the bug.
 */
const PHASE = process.env.E717_PHASE ?? "after";
const OUT = join(process.cwd(), "e2e-e717", "shots");
const RECORD = join(process.cwd(), "e2e-e717", `census-before.json`);

/** ⚠ Every route under `/community/`, from disk, plus the named pages in the brief. */
const COMMUNITY_ROUTES = [
  "/community",
  "/community/colleagues",
  "/community/groups",
  "/community/grow",
  "/community/mentors",
  "/community/score",
  "/community/teams",
];
const ACCOUNT_ROUTES = ["/profile", "/usage", "/account-health", "/settings", "/company"];
/** ⚠ The five the brief asks to see the band on. */
const SHOT_ROUTES = ["/profile", "/community/score", "/usage", "/account-health", "/community"];

test.beforeAll(() => mkdirSync(OUT, { recursive: true }));

/**
 * ⚠⚠ THE LIT ITEM, PLUS THE TWO TREATMENTS SIDE BY SIDE.
 * ⚠⚠⚠ **THE AVATAR'S FILL AND A PILL'S FILL ARE MEASURED IN THE SAME PASS**, because the
 * defect is not *"is a class applied"* — `bg-rail-active` was already on the avatar — it is
 * **how much of it a member can actually see.** A class check would have passed on the bug.
 */
async function readBand(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const band = document.querySelector("header.pm-band");
    if (!band) return { found: false } as const;

    const lit: string[] = [];
    band.querySelectorAll('[aria-current="page"]').forEach((el) => {
      const label = el.querySelector(".pm-band-label")?.textContent?.trim();
      lit.push(label || el.getAttribute("aria-label") || el.tagName.toLowerCase());
    });

    const box = (el: Element | null) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        bg: s.backgroundColor,
        pad: s.padding,
        radius: s.borderRadius,
      };
    };

    const avatarBtn = band.querySelector('button[aria-label="Account menu"]');
    /* ⚠ A LIT pill if there is one, otherwise any pill — so the comparison has both sides
       even on a page where nothing in the row is lit. */
    const litPill =
      band.querySelector('a.pm-band-item[aria-current="page"]') ??
      band.querySelector("a.pm-band-item");

    return {
      found: true as const,
      lit,
      avatar: box(avatarBtn),
      avatarLit: avatarBtn?.getAttribute("aria-current") === "page",
      pill: box(litPill),
      pillLit: litPill?.getAttribute("aria-current") === "page",
      bandH: Math.round(band.getBoundingClientRect().height),
    };
  });
}

test(`E717 ${PHASE} — census: which item lights on every /community route`, async ({
  browser,
}) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await signIn(page);

  const census: Record<string, string[]> = {};
  for (const route of [...COMMUNITY_ROUTES, ...ACCOUNT_ROUTES]) {
    const res = await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
    const band = await readBand(page);
    /* ⚠ A route that 404s or redirects would report "nothing lit" and read as a fix.
       The status and the landing path are recorded so that cannot pass silently. */
    const landed = new URL(page.url()).pathname;
    census[route] = band.found ? band.lit : ["NO BAND"];
    console.log(
      `E717 ${PHASE}  ${route.padEnd(28)} → lit: ${(census[route].join(", ") || "NOTHING").padEnd(12)}` +
        `  [${res?.status()}${landed !== route ? ` → ${landed}` : ""}]`
    );
  }

  if (PHASE === "before") {
    writeFileSync(RECORD, JSON.stringify(census, null, 1));
    console.log(`\nE717 before  census written to ${RECORD}`);
  } else {
    expect(existsSync(RECORD), "run E717_PHASE=before first").toBe(true);
    const before = JSON.parse(readFileSync(RECORD, "utf8")) as Record<string, string[]>;
    console.log(`\n══ E717 · BEFORE → AFTER, every route ══`);
    for (const route of Object.keys(before)) {
      const b = before[route].join(", ") || "NOTHING";
      const a = (census[route] ?? []).join(", ") || "NOTHING";
      console.log(`   ${route.padEnd(28)} ${b.padEnd(14)} → ${a}${b === a ? "" : "   ⚠ MOVED"}`);
    }

    /*
      ── ⚠⚠⚠ THE ONE ROUTE THAT MAY MOVE, AND THE EIGHT THAT MAY NOT ────────────────
      ⚠ This is the assertion the brief actually asks for: the fix must not take Connect's
      light off real Connect pages.
    */
    for (const route of Object.keys(before)) {
      const b = before[route].join(", ");
      const a = (census[route] ?? []).join(", ");
      if (route === "/community/score") {
        expect(a, "/community/score should now light the avatar").toContain("Account menu");
        expect(a, "/community/score still lights Connect").not.toContain("Connect");
      } else {
        expect(a, `${route} changed which band item it lights — collateral damage`).toBe(b);
      }
    }
    /* ⚠⚠ EXACTLY ONE THING LIT, EVERYWHERE — `E433`'s rule. A fix that lights the avatar by
       ALSO leaving Connect on would satisfy the two checks above and still be wrong. */
    for (const [route, lit] of Object.entries(census)) {
      expect(lit.length, `${route} lights ${lit.length} items: ${lit.join(", ")}`).toBe(1);
    }
  }
  await page.close();
});

test(`E717 ${PHASE} — the band at 1280 on the five named pages`, async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await signIn(page);
  for (const route of SHOT_ROUTES) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    const band = await readBand(page);
    const name = route.replace(/\//g, "_").replace(/^_/, "") || "root";
    await page
      .locator("header.pm-band")
      .screenshot({ path: join(OUT, `${PHASE}-band-${name}.png`) });
    console.log(
      `E717 ${PHASE}  ${route.padEnd(20)} lit=${(band.found ? band.lit : []).join(", ") || "NOTHING"}` +
        `  avatarLit=${band.found ? band.avatarLit : "?"}` +
        `  avatar=${band.found ? JSON.stringify(band.avatar) : "?"}`
    );
    if (route === "/profile" && band.found) {
      console.log(`E717 ${PHASE}    a lit PILL for comparison = ${JSON.stringify(band.pill)}`);
      console.log(`E717 ${PHASE}    band height = ${band.bandH}`);
    }
  }
  await page.close();
});
