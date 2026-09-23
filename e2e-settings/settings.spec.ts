import { test, expect } from "@playwright/test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { SETTINGS_NAV } from "../src/lib/settings-nav";

/**
 * ── ⚠⚠⚠ THE SETTINGS GATE (`P2-A2-E609`) ────────────────────────────────
 *
 * ⚠ Four assertions, and the fourth is the reason this is a Playwright suite
 * rather than a script: **no label truncates mid-word** can only be answered by
 * laying the row out at a real width.
 */

const SRC = join(process.cwd(), "src", "app", "(app)", "settings");
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

/** ⚠ Derived from disk, never a list (`E587`). */
function pageFiles(dir = SRC, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const f = join(dir, e);
    if (statSync(f).isDirectory()) pageFiles(f, out);
    else if (e === "page.tsx") out.push(f);
  }
  return out;
}
const routeOf = (f: string) =>
  "/settings" + f.slice(SRC.length).replace(/\/page\.tsx$/, "");

test("§1 the route set is intact — every page is a nav entry, a redirect, or a sub-page", () => {
  const files = pageFiles();
  expect(files.length, "the sweep found settings pages (E586)").toBeGreaterThan(5);

  /* ⚠⚠ BOTH SIDES DERIVED: routes from the FILESYSTEM, destinations from
     `SETTINGS_NAV`. Neither is typed here, so a page added or a nav entry
     dropped changes one side and not the other. */
  const navHrefs = new Set(SETTINGS_NAV.map((i) => i.href));
  expect(navHrefs.size, "the nav has entries (E586)").toBeGreaterThan(0);

  const orphans = files.filter((f) => {
    const route = routeOf(f);
    if (navHrefs.has(route)) return false;
    const code = strip(readFileSync(f, "utf8"));
    /* a redirect is a door to somewhere else, not a dead one */
    if (/\b(permanentRedirect|redirect)\(/.test(code)) return false;
    /* a sub-page of a nav destination is reached from its parent */
    if ([...navHrefs].some((h) => route.startsWith(h + "/"))) return false;
    return true;
  });
  expect(
    orphans.map(routeOf),
    "these settings pages are reachable from nothing — a lost door is a regression"
  ).toEqual([]);
});

test("§2 every settings page that renders a control has a routed handler", () => {
  const api = join(process.cwd(), "src", "app", "api", "settings");
  const handlers = new Set<string>();
  (function walk(dir: string) {
    for (const e of readdirSync(dir)) {
      const f = join(dir, e);
      if (statSync(f).isDirectory()) walk(f);
      else if (e === "route.ts") {
        const code = strip(readFileSync(f, "utf8"));
        /* ⚠ `export const POST` AND `export async function POST` both count —
           this codebase uses the first and a `function`-only check finds none. */
        if (/export\s+(const|async function)\s+(POST|PATCH|PUT|DELETE)/.test(code)) {
          handlers.add("/api" + f.slice(join(process.cwd(), "src", "app", "api").length).replace(/\/route\.ts$/, ""));
        }
      }
    }
  })(api);
  expect(handlers.size, "the sweep found settings handlers (E586)").toBeGreaterThan(3);

  /* ⚠⚠ A page that POSTs somewhere must POST somewhere that EXISTS. Derived
     from the fetch targets the pages actually name. */
  const missing: string[] = [];
  for (const f of pageFiles().concat(
    readdirSync(join(process.cwd(), "src", "components", "settings"))
      .filter((e) => e.endsWith(".tsx"))
      .map((e) => join(process.cwd(), "src", "components", "settings", e))
  )) {
    const code = strip(readFileSync(f, "utf8"));
    for (const m of code.matchAll(/["'`](\/api\/settings\/[a-z0-9/-]+)["'`]/g)) {
      if (!handlers.has(m[1])) missing.push(`${f.split("/").slice(-2).join("/")} → ${m[1]}`);
    }
  }
  expect(missing, "a control posts to a handler that does not exist").toEqual([]);
});

test("§3 no settings page offers a mechanism nothing writes", () => {
  /*
    ⚠⚠⚠ THE SHAPE `E603` RETIRED TWICE — *"once you complete your first paid
    work order"*, *"once buyers rate completed work orders"*. A sentence that
    says a figure will start counting is a claim about a mechanism.
    ⚠ MEASURED: nothing creates a `WorkOrder` and `PAID` is never written, so
    any copy promising settlement is promising a chain that stops at its first
    step.
    ⚠ Scoped to the settings pages and their components, derived from disk.
  */
  const files = pageFiles().concat(
    readdirSync(join(process.cwd(), "src", "components", "settings"))
      .filter((e) => e.endsWith(".tsx"))
      .map((e) => join(process.cwd(), "src", "components", "settings", e))
  );
  expect(files.length, "the sweep found settings source (E586)").toBeGreaterThan(5);
  const PROMISES = [
    /once work orders settle/i,
    /once you complete your first/i,
    /once buyers rate/i,
    /balances? appear once/i,
    /until you move to a paid plan/i,
  ];
  const offenders: string[] = [];
  for (const f of files) {
    const code = strip(readFileSync(f, "utf8"));
    for (const re of PROMISES) {
      const hit = code.match(re);
      if (hit) offenders.push(`${f.split("/").pop()}: "${hit[0]}"`);
    }
  }
  expect(offenders, "this copy promises a mechanism that has no writer").toEqual([]);
});

for (const width of [360, 390]) {
  test(`§4 no settings tab label is clipped at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[type="email"]');
    await page.waitForTimeout(700);
    await page.click('input[type="email"]');
    await page.type('input[type="email"]', "sw_user21@straterp.com", { delay: 4 });
    await page.click('input[type="password"]');
    await page.type('input[type="password"]', "Panameer123", { delay: 4 });
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/auth/callback/credentials")),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForTimeout(900);
    await page.goto("/settings", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    /* ⚠⚠ MEASURED AGAINST THE ROW'S OWN BOX, not eyeballed. A label whose right
       edge is past the container's is cut — whether by ellipsis or, as here,
       by a scroller slicing a word with no affordance. */
    const result = await page.evaluate(() => {
      const row = document.querySelector('[data-testid="page-tabs"]');
      if (!row) return { found: 0, clipped: [] as string[], overflows: false };
      const rr = row.getBoundingClientRect();
      const links = [...row.querySelectorAll("a")];
      return {
        found: links.length,
        clipped: links
          .filter((a) => {
            const b = a.getBoundingClientRect();
            return b.right > rr.right + 0.5 || b.left < rr.left - 0.5;
          })
          .map((a) => a.textContent?.trim() ?? ""),
        overflows: row.scrollWidth > row.clientWidth + 1,
      };
    });
    expect(result.found, "the tab row rendered links (E586)").toBeGreaterThan(3);
    expect(result.clipped, `clipped at ${width}px`).toEqual([]);
    expect(result.overflows, `the row still scrolls horizontally at ${width}px`).toBe(false);
  });
}

test("§5 /settings lands on a page a member can change", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[type="email"]');
  await page.waitForTimeout(700);
  await page.click('input[type="email"]');
  await page.type('input[type="email"]', "sw_user21@straterp.com", { delay: 4 });
  await page.click('input[type="password"]');
  await page.type('input[type="password"]', "Panameer123", { delay: 4 });
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/callback/credentials")),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(900);
  await page.goto("/settings", { waitUntil: "networkidle" });
  /* ⚠ Membership writes zero rows; landing there put a read behind the door. */
  expect(new URL(page.url()).pathname).not.toBe("/settings/membership");
  const inputs = await page.locator("main input, main select, main textarea").count();
  expect(inputs, "the landing page offers something to change").toBeGreaterThan(0);
});
