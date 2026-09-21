import { test, expect } from "@playwright/test";
import { signIn } from "./_auth";
import { requireCompleteProvider } from "./_persona";
import { INVITES } from "../prisma/test3-community-spec";

/**
 * ── ⚠⚠ THE COMMUNITY PAGE, WALKED SIGNED IN (`P2-J3-E591` WS-C) ───────────
 *
 * ⚠⚠⚠ AGAINST THE SEEDED COMMUNITY, NOT A DOUBLED ROUTE. `test3@panameer.com`
 * now has 6 colleagues, 1 live invitation and 6 reachable people (seeded
 * 2026-09-20 as an authorised `E564` exception). ⚠ A route double proves the
 * RENDER; only real rows prove the QUERIES, the joins and the second degree.
 *
 * ⚠ `check:community-page` proves the RULES statically. This proves they are
 * true of the DOM the browser actually built.
 */
/**
 * ── ⚠⚠⚠ THE PRECONDITION. IT RUNS FIRST AND IT FAILS LOUDLY (`P0-E595` WS-B) ─
 *
 * ⚠ SCOTT, 2026-09-21: *"The gate must fail loudly if that persona isn't a
 * complete provider. A gate that passes on nothing isn't a gate (E586)."*
 *
 * ⚠⚠ `E586` IS `check:resume` REPORTING `0 passed, 0 failed, 16 skipped` WITH
 * EXIT CODE 0 because its fixtures did not exist, and it was quoted as green in
 * gate tables for weeks. ⚠⚠⚠ THE SAME HOLE OPENED HERE THE MOMENT THE `E595`
 * RESET EMPTIED THE SEED: the account every spec signs in as lost its provider
 * profile, and several assertions in this suite are ABSENCE checks — *"no rate
 * reaches the visitor"* — which a blank page satisfies perfectly.
 * ⚠ So the suite would have gone greener, not redder, on no data at all.
 *
 * ⚠ It asserts the persona as a BUYER sees them: on `/talent`, which only lists
 * providers who pass every clause of `providerMeetsRequired`.
 */
test("⚠⚠⚠ PRECONDITION — the gate persona is a complete, visible provider", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await signIn(page);
  const href = await requireCompleteProvider(page);
  console.log(`E595/WS-B  gate persona OK — ${href}`);
  await page.close();
});

