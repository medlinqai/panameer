import { test, expect, type Page, type Browser } from "@playwright/test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * `check:app-shell` — THE SHELL IS THE ONE COMPONENT WHOSE REGRESSION IS
 * ATTRIBUTED TO EVERY OTHER PAGE (P1-ALL-E001).
 *
 * The header overflowed every authenticated page between 760 and 1180. It was
 * found by a CONTROL RUN on untouched pages while verifying an unrelated brief;
 * without that control it would have been filed against Learn. Nothing in Node
 * can see it — it needs a browser, a signed-in session and a width sweep.
 *
 * Three guards, in the order the brief states them:
 *
 *   1  no horizontal overflow FROM THE HEADER at eleven widths, asserting
 *      past-right and off-left SEPARATELY (E168: left overflow never extends
 *      scrollWidth, so a single check silently misses half the failure mode).
 *   2  the four universal controls and the profile are present, RENDERED and
 *      HIT-TESTABLE at every width — and nothing in the row wraps.
 *   3  no arbitrary `min-[…]` variant competes with a named-breakpoint variant
 *      for the same property.
 *
 * ⚠ THE ACCOUNT IS READ FROM THE SEED FILE, NOT HARDCODED. `test3@panameer.com`
 * is in `prisma/seed-data/test-users.json`, which is generated from Scott's
 * Users.xlsx — so a password rotation there changes this suite too, instead of
 * breaking it a month later for a reason nobody connects.
 */

const WIDTHS = [360, 375, 640, 760, 900, 1000, 1100, 1180, 1282, 1440, 1562];

/** The five things that may never disappear, whatever the width. */
const UNIVERSAL = [
  { label: "Search", how: "either" as const },
  { label: "Home", how: "icon" as const },
  { label: "Notifications", how: "icon" as const },
  { label: "Account menu", how: "button" as const },
  { label: "Report a bug", how: "optional" as const },
];

/** Signed-in pages that must all sit on a clean shell. */
const PAGES = [
  "/dashboard",
  "/profile",
  "/learn/courses",
  "/learn",
  "/learn/end-user-procurement-advanced-procurement",
];

function seededAccount(): { email: string; password: string } {
  const raw = JSON.parse(
    readFileSync(join(process.cwd(), "prisma", "seed-data", "test-users.json"), "utf8")
  ) as Record<string, unknown>;
  const groups = Object.values(raw).filter(Array.isArray) as {
    email: string;
    password: string;
  }[][];
  const all = groups.flat();
  const chosen = all.find((u) => u.email === "test3@panameer.com");
  if (!chosen) throw new Error("test3@panameer.com is not in prisma/seed-data/test-users.json");
  return { email: chosen.email, password: chosen.password };
}

async function signIn(page: Page) {
  const { email, password } = seededAccount();
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[type="email"]');
  /* Hydration: an unhydrated React input takes the value and loses it on the
     first client render, which posts an empty email and 401s in 5ms. */
  await page.waitForTimeout(1200);
  await page.click('input[type="email"]');
  await page.type('input[type="email"]', email, { delay: 5 });
  await page.click('input[type="password"]');
  await page.type('input[type="password"]', password, { delay: 5 });
  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/callback/credentials")),
    page.click('button[type="submit"]'),
  ]);
  expect(res.ok(), `sign-in as ${email} returned ${res.status()}`).toBe(true);
  await page.waitForTimeout(1500);
}

let browserRef: Browser;
let page: Page;

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  browserRef = browser;
  const ctx = await browserRef.newContext({ viewport: { width: 1440, height: 900 } });
  page = await ctx.newPage();
  await signIn(page);
});

test.afterAll(async () => {
  await page?.context().close();
});

