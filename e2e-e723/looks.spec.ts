import { test, expect } from "@playwright/test";
import { signInAsSeeded } from "../e2e-shell/_auth";
import { db } from "../e2e-shell/_db";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "e2e-e723", "shots");
const OWNER = "SW_user2@straterp.com";
test.beforeAll(() => mkdirSync(OUT, { recursive: true }));

/** ⚠ Sets the attribute the stylesheet keys on, so dark renders without driving a toggle. */
const setTheme = (t: "light" | "dark") =>
  `document.documentElement.setAttribute("data-theme", "${t}")`;

async function probe(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const cs = (sel: string, prop: string) => {
      const el = document.querySelector<HTMLElement>(sel);
      return el ? getComputedStyle(el).getPropertyValue(prop).trim() : null;
    };
    const rootVar = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    const meta = document.querySelector<SVGElement>(".pm-cp3 svg.stroke-ink-3");
    const btns = [...document.querySelectorAll<HTMLElement>(".pm-rail-button .pm-btn")].map((b) => {
      const r = b.getBoundingClientRect(); const s = getComputedStyle(b);
      return { text: (b.textContent ?? "").trim().slice(0, 34), w: Math.round(r.width), h: Math.round(r.height),
               font: s.fontSize, radius: s.borderTopLeftRadius, bg: s.backgroundColor, border: s.borderTopWidth + " " + s.borderTopColor };
    });
    const railW = document.querySelector(".pm-cp3-rail")
      ? Math.round(document.querySelector(".pm-cp3-rail")!.getBoundingClientRect().width) : null;
    return {
      inkVar: rootVar("--color-ink"), ink3Var: rootVar("--color-ink-3"), surfaceVar: rootVar("--color-surface"),
      surfaceBg: cs(".account-surface", "background-color"),
      /* ⚠ THE SECTION TITLE, NOT "the first h2 on the page". ⚠⚠ A first version read
         `.pm-cp3 h2` and reported the owner's title as grey — it had picked up the RANK
         HIGHER eyebrow, which is `text-ink-3` on purpose and sits earlier in the owner's
         DOM. **Measured, not assumed: the page was right and the selector was wrong.** */
      bodyInk: cs("details.pm-clean-sec h2", "color"),
      /* ⚠ AND THE COUNT BESIDE IT (`E722`), which must stay grey and stay DIFFERENT. */
      countInk: cs("details.pm-clean-sec h2 [data-count]", "color"),
      ringCentreBg: cs(".pm-score-ring > span", "background-color"),
      ringW: Math.round(document.querySelector(".pm-score-ring")?.getBoundingClientRect().width ?? 0),
      ringFont: cs(".pm-score-ring > span", "font-size"),
      eyebrow: cs(".pm-score-block h4", "font-size"),
      metaIconStroke: meta ? getComputedStyle(meta).stroke : "NO ICON FOUND",
      btns, railW,
    };
  });
}

for (const view of ["owner", "visitor"] as const) {
  test(`E723 — ${view}: light + dark, 1280 + 390`, async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });
    await signInAsSeeded(page, OWNER);
    let url = "/profile";
    if (view === "visitor") {
      const solo = await db().project.groupBy({ by: ["provider_profile_id"], where: { employer_id: null }, _count: { _all: true }, orderBy: { _count: { id: "desc" } }, take: 1 });
      url = `/providers/${solo[0]!.provider_profile_id}`;
    }
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2400);

    for (const theme of ["light", "dark"] as const) {
      await page.evaluate(setTheme(theme));
      await page.waitForTimeout(400);
      for (const w of [1280, 390]) {
        await page.setViewportSize({ width: w, height: w === 1280 ? 1600 : 1400 });
        await page.waitForTimeout(500);
        if (w === 1280) {
          const p = await probe(page);
          console.log(`\n══ ${view.toUpperCase()} · ${theme.toUpperCase()} · 1280 ══`);
          console.log(`   --color-ink ${p.inkVar} · --color-ink-3 ${p.ink3Var} · --color-surface ${p.surfaceVar}`);
          console.log(`   .account-surface bg ${p.surfaceBg}  ·  section title ${p.bodyInk} · its count ${p.countInk}`);
          /* ⚠⚠⚠ THE TITLE MUST BE INK AND THE COUNT MUST NOT — both, in both themes. */
          expect(p.bodyInk, "a section title is not ink").toBe(theme === "dark" ? "rgb(242, 240, 247)" : "rgb(39, 35, 52)");
          expect(p.countInk, "the count is the same colour as its title").not.toBe(p.bodyInk);
          console.log(`   ring centre bg ${p.ringCentreBg} · ring ${p.ringW}px · number ${p.ringFont} · eyebrow ${p.eyebrow}`);
          console.log(`   MetaIcon stroke: ${p.metaIconStroke}`);
          console.log(`   rail ${p.railW}px · buttons:`);
          for (const b of p.btns) console.log(`      "${b.text}" ${b.w}×${b.h} font ${b.font} radius ${b.radius} bg ${b.bg} border ${b.border}`);
          /* ⚠⚠⚠ THE DARK-MODE DEFECT ITSELF: the ground must not stay white while ink goes near-white. */
          if (theme === "dark") {
            expect(p.surfaceBg, "the account surface is still painted white in dark mode").not.toBe("rgb(255, 255, 255)");
            expect(p.ringCentreBg, "the score ring centre is still white in dark mode").not.toBe("rgb(255, 255, 255)");
          }
          /* ⚠ ITEM 6: the icon must actually have a stroke. */
          if (view === "owner") {
            expect(p.metaIconStroke, "MetaIcon still has no stroke — the icons are invisible").not.toBe("none");
            expect(p.metaIconStroke, "MetaIcon stroke did not resolve").not.toBe("NO ICON FOUND");
          }
          /* ⚠ ITEM 8: both rail buttons are full column width and the same box. */
          if (view === "owner" && p.btns.length >= 2) {
            expect(p.btns[0].w, "the primary is not full column width").toBeGreaterThan((p.railW ?? 0) - 4);
            expect(p.btns[1].w, "the two rail buttons are different widths").toBe(p.btns[0].w);
            expect(p.btns[1].font, "the two rail buttons are different text sizes").toBe(p.btns[0].font);
            expect(p.btns[1].radius, "the two rail buttons are different radii").toBe(p.btns[0].radius);
            /* ⚠⚠⚠ AND THE PRIMARY'S LABEL MUST NOT MATCH ITS OWN GROUND. ⚠ MEASURED BEFORE
               THE FIX, IN DARK: background rgb(242,240,247) with colour #fff — contrast 1.05,
               a button with no readable label. This is the assertion that caught it. */
            const prim = p.btns[0];
            expect(prim.bg, "the primary button's ground equals the page surface").not.toBe(p.surfaceBg);
            expect(p.btns[1].bg, "the secondary button is not on the page surface").toBe(p.surfaceBg);
          }
        }
        await page.screenshot({ path: join(OUT, `${view}-${theme}-${w}.png`), fullPage: true });
      }
      await page.setViewportSize({ width: 1280, height: 1600 });
    }
    await page.close();
  });
}
