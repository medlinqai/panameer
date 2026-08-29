import { redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";

/**
 * `/join/requester/ready` — A REDIRECT TO `/dashboard` (`P1-J1.1-E247`).
 *
 * Scott, 2026-08-29, on seeing the requester dashboard:
 * *"they are in the same place they will be in every time they log in — no need to
 * create another page."*
 *
 * ── ⚠⚠ THIS FILE'S OWN HEADER USED TO ARGUE THE OPPOSITE ──────────────────────
 *
 * ⚠ SUPERSEDED, quoted not deleted, because it is a reasonable argument that was
 * overruled by the person it was written for:
 *   *"READY TO POST WORK REQUEST — the requester's end state (P1-J1.2 WS5). Every
 *   onboarding ends at a "ready" state that is the entry to the fulfillment flow
 *   (requester_onboarding.md). This is the handoff, not the fulfillment: the primary
 *   action goes to the Work Request builder, which already exists.
 *   It is a REAL PAGE rather than a redirect to /work/new because the ready state is
 *   the thing being claimed — the requester has just answered five screens and
 *   deserves to be told what they now have, and the CTA is a choice rather than a
 *   shove into a second form."*
 *
 * ⚠ WHAT REVERSED IT: the dashboard already carries all three transactions with real
 * data behind them — its empty state's primary button already reads `Create a Work
 * Request`, `Search Packages` is in the rail, and the *Collaborate with an expert*
 * row is the talent search. The ready page congratulated the requester and then asked
 * them to click again to reach a page that says it better.
 *
 * ⚠⚠ EARLIER DRAFTS OF THE `E247` BRIEF SPECIFIED A REBUILT VERSION OF THIS PAGE —
 * first an "AIP is building your company profile" panel with six nav-derived cards,
 * then a `You're Ready to Transact!` headline over three transaction cards (Search
 * Talent · Hire Talent · Buy Service Products). ALL OF IT IS CUT, and the mockup
 * `2. Claude Sub-Files/mockups/requester_ready_2026-08-29.html` IS SUPERSEDED. Do not
 * build any of it from an earlier read of that brief or from that file.
 *
 * ⚠ NO BANNER, NO CONFIRMATION STRIP, NO FIRST-VISIT STATE. Chat proposed a
 * dismissible *"you're set up under {Company}"* strip and Scott rejected it: the
 * POINT is that they land where they always land. Nothing here is conditional on
 * arrival.
 *
 * ── ⚠ THE ROUTE STAYS. IT IS NOT DEAD ────────────────────────────────────────
 *
 * FIVE call sites still point here and they were all LEFT POINTING HERE — repointing
 * them at `/dashboard` is five edits to save one hop, on paths that are walked and
 * stable:
 *   join/requester/page.tsx:72        router.replace(completed ? ready : start)
 *   join/requester/start/page.tsx:33  redirect(ready) when completed_at is set
 *   join/requester/steps/page.tsx:171 router.replace(ready)
 *   join/requester/steps/page.tsx:213 router.push(ready)
 *   verify-email/page.tsx:56          destination = ready
 * A requester may also have this URL in history. ⚠ DO NOT DELETE THIS FILE (`E164`).
 *
 * ── ⚠⚠ TWO GUARDS WENT WITH THE BODY, AND THAT IS A BEHAVIOUR CHANGE ─────────
 *
 * This page used to load the person and redirect `/join` when there was no requester
 * profile, and `/join/requester/steps` when `completed_at` was null — so typing the
 * URL mid-wizard returned you to the wizard. `E247` says "signed in → /dashboard",
 * full stop, so both guards and the Prisma query are gone and a mid-wizard requester
 * typing this URL now lands on `/dashboard` instead of back on their next step.
 * ⚠ REPORTED AT `E247` RATHER THAN QUIETLY KEPT: every caller already gates on
 * `completed_at` before sending anyone here, so the guard only ever fired on a
 * hand-typed URL — but it is a real difference and Scott should know it.
 */
export default async function RequesterReadyPage() {
  const viewer = await getSessionViewer();
  /*
    ⚠ THE CALLBACK IS `/dashboard`, NOT THIS ROUTE. Sending it back here would bounce
    the visitor through this redirect a second time after sign-in; the brief specifies
    the destination directly, so sign-in lands on the dashboard in one hop.
  */
  if (!viewer) redirect("/login?callbackUrl=/dashboard");
  redirect("/dashboard");
}
