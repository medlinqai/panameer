import { test, expect, type ConsoleMessage } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { signIn } from "./_auth";
import { requireCompleteProvider } from "./_persona";

/**
 * ── ⚠⚠⚠ NO PAGE IN THE WALK MAY LOG A CONSOLE ERROR (`P0-E595` WS-C) ───────
 *
 * ⚠ SCOTT, 2026-09-21: *"Add a check that fails on any console error on
 * /connect and on every page the WS-C walk visits."*
 *
 * ── ⚠⚠ WHAT COUNTS AS A FAILURE, AND WHY THE LINE IS WHERE IT IS ──────────
 *
 * ⚠ `console.error` AND an uncaught `pageerror`. Both, because they are
 * different failures: an uncaught exception stops a component tree, while a
 * `console.error` is usually React telling us something is wrong that it has
 * chosen to survive — which is exactly the class this gate exists for (React's
 * script-tag warning is a `console.error`, not a throw).
 * ⚠⚠ WARNINGS ARE NOT INCLUDED. `console.warn` carries deprecations and
 * third-party noise nobody here can action; a gate that goes red on somebody
 * else's roadmap stops being read, which is the `KNOWN_OPEN` argument from
 * `E522` applied before the fact rather than after.
 *
 * ── ⚠⚠⚠ IT MUST NOT PASS ON NOTHING (`E586`) ──────────────────────────────
 *
 * ⚠ `E586` is `check:resume` reporting `0 passed, 0 failed, 16 skipped` with
 * exit code 0 because its fixtures were absent, and being quoted as green for
 * weeks. ⚠⚠ A CONSOLE GATE HAS THE SAME SHAPE — "no errors were seen" is
 * exactly what an empty run reports. So every page asserts it actually
 * rendered, and the suite asserts it visited the whole list.
 */

/** ⚠ The gate persona's own public page, from the receipt the seed writes. */
function gatePersonaPublicPath(): string {
  const receipt = JSON.parse(
    readFileSync(join(process.cwd(), "prisma", "seed-data", "gate-persona.json"), "utf8")
  ) as { publicPath?: string };
  if (!receipt.publicPath) {
    throw new Error(
      "prisma/seed-data/gate-persona.json has no publicPath — re-seed with " +
        "`npm run seed:test-data -- --apply`."
    );
  }
  return receipt.publicPath;
}

/**
 * ⚠⚠ EVERY PAGE THE WS-C WALK VISITS. `/connect` is named by Scott; the rest
 * are the surfaces the walk actually opens to prove the reset produced a
 * working platform. ⚠ Adding a page to the walk means adding it here — that is
 * the point of listing them rather than crawling.
 */
const WALK_PAGES: readonly string[] = [
  "/connect",
  "/dashboard",
  "/learn",
  "/community",
  "/stats",
  "/profile",
];

/** ⚠ Collected per page so a failure names WHICH page, not just "somewhere". */
type Found = { page: string; kind: string; text: string };

test.describe.configure({ mode: "serial" });

test("⚠⚠⚠ PRECONDITION — the gate persona is a complete, visible provider", async ({
  browser,
}) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await signIn(page);
  await requireCompleteProvider(page);
  await page.close();
});

test("⚠⚠⚠ no page in the walk logs a console error", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const found: Found[] = [];
  let current = "(before navigation)";

  const onConsole = (m: ConsoleMessage) => {
    if (m.type() !== "error") return;
    /*
      ⚠ A FAILED SUBRESOURCE IS REPORTED BY THE BROWSER, NOT BY OUR CODE, and it
      still belongs here — a 404 on an avatar is a real defect on a page whose
      whole job is to show one. It is kept rather than filtered.
    */
    found.push({ page: current, kind: "console.error", text: m.text() });
  };
  const onPageError = (e: Error) => {
    found.push({ page: current, kind: "pageerror", text: `${e.name}: ${e.message}` });
  };
  page.on("console", onConsole);
  page.on("pageerror", onPageError);

  await signIn(page);

  const visited: string[] = [];
  for (const path of [...WALK_PAGES, gatePersonaPublicPath()]) {
    current = path;
    const res = await page.goto(path, { waitUntil: "networkidle" });
    /* ⚠⚠ THE PAGE MUST ACTUALLY HAVE RENDERED. A redirect to /login or a 404
       would otherwise sail through with a clean console — `E586`'s shape. */
    expect(res?.status(), `${path} returned ${res?.status()}`).toBeLessThan(400);
    expect(
      new URL(page.url()).pathname,
      `${path} redirected to ${page.url()} — the walk never saw it`
    ).not.toContain("/login");
    const text = (await page.locator("body").innerText()).trim();
    expect(text.length, `${path} rendered an empty body`).toBeGreaterThan(40);
    visited.push(path);
  }

  /* ⚠⚠⚠ `E586` — a run that visited nothing must FAIL, not report "no errors". */
  expect(visited.length, "the walk visited no pages at all").toBe(WALK_PAGES.length + 1);

  if (found.length) {
    const report = found
      .map((f) => `  ${f.page.padEnd(28)} [${f.kind}] ${f.text.replace(/\s+/g, " ").slice(0, 300)}`)
      .join("\n");
    throw new Error(
      `\n⚠⚠⚠ ${found.length} CONSOLE ERROR(S) ACROSS ${visited.length} PAGES:\n\n${report}\n`
    );
  }

  console.log(`E595/WS-C  ${visited.length} pages walked, 0 console errors`);
  await page.close();
});
