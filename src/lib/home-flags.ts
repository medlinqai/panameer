/**
 * Marketing-home content flags.
 *
 * ⚠ THE TAX-SAVINGS STAT IS COUNSEL-GATED.
 *
 * "$6M+ Tax Savings Used to Fund Deployment" is a guaranteed-savings claim, and
 * `approach_to_market.md` requires CPA + lawyer sign-off before any such claim
 * faces the public. The mockup shows it, so the build shows it — but behind a
 * switch, because the two failure modes here are not symmetric: shipping it
 * unreviewed is a legal exposure, while hiding it is one missing tile.
 *
 * DEFAULT ON IN DEVELOPMENT, OFF IN PRODUCTION. That inversion is deliberate.
 * Scott is reviewing the page against the mockup, so it has to be there on
 * localhost; nobody has to remember to flip anything before a deploy, and
 * turning it on in production is then an explicit act — set
 * NEXT_PUBLIC_SHOW_TAX_SAVINGS_STAT=1 — rather than an omission.
 *
 * A flag rather than a comment-out so the copy stays in one place and the
 * decision is visible in the code that renders it.
 */
export const SHOW_TAX_SAVINGS_STAT =
  process.env.NEXT_PUBLIC_SHOW_TAX_SAVINGS_STAT === "1" ||
  process.env.NODE_ENV !== "production";
