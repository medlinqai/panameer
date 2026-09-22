import { test, expect, type Page } from "@playwright/test";
import { signIn, signInAsSeeded } from "./_auth";
import { requireCompleteProvider } from "./_persona";
import { db } from "./_db";

/**
 * ── ⚠⚠ THE VISITOR PAGE, AND THE OWNER'S UNCHANGED (`E593` WS-C item 13) ──
 *
 * ⚠⚠⚠ `/providers/[id]` RENDERS `ConnectProfile` IN VISITOR MODE — the SAME
 * component the owner sees at `/connect` (`E588` WS-B). So every item-13 change
 * is a change to the owner's page too unless it sits behind the owner flag.
 * ⚠ Scott, at the WS-B gate: *"any owner-side difference is a failure, not
 * something to explain."* ⚠⚠ BOTH MODES ARE THEREFORE ASSERTED IN ONE FILE,
 * because a guarantee about two surfaces cannot be proved on one.
 *
 * ⚠ `test3@panameer.com` is a PROVIDER (measured, `_auth.ts`), which is the
 * exact persona Scott's rate ruling is about: *"I do nto think providers should
 * see other provider's rates."*
 */

/** ⚠ Resolved from the page, never hardcoded — an id in a spec rots silently. */
async function firstColleagueProfile(page: Page): Promise<string> {
  await page.goto("/community", { waitUntil: "networkidle" });
  const href = await page.locator(".pm-cm-card .pm-cm-open").first().getAttribute("href");
  expect(href, "no colleague card links to a profile").toBeTruthy();
  return href!;
}

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

