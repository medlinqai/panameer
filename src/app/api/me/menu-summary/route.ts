import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/guard";
import { ownedProviderProfile } from "@/lib/access";
import { buildCompletenessInput } from "@/lib/onboarding";
import { computeProfileScore } from "@/lib/completeness";
import { accountStandingLines, accountStandingSummary } from "@/lib/account-standing";

/**
 * GET /api/me/menu-summary — the two live values in the avatar menu
 * (`P2-A2-E598` WS-A).
 *
 * ── ⚠⚠⚠ IT IS FETCHED ON OPEN, NOT ON EVERY PAGE ─────────────────────────
 *
 * ⚠ SCOTT, 2026-09-21, ruling on where this read belongs: *"Load the two values
 * only when the menu is opened, not on every page. The menu renders on every
 * page, but only someone who clicks their avatar needs '78%' and 'All good'.
 * Show the labels immediately and fill the values in when the fetch returns."*
 *
 * ⚠⚠ `AccountMenu` MOUNTS IN THREE PLACES — `AppBand`, `AppHeader` and
 * `MarketingHeader` — so it is on essentially every signed-in render. Reading a
 * profile score there would have put a completeness computation on the path of
 * every page in the product, to answer a question almost nobody asks.
 * ⚠⚠⚠ THE MENU RENDERS AND IS USABLE WITHOUT THIS. Every row navigates before
 * the fetch returns; the values are decoration on rows that already work, which
 * is what makes deferring them safe rather than merely cheap.
 *
 * ── ⚠ OWNER-SCOPED, LIKE EVERY OTHER PROFILE READ ────────────────────────
 *
 * ⚠⚠ THE PROFILE IS RESOLVED FROM THE SESSION through `ownedProviderProfile`
 * and this route takes NO PARAMETERS AT ALL — there is no id to tamper with,
 * which is the `E046`-family rule applied by having nothing to apply it to.
 */
export async function GET() {
  /* ⚠ `authenticated`, not `canProvideServices`: a buyer opens this menu too,
     and they get nulls rather than a 403 on their own avatar. */
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const viewer = gate;

  const profile = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    select: {
      id: true,
      status: true,
      person: { select: { user: { select: { email_verified: true } } } },
    },
  });

  /*
    ⚠⚠ NO PROVIDER PROFILE MEANS NO ANSWER, NOT A ZERO. A member who does not
    sell has no profile score and no seller standing; returning `0%` would be a
    claim, and returning "All good" would be a claim about an account that does
    not exist. The menu renders those rows without values.
  */
  if (!profile) {
    return NextResponse.json({ scorePercent: null, account: null });
  }

  const input = await buildCompletenessInput(profile.id);
  const score = input ? computeProfileScore(input) : null;

  const standing = accountStandingLines({
    status: profile.status,
    emailVerified: !!profile.person.user?.email_verified,
  });

  return NextResponse.json({
    scorePercent: score ? score.total : null,
    /* ⚠ THE SAME COMPUTATION `/account-health` RENDERS — see
       `lib/account-standing.ts`. Two of these would be `E585`. */
    account: accountStandingSummary(standing),
  });
}
