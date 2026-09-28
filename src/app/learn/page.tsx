import { getMyLearning } from "@/lib/learn-dashboard";
import { MyLearning } from "@/components/learn/app/MyLearning";
import { memberOrPublicTwin } from "@/lib/public-twin";
/* ⚠ SUPERSEDED, quoted not deleted (`E164`) — this page no longer renders the
   public surface; `/training` does:
   //   import { getSessionViewer } from "@/lib/session";
   //   import { LearnPublic } from "@/components/learn/LearnPublic"; */

export const metadata = {
  /* ⚠ THE MEMBER'S DASHBOARD, NOT THE SALES PAGE — the public copy moved to
     `/training` with the page that uses it (`P2-ALL-E698` WS-C).
     ⚠ SUPERSEDED, quoted not deleted (`E164`):
     //   title: "Learn — Panameer",
     //   description: "Free Oracle Cloud courses: procurement, finance, supply
     //   chain and HR, taught by the people who implement them." */
  title: "My Learning — Panameer",
  description: "Your learning paths, courses and progress on Panameer.",
};

/**
 * `/learn` — MY LEARNING. **ONE URL, ONE PAGE.**
 *
 * ── ⚠⚠⚠ IT STOPPED BEING TWO PRODUCTS (`P2-ALL-E698` WS-C) ───────────────────
 *
 * ⚠⚠ **SCOTT, 2026-09-28:** *"changing the content based on if logged in seems
 * confusing when someone reports an error with /learn."* ⚠ The sales page is at
 * **`/training`** now and this route is the learner's dashboard and nothing else.
 *
 * ⚠⚠ **AN ANONYMOUS VISITOR IS SENT TO `/training`, NOT TO `/login`** — see
 * `lib/public-twin.ts` for why, and why the rule is one map rather than a check
 * repeated on three pages (`E585`). ⚠ A stranger who types `/learn` wanted to read
 * about the courses; a login wall answers a question they did not ask.
 *
 * ⚠⚠⚠ **`learn/layout.tsx` STILL BRANCHES ON THE VIEWER AND THAT IS CORRECT, NOT A
 * LEFTOVER.** It serves four PUBLIC sub-routes — `/learn/courses`, `/learn/paths`,
 * `/learn/[slug]` and `/learn/[slug]/course/[courseSlug]` — which still need the
 * marketing chrome for an anonymous reader. ⚠⚠ **THE PAGE STOPPED BRANCHING; THE
 * LAYOUT MUST NOT. Simplifying it would gate four public browse pages.**
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — what this page was:
 * //   `/learn` — TWO PRODUCTS BEHIND ONE URL.
 * //   Signed out it is a SALES PAGE (E223): the public surfaces exist to get you
 * //   to make an account, and a visitor never sees a catalog query.
 * //   const viewer = await getSessionViewer();
 * //   if (!viewer) return <LearnPublic />;
 *
 * It is MY LEARNING (brief_learn_app_shell WS2) — the learner's
 * dashboard, not a catalog. Scott: *"The layout and design i started with is
 * boring and sucks... Seeing total learning paths vs the LPs, courses, and
 * lessons i have taken. Gamify it and make the UI look BEAUTIFUL."*
 *
 * ⚠ THE CATALOG BROWSER MOVED, IT DID NOT DIE. Search, domain chips, the All /
 * My filter and the PathCard grid are the only way to find a path by name or by
 * instructor, and this page is no longer a list. They live at `/learn/paths`,
 * rendering the same `LearnHome` component unchanged; the dashboard's two
 * "browse" links point there and so does the rail's submenu. Flagged in the
 * report as one route more than the brief describes.
 *
 * ⚠ `searchParams` IS GONE FROM THIS PAGE. `?tab=mine` was a filter over the
 * catalog that is no longer here; it now belongs to `/learn/paths`. An existing
 * `/learn?tab=mine` link lands on the dashboard and the query is ignored — a
 * change in what an old link does, and the right one, since the tab has nothing
 * to filter here.
 */
export default async function LearnPage() {
  const viewer = await memberOrPublicTwin("/learn");

  const data = await getMyLearning(viewer.userId);
  return <MyLearning data={data} />;
}
