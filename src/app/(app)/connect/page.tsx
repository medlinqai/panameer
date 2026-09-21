import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { redirect } from "next/navigation";
import { PageTabs } from "@/components/casing/PageTabs";
import { tabSequenceFor } from "@/lib/nav";
import { connectTabs } from "@/lib/connect-tabs";
import { unreadCount } from "@/lib/messages";
import { ConnectProfile } from "@/components/community/ConnectProfile";
import { getOwnProviderProfileView } from "@/lib/provider-profile-view";
import { getPathsTaughtByProfile, getPathsTakenBy } from "@/lib/learn-home";
import { publicTestimonials } from "@/lib/recommendations";
import { getCommunitySignalForProfile } from "@/lib/community-signal";
import { getMyCommunity } from "@/lib/connections";
/* ⚠ `P2-J3-E590` WS-C — the completion card needs the per-line breakdown, which
   the stored column cannot carry. Computed from `buildCompletenessInput`, the
   one write path, so the card and the score page cannot disagree. */
import { buildCompletenessInput } from "@/lib/onboarding";
import { computeProfileScore } from "@/lib/completeness";

/**
 * ── ⚠⚠ `/connect` IS THE PROFILE (`P2-J3-E591` WS-A) ───────────────────────
 *
 * ⚠⚠⚠ SCOTT, 2026-09-19: *"connect is now 'build your profile and connect to
 * other profiles'."* ⚠ Connect is the application's name in the band, so the
 * application's home is the member's own profile and this route says so.
 *
 * ── ⚠⚠ WHY THIS FILE EXISTS: ONE ROUTE WAS RENDERING TWO PAGES ────────────
 *
 * ⚠ `/community` rendered the PROFILE for a provider and Connect Home for
 * everybody else, so the same URL meant two different things depending on who
 * asked — and every link to it meant whichever one the author had in mind.
 * ⚠⚠ THE PROFILE MOVED HERE; `/community` KEPT CONNECT HOME and becomes the
 * Community page (`E591` WS-C). ⚠ The four data calls below were MOVED, not
 * duplicated — `(app)/community/page.tsx` no longer makes any of them.
 *
 * ── ⚠⚠ THE NON-PROVIDER CASE IS A REDIRECT, NOT A FALLBACK ────────────────
 *
 * ⚠⚠ `Connect` IS IN THE BUYER MENU TOO (`REQUESTER_NAV`), and a requester has
 * no `ProviderProfile` — so there is no profile to render for them. Before the
 * split they got Connect Home from this same route; now Connect Home IS
 * `/community`, so they are sent there. ⚠ **Nothing a member could reach
 * yesterday is unreachable today** — the destination is the same page, it just
 * has its own URL at last.
 *
 * ⚠ ACCESS: `route-access.ts` carries an explicit `{ prefix: "/connect",
 * requires: "authenticated" }` rule. A new route is covered by NOTHING until a
 * rule names it (`E591` WS-A item 7) — the prefix rule on `/community` does not
 * reach here.
 */
export default async function ConnectPage() {
  await guardPage("authenticated");
  const viewer = await getSessionViewer();
  /* ⚠ `P1-ALL-E379` — the Messages tab carries the unread count on every page
     in this row, so the number is the same wherever you are standing. */
  const unread = viewer ? await unreadCount(viewer) : 0;

  const profile = viewer ? await getOwnProviderProfileView(viewer.userId, viewer) : null;

  /*
    ⚠⚠ A MEMBER WITH NO PROVIDER PROFILE GETS THE COMMUNITY PAGE, NOT AN EMPTY
    PROFILE. ⚠ `redirect` throws, so nothing below it runs and no profile query
    is attempted against a profile that does not exist.
  */
  if (!viewer || !profile) redirect("/community");

  return (
    <>
      <PageTabs
        eyebrow="CONNECT"
        sequence={tabSequenceFor("/connect")}
        tabs={connectTabs(viewer, unread)}
        current="/connect"
      />
      {/* ⚠ `takenPaths` IS KEYED ON THE **USER**, not the person —
          `LearnEnrollment.user_id` (`E593` WS-B item 17). ⚠⚠ A JSX comment
          is only legal in CHILDREN position, never between attributes, which
          is why this note sits here rather than beside the prop. */}
      <ConnectProfile
        p={profile}
        taughtPaths={await getPathsTaughtByProfile(profile.id)}
        takenPaths={await getPathsTakenBy(viewer.userId)}
        testimonials={await publicTestimonials(profile.id)}
        community={await getCommunitySignalForProfile(profile.id)}
        colleagueCount={(await getMyCommunity(viewer)).colleagues.length}
        score={await ownerScore(profile.id)}
      />
    </>
  );
}

/**
 * ⚠ The owner's score breakdown, or `null` when the input cannot be built.
 * ⚠⚠ NULL RENDERS NO CARD — better than a ring of zeroes that asserts a
 * provider has answered nothing.
 */
async function ownerScore(profileId: string) {
  const input = await buildCompletenessInput(profileId);
  return input ? computeProfileScore(input) : null;
}
