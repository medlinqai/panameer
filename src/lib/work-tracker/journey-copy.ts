/**
 * ⚠⚠ A DATA-ONLY MODULE, AND THAT IS THE POINT: IT IMPORTS NOTHING.
 *
 * ⚠ The leak test needs the exact set of strings the public page publishes, so it
 * can exclude them and nothing else. ⚠⚠⚠ Importing it from `public-view.ts`
 * dragged the app's Prisma singleton into the Playwright process and every test
 * failed in `beforeAll` at 0ms. ⚠ A module with no imports can be read from
 * anywhere — the app, a gate, a script — without carrying a runtime behind it.
 */
/**
 * ⚠⚠⚠ THE JOURNEY DESCRIPTIONS ARE **NOT** THE CATALOG'S TASK TEXT (`E757`).
 *
 * ⚠⚠ **MY FIRST VERSION PUBLISHED `CatalogTask.task` AND THE LEAK TEST CAUGHT
 * IT**, correctly: the rule is that the 212 AIM tasks are admin-only, and the
 * twelve `PNM-*` rows are tasks like any other.
 *
 * ⚠ **THE APPROVED MOCKUP (v5) SETTLES IT — ITS JOURNEY ROWS CARRY THEIR OWN,
 * SHORTER, BUYER-FACING COPY.** Compare: the catalog says *"Account creation for
 * requesters, buyers, recruiters and providers"*; the mockup says *"Accounts for
 * buyers, recruiters and providers"*. ⚠⚠ They are different sentences for
 * different readers, so this is not a duplicate definition — it is the PUBLIC
 * one, and the catalog keeps the internal one.
 *
 * ⚠ Keyed on the catalog `segment`, verbatim from the mockup. A journey with no
 * entry here renders **no description** rather than falling back to task text —
 * silence is safe, a leak is not.
 */
export const JOURNEY_COPY: Record<string, string> = {
  "Public": "Training, Talent, Work and Marketplace",
  "Register": "Accounts for buyers, recruiters and providers",
  "Profile": "Profile, Search Score and validated experience",
  "Connect": "Colleagues, messages, forums and mentoring",
  "Learn": "Courses and certification",
  "Hire": "Requests, proposals and work orders",
  "Shop": "Service products you can buy as-is",
  "Pay": "Settlement, payout and fees",
  "Optimize": "AI maturity assessment and roadmap",
  "Platform": "Support, notifications and worklist",
};

