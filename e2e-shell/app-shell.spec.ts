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
      /*
        ⚠ WAIT FOR THE HEADER, NOT FOR A CLOCK. A fixed 600ms lost a race once on
        the first visit to a route in a session — a cold Turbopack compile beats
        it — and `retries: 0` means a flake is a finding rather than something to
        re-run past. Waiting on the thing being measured removes the class.
      */
      await page.waitForSelector("header", { state: "attached", timeout: 30_000 });
      await page.waitForTimeout(400);
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

// ---------------------------------------------------------------------------
// THE MARKETING HEADER (P1-ALL-E004)
// ---------------------------------------------------------------------------

/**
 * ⚠ 767 · 768 · 769 ARE IN THIS LIST ON PURPOSE.
 *
 * The bug lived at exactly `md` and for ~27px above it: at 767 the ☰ carried
 * everything and the row was 21px wide; at 768 the nav and the auth cluster both
 * switched on while the ☰ switched off, and the row needed 819px of a 768px
 * viewport. A sweep that steps 640 → 900 walks straight over it.
 */
const PUBLIC_WIDTHS = [360, 375, 640, 767, 768, 769, 900, 1000, 1100, 1180, 1282, 1440, 1562];

const PUBLIC_PAGES = ["/", "/learn", "/hire-talent", "/find-work", "/buy-services"];

/**
 * ⚠ SIX ITEMS SINCE `P1-J0-E245`, AND THIS SUITE READS THEM, NEVER SETS THEM.
 *
 * They are Scott's labels. The pairs are declared here as label+href TOGETHER
 * because the assertion below keys on the HREF and checks the label against it —
 * see the note on `navByHref`.
 */
const PUBLIC_NAV_ITEMS = [
  { label: "Learn", href: "/learn" },
  { label: "Talent", href: "/hire-talent" },
  { label: "Work", href: "/find-work" },
  { label: "Shop", href: "/buy-services" },
  /*
    ⚠ `/optimize`, NOT `/assess` — REPOINTED 2026-08-21 (`P1-J0-E266`). This
    assertion caught the change, which is what it is for. `/assess` is the wizard
    and keeps focused chrome with NO marketing nav, so a nav item pointing there
    dropped the visitor out of the header they had just used. The destination
    moved; the assertion follows it.
  */
  { label: "Optimize", href: "/optimize" },
  { label: "Integrate", href: "/enterprise" },
] as const;

const PUBLIC_NAV_LABELS = PUBLIC_NAV_ITEMS.map((i) => i.label);

