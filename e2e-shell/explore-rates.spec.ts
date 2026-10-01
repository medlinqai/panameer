import { test, expect } from "@playwright/test";
import { signInAsSeeded } from "./_auth";

/**
 * ── ⚠⚠⚠ `/explore` RATES OBEY THE ONE VIEWER RULE (`P2-A2-E618`, ruling 29)
 *
 * ⚠⚠ MEASURED BEFORE THE FIX, signed out with no account: `GET /explore`
 * returned **HTTP 200 rendering 8 real provider rates** — `$145` · `$80` ·
 * `$125` · `$95` per hour, **including Scott's own** — while the profile
 * refused the same person the same number to the same viewer.
 *
 * ⚠⚠⚠ THIS IS A RUNTIME GATE ON PURPOSE. The rule is one function now
 * (`lib/rate-visibility.ts`), and a source scan can prove the function is
 * CALLED but not that the figure stays off the page. **Only a browser can say
 * what a viewer actually sees.**
 *
 * ⚠ AND IT ASSERTS THE PAGE IS STILL PUBLIC. Scott's note in
 * `lib/public-routes.ts` reads *"PUBLIC PROFILE BROWSE, AND IT WORKS… DO NOT
 * GATE IT."* ⚠⚠ **A fix that emptied the page would satisfy every rate
 * assertion below and break the thing they protect**, so the card count is
 * asserted in every state.
 */
const MONEY = /\$[\d,]+(\s*[–-]\s*\$[\d,]+)?\s*\/\s*hr/;

/** ⚠ Seeded personas. `sw_user31` is a BUYER, `sw_user10` a PROVIDER, and
 *  `sw_user17` is a provider who publishes a rate — so the OWNER case has a
 *  figure of its own to find. */
const BUYER = "sw_user31@straterp.com";
const PROVIDER = "sw_user10@straterp.com";
const RATED_OWNER = "sw_user17@straterp.com";
/** ⚠ One of that owner's own skills, so their card is in the result set. */
const OWNER_SKILL = "Account Reconciliation";
const OWNER_FIRST_NAME = "Steve";

