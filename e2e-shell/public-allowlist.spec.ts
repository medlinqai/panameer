import { test, expect } from "@playwright/test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  PUBLIC_ROUTES,
  UNCLASSIFIED_PENDING_DECISION,
  CATEGORY_NAMES,
  isPublicRoute,
  publicCategory,
  isGatedPrefix,
  GATED_PREFIXES,
} from "../src/lib/public-routes";

/**
 * THE PUBLIC ALLOWLIST — `P1-ALL-E025`.
 *
 * ⚠⚠ WHAT THIS EXISTS TO CATCH: a page added six months from now that nobody
 * classified. Before this file, such a page was PUBLIC BY ACCIDENT — it just had
 * to avoid `(app)` and avoid `proxy.ts`, and nothing failed. Now it fails here,
 * BY NAME, until someone gives it a category or a gate.
 *
 * ⚠ STATIC INVENTORY ONLY. No network, no login, no browser — it reads `src/app`
 * off the disk and parses `src/proxy.ts` as text. Signed-in behaviour is NOT
 * testable in this environment and is deliberately not faked. That is also why
 * this is its OWN spec file rather than an addition to `app-shell.spec.ts`,
 * whose file-level `beforeAll` signs in before every test in it.
 *
 * ⚠ THE THREE WAYS A ROUTE CAN BE GATED — and `(app)` IS NOT ONE OF THEM:
 *   1. `proxy.ts`'s matcher + `ROUTE_ACCESS`         (the edge)
 *   2. a `layout.tsx` ABOVE it that guards            (admin, settings)
 *   3. its own `page.tsx` guarding                    (`guardPage`, or
 *      `if (!viewer) redirect(...)`)
 * ⚠⚠ `src/app/(app)/layout.tsx` HAS NO SESSION CHECK — it is MeProvider +
 * AppShell, chrome only. A route is never gated merely by living in that folder,
 * and this file must never pretend otherwise. Measured 2026-08-26: fifteen
 * `(app)` pages are outside the matcher and every one of them self-guards.
 */

const APP_DIR = "src/app";

/** Every `page.tsx`, as [route, file]. Route groups `(x)` are not URL segments. */
function inventory(): { route: string; file: string }[] {
  const out: { route: string; file: string }[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry === "page.tsx") {
        const route =
          full
            .slice(APP_DIR.length)
            .replace(/\/page\.tsx$/, "")
            .replace(/\/\([^)]+\)/g, "") || "/";
        out.push({ route, file: full });
      }
    }
  };
  walk(APP_DIR);
  return out.sort((a, b) => a.route.localeCompare(b.route));
}

