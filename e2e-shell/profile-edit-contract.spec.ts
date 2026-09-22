import { test, expect, type Page } from "@playwright/test";
import { signIn } from "./_auth";

/**
 * ── ⚠⚠⚠ THE PROFILE'S EDIT CONTROLS, BY SHAPE (`P2-A2-E597` WS-D) ─────────
 *
 * ⚠ SCOTT, 2026-09-21: *"Render the owner's profile, collect every Edit
 * control, and for each: it doesn't resolve under /join; it renders 200 inside
 * the profile's frame; and it shows exactly one section. Assert the count is
 * > 0."*
 *
 * ── ⚠⚠ WHY BY SHAPE AND NOT BY A LIST OF SECTIONS ────────────────────────
 *
 * ⚠⚠⚠ A GATE THAT NAMES WHAT IT CHECKS GOES BLIND THE DAY SOMETHING IS ADDED,
 * AND IT GOES BLIND SILENTLY — it keeps passing, on a shrinking fraction of the
 * page. ⚠ `check:review-edit` is the worked example: it read
 * `ProviderProfileView.tsx` for months after `E588` stopped rendering it, and
 * its assertions were true about a file nothing imports.
 * ⚠⚠ MEASURED, AND IT ALREADY EARNED ITS KEEP: this collector found **TEN**
 * controls where WS-C's hand count found NINE. `Add a Service Product` reached
 * `/my-services` and was missed because it carries no `aria-label` — a list
 * written from that count would have been wrong on the day it was written.
 *
 * ── ⚠⚠⚠ IT RENDERS EVERY ONE. THAT IS THE POINT, NOT A DETAIL ────────────
 *
 * ⚠ WS-C's first build passed `tsc` AND `npm run build` and returned **500 on
 * six of the eight editor routes**: the page handed a client component a
 * `SectionSpec`, whose `payload` is a FUNCTION, and functions cannot cross that
 * boundary. ⚠⚠ NEITHER THE COMPILER NOR THE BUILD CAN SEE IT — only rendering
 * can. ⚠⚠⚠ And the two routes that did NOT fail were the two whose payload is
 * `null`, so the damage looked like an unfinished feature rather than a break.
 * ⚠ A STATIC GATE WOULD HAVE PASSED ON ALL EIGHT.
 *
 * ── ⚠ `E586` — A GATE WITH NO INPUTS MUST FAIL ───────────────────────────
 *
 * ⚠⚠ `check:resume` has reported `0 passed, 0 failed, 16 skipped` and EXIT 0
 * for weeks, and has been quoted as green in gate tables. ⚠ So the count is
 * asserted FIRST here: if the profile renders no Edit controls — because the
 * persona lost its profile, or the selector stopped matching — this suite fails
 * loudly instead of passing over an empty list.
 */

/** ⚠ `/profile` is the stable route (`E591`). Where it RESOLVES is free to
    move — it redirects to `/connect` today — and this suite deliberately does
    not care, which is what stops it pinning a redirect the avatar-menu brief
    is about to change. */
const PROFILE = "/profile";

/**
 * ⚠⚠ THE SHAPE: an anchor whose accessible name OPENS with an edit verb.
 * ⚠ `aria-label` FIRST, THEN TEXT — and the fallback is not optional padding:
 * `Add a Service Product` has no `aria-label` at all, and it is exactly the
 * control a name-only collector misses.
 * ⚠⚠⚠ ANCHORED WITH `^`. An unanchored match would sweep in any sentence
 * containing the word "edit", and a collector that over-collects fails on
 * innocent copy — which gets it deleted, which is worse than a narrow one.
 */
const EDIT_VERB = /^(Edit|Add|Manage)\b/i;

type Control = { name: string; href: string };

async function collectEditControls(page: Page): Promise<Control[]> {
  await page.goto(PROFILE, { waitUntil: "domcontentloaded" });
  /* ⚠ The profile's cards hydrate before the owner-only affordances settle. */
  await page.waitForSelector("a[href]");
  await page.waitForTimeout(1200);
  return page.evaluate((src) => {
    const re = new RegExp(src, "i");
    return [...document.querySelectorAll("a[href]")]
      .map((a) => ({
        name: (a.getAttribute("aria-label") || a.textContent || "").replace(/\s+/g, " ").trim(),
        href: a.getAttribute("href") ?? "",
      }))
      .filter((c) => c.href && re.test(c.name));
  }, EDIT_VERB.source);
}

