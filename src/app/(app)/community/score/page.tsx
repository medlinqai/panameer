import { redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { PageTabs } from "@/components/casing/PageTabs";
import { tabSequenceFor } from "@/lib/nav";
import { profileTabs } from "@/lib/profile-tabs";
import { ownedProviderProfile } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { buildCompletenessInput } from "@/lib/onboarding";
import { computeProfileScore } from "@/lib/completeness";
import { ProfileScoreView } from "@/components/community/ProfileScoreView";

/**
 * ── ⚠⚠ YOUR PROFILE SCORE — `/community/score` (`P2-J3-E590` WS-B) ────────
 *
 * ⚠ WHY HERE AND NOT `/stats`: `/community` IS the profile (`E588`), and the
 * score describes the profile. `/stats` is a different surface — usage, not
 * completeness — and merging them would collapse the Profile-vs-Stats
 * distinction Scott drew on 2026-09-20.
 * ⚠ AND NOT `/profile`: that route is a redirect as of `E588` WS-A.
 *
 * ── ⚠⚠⚠ THE SCORE IS COMPUTED, NOT READ FROM THE COLUMN ───────────────────
 *
 * ⚠ The stored `completeness` is a CACHE, refreshed by `recomputeCompleteness`
 * when a profile is written. This page needs the per-line BREAKDOWN, which the
 * column cannot carry — so it computes both from `buildCompletenessInput`, the
 * one write path. ⚠⚠ THE TOTAL IT SHOWS AND THE COLUMN CANNOT DISAGREE,
 * because they are the same function over the same input.
 */
export const metadata = { title: "Your Profile Score · Panameer" };

export default async function ProfileScorePage() {
  await guardPage("authenticated");
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fcommunity%2Fscore");

  const profile = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    select: { id: true },
  });
  /*
    ⚠ A MEMBER WITH NO PROVIDER PROFILE HAS NO SCORE — there is nothing to
    measure, so they go back to Connect rather than meeting an empty dial.
    ⚠⚠ `Connect` IS IN THE BUYER MENU TOO, so this is reachable by a buyer.

    ⚠⚠⚠ THIS ONE STAYS `/community` AFTER THE `E591` SPLIT, AND THAT IS A
    DEVIATION FROM THE BRIEF, MADE ON PURPOSE. WS-A item 8 sends BOTH of these
    redirects to `/connect`. ⚠ This branch fires when the viewer has NO PROVIDER
    PROFILE — and `/connect` redirects exactly that member straight back to
    `/community`. Sending them there would be a bounce through a route whose
    only job would be to return them here. ⚠⚠ The brief's stated intent — *"left
    alone, a user with no profile lands on the Community page instead"* — is the
    correct destination for someone who has no profile; it is the OTHER branch
    that meant "go to your profile".
  */
  if (!profile) redirect("/community");

  /* ⚠ THE VIEWER HAS A PROFILE, so this genuinely means *"go to your profile"*
     and it follows the profile to `/connect` (`E591` WS-A item 8).
     ⚠ SUPERSEDED, quoted not deleted (`E164`):
     //   if (!input) redirect("/community"); */
  const input = await buildCompletenessInput(profile.id);
  if (!input) redirect("/connect");


  return (
    <>
      {/*
        ── ⚠⚠⚠ THE SCORE PAGE IS A PROFILE PAGE NOW (`P2-A2-E600` WS-A 1) ─────

        ⚠ SCOTT: *"The Score page stops showing Connect's tab row (today it
        shows Community · Groups · Service Products · Settings). It's a profile
        page now."*
        ⚠⚠ THE ROUTE DOES NOT MOVE. `/community/score` stays where it is — it
        still lights `Connect` in the band, because `bandPrefixesFor` resolves
        `/community` through Connect, and that is why it is the ONE tab of the
        six with no `BAND_KNOWN_OPEN` entry. ⚠⚠⚠ A ROW IS NOT A ROUTE: what
        changed is which set of siblings this page claims, not where it lives.
        ⚠ `unreadCount` WENT WITH THE ROW — it existed only to badge Connect's
        Messages tab. One fewer query on this page.
        ⚠ SUPERSEDED, quoted not deleted (`E164`), including the `current`
        reasoning it carried:
        //   <PageTabs
        //     eyebrow="CONNECT"
        //     sequence={tabSequenceFor("/connect")}
        //     tabs={connectTabs(viewer, unread)}
        //     ⚠ THE SCORE IS THE PROFILE'S, so `Home` (`/connect`) is the
        //       active tab, not `Community` (`E591` WS-A).
        //     current="/connect"
        //   />
        ⚠⚠ THAT REASONING IS NOT WRONG, IT IS SUPERSEDED: the score still
        belongs to the profile — the profile simply has its own row now.
      */}
      <PageTabs
        eyebrow="MY PROFILE"
        sequence={tabSequenceFor("/profile")}
        tabs={profileTabs(viewer)}
        current="/community/score"
      />
      <ProfileScoreView score={computeProfileScore(input)} />
    </>
  );
}
