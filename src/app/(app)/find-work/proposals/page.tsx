import { guardPage } from "@/lib/guard";
import { redirect } from "next/navigation";

/**
 * ── ⚠⚠⚠ THIS VIEW ALREADY EXISTS. IT IS A TAB. (`P2-ALL-E708`) ──────────────
 *
 * ⚠⚠ **`My Proposals` WAS THE ONE RAIL CHILD `E216` COULD NOT DE-DUPLICATE** —
 * *"Exactly one child described a view this row did not have: My Proposals"* — so it
 * was added to `WORK_FEED_TABS` as its own tab. ⚠⚠⚠ **IT IS THEREFORE THE STRONGEST
 * CASE OF THE FIVE: the tab exists BECAUSE of this menu item.** A page here would be
 * the second door onto a view built to answer this very link (`E585`).
 * ⚠ Full reasoning and the menu-label finding: `find-work/for-my-skills/page.tsx`.
 *
 * ⚠⚠ **THE DATA IS REAL.** `work-feed.ts` records that the old claim — *"needs a
 * Proposal model, which doesn't exist"* — was **FALSE TWICE OVER**: the model is
 * **`Proposal`** and `proposals.ts:366` creates one, reached from
 * `api/work-requests/[id]/propose/route.ts:94`. ⚠ **0 rows today** → the tab shows
 * *"None to show"*.
 * ⚠⚠⚠ **AND THE STRING IT REPLACED BLAMED THE MEMBER** — *"You haven't sent any
 * proposals, and you can't yet"* — which was **not even true**, since a provider can
 * now propose. Ruling 18 forbids exactly that, and this redirect is what finally
 * stops the menu item leading anywhere near it.
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`):
 * //   export const metadata = { title: "My Proposals · Panameer" };
 * //   return <ComingSoon title="My Proposals" />;
 */
export default async function Page() {
  await guardPage("canProvideServices");
  redirect("/find-work?tab=proposals");
}