test.describe("⚠⚠⚠ E597 WS-D — every Edit control on the owner's profile", () => {
  test("⚠⚠ the profile offers Edit controls at all (E586 — no inputs must fail)", async ({
    page,
  }) => {
    await signIn(page);
    const controls = await collectEditControls(page);
    console.log(
      `E597/WS-D  ${controls.length} edit controls: ` +
        controls.map((c) => `${c.name} → ${c.href}`).join(" · ")
    );
    /* ⚠⚠⚠ THE `E586` ASSERTION. An empty list is a BROKEN GATE, never a pass. */
    expect(
      controls.length,
      "the owner's profile rendered NO edit controls — the persona, the page or the selector is broken, and a suite that passes here is proving nothing (E586)"
    ).toBeGreaterThan(0);
  });

  test("⚠⚠⚠ no Edit control resolves under /join", async ({ page }) => {
    await signIn(page);
    const controls = await collectEditControls(page);
    expect(controls.length).toBeGreaterThan(0);
    /*
      ⚠ SCOTT, filing this: *"I went to edit the specializations… and when I
      clicked the edit hyperlink it takes me back to the registration walk. This
      is wrong and presents multiple issues (not the right page, not the right
      menu)."*
      ⚠⚠ THE REDIRECT COUNTS, NOT JUST THE href. A link to `/profile/edit/x`
      that 307s into the wizard would satisfy a text scan and fail the person.
    */
    const offenders: string[] = [];
    for (const c of controls) {
      const target = c.href.split("#")[0];
      if (/^\/join(\/|$|\?)/.test(target)) {
        offenders.push(`${c.name} → ${c.href} (href)`);
        continue;
      }
      await page.goto(target, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(400);
      const landed = new URL(page.url()).pathname;
      if (/^\/join(\/|$)/.test(landed)) offenders.push(`${c.name} → ${c.href} redirected to ${landed}`);
    }
    expect(offenders, `edit controls still reaching the registration wizard:\n  ${offenders.join("\n  ")}`).toEqual([]);
  });

  test("⚠⚠⚠ every Edit control renders 200 in the profile's frame", async ({ page }) => {
    await signIn(page);
    const controls = await collectEditControls(page);
    expect(controls.length).toBeGreaterThan(0);
    const bad: string[] = [];
    for (const c of controls) {
      const res = await page.goto(c.href.split("#")[0], { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(700);
      const status = res?.status() ?? 0;
      const frame = await page.evaluate(() => ({
        /* ⚠ The app band — every logged-in page wears it (`E559`). Its absence
           means the page rendered outside the shell, which is the "not the
           right menu" half of the complaint. */
        band: !!document.querySelector("header") || !!document.querySelector("nav"),
        /* ⚠⚠ AND NO CONNECT TAB ROW. A profile editor under a tab row saying
           CONNECT is the same complaint in a new place. */
        connectTabs: /\bCONNECT\b\s*\|/.test(document.body.innerText),
        /* ⚠⚠⚠ A 500 CAN STILL ANSWER 200 in a route that catches its own throw,
           so the error surface is asserted absent as well as the status. */
        errored: /This page couldn.t load|Application error|Unhandled Runtime Error/i.test(
          document.body.innerText
        ),
      }));
      if (status !== 200) bad.push(`${c.name} → ${c.href} returned ${status}`);
      else if (frame.errored) bad.push(`${c.name} → ${c.href} rendered an error page`);
      else if (!frame.band) bad.push(`${c.name} → ${c.href} rendered outside the app shell`);
      else if (frame.connectTabs) bad.push(`${c.name} → ${c.href} rendered under a CONNECT tab row`);
    }
    expect(bad, `edit destinations that did not render in the profile's frame:\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  test("⚠⚠⚠ each one-section editor shows exactly one section, and it is the one named", async ({
    page,
  }) => {
    await signIn(page);
    const controls = await collectEditControls(page);
    /*
      ── ⚠⚠ THE PARTITION IS MEASURED, NOT ASSUMED ─────────────────────────

      ⚠ Of the ten controls, EIGHT reach `/profile/edit/<slug>` and two reach
      whole pages of their own — `Add a Service Product` → `/my-services` and
      `Manage Account Health` → `/account-health`.
      ⚠⚠ "EXACTLY ONE SECTION" IS A CLAIM ABOUT A ONE-SECTION EDITOR, so it is
      asserted over the first group only. The other two are still held to the
      `/join` and render rules above, which is where they belong.
      ⚠⚠⚠ THE GROUP IS DERIVED FROM THE href, NOT FROM A LIST OF SLUGS — adding
      a ninth section puts it in scope automatically, which is the entire reason
      this suite is shaped this way.
    */
    const editors = controls.filter((c) => /^\/profile\/edit\//.test(c.href));
    console.log(
      `E597/WS-D  ${editors.length} one-section editors of ${controls.length} controls: ` +
        editors.map((c) => c.href.replace("/profile/edit/", "")).join(" · ")
    );
    expect(
      editors.length,
      "no control reached /profile/edit/<section> — the one-section editors are gone or the route moved (E586)"
    ).toBeGreaterThan(0);

    const bad: string[] = [];
    for (const c of editors) {
      await page.goto(c.href.split("#")[0], { waitUntil: "domcontentloaded" });
      await page.waitForSelector("h1");
      await page.waitForTimeout(500);
      const seen = await page.evaluate(() => ({
        h1s: [...document.querySelectorAll("h1")].map((h) => (h.textContent ?? "").trim()),
        /* ⚠ The wizard's stepper must not be here. `E597`'s whole complaint is
           that a one-field edit presented itself as part of a sequence. */
        stepper: /\b\d\s*\/\s*\d\b/.test(document.body.innerText),
        next: [...document.querySelectorAll("button")].some(
          (b) => (b.textContent ?? "").trim() === "Next"
        ),
      }));
      /* ⚠⚠ ONE `<h1>` IS WHAT "EXACTLY ONE SECTION" MEANS ON THE PAGE. Two
         headings would mean two sections mounted, which is the wizard again. */
      if (seen.h1s.length !== 1) {
        bad.push(`${c.href} rendered ${seen.h1s.length} h1s [${seen.h1s.join(" | ")}]`);
        continue;
      }
      /*
        ⚠⚠⚠ AND IT IS THE SECTION THE LINK NAMED. Without this, every editor
        could open the same section and all four assertions above would pass.
        ⚠ The control's own name carries the section — `Edit Specializations` →
        `Specializations` — so the link and the page are checked against each
        other rather than both against a list this gate would have to hold.
      */
      const named = c.name.replace(EDIT_VERB, "").trim().toLowerCase();
      if (seen.h1s[0].toLowerCase() !== named) {
        bad.push(`${c.name} opened "${seen.h1s[0]}" — the link and the page disagree`);
      }
      if (seen.stepper) bad.push(`${c.href} shows a step counter`);
      if (seen.next) bad.push(`${c.href} offers a Next button`);
    }
    expect(bad, `one-section editors that did not show exactly their own section:\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  /*
    ── ⚠⚠⚠ NO LINK ON EITHER PAGE REACHES THE WIZARD (`P2-A2-E600` WS-F) ─────

    ⚠ SCOTT: *"every link on the profile and the Score page, none matching
    /join, count > 0."*
    ⚠⚠ THE TEST ABOVE COLLECTS ONLY **EDIT CONTROLS**. This collects **EVERY
    ANCHOR** on both pages — `E597`'s complaint was never limited to links that
    happen to start with the word "Edit", and the Score page proved it: all 16
    of its action links pointed into `/join/provider` while every Edit control
    on the profile was already correct.
    ⚠⚠⚠ THE COUNT IS ASSERTED FIRST (`E586`). A page that rendered no links at
    all would satisfy "none match /join" perfectly.
  */
  test("⚠⚠⚠ no link on the profile or the Score page reaches /join", async ({ page }) => {
    await signIn(page);
    const offenders: string[] = [];
    let total = 0;
    for (const route of [PROFILE, "/community/score"]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("a[href]");
      await page.waitForTimeout(1200);
      const links = await page.evaluate(() =>
        [...document.querySelectorAll("a[href]")].map((a) => ({
          name: (a.getAttribute("aria-label") || a.textContent || "").replace(/\s+/g, " ").trim(),
          href: a.getAttribute("href") ?? "",
        }))
      );
      total += links.length;
      for (const l of links) {
        if (/^\/join(\/|$|\?)/.test(l.href)) offenders.push(`${route}: ${l.name} → ${l.href}`);
      }
    }
    /* ⚠⚠ COUNT FIRST — the absence check below is worthless on an empty page. */
    expect(
      total,
      "neither page rendered any links — the persona, the routes or the selector is broken (E586)"
    ).toBeGreaterThan(0);
    expect(
      offenders,
      `links still reaching the registration wizard:\n  ${offenders.join("\n  ")}`
    ).toEqual([]);
    console.log(`E600/WS-F  ${total} links across /profile and /community/score, 0 into /join`);
  });
});