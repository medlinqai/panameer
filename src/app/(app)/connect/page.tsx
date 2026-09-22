import { guardPage } from "@/lib/guard";
import { redirect } from "next/navigation";

/**
 * ── ⚠⚠⚠ CONNECT LANDS ON COMMUNITY (`P2-A2-E598` WS-B item 2) ────────────
 *
 * ⚠ SCOTT, 2026-09-21: the profile moves under the avatar, *"like LinkedIn's
 * 'Me'"*, and *"the Profile tab leaves the Connect row. Connect then lands on
 * Community."*
 *
 * ── ⚠⚠ A REDIRECT, NOT A DELETION, AND THAT IS THE WHOLE POINT ───────────
 *
 * ⚠⚠⚠ `/connect` IS THE BAND'S APPLICATION HREF. `PROVIDER_NAV` and
 * `REQUESTER_NAV` both name it, `PAGE_TABS` is keyed on it, `bandPrefixesFor`
 * resolves `/community` through it, `route-access.ts` and `proxy.ts` both carry
 * rules for it. ⚠ MEASURED AT THE WS-B GATE: **31 live references across 17
 * files.** Deleting this route would have broken the band's own home link.
 * ⚠⚠ SO THE URL SURVIVES AND ONLY ITS CONTENT MOVED — every caller resolves,
 * nothing 404s, and the band still lights Connect here.
 *
 * ── ⚠ SUPERSEDED, quoted not deleted (`E164`) ───────────────────────────
 *
 * ⚠ This route rendered the owner's profile (`P2-J3-E591` WS-A), with the
 * thirteen data calls that go with it. That whole body MOVED to
 * `(app)/profile/page.tsx` — it was not rewritten and it was not duplicated:
 * //   const profile = viewer ? await getOwnProviderProfileView(viewer.userId, viewer) : null;
 * //   if (!viewer || !profile) redirect("/community");
 * //   return (
 * //     <>
 * //       <PageTabs eyebrow="CONNECT" … current="/connect" />
 * //       <ConnectProfile p={profile} … />
 * //     </>
 * //   );
 * ⚠⚠ ITS REASONING IS SUPERSEDED BY RULE 13, NOT BY DRIFT. `E591` WS-A was
 * built on Scott, 2026-09-19: *"connect is now 'build your profile and connect
 * to other profiles'."* ⚠⚠⚠ THE 2026-09-21 RULING IS NEWER AND SPLITS THOSE TWO
 * HALVES: you build your profile under your own picture, and you connect to
 * other profiles in Connect.
 *
 * ⚠ THE NON-PROVIDER REDIRECT THAT LIVED HERE IS NOT LOST — `/profile` carries
 * it now, sending a member with no provider profile to `/community`. ⚠⚠ Both
 * paths land in the same place, so this route's behaviour is unchanged for
 * them; it simply no longer depends on who is asking.
 */
export default async function ConnectPage() {
  /* ⚠ GUARDED BEFORE REDIRECTING, so a signed-out visitor meets `/login` rather
     than being bounced to `/community` and challenged there — the callback URL
     would name the wrong page. */
  await guardPage("authenticated");
  redirect("/community");
}