/** A page or layout that stops an anonymous request itself. */
function selfGuards(file: string): boolean {
  const src = readFileSync(file, "utf8");
  if (/\bguardPage\s*\(/.test(src)) return true;
  /*
    The other shape in this codebase: resolve the session, then bail. Matched
    across up to two lines because both the one-liner and the braced form are in
    use (`/company/page.tsx:42` vs `/providers/[id]/page.tsx:68`).
    ⚠ `if (!viewer) return <LearnPublic />` must NOT match — `/learn` renders a
    PUBLIC variant instead of redirecting, and reading it as a guard would let a
    genuinely public page look gated.
  */
  return /if\s*\(\s*!\s*(viewer|session)\s*\)\s*\{?\s*\n?\s*redirect\s*\(/.test(src);
}

/** Does any `layout.tsx` at or above this page guard? */
function guardedByLayout(file: string): string | null {
  let dir = file.slice(0, file.lastIndexOf("/"));
  while (dir.length >= APP_DIR.length) {
    const layout = join(dir, "layout.tsx");
    try {
      if (statSync(layout).isFile() && selfGuards(layout)) return layout;
    } catch {
      /* no layout at this level */
    }
    dir = dir.slice(0, dir.lastIndexOf("/"));
  }
  return null;
}

/**
 * `proxy.ts`'s matcher, parsed OUT OF THE SOURCE rather than imported.
 *
 * ⚠⚠ ON PURPOSE. Importing `src/proxy.ts` would evaluate the module and prove
 * nothing about the SHAPE of the literal — and the shape is the thing that
 * breaks. Next reads `config.matcher` at build time and cannot evaluate a
 * computed value, so a helpful refactor to `matcher: PROTECTED_PREFIX_MATCHERS`
 * type-checks and builds — and then runs the edge on EVERY route. Measured, not
 * assumed: see the failure message below.
 */
function matcherSource(): { raw: string; entries: string[] } {
  const src = readFileSync("src/proxy.ts", "utf8");
  const at = src.indexOf("matcher: [");
  expect(at, "proxy.ts no longer contains `matcher: [` — this parser needs updating").toBeGreaterThan(-1);
  const close = src.indexOf("]", at);
  expect(close, "proxy.ts's matcher array is not closed").toBeGreaterThan(at);
  const raw = src.slice(at + "matcher: [".length, close);
  /*
    ⚠ STRIP COMMENTS BEFORE READING THE LITERALS, and this is not hypothetical:
    the first version of this parser did not, and the explanatory block comments
    INSIDE the matcher array quote route names — so `"the PUBLIC Packages page"`
    was read as a matcher entry and the cross-check failed against my own prose.
  */
  const code = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const entries = [...code.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  return { raw, entries };
}

test.describe("THE PUBLIC ALLOWLIST — P1-ALL-E025", () => {
  test("proxy.ts's matcher is still a STATIC LITERAL array of strings", () => {
    const { raw, entries } = matcherSource();
    expect(entries.length, "the matcher parsed as empty").toBeGreaterThan(0);

    /* Strip comments and every string literal; anything left is a live value. */
    const residue = raw
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "")
      .replace(/"[^"]*"/g, "")
      .replace(/[\s,]/g, "");

    expect(
      residue,
      `proxy.ts's matcher contains something that is not a string literal: ${JSON.stringify(
        residue
      )}. ⚠⚠ Next reads config.matcher AT BUILD TIME and cannot evaluate an ` +
        `import, spread or template. MEASURED 2026-08-26 with \`...PROTECTED_PREFIX_MATCHERS\` ` +
        `spread in here: the edge then runs on EVERYTHING — /talent /work /learn /shop all ` +
        `307 to /login, /login redirects to ITSELF, and / returns 500. The whole site. ` +
        `Put the literal back and assert it here instead.`
    ).toBe("");
  });

  test("the matcher and ROUTE_ACCESS agree, in both directions", () => {
    const { entries } = matcherSource();
    const prefixes = entries
      .filter((e) => e !== "/")
      .map((e) => e.replace(/\/:path\*$/, ""));

    for (const p of prefixes) {
      expect(
        GATED_PREFIXES,
        `proxy.ts runs the edge on "${p}" but ROUTE_ACCESS has no entry for it — ` +
          `a matched route with no map entry FAILS CLOSED, so this bounces everyone ` +
          `to /dashboard?noaccess=1. Add it to route-access.ts or drop it from the matcher.`
      ).toContain(p);
    }

    for (const p of GATED_PREFIXES) {
      const covered = prefixes.some((m) => p === m || p.startsWith(m + "/"));
      expect(
        covered,
        `ROUTE_ACCESS gates "${p}" but no matcher entry in proxy.ts covers it, so ` +
          `the edge never runs there. It may still be gated by a layout or its own ` +
          `guardPage — but the map says otherwise, and the two must not disagree.`
      ).toBe(true);
    }
  });

  test("no route is both public and gated", () => {
    for (const p of PUBLIC_ROUTES) {
      /*
        ⚠ `/` IS THE ONE DELIBERATE OVERLAP and it is not a contradiction: the
        proxy runs on `/` to do the HOST SPLIT (marketing domain → public, app
        domain → /login), not to gate it. See the top of proxy.ts.
      */
      if (p.route === "/") continue;
      expect(
        isGatedPrefix(p.route),
        `"${p.route}" is in the public allowlist (category ${p.category} — ` +
          `${CATEGORY_NAMES[p.category]}) AND is covered by a gated prefix in ` +
          `ROUTE_ACCESS. One of the two is wrong. ⚠ Do NOT resolve this by ` +
          `deleting the assertion — decide which one reflects the intent.`
      ).toBe(false);
    }
  });

  test("EVERY page.tsx is allowlisted or gated — no route is public by accident", () => {
    const pages = inventory();
    expect(pages.length, "the inventory found no pages at all").toBeGreaterThan(100);

    const quarantined = new Set(UNCLASSIFIED_PENDING_DECISION.map((u) => u.route));
    const unclassified: string[] = [];

    for (const { route, file } of pages) {
      if (isPublicRoute(route)) continue;
      if (isGatedPrefix(route)) continue;
      if (guardedByLayout(file)) continue;
      if (selfGuards(file)) continue;
      if (quarantined.has(route)) continue;
      unclassified.push(`${route}   (${file})`);
    }

    expect(
      unclassified,
      `⚠⚠ ${unclassified.length} route(s) are REACHABLE SIGNED OUT and belong to no ` +
        `category and no gate:\n\n  ${unclassified.join("\n  ")}\n\n` +
        `A page is GATED BY DEFAULT — being outside (app) and outside proxy.ts is ` +
        `no longer enough to make it public.\n` +
        `⚠ FIX IT ONE OF TWO WAYS:\n` +
        `   · add it to src/lib/public-routes.ts WITH A CATEGORY (1 MENU + ROOT · ` +
        `2 AUTH DOORS · 3 LEGAL · 4 TOKEN-ADDRESSED · 5 FRONT DOORS) and say WHY, or\n` +
        `   · gate it — add its prefix to ROUTE_ACCESS + the proxy matcher, or call ` +
        `guardPage() in the page itself.\n` +
        `⚠ DO NOT add it to UNCLASSIFIED_PENDING_DECISION. That list is a frozen ` +
        `record of what was already open on 2026-08-26 and may only ever shrink.`
    ).toEqual([]);
  });

  test("the quarantine list has not rotted", () => {
    const pages = new Map(inventory().map((p) => [p.route, p.file]));

    for (const { route } of UNCLASSIFIED_PENDING_DECISION) {
      const file = pages.get(route);
      expect(
        file,
        `UNCLASSIFIED_PENDING_DECISION names "${route}" but no such page exists. ` +
          `The route was renamed or deleted — remove the entry.`
      ).toBeTruthy();
      if (!file) continue;

      /* If it has since been decided, the entry is stale and must go. */
      const decided =
        isPublicRoute(route) || isGatedPrefix(route) || !!guardedByLayout(file) || selfGuards(file);
      expect(
        decided,
        `"${route}" is now classified (allowlisted or gated) but is STILL listed in ` +
          `UNCLASSIFIED_PENDING_DECISION. Delete the entry — the list must only shrink.`
      ).toBe(false);
    }
  });

  test("every allowlist entry names a page that exists, and every category is legal", () => {
    const routes = new Set(inventory().map((p) => p.route));
    for (const p of PUBLIC_ROUTES) {
      expect(
        CATEGORY_NAMES[p.category],
        `"${p.route}" has category ${p.category}, which is not one of Scott's five`
      ).toBeTruthy();
      if (p.subtree) {
        const any = [...routes].some((r) => r === p.route || r.startsWith(p.route + "/"));
        expect(any, `allowlisted subtree "${p.route}/*" matches no page on disk`).toBe(true);
      } else {
        expect(
          routes.has(p.route),
          `allowlisted route "${p.route}" has no page.tsx — it was renamed or deleted, ` +
            `and a public allowlist naming a dead route is how a stale allowlist starts`
        ).toBe(true);
      }
      expect(publicCategory(p.route)).toBe(p.category);
    }
  });
});
