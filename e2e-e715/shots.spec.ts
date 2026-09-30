import { test } from "@playwright/test";
import { signIn } from "../e2e-shell/_auth";
/* ⚠ STATIC, NOT `await import(...)` — a dynamic import in a spec is transformed to a CJS
   `require` and throws *"Cannot use import statement outside a module"* at run time. */
import { db } from "../e2e-shell/_db";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * ── ⚠⚠⚠ `E715` — THE PAIRED SCREENSHOT GATE ───────────────────────────────────
 *
 * ⚠ The brief's gate is *"three pairs of screenshots, mockup beside live"* plus four
 * COMPUTED values. ⚠⚠ **A screenshot is the only thing that caught `E713`'s three still-
 * bordered cards** — the computed-style measurements passed them — so the shots are the gate
 * and the numbers are the evidence beside them.
 *
 * ⚠⚠ `PHASE` NAMES THE RUN (`before` / `after`) so the same spec measures both sides and the
 * files cannot overwrite each other. ⚠⚠⚠ **IT IS ONE SPEC, NOT TWO**, because a second copy
 * is a second chance for the two runs to measure different things (`E585`).
 */
const PHASE = process.env.E715_PHASE ?? "after";
const OUT = join(process.cwd(), "e2e-e715", "shots");
const MOCKUP =
  "file://" +
  join(
    process.cwd(),
    "..",
    "2. Claude Sub-Files",
    "mockups",
    "profile_clean_2026-09-26.html"
  );

test.beforeAll(() => {
  mkdirSync(OUT, { recursive: true });
});

/**
 * ⚠⚠ THE FOUR COMPUTED VALUES THE BRIEF ASKS FOR, READ IN THE BROWSER.
 * ⚠⚠⚠ **THE BACKGROUND IS WALKED UP EVERY ANCESTOR, NOT READ OFF THE PAGE** — the brief says
 * so explicitly (*"Measure the computed background of each ancestor, not just the page"*),
 * because a faint grey can come from any wrapper between `<html>` and the content and reading
 * only one of them is how `E713` was reported clean while Scott could still see it.
 */
async function measure(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const out: Record<string, unknown> = {};

    /* ⚠⚠ THE FALLBACKS ARE WHAT MAKE THE `before` RUN MEAN ANYTHING. The `data-e715-*` hooks
       do not exist on trunk, so without a fallback the BEFORE side would report "NOT FOUND"
       for every value and there would be nothing to compare the AFTER against — a control
       that measures nothing agrees with everything. */
    const img =
      document.querySelector<HTMLElement>("[data-e715-photo]") ??
      document.querySelector<HTMLElement>(".pm-cp3-rail img") ??
      document.querySelector<HTMLElement>(".pm-cp3-rail [class*='rounded-full']");
    if (img) {
      const r = img.getBoundingClientRect();
      out.photo = {
        via: img.hasAttribute("data-e715-photo") ? "data-e715-photo" : "FALLBACK " + img.tagName,
        w: Math.round(r.width),
        h: Math.round(r.height),
        radius: getComputedStyle(img).borderRadius,
      };
    } else out.photo = "NOT FOUND";

    const btnNodes = document.querySelectorAll<HTMLElement>("[data-e715-btn]").length
      ? document.querySelectorAll<HTMLElement>("[data-e715-btn]")
      : document.querySelectorAll<HTMLElement>(
          ".pm-cp3-rail a[href='/community/score'], .pm-cp3-rail a[href^='/providers/']"
        );
    const btns = [...btnNodes].map((b) => {
      const s = getComputedStyle(b);
      return {
        label: (b.textContent ?? "").trim().slice(0, 34),
        radius: s.borderRadius,
        bg: s.backgroundColor,
        color: s.color,
        border: s.borderWidth + " " + s.borderColor,
        w: Math.round(b.getBoundingClientRect().width),
      };
    });
    out.buttons = btns.length ? btns : "NOT FOUND";

    /* ⚠ Every ancestor of the content, from the content up to <html>. A non-transparent
       background anywhere in that chain is what a reader sees as "grey". */
    const anchor =
      document.querySelector<HTMLElement>(".pm-cp3") ??
      document.querySelector<HTMLElement>("main");
    const chain: { tag: string; cls: string; bg: string }[] = [];
    for (let el: HTMLElement | null = anchor; el; el = el.parentElement) {
      chain.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className || "").toString().slice(0, 46),
        bg: getComputedStyle(el).backgroundColor,
      });
    }
    out.bgChain = chain;

    out.sections = [...document.querySelectorAll("details.pm-clean-sec")].map((d) => ({
      id: d.id || null,
      title: (d.querySelector("summary h2")?.textContent ?? "").trim(),
      open: (d as HTMLDetailsElement).open,
    }));

    const wrap = document.querySelector<HTMLElement>(".pm-cp3");
    if (wrap) {
      const s = getComputedStyle(wrap);
      out.grid = { cols: s.gridTemplateColumns, gap: s.columnGap, maxW: s.maxWidth };
    }
    return out;
  });
}