async function read(page: import("@playwright/test").Page, q = "") {
  await page.goto(q ? `/explore?q=${encodeURIComponent(q)}` : "/explore", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(1200);
  const body = await page.locator("body").innerText();
  /*
    ── ⚠⚠⚠ THE COUNTER WAS RE-ANCHORED WITH THE CARDS (`P2-A1.1-E738`) ───────

    ⚠ It counted `a[href^="/login?callbackUrl"]` — the sign-in link the OLD
    teaser put on every card, because clicking one had to cost an account.
    ⚠⚠ **`E738`'s MASKED CARD LINKS STRAIGHT TO `/providers/<id>`**, which is the
    whole point of WS-A: the destination is now safe to open signed out, so the
    login round trip is gone. ⚠⚠⚠ **LEFT ALONE, THIS COUNTED 0 FOR EVERY VIEWER
    AND THE GATE WOULD HAVE READ AS "THE PAGE IS EMPTY"** — which is exactly the
    failure the count exists to catch, pointed at the wrong selector.
    ⚠ It counts the same FACT — a card rendered — by the link that is now on one.
    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   (comment: The sign-in link on each card - the count proves the browse
    //    still renders.)
    //   const cards = await page.locator('a[href^="/login?callbackUrl"]').count();
  */
  const cards = await page.locator('a[href^="/providers/"]').count();
  return { rate: MONEY.test(body), cards, body };
}

/*
  ── ⚠⚠⚠ RE-ANCHORED BY SHAPE, NOT DELETED — `P2-A1.1-E738` ─────────────────

  ⚠ `/explore` BECAME THE MASKED **BROWSE TALENT** GRID on 2026-10-01 (Scott's
  answer 8: *"`/explore` becomes the masked grid; real first names and photo URLs
  removed"*). ⚠⚠ **`MaskedCard` HAS NO RATE FIELD AT ALL**, so no viewer — buyer,
  provider, owner or stranger — can see a rate here any more.

  ⚠⚠⚠ **RULING 29 IS STILL LIVE. ITS SUBJECT MOVED.** *"The rate obeys the viewer
  rule"* is proved on `/providers/[id]` by `check:visitor-profile`, which reads an
  actual figure three ways (*"rate figure 210.00 — owner true · buyer true ·
  provider false"*). ⚠ What `/explore` can still prove is the STRONGER half: the
  figure is not on the page **for anybody**, and the page is still public.

  ⚠⚠ **THIS IS THE `orderSeries` LESSON (2026-09-23 decisions, item 14):**
  *"BEFORE DELETING DEAD CODE, CHECK WHETHER A GATE ASSERTS A LIVE RULE AGAINST
  IT… it was RE-ANCHORED BY SHAPE instead."* ⚠⚠⚠ **DELETING THIS FILE WOULD HAVE
  TAKEN THE "DO NOT GATE IT" ASSERTION WITH IT** — the half Scott explicitly
  protected — and nothing else asserts that `/explore` renders to a stranger.

  ⚠ **SUPERSEDED BY SCOTT, NOT BY DRIFT (rule 13):** ruling 29 (2026-09-24) had the
  OWNER seeing their own rate on their own card here; answer 8 (2026-10-01) makes
  this surface masked for everyone. ⚠⚠ **THE NEWER STATEMENT IS THE LIVE ONE, AND
  IT IS FLAGGED RATHER THAN APPLIED QUIETLY.**
  ⚠ SUPERSEDED, quoted not deleted (`E164`) — both tests as they stood:
  //   test("ruling 29 - the rate obeys the viewer rule, and the page stays public")
  //     expect(buyer.rate, "a buyer must see a rate - it is what they filter on").toBe(true);
  //     expect(prov.rate, "a provider must not see another provider's rate").toBe(false);
  //     expect(out.rate, "a signed-out visitor must not see a rate").toBe(false);
  //     expect(buyer.rate === prov.rate, "buyer and provider must DIFFER").toBe(false);
  //   test("ruling 29 - the owner sees their OWN rate while the cards beside it stay blank")
  //     (one result set, one viewer, TWO answers: the owner's own card carries a
  //      rate and every other card in the same list does not; isOwner per card)
  //     expect(ownHasRate, "the owner always sees their own rate").toBe(true);
  //     expect(othersWithRate, "a provider must not see another provider's rate,
  //       even beside their own").toBe(0);
*/
test("⚠⚠⚠ `/explore` shows NO rate to ANY viewer, and the page stays public", async ({
  browser,
}) => {
  const ctxOut = await browser.newContext();
  const out = await read(await ctxOut.newPage());

  const ctxBuyer = await browser.newContext();
  const buyerPage = await ctxBuyer.newPage();
  await signInAsSeeded(buyerPage, BUYER);
  const buyer = await read(buyerPage);

  const ctxProv = await browser.newContext();
  const provPage = await ctxProv.newPage();
  await signInAsSeeded(provPage, PROVIDER);
  const prov = await read(provPage);

  /* ⚠ The owner of a published rate, searching one of their own skills, so
     their own card is in the result set — the hardest case for "no rate". */
  const ctxOwner = await browser.newContext();
  const ownerPage = await ctxOwner.newPage();
  await signInAsSeeded(ownerPage, RATED_OWNER);
  const owner = await read(ownerPage, OWNER_SKILL);

  console.log(
    `E738  rate on /explore — signed-out=${out.rate} · buyer=${buyer.rate} · provider=${prov.rate} · rate-owner=${owner.rate}`
  );
  console.log(
    `E738  cards rendered — signed-out ${out.cards} · buyer ${buyer.cards} · provider ${prov.cards} · owner ${owner.cards}`
  );

  /* ⚠⚠ FOUR VIEWERS, ONE ANSWER. The masked grid carries no rate field, so this
     is structural rather than conditional — there is nothing to hide. */
  expect(out.rate, "a signed-out visitor must not see a rate").toBe(false);
  expect(buyer.rate, "the masked grid shows no rate, not even to a buyer").toBe(false);
  expect(prov.rate, "a provider must not see another provider's rate").toBe(false);
  expect(owner.rate, "the masked grid shows no rate, not even the owner's own").toBe(false);

  /*
    ⚠⚠⚠ AND THE PAGE IS NOT GATED — Scott: *"DO NOT GATE IT."*
    ⚠ **THIS IS THE HALF THAT STOPS THE TEST PASSING VACUOUSLY.** Four `false`
    rate answers would also be produced by a page that 500'd or rendered nothing,
    so the card count is asserted in every state — the same reasoning the file
    carried before this surface changed.
  */
  expect(out.cards, "signed-out browse must still render cards").toBeGreaterThan(0);
  expect(buyer.cards, "a buyer sees the same browse").toBeGreaterThan(0);
  expect(prov.cards, "a provider sees the same browse").toBeGreaterThan(0);
  expect(owner.cards, "the owner's own search returns cards").toBeGreaterThan(0);

  /* ⚠⚠ AND THE MASK ITSELF, on the surface this file already loads: the lock
     line is what a masked card promises, and its absence would mean the grid
     silently reverted to the old teaser. */
  expect(out.body, "the masked grid's lock line is missing").toContain(
    "shown after you join"
  );

  await ctxOut.close();
  await ctxBuyer.close();
  await ctxProv.close();
  await ctxOwner.close();
});