async function measurePublic(p: Page) {
  return p.evaluate((labels: string[]) => {
    const header = document.querySelector("header");
    if (!header) return null;
    const iw = window.innerWidth;

    /* An element inside a horizontal scroller is legitimately past the edge. */
    const inScroller = (e: Element) => {
      let n = e.parentElement;
      while (n && n !== document.body) {
        if (/auto|scroll|hidden/.test(getComputedStyle(n).overflowX)) return true;
        n = n.parentElement;
      }
      return false;
    };
    const visible = (e: Element | null) => {
      if (!e) return false;
      const cs = getComputedStyle(e);
      const b = e.getBoundingClientRect();
      return cs.display !== "none" && cs.visibility !== "hidden" && b.width > 0 && b.height > 0;
    };
    const size = (e: Element | null) => {
      if (!e) return { w: 0, h: 0 };
      const b = e.getBoundingClientRect();
      return { w: Math.round(b.width), h: Math.round(b.height) };
    };

    const pastRight: string[] = [];
    const offLeft: string[] = [];
    header.querySelectorAll("*").forEach((e) => {
      const b = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden") return;
      if (b.width === 0 || b.height === 0) return;
      if (inScroller(e)) return;
      const d = `${e.tagName}.${String((e as HTMLElement).className).slice(0, 40)}`;
      if (b.right > iw + 0.5) pastRight.push(`${d} right=${Math.round(b.right)}`);
      if (b.left < -0.5) offLeft.push(`${d} left=${Math.round(b.left)}`);
    });

    /*
      ⚠ EVERY LINK IN THE HEADER, ROW OR DRAWER. The drawer is only in the DOM
      while it is open, so the burger is clicked before this runs — which is also
      the only honest way to assert "Log In is reachable at 375".
    */
    const links = [...header.querySelectorAll("a")];
    const byText = (t: string) =>
      links.filter((a) => (a.textContent ?? "").trim() === t).find((a) => visible(a)) ?? null;

    const logo = header.querySelector("img, svg");
    const burger = header.querySelector('button[aria-label="Toggle navigation"]');
    const current = links.filter((a) => a.getAttribute("aria-current") === "page");

    return {
      innerWidth: iw,
      headerClientWidth: header.clientWidth,
      headerScrollWidth: header.scrollWidth,
      /* ⚠ scrollWidth omits the END PADDING once content overflows. Add it back
         before treating this as the row's true requirement. */
      endPadding: (() => {
        const row = header.firstElementChild;
        return row ? Math.round(parseFloat(getComputedStyle(row).paddingRight)) : 0;
      })(),
      docScrollWidth: document.documentElement.scrollWidth,
      pastRight,
      offLeft,
      logo: { ...size(logo), shown: visible(logo) },
      burgerShown: visible(burger),
      nav: Object.fromEntries(
        labels.map((l) => {
          const el = byText(l);
          return [l, { ...size(el), shown: Boolean(el) }];
        })
      ),
      /*
        ⚠ KEYED BY HREF, NOT BY LABEL, AND THAT IS THE WHOLE POINT (E245).

        "Talent" and "Work" are single words that sit adjacent and are the two
        sides of one market, so an off-by-one in `MARKETING_NAV` swaps a buyer
        destination for a seller one AND STILL READS PLAUSIBLY down the row. A
        label-keyed lookup cannot see that — `byText("Talent")` finds an anchor
        called Talent whatever it points at. This reads every visible header
        anchor by its href and reports the WORD attached to it, so the test can
        assert the pairing rather than the vocabulary.

        First visible match wins: the drawer duplicates the row between 768 and
        1023 by design, and both copies carry the same href.
      */
      navByHref: Object.fromEntries(
        [...new Set(links.map((a) => a.getAttribute("href") ?? ""))]
          .filter(Boolean)
          .map((href) => {
            const el = links.filter((a) => a.getAttribute("href") === href).find((a) => visible(a));
            return [
              href,
              { label: el ? (el.textContent ?? "").trim() : null, ...size(el), shown: Boolean(el) },
            ];
          })
      ),
      logIn: { ...size(byText("Log In")), shown: Boolean(byText("Log In")) },
      signUp: { ...size(byText("Sign Up")), shown: Boolean(byText("Sign Up")) },
      ariaCurrent: current.map((a) => `${(a.textContent ?? "").trim()}→${a.getAttribute("href")}`),
    };
  }, labels_);
}

/* Passed in rather than closed over, so the browser context gets a plain array. */
const labels_ = PUBLIC_NAV_LABELS;