/** Everything the assertions need, measured in one pass. */
async function measure(p: Page) {
  return p.evaluate(() => {
    const header = document.querySelector("header");
    if (!header) return null;
    const iw = window.innerWidth;

    const pastRight: string[] = [];
    const offLeft: string[] = [];
    const wrapped: string[] = [];

    const describe = (e: Element) =>
      `${e.tagName}.${String((e as HTMLElement).className).slice(0, 44)}`;

    header.querySelectorAll("*").forEach((e) => {
      const b = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden") return;
      if (b.width === 0 || b.height === 0) return;
      if (b.right > iw + 0.5) pastRight.push(`${describe(e)} right=${Math.round(b.right)}`);
      if (b.left < -0.5) offLeft.push(`${describe(e)} left=${Math.round(b.left)}`);

      /*
        ⚠ LEGIBILITY IS A DIFFERENT FAILURE FROM OVERFLOW. `pitfalls.md`
        2026-08-19: three cards collapsed to one word per line at 390px while
        `scrollWidth === innerWidth` passed the whole time. A pill that wraps to
        two lines has not overflowed and is still broken.

        The GREETING is exempt — it truncates by design, and truncating is the
        deliberate reason the four controls stay reachable at 360px.
      */
      /*
        ⚠ LINE BOXES OF THE TEXT ITSELF, VIA A Range ON EACH TEXT NODE.

        Two earlier versions of this were wrong in opposite directions and both
        are worth recording, because the check is the point of the whole guard:

          `scrollHeight > clientHeight` MISSED EVERYTHING. Both are 0 on an
          INLINE element, so every inline pill in this row was silently exempt —
          it did not fire on a span deliberately squeezed to 44px.

          A Range over the whole ELEMENT false-positived on the real header at
          640. A container's rects are one per child, and a 36px icon and a 20px
          text node in the same row do not share a `top`, so "more than one top"
          read as "wrapped" for every row in the component.

        Ranging over each DIRECT TEXT NODE is exact: more than one line box for a
        single run of text is wrapping and nothing else.
      */
      const isGreeting = e.tagName === "P" && header.firstElementChild === e;
      if (!isGreeting) {
        for (const node of e.childNodes) {
          if (node.nodeType !== Node.TEXT_NODE) continue;
          if (!(node.textContent ?? "").trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          const tops = new Set(
            [...range.getClientRects()]
              .filter((r) => r.width > 0 && r.height > 0)
              .map((r) => Math.round(r.top))
          );
          range.detach();
          if (tops.size > 1) {
            wrapped.push(
              `${describe(e)} text ${JSON.stringify((node.textContent ?? "").trim().slice(0, 24))} broke across ${tops.size} lines`
            );
          }
        }
      }
    });

    /* Present, rendered, and the thing under its own centre point. */
    const control = (label: string) => {
      const els = [...header.querySelectorAll(`[aria-label="${label}"]`)].filter((e) => {
        const b = e.getBoundingClientRect();
        const cs = getComputedStyle(e);
        return cs.display !== "none" && b.width > 0 && b.height > 0;
      });
      if (els.length === 0) return { found: false, w: 0, h: 0, hit: false };
      const el = els[0];
      const b = el.getBoundingClientRect();
      const at = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      return {
        found: true,
        w: Math.round(b.width),
        h: Math.round(b.height),
        hit: Boolean(at && (at === el || el.contains(at))),
      };
    };

    /* Search is a centre pill above sm and an icon below — either satisfies it. */
    const searchPill = header.querySelector('a[href="/search"]:not([aria-label])');
    const searchPillVisible =
      !!searchPill &&
      getComputedStyle(searchPill).display !== "none" &&
      searchPill.getBoundingClientRect().width > 0;
    const searchPillHit = (() => {
      if (!searchPillVisible || !searchPill) return false;
      const b = searchPill.getBoundingClientRect();
      const at = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      return Boolean(at && (at === searchPill || searchPill.contains(at)));
    })();

    return {
      innerWidth: iw,
      headerClientWidth: header.clientWidth,
      headerScrollWidth: header.scrollWidth,
      docScrollWidth: document.documentElement.scrollWidth,
      railWidth: (() => {
        const a = document.querySelector("aside");
        if (!a) return 0;
        const cs = getComputedStyle(a);
        return cs.display === "none" ? 0 : Math.round(a.getBoundingClientRect().width);
      })(),
      pastRight,
      offLeft,
      wrapped,
      controls: {
        Search: searchPillVisible ? { found: true, w: Math.round(searchPill!.getBoundingClientRect().width), h: 36, hit: searchPillHit } : control("Search"),
        Home: control("Home"),
        Notifications: control("Notifications"),
        "Account menu": control("Account menu"),
        "Report a bug": control("Report a bug"),
      } as Record<string, { found: boolean; w: number; h: number; hit: boolean }>,
    };
  });
}

for (const url of PAGES) {
  test(`GUARD 1+2 — the shell is clean and usable across the width sweep on ${url}`, async () => {
    const rows: string[] = [];
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(600);
      const m = await measure(page);
      expect(m, `no <header> rendered on ${url}`).not.toBeNull();
      const r = m!;
      rows.push(
        `  ${String(w).padStart(4)}  doc ${String(r.docScrollWidth).padStart(4)}  hdr ${String(r.headerClientWidth).padStart(4)}/${String(r.headerScrollWidth).padStart(4)}  rail ${String(r.railWidth).padStart(3)}`
      );

      // ── GUARD 1 ────────────────────────────────────────────────────────
      expect(
        r.pastRight,
        `${url} @${w}: header content past the RIGHT edge`
      ).toEqual([]);
      expect(r.offLeft, `${url} @${w}: header content clipped off the LEFT`).toEqual([]);
      expect(
        r.headerScrollWidth,
        `${url} @${w}: the header itself scrolls sideways`
      ).toBeLessThanOrEqual(r.headerClientWidth);

      // ── GUARD 2 ────────────────────────────────────────────────────────
      for (const c of UNIVERSAL) {
        const got = r.controls[c.label];
        if (c.how === "optional") {
          /* Bug drops below sm by design — but when it is there it must work. */
          if (got.found) {
            expect(got.w, `${url} @${w}: "${c.label}" has zero width`).toBeGreaterThan(0);
            expect(got.hit, `${url} @${w}: "${c.label}" is covered by something`).toBe(true);
          }
          continue;
        }
        expect(got.found, `${url} @${w}: "${c.label}" is not rendered`).toBe(true);
        expect(
          got.w,
          `${url} @${w}: "${c.label}" is in the DOM but has no size`
        ).toBeGreaterThanOrEqual(24);
        expect(got.h, `${url} @${w}: "${c.label}" is under 24px tall`).toBeGreaterThanOrEqual(24);
        expect(got.hit, `${url} @${w}: "${c.label}" is not hit-testable`).toBe(true);
      }

      expect(r.wrapped, `${url} @${w}: something in the header wrapped to a second line`).toEqual(
        []
      );
    }
    console.log(`\n${url}\n${rows.join("\n")}`);
  });
}