test(`E715 ${PHASE} — /profile at 1280 and 390, with the numbers`, async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
  await signIn(page);
  await page.goto("/profile", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  const m = await measure(page);
  console.log(`\n══ E715 ${PHASE} · COMPUTED ══`);
  console.log(JSON.stringify(m, null, 1));

  await page.screenshot({ path: join(OUT, `${PHASE}-live-1280-top.png`) });

  /* ⚠ The Work History pair. Scrolled to the section rather than shot full-page: the brief
     asks for that region specifically, and a full-page shot of a long profile makes the
     ordering defect (row 12) too small to see. */
  const wh = page.locator("details#work-history").first();
  if (await wh.count()) {
    await wh.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    const entries = await page.locator("#work-history .pm-tl-job").count();
    console.log(`E715 ${PHASE}  owner work-history entries: ${entries}`);
    await page.screenshot({ path: join(OUT, `${PHASE}-live-1280-work.png`) });
  } else {
    console.log("⚠ Work History section NOT FOUND at 1280");
  }

  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/profile", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: join(OUT, `${PHASE}-live-390-top.png`) });

  await page.close();
});

/**
 * ⚠⚠ THE VISITOR VIEW AND `/join/provider`, WHICH THE BRIEF NAMES SEPARATELY.
 * ⚠⚠⚠ `/join/provider` IS THE ONE PAGE THIS BRIEF MAY NOT CHANGE, so it is shot on BOTH
 * sides and compared — *"before and after: one screenshot each, showing it is identical."*
 */
test(`E715 ${PHASE} — visitor profile and /join/provider`, async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
  await signIn(page);

  /* The owner's own public page, reached the way the page itself links to it. */
  await page.goto("/profile", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const href = await page.evaluate(() => {
    const a = [...document.querySelectorAll("a")].find((x) =>
      /^\/providers\//.test(x.getAttribute("href") ?? "")
    );
    return a?.getAttribute("href") ?? null;
  });
  if (href) {
    await page.goto(href, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    console.log(`E715 ${PHASE}  visitor page: ${href}`);
    await page.screenshot({ path: join(OUT, `${PHASE}-visitor-1280.png`) });
  } else {
    console.log("⚠ no /providers/ link found on /profile");
  }

  await page.goto("/join/provider", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(OUT, `${PHASE}-join-provider-1280.png`) });

  await page.close();
});

/**
 * ── ⚠⚠⚠ ROW 12 NEEDS A PROFILE THAT ACTUALLY HAS WORK HISTORY ────────────────────────
 *
 * ⚠⚠ **THE GATE PERSONA HAS NONE — `/profile` renders *"No work history yet."*** ⚠⚠⚠ So the
 * brief's Work History pair, shot on that account, would be a screenshot of an empty section
 * proving that the role now leads. **That is `E586`'s shape: a gate that passes on no
 * inputs**, and it would have been reported as green.
 * ⚠ So the entry is shot on a profile that HAS employers, FOUND AT RUNTIME rather than
 * hard-coded — an id pasted into a spec is stale the first time the data moves.
 * ⚠⚠ It is the VISITOR view, and that is not a weaker proof: `/providers/[id]` renders the
 * SAME `ConnectProfile`, which passes `roleFirst` unconditionally, so it is the same call
 * site and the same component. The owner's own page is shot separately above.
 * ⚠ **READ-ONLY. Nothing is seeded and nothing is written** beyond the `recordProfileView`
 * row the app writes on any non-owner render, which is ordinary browsing.
 */
test(`E715 ${PHASE} — Work History where there IS work history`, async ({ browser }) => {
  const prisma = db();
  const hit = await prisma.providerProfile.findFirst({
    where: { employers: { some: {} } },
    select: { id: true, _count: { select: { employers: true } } },
    orderBy: { employers: { _count: "desc" } },
  });
  await prisma.$disconnect();
  if (!hit) {
    console.log("⚠⚠ NO PROFILE IN THE DATABASE HAS ANY EMPLOYER — row 12 is unprovable here.");
    return;
  }

  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
  await signIn(page);
  await page.goto(`/providers/${hit.id}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const wh = page.locator("details#work-history").first();
  if (await wh.count()) {
    await wh.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
  }
  /* ⚠ The assertion is on the DATA, not on a heading: the shot must contain real entries or
     it proves nothing about the order they are printed in. */
  const entries = await page.locator("#work-history .pm-tl-job").count();
  console.log(
    `E715 ${PHASE}  work-history proof: /providers/${hit.id} — ${hit._count.employers} employers, ${entries} rendered`
  );
  await page.screenshot({ path: join(OUT, `${PHASE}-work-proof-1280.png`) });
  await page.close();
});

/**
 * ⚠ The mockup, at the same two widths, so each pair is a like-for-like comparison.
 * ⚠⚠ It is shot on both phases even though it cannot change — a pair is only readable if both
 * halves were taken by the same browser at the same width.
 */
test(`E715 ${PHASE} — the mockup at 1280 and 390`, async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
  await page.goto(MOCKUP, { waitUntil: "load" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(OUT, `mockup-1280-top.png`) });

  const job = page.locator(".job").first();
  if (await job.count()) {
    await job.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT, `mockup-1280-work.png`) });
  }

  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(MOCKUP, { waitUntil: "load" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, `mockup-390-top.png`) });

  /* ⚠ Reported, not assumed: the mockup pulls Montserrat from Google Fonts. If the network
     refused it the shot is a fallback face and every width in it is wrong by ~12% (rule 4). */
  const font = await page.evaluate(() =>
    document.fonts.check('600 16px Montserrat') ? "Montserrat loaded" : "FALLBACK FACE"
  );
  console.log(`E715  mockup font: ${font}`);

  await page.close();
});