test.describe("the MARKETING header", () => {
  for (const url of PUBLIC_PAGES) {
    test(`MARKETING GUARD 1+2 — clean and whole across the width sweep on ${url}`, async ({
      browser,
    }) => {
      /* No session: these are public pages, and signing in would change the shell. */
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const pub = await ctx.newPage();
      const rows: string[] = [];
      try {
        for (const w of PUBLIC_WIDTHS) {
          await pub.setViewportSize({ width: w, height: 900 });
          await pub.goto(url, { waitUntil: "domcontentloaded" });
          /* Same reason as the app block above: wait on the header, not a clock. */
          await pub.waitForSelector("header", { state: "attached", timeout: 30_000 });
          await pub.waitForTimeout(400);

          /*
            Open the drawer when it is the thing carrying the links. Below lg the
            row has only the logo and the ☰, so "Log In is reachable" is a claim
            about the drawer and has to be tested there.
          */
          const burger = await pub.$('button[aria-label="Toggle navigation"]');
          const burgerVisible = burger ? await burger.isVisible() : false;
          if (burgerVisible) {
            await burger!.click();
            await pub.waitForTimeout(250);
          }

          const m = await measurePublic(pub);
          expect(m, `no <header> on ${url}`).not.toBeNull();
          const r = m!;
          rows.push(
            `  ${String(w).padStart(4)}  doc ${String(r.docScrollWidth).padStart(4)}  hdr ${String(r.headerClientWidth).padStart(4)}/${String(r.headerScrollWidth).padStart(4)} (+${r.endPadding} end pad)  ☰ ${r.burgerShown ? "on" : "off"}`
          );

          // ── GUARD 1 — overflow, both directions, separately (E168) ──────
          expect(r.pastRight, `${url} @${w}: marketing header past the RIGHT edge`).toEqual([]);
          expect(r.offLeft, `${url} @${w}: marketing header clipped off the LEFT`).toEqual([]);
          expect(
            r.headerScrollWidth,
            `${url} @${w}: the marketing header scrolls sideways`
          ).toBeLessThanOrEqual(r.headerClientWidth);

          // ── GUARD 2 — everything reachable, with real size ──────────────
          expect(r.logo.shown, `${url} @${w}: the logo is not rendered`).toBe(true);
          expect(r.logo.w, `${url} @${w}: the logo has no width`).toBeGreaterThan(40);

          /*
            ⚠ PRESENCE **WITH NON-ZERO SIZE**, NOT PRESENCE. An item hidden at a
            breakpoint is still in the DOM and still `querySelector`-able; only
            its rect says whether anyone can click it. `> 20` is the floor for the
            shortest label in the set ("Work", 41.77 at 1024) with room to spare.
          */
          for (const label of PUBLIC_NAV_LABELS) {
            const item = r.nav[label];
            expect(item.shown, `${url} @${w}: nav item "${label}" is unreachable`).toBe(true);
            expect(item.w, `${url} @${w}: nav item "${label}" has no width`).toBeGreaterThan(20);
          }

          /*
            ⚠ AND THE SAME SIX ASSERTED **BY HREF** (E245). The loop above proves
            six words are on screen; this proves each word is on the right door.
            `Talent`/`Work` is the pair that matters — swap those two hrefs in
            `MARKETING_NAV` and the row still reads plausibly left to right, so a
            label-keyed test passes a broken nav.
          */
          for (const { label, href } of PUBLIC_NAV_ITEMS) {
            const item = r.navByHref[href];
            expect(item, `${url} @${w}: no header link points at ${href}`).toBeTruthy();
            expect(item.shown, `${url} @${w}: the link to ${href} is unreachable`).toBe(true);
            expect(item.w, `${url} @${w}: the link to ${href} has no width`).toBeGreaterThan(20);
            expect(
              item.label,
              `${url} @${w}: ${href} is labelled "${item.label}", expected "${label}" — a nav item is on the wrong door`
            ).toBe(label);
          }
          /*
            ⚠ BOTH AUTH BUTTONS, AT EVERY WIDTH. This is the assertion that would
            have caught moving the cluster to `lg:flex` while leaving the ☰ at
            `md:hidden` — a band with no Log In and no Sign Up anywhere.
          */
          for (const [name, btn] of [["Log In", r.logIn], ["Sign Up", r.signUp]] as const) {
            expect(btn.shown, `${url} @${w}: "${name}" is unreachable`).toBe(true);
            expect(btn.w, `${url} @${w}: "${name}" has no width`).toBeGreaterThan(40);
            expect(btn.h, `${url} @${w}: "${name}" is under 24px tall`).toBeGreaterThanOrEqual(24);
          }

          /*
            ⚠ EXACTLY ONE aria-current. The component's own comment records a bug
            where three items read as selected at once; a breakpoint change must
            not resurrect it. `/` has no nav destination of its own, so zero there
            is correct — one is the ceiling, not the floor.

            The drawer duplicates the nav above md, so the current item legitimately
            appears twice in the DOM; they are the same destination, which is what
            is asserted.
          */
          const destinations = new Set(r.ariaCurrent.map((x) => x.split("→")[1]));
          expect(
            destinations.size,
            `${url} @${w}: ${destinations.size} different items claim aria-current — ${r.ariaCurrent.join(", ")}`
          ).toBeLessThanOrEqual(1);
          if (url !== "/") {
            expect(
              destinations.size,
              `${url} @${w}: nothing is marked as the current page`
            ).toBe(1);
          }
        }
        console.log(`\n${url}\n${rows.join("\n")}`);
      } finally {
        await ctx.close();
      }
    });
  }
});
