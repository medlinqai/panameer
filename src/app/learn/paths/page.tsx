import { redirect } from "next/navigation";
import { getLearnHome, groupChips } from "@/lib/learn-home";
import { getSessionViewer } from "@/lib/session";
import { LearnHome } from "@/components/learn/LearnHome";

export const metadata = {
  title: "All Learning Paths — Panameer Learn",
  description: "Every Panameer learning path, searchable by name, domain and instructor.",
};

/**
 * THE CATALOG BROWSER — what `/learn` was before it became a dashboard.
 *
 * ⚠ THIS ROUTE IS ONE MORE THAN `brief_learn_app_shell` DESCRIBES, and it is
 * here so that brief's "replaces the current LearnHome body" doesn't silently
 * delete a working surface. `LearnHome` is the only place in the app where 23
 * paths can be searched by title, summary or instructor name and filtered by
 * domain; the new dashboard shows coverage and what's in progress, which is a
 * different question. Flagged in the report rather than decided quietly.
 *
 * The component is IMPORTED UNCHANGED — not copied, not forked. If it is ever
 * genuinely unwanted, deleting this file and the component is one commit.
 *
 * ⚠ SIGNED OUT, THIS REDIRECTS TO `/learn`. The public Learn surface is the
 * sales page (E223) and a bare catalog here would be a second, competing front
 * door that answers none of a visitor's questions.
 */
export default async function LearnPathsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const viewer = await getSessionViewer();
  /*
    ⚠⚠ `/login`, NOT `/learn` (`P1-J3-E036`). THIS IS THE SECOND HALF OF THE FIX
    AND IT IS NOT OPTIONAL.

    ⚠ SUPERSEDED 2026-08-26, quoted not deleted:  *`redirect("/learn")`*
    ⚠ THAT WAS A LOOP. `/learn`'s hero button now points HERE, so a signed-out
    click on `/learn` returned the visitor to `/learn` — the page they clicked
    from, with nothing changed and no explanation. Scott asked for *"a LOGIN or
    CREATE YOUR ACCOUNT page"*; this is it.

    ⚠ THE CALLBACK IS ENCODED (`%2Flearn%2Fpaths`) so signing in lands on the paths
    they were trying to open, not on a dashboard.
    ⚠ THIS ROUTE STAYS GATED. It moves from redirecting to `/learn` to redirecting
    to `/login`, which is a BETTER gate, not a new one — its `public-routes.ts`
    status does not change and it is still absent from the allowlist.
  */
  if (!viewer) redirect("/login?callbackUrl=%2Flearn%2Fpaths");

  const cards = await getLearnHome(viewer.userId);
  const { tab } = await searchParams;

  return (
    <LearnHome
      cards={cards}
      chips={groupChips(cards)}
      signedIn
      initialTab={tab === "mine" ? "mine" : "all"}
    />
  );
}