// ---------------------------------------------------------------------------
// GUARD 3 — arbitrary variants must not compete with named ones
// ---------------------------------------------------------------------------

test("GUARD 3 — no arbitrary min-[…] variant competes with a named breakpoint", () => {
  const NAMED = new Set(["sm", "md", "lg", "xl", "2xl"]);

  const walk = (dir: string, out: string[] = []): string[] => {
    for (const e of readdirSync(dir)) {
      const full = join(dir, e);
      if (statSync(full).isDirectory()) walk(full, out);
      else if (/\.tsx?$/.test(full)) out.push(full);
    }
    return out;
  };

  /* Comments are stripped: this repo documents its own class strings, and a
     scanner that read prose would fail on the note explaining the rule. */
  const strip = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

  /**
   * A utility → the PROPERTY it sets, coarsely.
   *
   * Coarse on purpose: the failure this catches is two variants writing the same
   * property, and the property only has to be identified consistently, not
   * correctly. `grid-cols-2` and `grid-cols-[1fr_auto]` must land on the same
   * key; that is the whole requirement.
   */
  const propertyOf = (util: string): string => {
    const u = util.replace(/^!/, "");
    if (/^(hidden|block|flex|inline-flex|inline-block|inline|grid|inline-grid|contents|table|flow-root)$/.test(u))
      return "display";
    if (/^(static|fixed|absolute|relative|sticky)$/.test(u)) return "position";
    if (/^flex-(row|row-reverse|col|col-reverse)$/.test(u)) return "flex-direction";
    if (/^(items|justify|content|self|place)-/.test(u)) return u.split("-").slice(0, 2).join("-");
    /* Everything else: drop the final value segment. `grid-cols-12` →
       `grid-cols`, `text-[50px]` → `text`, `py-11` → `py`. */
    const m = /^([a-z-]+?)-(\[.*\]|[^-]+)$/.exec(u);
    return m ? m[1] : u;
  };

  const offences: string[] = [];
  for (const file of [...walk("src")]) {
    const src = strip(readFileSync(file, "utf8"));
    /* Every quoted string that looks like a class list. */
    for (const [, list] of src.matchAll(/["'`]([^"'`\n]*?(?:\s|^)(?:min|max)-\[[^\]]+\]:[^"'`\n]*)["'`]/g)) {
      const classes = list.split(/\s+/).filter(Boolean);
      const byProp = new Map<string, { arbitrary: string[]; named: string[] }>();
      for (const c of classes) {
        const i = c.lastIndexOf(":");
        if (i < 0) continue; // unprefixed — see the note below
        const variant = c.slice(0, i);
        const util = c.slice(i + 1);
        const prop = propertyOf(util);
        if (!byProp.has(prop)) byProp.set(prop, { arbitrary: [], named: [] });
        if (/^(min|max)-\[[^\]]+\]$/.test(variant)) byProp.get(prop)!.arbitrary.push(c);
        else if (NAMED.has(variant)) byProp.get(prop)!.named.push(c);
      }
      for (const [prop, g] of byProp) {
        if (g.arbitrary.length > 0 && g.named.length > 0) {
          offences.push(
            `${file}: "${prop}" is set by both ${g.arbitrary.join(", ")} and ${g.named.join(", ")}`
          );
        }
      }
    }
  }

  /*
    ⚠ SCOPED TO VARIANT-vs-VARIANT, WHICH IS A NARROWING OF THE BRIEF, AND IT IS
    FLAGGED IN THE REPORT.

    The brief asks for "unprefixed OR lower-breakpoint". Unprefixed is excluded
    here because Tailwind v4 emits unvariated utilities in the base layer, before
    every variant layer, so an unprefixed utility ALWAYS loses — and including it
    would condemn six shipped, measured-correct class lists (`grid-cols-8
    min-[520px]:grid-cols-12`, SellSection's `py-[66px] min-[900px]:py-[84px]`,
    …) whose breakpoints were asserted exactly at their own boundaries.

    The hazard the pitfall actually recorded was `sm:` LOSING to `min-[1100px]:`
    — two variants, where source order decides and nothing guarantees it. That is
    what this fails on.
  */
  expect(offences, offences.join("\n")).toEqual([]);
});
