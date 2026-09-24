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
  /* ⚠ The sign-in link on each card — the count proves the browse still renders. */
  const cards = await page.locator('a[href^="/login?callbackUrl"]').count();
  return { rate: MONEY.test(body), cards, body };
}

test("⚠⚠⚠ ruling 29 — the rate obeys the viewer rule, and the page stays public", async ({
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

  console.log(
    `E618/ruling29  signed-out rate=${out.rate} · buyer rate=${buyer.rate} · provider rate=${prov.rate}`
  );
  console.log(
    `E618/ruling29  cards rendered — signed-out ${out.cards} · buyer ${buyer.cards} · provider ${prov.cards}`
  );

  /* ⚠⚠ THE FIXTURE DISTINGUISHES WHAT IT COMPARES. Two hidden rates agree, so
     the buyer case is what makes the other two mean anything. */
  expect(buyer.rate, "a buyer must see a rate — it is what they filter on").toBe(true);
  expect(prov.rate, "a provider must not see another provider's rate (ruling 9)").toBe(false);
  expect(out.rate, "a signed-out visitor must not see a rate").toBe(false);
  expect(buyer.rate === prov.rate, "buyer and provider must DIFFER, or nothing is proved").toBe(
    false
  );

  /* ⚠⚠⚠ AND THE PAGE IS NOT GATED — Scott: "DO NOT GATE IT." */
  expect(out.cards, "signed-out browse must still render cards").toBeGreaterThan(0);
  expect(buyer.cards, "a buyer sees the same browse").toBeGreaterThan(0);
  expect(prov.cards, "a provider sees the same browse").toBeGreaterThan(0);

  await ctxOut.close();
  await ctxBuyer.close();
  await ctxProv.close();
});

test("⚠⚠ ruling 29 — the owner sees their OWN rate while the cards beside it stay blank", async ({
  browser,
}) => {
  /*
    ⚠⚠⚠ THE SHARPEST FORM OF "THE FIXTURE DISTINGUISHES WHAT IT COMPARES":
    one result set, one viewer, and TWO ANSWERS — the owner's own card carries a
    rate and every other card in the same list does not. ⚠ Two hidden rates
    agree; a hidden rate beside a shown one cannot.

    ⚠ `isOwner` is computed PER CARD, which is what makes that possible. Without
    it the rule would read as *"providers see no rates"*, and that is not what
    ruling 9 says — a provider always sees their own.

    ⚠ The search term is one of the owner's own SKILLS, so their card is in the
    result set. The default browse returns a short teaser list they are not
    always in, and a test that depends on being in it is a flake.
  */
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await signInAsSeeded(page, RATED_OWNER);
  await page.goto(`/explore?q=${encodeURIComponent(OWNER_SKILL)}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(1200);

  const cards = await page.locator("article, li, a").evaluateAll((nodes) =>
    nodes
      .map((n) => (n.textContent ?? "").replace(/\s+/g, " ").trim())
      .filter((t) => t.length > 0 && t.length < 400)
  );
  const own = cards.filter((t) => t.includes(OWNER_FIRST_NAME));
  const others = cards.filter((t) => !t.includes(OWNER_FIRST_NAME));

  const ownHasRate = own.some((t) => MONEY.test(t));
  const othersWithRate = others.filter((t) => MONEY.test(t)).length;
  console.log(
    `E618/ruling29  owner card rate=${ownHasRate} · other cards showing a rate=${othersWithRate}`
  );

  expect(own.length, "the owner's own card must be in the results").toBeGreaterThan(0);
  expect(ownHasRate, "the owner always sees their own rate").toBe(true);
  expect(
    othersWithRate,
    "a provider must not see another provider's rate, even beside their own"
  ).toBe(0);
  await ctx.close();
});