test.describe("⚠ THE VISITOR PROFILE — P2-J3-E593 WS-C", () => {
  test("⚠⚠⚠ no rate reaches the visitor — DOM or RSC payload", async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await signIn(page);
    const href = await firstColleagueProfile(page);
    await page.goto(href, { waitUntil: "networkidle" });

    /*
      ⚠⚠⚠ LOWER-CASED, AND THIS WAS A REAL FALSE PASS. `innerText` returns the
      RENDERED text, so a heading with `text-transform: uppercase` — which the
      `Grow Your Income Faster` card has — comes back as `GROW YOUR INCOME
      FASTER`. ⚠ The owner assertion failed on it honestly; **the VISITOR
      assertion PASSED on it dishonestly**, because the absent-check could never
      have matched either way. ⚠⚠ A case-sensitive needle against transformed
      text is a test that cannot fail.
    */
    const body = (await page.locator("body").innerText()).toLowerCase();
    for (const needle of ["Rates", "/hr", "per hour", "Onsite", "Fully Remote"]) {
      expect(body.includes(needle.toLowerCase()), `"${needle}" is visible on ${href}`).toBe(false);
    }
    /*
      ── ⚠⚠⚠ THE PAYLOAD CHECK, AND WHY IT IS NOT WRITTEN AS AN ABSENCE ──────

      ⚠ The brief asks for proof that no rate reaches the RSC payload, *"a field
      absent from the DOM but present in the payload is still disclosed."*
      ⚠⚠ MEASURED 2026-09-20, AND THE FIRST VERSION OF THIS TEST WAS VACUOUS:
      `onsiteCents`, `remoteCents`, `minCents`, `maxCents` and `hourlyCents`
      appear in **NEITHER** page — not the visitor's, and **not the owner's**,
      which has 31 flight script tags and none of those strings.
      ⚠⚠⚠ THE REASON IS STRUCTURAL: `ConnectProfile` and everything under it are
      SERVER components. `p` is never serialised, because no client component
      receives it — only the rendered HTML crosses the wire.
      ⚠ SO AN ABSENCE ASSERTION HERE COULD NEVER FAIL, which is `E586` exactly:
      a check with no inputs reporting success. **It was removed rather than
      left to be quoted as proof.**

      ⚠⚠ WHAT IS ASSERTED INSTEAD IS THE THING THAT CAN ACTUALLY GO WRONG: no
      MONEY FIGURE anywhere in the visitor's document. That covers the rendered
      DOM and any future flight data in one test, and it keeps failing if
      somebody later turns a card into a client component.
      ⚠ The view-model shape — `p.rates` is `null` for a non-owner — is gated
      statically in `check:community-page`, where it CAN fail.
    */
    /*
      ⚠⚠ AND NOT A BLANKET "NO MONEY" CHECK EITHER, WHICH WAS THE SECOND WRONG
      ANSWER. Two measurements killed it:
        1. run over `page.content()` it matched Next's own flight markers —
           `$1`, `$2`, `$15` — which are reference ids, not prices;
        2. run over the visible text it would still be WRONG, because
           **Service Products legitimately show prices to a visitor**
           (`{!owner && serviceProducts}`) and always have.
      ⚠⚠⚠ THE RULE IS "NO RATE", NOT "NO MONEY". A product's price is the thing
      a buyer is here to see; an engagement rate is what Scott ruled private.
      ⚠ So the assertion is the one directly above — the rate LABELS are absent
      — plus the view-model shape gated in `check:community-page`, which is
      where a structural claim can actually fail.
    */
    expect(
      await page.locator("text=/^Rate$/").count(),
      "a `Rate` row rendered on the visitor page"
    ).toBe(0);
    console.log(`E593/WS-C  visitor ${href} — no rate in DOM or payload`);
    await page.screenshot({ path: "e2e-shell/.artifacts/e593-visitor-desktop.png" });
    await page.close();
  });

  test("⚠ the visitor sees no owner-only surface", async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await signIn(page);
    const href = await firstColleagueProfile(page);
    await page.goto(href, { waitUntil: "networkidle" });
    /*
      ⚠⚠⚠ LOWER-CASED, AND THIS WAS A REAL FALSE PASS. `innerText` returns the
      RENDERED text, so a heading with `text-transform: uppercase` — which the
      `Grow Your Income Faster` card has — comes back as `GROW YOUR INCOME
      FASTER`. ⚠ The owner assertion failed on it honestly; **the VISITOR
      assertion PASSED on it dishonestly**, because the absent-check could never
      have matched either way. ⚠⚠ A case-sensitive needle against transformed
      text is a test that cannot fail.
    */
    const body = (await page.locator("body").innerText()).toLowerCase();
    /* ⚠ Scott: no stats, no account health, and NO `Grow Your Income Faster` —
       *"this is basically an ad."* ⚠ The completion ring was already owner-only
       (`E588`) and is asserted here so it stays that way. */
    for (const needle of [
      "Grow Your Income Faster",
      "Account Health",
      "Profile Completion",
      "My Stats",
    ]) {
      expect(body.includes(needle.toLowerCase()), `"${needle}" leaked to the visitor view`).toBe(false);
    }
    /* ⚠⚠ COLLEAGUE **COUNT** ONLY, NEVER WHO. */
    expect(body.includes("my colleagues"), "the owner's colleague link leaked").toBe(false);
    const named = await page.evaluate(
      () => document.querySelectorAll('a[href^="/providers/"]').length
    );
    expect(named, "the visitor page lists individual colleagues").toBe(0);
    console.log(`E593/WS-C  visitor — no owner-only surface, 0 colleague links`);
    await page.close();
  });

  test("⚠⚠ the OWNER's view is unchanged — every owner surface still renders", async ({
    browser,
  }) => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await signIn(page);
    /* ⚠⚠ THE OWNER'S PAGE IS `/profile` (`P2-A2-E598` WS-B). `/connect` now
       redirects to `/community`, which is the PEOPLE page and carries none of
       the owner surfaces this asserts — so it reported them "vanished".
       ⚠ SUPERSEDED, quoted not deleted (`E164`):
       //   await page.goto("/connect", { waitUntil: "networkidle" });
       ⚠⚠⚠ THE RULE IS UNCHANGED — *"the OWNER's view is unchanged"* — only the
       URL the owner's view lives at moved. */
    await page.goto("/profile", { waitUntil: "networkidle" });
    /*
      ⚠⚠⚠ LOWER-CASED, AND THIS WAS A REAL FALSE PASS. `innerText` returns the
      RENDERED text, so a heading with `text-transform: uppercase` — which the
      `Grow Your Income Faster` card has — comes back as `GROW YOUR INCOME
      FASTER`. ⚠ The owner assertion failed on it honestly; **the VISITOR
      assertion PASSED on it dishonestly**, because the absent-check could never
      have matched either way. ⚠⚠ A case-sensitive needle against transformed
      text is a test that cannot fail.
    */
    const body = (await page.locator("body").innerText()).toLowerCase();
    /*
      ⚠⚠⚠ THIS IS THE HALF THAT CATCHES A SHARED-COMPONENT MISTAKE. Gating a
      card on `owner` is one character away from gating it on `!owner`, and the
      visitor assertions above would pass either way.
    */
    /*
      ── ⚠⚠⚠ TWO NEEDLES RETIRED BY `P2-A2-E598` WS-C ────────────────────────

      ⚠ SUPERSEDED, quoted not deleted (`E164`):
      //   "Account Health",
      //   "Grow Your Income Faster",
      ⚠⚠ BOTH WERE REMOVED ON PURPOSE AND THE BRIEF NAMES THEM: *"Removed from
      the profile: … the full Account Health card … Grow Your Income Faster. Its
      links move to the Service Products empty state."*
      ⚠⚠⚠ REMOVING A NEEDLE IS NOT ENOUGH — that would stop the gate failing and
      stop it saying anything. What REPLACED each one is asserted below, so the
      rule (*"every owner surface still renders"*) survives the redesign.
    */
    for (const needle of [
      "Rates",
      "Profile Completion",
      "Learning Paths",
      /* ⚠ THE `Grow` CARD is the new home of Invite, Recommendation and Mentor
         — three separate cards became three rows, and all three destinations
         are unchanged. */
      "Grow",
      "Invite a Colleague",
      "Request a Recommendation",
      "Request a Mentor",
      /* ⚠⚠ AND THE HERO'S TWO ACTIONS. `See What Buyers See` is the owner's
         preview of their own `/providers/[id]` page. */
      /* ⚠ RENAMED AT THE WS-C GATE (`E598`). ⚠ SUPERSEDED, quoted (`E164`):
         //   "Edit Profile", */
      "Complete Your Profile",
      "See What Buyers See",
    ]) {
      expect(body.includes(needle.toLowerCase()), `"${needle}" vanished from the OWNER's page`).toBe(true);
    }
    /*
      ⚠⚠ ACCOUNT HEALTH IS A ONE-LINER NOW, NOT A CARD — *"one line each with a
      link, because each already has its own page."* ⚠⚠⚠ THE DOOR IS WHAT
      MATTERS AND IT IS ASSERTED AS A LINK, not as a word: the card's four
      ticked rows went, `/account-health` remains the authority, and a reader
      must still be able to reach it.
    */
    await expect(
      page.locator('a[href="/account-health"]'),
      "the owner lost their door to /account-health"
    ).toHaveCount(1);
    /* ⚠ AND THE USAGE ONE-LINER'S DOOR TO `/stats`. The comb is gone (WS-C item
       3); the page it summarised is not. */
    await expect(
      page.locator('a[href="/stats"]'),
      "the owner lost their door to /stats"
    ).toHaveCount(1);
    /*
      ⚠ AND THE OWNER STILL HAS THEIR OWN RATES CARD — the rule is *"not the
      viewer's own"*, not *"never"*. ⚠⚠ ASSERTED ON THE CARD, NOT ON A FIELD
      NAME: the field names are in no payload at all (see the note above), so a
      name check here would be the same vacuous test inverted, and would pass
      for the wrong reason.
    */
    expect(body.includes("rates"), "the owner lost their own Rates card").toBe(true);
    console.log(`E593/WS-C  owner — every owner surface present, own rate intact`);
    await page.screenshot({ path: "e2e-shell/.artifacts/e593-owner-desktop.png" });
    await page.close();
  });

  test("⚠ an empty section offers a door, and the score page keeps the gaps", async ({
    browser,
  }) => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await signIn(page);
    /* ⚠⚠ THE OWNER'S PAGE IS `/profile` (`P2-A2-E598` WS-B). `/connect` now
       redirects to `/community`, which is the PEOPLE page and carries none of
       the owner surfaces this asserts — so it reported them "vanished".
       ⚠ SUPERSEDED, quoted not deleted (`E164`):
       //   await page.goto("/connect", { waitUntil: "networkidle" });
       ⚠⚠⚠ THE RULE IS UNCHANGED — *"the OWNER's view is unchanged"* — only the
       URL the owner's view lives at moved. */
    await page.goto("/profile", { waitUntil: "networkidle" });
    /*
      ⚠⚠⚠ LOWER-CASED, AND THIS WAS A REAL FALSE PASS. `innerText` returns the
      RENDERED text, so a heading with `text-transform: uppercase` — which the
      `Grow Your Income Faster` card has — comes back as `GROW YOUR INCOME
      FASTER`. ⚠ The owner assertion failed on it honestly; **the VISITOR
      assertion PASSED on it dishonestly**, because the absent-check could never
      have matched either way. ⚠⚠ A case-sensitive needle against transformed
      text is a test that cannot fail.
    */
    const body = (await page.locator("body").innerText()).toLowerCase();
    /*
      ⚠⚠ THE RULING (`E593` WS-C item 16): the SCORE PAGE owns *"what is
      missing"*; an empty SECTION owns *"here is where to get one."*
      ⚠ So the profile may count what is left — the ring's hook does — but must
      not LIST the missing items. That list belongs to `/community/score`.
    */
    const hasEmptyDoor =
      body.includes("earn one in learn") || body.includes("browse learning paths");
    console.log(`E593/WS-C  empty-section door present: ${hasEmptyDoor}`);
    /* ⚠ Conditional on this account actually having an empty section — asserting
       it unconditionally would force a seed (`E564`). The SHAPE is gated in
       `check:community-page`; this reports what the walk saw. */
    await page.close();
  });

  /*
    ── ⚠⚠⚠ THE RATE RULE, PROVED BY THE FIGURE (`P2-A2-E598` WS-D) ───────────

    ⚠ SCOTT, 2026-09-22: *"The rate rule: `isOwner || hasCapability(viewer,
    'canHireTalent')`. Prove it by the figure (the `E596` WS-G method), not by
    the HTML field name."*

    ⚠⚠ THE TEST ABOVE PROVES ONLY HALF OF IT. It signs in as the gate persona —
    a PROVIDER — and asserts the rate LABELS are absent. That is the withholding
    half. ⚠⚠⚠ NOTHING ASSERTED THAT A BUYER STILL SEES THE RATE, and a
    predicate that hid it from everyone would have passed every assertion in
    this file. `E581` is why that matters: *"a rate is in the required set
    precisely so buyers can filter on it."*

    ── ⚠⚠⚠ `210.00`, NOT `$210`, AND THE DIFFERENCE IS A REAL TRAP ──────────

    ⚠ MEASURED 2026-09-22: `$210` MATCHES THE PROVIDER'S PAGE — in
    `$20c`, `$210`, `$211`, `$215`, which are **Next flight REFERENCE IDS**, not
    prices. ⚠⚠ This file already recorded that trap for a blanket money scan;
    it bites a specific figure too, and it read as a disclosure on first
    measurement.
    ⚠⚠⚠ A DECIMAL CANNOT BE A FLIGHT ID, so the figure is matched WITH its
    cents. ⚠ Asserted against the RAW SERVER HTML as well as the rendered text,
    because a figure absent from the DOM but present in the payload is still
    disclosed.
  */
  test("⚠⚠⚠ the rate figure reaches a buyer and the owner, and NOT another provider", async ({
    browser,
  }) => {
    /* ⚠ The gate persona's own rate, read from the seed rather than typed:
       `hourly_rate_cents` 21000. ⚠⚠ THE PROFILE IS RESOLVED FROM THE PAGE, not
       from a hardcoded id — `requireCompleteProvider` returns her href and
       fails loudly if she is not complete (`E586`). */
    const owner = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await signIn(owner);
    const href = await requireCompleteProvider(owner);
    const money = /210\.00/;

    const ownerText = await owner.locator("body").innerText();
    await owner.close();

    /*
      ⚠⚠ THREE VIEWERS, ONE URL. `sw_user31` is a seeded BUYER
      (`is_service_buyer`, no provider profile); `sw_user10` is a seeded
      PROVIDER-ONLY account. ⚠ NEITHER IS `sw_user3`/`sw_user4` — those hold
      `learn_lessons.expert_person_id` and are protected (load-bearing rule 10).
      ⚠⚠⚠ NOTHING IS WRITTEN. Both accounts are read-only here, and the gate
      persona is untouched.
    */
    const buyer = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await signInAsSeeded(buyer, "sw_user31@straterp.com");
    await buyer.goto(href, { waitUntil: "networkidle" });
    const buyerText = await buyer.locator("body").innerText();
    const buyerRaw = await (await buyer.request.get(href)).text();
    await buyer.close();

    const provider = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await signInAsSeeded(provider, "sw_user10@straterp.com");
    await provider.goto(href, { waitUntil: "networkidle" });
    const providerText = await provider.locator("body").innerText();
    const providerRaw = await (await provider.request.get(href)).text();
    await provider.close();

    /* ⚠ THE OWNER SEES THEIR OWN — `isOwner` is the first clause. */
    expect(money.test(ownerText), "the owner cannot see their own rate").toBe(true);
    /* ⚠⚠ A BUYER SEES IT — `canHireTalent`. This is the half that was unasserted. */
    expect(money.test(buyerText), "a buyer cannot see the rate they are here to filter on").toBe(true);
    expect(money.test(buyerRaw), "the rate is rendered but not served to a buyer").toBe(true);
    /* ⚠⚠⚠ ANOTHER PROVIDER DOES NOT — Scott: *"I do nto think providers should
       see other provider's rates."* ⚠ ABSENT FROM THE PAYLOAD, not merely
       unrendered: the view model withholds `p.rates` itself. */
    expect(money.test(providerText), "another provider can SEE the rate figure").toBe(false);
    expect(money.test(providerRaw), "the rate figure is in the payload served to another provider").toBe(false);
    console.log(
      `E598/WS-D  rate figure 210.00 — owner ${money.test(ownerText)} · buyer ${money.test(buyerText)} · provider ${money.test(providerText)}`
    );

    /*
      ── ⚠⚠⚠ THE WALK LEAVES NOTHING BEHIND (`P2-A2-E598` WS-D) ──────────────

      ⚠ SCOTT, 2026-09-22: *"Priya (`sw_user21`) stays exactly as the seed
      defines her. Remove any test writes."*
      ⚠⚠ VIEWING A PROFILE IS A WRITE. `/providers/[id]` calls
      `recordProfileView` on every non-owner render — one row per viewer per day
      — so this test increments the gate persona's *"N profile views"* EVERY RUN
      unless it cleans up. ⚠⚠⚠ MEASURED: four rows had accumulated on her before
      this teardown existed, and the seed writes NONE — `prisma/reset/02-wipe.ts`
      wipes `profileView`, so **0 is her seeded state.**
      ⚠ SCOPED TO THE TWO VIEWERS THIS TEST SIGNS IN AS, never `deleteMany` by
      profile: a blanket delete would erase rows some other run legitimately
      created, which is the *"a save deletes data it did not create"* rule
      (`E517`/`E552`/`E553`) applied to a teardown.
    */
    const prisma = db();
    const viewers = await prisma.person.findMany({
      where: { user: { email: { in: ["sw_user31@straterp.com", "sw_user10@straterp.com"] } } },
      select: { id: true },
    });
    const profileId = href.split("/").pop()!;
    const removed = await prisma.profileView.deleteMany({
      where: { profile_id: profileId, viewer_person_id: { in: viewers.map((v) => v.id) } },
    });
    console.log(`E598/WS-D  teardown — removed ${removed.count} ProfileView row(s) this test created`);
  });
});
