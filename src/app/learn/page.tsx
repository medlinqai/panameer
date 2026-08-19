import { getSessionViewer } from "@/lib/session";
import { getMyLearning } from "@/lib/learn-dashboard";
import { MyLearning } from "@/components/learn/app/MyLearning";
import { LearnPublic } from "@/components/learn/LearnPublic";

export const metadata = {
  title: "Learn — Panameer",
  description:
    "Free Oracle Cloud courses: procurement, finance, supply chain and HR, taught by the people who implement them.",
};

/**
 * `/learn` — TWO PRODUCTS BEHIND ONE URL.
 *
 * Signed out it is a SALES PAGE (E223): the public surfaces exist to get you to
 * make an account, and a visitor never sees a catalog query.
 *
 * Signed in it is MY LEARNING (brief_learn_app_shell WS2) — the learner's
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
  const viewer = await getSessionViewer();
  if (!viewer) return <LearnPublic />;

  const data = await getMyLearning(viewer.userId);
  return <MyLearning data={data} />;
}
