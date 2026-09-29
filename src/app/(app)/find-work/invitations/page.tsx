import { guardPage } from "@/lib/guard";
import { redirect } from "next/navigation";

/**
 * ── ⚠⚠⚠ THIS VIEW ALREADY EXISTS. IT IS A TAB. (`P2-ALL-E708`) ──────────────
 *
 * ⚠⚠ **`E216` FOLDED THIS EXACT VIEW INTO `/find-work`'s TAB ROW:** *"'Invitations
 * to Propose My Rate' IS Invitations."* ⚠ Building a page here would be a second
 * door onto one view (`E585`). **The full reasoning, the redirect-not-delete
 * decision, and the menu-label finding are in
 * `find-work/for-my-skills/page.tsx` — one explanation, not four copies.**
 *
 * ⚠⚠⚠ **AND THIS TAB'S DATA IS REAL, WHICH IS WHY THE REDIRECT IS HONEST RATHER
 * THAN A TIDIER PLACEHOLDER.** `work-feed.ts` records that the old claim —
 * *"needs a work-invitation model, which doesn't exist"* — was **FALSE**: the model
 * is **`ProposalRequest`** and `work-request-invite.ts:117` has been creating one
 * all along, reached from `api/work-requests/[id]/invite/route.ts:37`.
 * ⚠ **0 rows today**, so the tab shows `UNBACKED_TABS.invitations` — *"None to
 * show"* — which is an honest zero, not an empty list dressed as a feature.
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`):
 * //   export const metadata = { title: "Invitations to Propose My Rate · Panameer" };
 * //   return <ComingSoon title="Invitations to Propose My Rate" />;
 */
export default async function Page() {
  await guardPage("canProvideServices");
  redirect("/find-work?tab=invitations");
}