test.describe("⚠ THE COMMUNITY PAGE — P2-J3-E591 WS-C", () => {
  for (const { label, w } of [
    { label: "desktop", w: 1440 },
    { label: "tablet", w: 834 },
    { label: "phone", w: 390 },
  ]) {
    test(`${label} (${w}px) — two columns, cards, rail, no overflow`, async ({ browser }) => {
      const page = await browser.newPage({ viewport: { width: w, height: 1000 } });
      await signIn(page);
      await page.goto("/community", { waitUntil: "networkidle" });

      const cards = page.locator(".pm-cm-card");
      const invited = page.locator(".pm-cm-card-invited");
      const n = await cards.count();
      const nInv = await invited.count();
      console.log(
        `E591/WS-C  ${label.padEnd(7)} ${n} cards (${nInv} invited), ` +
          `rail ${(await page.locator(".pm-cm-rail").count()) ? "present" : "MISSING"}`
      );
      /* ⚠ The seed guarantees these, so a zero here is a broken query, not an
         empty account — which is the whole reason the seed exists. */
      expect(n, "no colleague cards rendered").toBeGreaterThan(0);
      expect(nInv, "the live invitation did not render").toBe(1);

      /* ⚠⚠ THE LAPSED INVITATION MUST NOT APPEAR. Two were seeded; one expired
         three days ago and `status` still reads PENDING.
         ⚠⚠⚠ THE ADDRESSES ARE READ FROM THE SEED SPEC, NOT TYPED. SUPERSEDED,
         quoted not deleted (`E164`):
         //   await expect(page.getByText("marcus.oyelaran@example.com")).toHaveCount(0);
         //   await expect(page.getByText("dana.whitfield@example.com")).toHaveCount(1);
         ⚠ `E595` WS-B renamed the live invitee — `sw_user23@straterp.com` IS Dana
         Whitfield and is now a first-degree COLLEAGUE, so an invitation in the
         same name put one person in two states on one screen. The gate went red
         on the rename rather than on a defect, which is a gate encoding a
         LITERAL where the seed owns the fact. */
      const live = INVITES.find((i) => i.expiresInDays > 0)!;
      const lapsed = INVITES.find((i) => i.expiresInDays < 0)!;
      await expect(page.getByText(lapsed.email)).toHaveCount(0);
      await expect(page.getByText(live.email)).toHaveCount(1);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow, `${label}: page scrolls sideways by ${overflow}px`).toBeLessThanOrEqual(0);

      await page.screenshot({ path: `e2e-shell/.artifacts/e591-community-${label}.png` });
      await page.close();
    });
  }

  /*
    ⚠⚠⚠ NO RATE IN THE DOM, AND NONE IN THE PAYLOAD EITHER. The static gate
    proves the source asks for none; this proves none arrived — including in the
    RSC flight data, which is where a value omitted from the render still lands.
  */
  test("⚠⚠ no rate reaches the page — DOM or payload", async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await signIn(page);
    await page.goto("/community", { waitUntil: "networkidle" });

    const body = await page.locator("body").innerText();
    for (const needle of ["/hr", "per hour", "hourly", "$"]) {
      expect(body.includes(needle), `"${needle}" appears in the rendered page`).toBe(false);
    }
    /* ⚠ The whole served document, not just the visible text. */
    const html = await page.content();
    for (const needle of ["hourly_rate_cents", "rate_min_cents", "rate_max_cents"]) {
      expect(html.includes(needle), `"${needle}" is in the payload`).toBe(false);
    }
    await page.close();
  });

  /*
    ⚠⚠ THE STRETCHED LINK: the whole card opens the profile, and there is no
    anchor inside an anchor. ⚠ Nested anchors are invalid HTML and break
    keyboard order — the browser is the only thing that can prove it did not
    happen, because the parser silently repairs it.
  */
  test("⚠⚠ a joined card opens the profile, with no nested anchor", async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await signIn(page);
    await page.goto("/community", { waitUntil: "networkidle" });

    const nested = await page.evaluate(
      () => document.querySelectorAll(".pm-cm-card a a").length
    );
    expect(nested, "an anchor is nested inside another anchor").toBe(0);

    /*
      ── ⚠⚠ EVERY CARD'S LINK WORKS, NOT JUST THE FIRST (`P2-A3-E596` WS-G 5) ──

      ⚠ SUPERSEDED, quoted not deleted (`E164`):
      //   const href = await page.locator(".pm-cm-card .pm-cm-open").first().getAttribute("href");
      //   expect(href).toMatch(/^\/providers\//);

      ⚠⚠ `E591` WS-C item 5's COUNTER-CASE IS RETIRED — a card that "correctly
      does not link" no longer has a subject. Measured at `E595` WS-B: every
      colleague now has a provider profile, so every card links.
      ⚠⚠⚠ SO THE ASSERTION BECOMES THE STRONGER ONE Scott asked for: each link
      RETURNS 200 AND RENDERS A NAME. A card pointing at a 404 is the failure
      that matters, and checking one card could never find it.
    */
    const hrefs = await page.evaluate(() =>
      [...document.querySelectorAll(".pm-cm-card .pm-cm-open")].map((a) =>
        a.getAttribute("href")
      )
    );
    expect(hrefs.length, "no colleague card rendered a link").toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href).toMatch(/^\/providers\//);
      const res = await page.goto(href!, { waitUntil: "domcontentloaded" });
      expect(res?.status(), `${href} returned ${res?.status()}`).toBeLessThan(400);
      const name = await page.evaluate(
        () => document.querySelector("h2")?.textContent?.trim() ?? ""
      );
      expect(name.length, `${href} rendered no name`).toBeGreaterThan(1);
    }
    console.log(`E596/WS-G  ${hrefs.length} colleague cards, every link 200 with a name`);
    await page.goto("/community", { waitUntil: "networkidle" });

    /* ⚠ An INVITED card opens nothing — there is no profile to open. */
    const invitedLinks = await page.evaluate(
      () => document.querySelectorAll(".pm-cm-card-invited a").length
    );
    expect(invitedLinks, "the invited card is a link").toBe(0);
    await page.close();
  });

  /* ⚠⚠ NEVER INITIALS. The placeholder is the grey silhouette, everywhere. */
  test("⚠ a missing photo is the silhouette, never initials", async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await signIn(page);
    await page.goto("/community", { waitUntil: "networkidle" });
    const counts = await page.evaluate(() => ({
      sil: document.querySelectorAll(".pm-cm-card .pm-sil, .pm-cm-rail .pm-sil").length,
      faces: document.querySelectorAll(".pm-cm-card .pm-face, .pm-cm-rail .pm-face").length,
      initials: document.querySelectorAll(".pm-cm-card .pm-avatar, .pm-cm-rail .pm-avatar").length,
    }));
    console.log(
      `E591/WS-C  faces: ${counts.faces} photos, ${counts.sil} silhouettes, ${counts.initials} initials`
    );
    expect(counts.initials, "an initials avatar rendered").toBe(0);
    /* ⚠ The invited card has no photo by definition, so there is always one. */
    expect(counts.sil, "no silhouette rendered at all").toBeGreaterThan(0);
    await page.close();
  });

  /*
    ── ⚠⚠ IT RENDERS CLEAN, AND EVERY IMAGE IT ASKS FOR ARRIVES ─────────────

    ⚠⚠⚠ THIS EXISTS BECAUSE OF A DEFECT THE SCREENSHOT FOUND AND EVERY OTHER
    ASSERTION MISSED: `Test User 5` has a non-null `photo_url` whose image does
    not load, and the card rendered as a bare magenta circle. ⚠ Counting
    `.pm-face` elements said "7 photos" and was TRUE — the `<img>` existed. It
    just had nothing in it.
    ⚠⚠ SO THE COUNT WAS NOT THE MEASUREMENT. The fallback layer is now asserted
    directly, and the failed requests are printed so a broken photo is visible
    as a broken photo rather than as a design choice.
  */
  test("⚠⚠ no console error, and every face has a fallback underneath", async ({
    browser,
  }) => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text().slice(0, 300));
    });
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message.slice(0, 200)}`));
    const failed: string[] = [];
    page.on("response", (r) => {
      if (r.status() >= 400) failed.push(`${r.status()} ${r.url().slice(0, 90)}`);
    });

    await signIn(page);
    /*
      ⚠⚠ COLLECTED FROM THE NAVIGATION ONWARDS, NOT FROM SIGN-IN. The login
      page requests `/brand/login-bg.mp4`, which IS NOT IN `public/brand/` —
      a PRE-EXISTING 404 on every sign-in in this repo, and `login/page.tsx`
      treats the video as optional (`NEXT_PUBLIC_LOGIN_VIDEO_URL` overrides it).
      ⚠ Attributing somebody else's missing asset to this page would make the
      gate fail for a reason it is not about — and a gate that fails for the
      wrong reason gets waived, which is how a real error later gets ignored.
      ⚠ Reported at the `E591` gate rather than fixed inside this brief.
      ⚠ The same shape as `connect-walk.spec.ts`'s `open()`, deliberately.
    */
    errors.length = 0;
    failed.length = 0;
    await page.goto("/community", { waitUntil: "networkidle" });

    if (failed.length) console.log(`E591/WS-C  ⚠ failed requests: ${failed.join(" | ")}`);
    expect(errors, `console errors: ${errors.join(" | ")}`).toEqual([]);

    /*
      ⚠⚠ EVERY PHOTO SITS ON A SILHOUETTE. A photo without one is a card that
      renders as a hole the day that URL stops resolving — which is not a
      hypothetical, it is what `Test User 5` already does.
    */
    const unbacked = await page.evaluate(
      () =>
        [...document.querySelectorAll(".pm-cm-card .pm-face, .pm-cm-rail .pm-face")].filter(
          (img) => !img.parentElement?.querySelector(".pm-sil")
        ).length
    );
    expect(unbacked, "a photo has no silhouette behind it").toBe(0);

    /* ⚠ And a broken one is genuinely covered: naturalWidth is 0 when the
       image did not decode, and the glyph underneath is what shows. */
    const broken = await page.evaluate(
      () =>
        [...document.querySelectorAll<HTMLImageElement>(".pm-cm-card .pm-face")].filter(
          (i) => i.complete && i.naturalWidth === 0
        ).length
    );
    console.log(`E591/WS-C  ${broken} photo(s) failed to decode — each falls back to the glyph`);
    await page.close();
  });

  /* ⚠⚠ PROFILE COMPLETION DOES NOT APPEAR ON THIS PAGE (item 2). */
  test("⚠⚠ no completion ring and no completeness figure", async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await signIn(page);
    await page.goto("/community", { waitUntil: "networkidle" });
    await expect(page.getByText("Profile Completion")).toHaveCount(0);
    await expect(page.getByText("of 100")).toHaveCount(0);
    await page.close();
  });
});
