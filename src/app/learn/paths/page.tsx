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
 * ⚠ SIGNED OUT, THIS NOW RENDERS (`P1-J3-E364` WS-8). ⚠ SUPERSEDED: *"SIGNED
 * OUT, THIS REDIRECTS TO `/learn`. The public Learn surface is the sales page
 * (E223) and a bare catalog here would be a second, competing front door."*
 * `E316` already reversed that reasoning for `/learn/courses`, which serves this
 * same component to visitors; keeping the opposite rule here is what produced two
 * catalogs. `/learn` is still the sales page and is untouched.
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
  /*
    ── ⚠⚠ IT NO LONGER REDIRECTS SIGNED OUT (`P1-J3-E364` WS-8) ───────────────

    ⚠ SUPERSEDED, quoted twice over because both were deliberate at the time:
      · `redirect("/learn")` — reversed by `E036` as a loop.
      · `redirect("/login?callbackUrl=%2Flearn%2Fpaths")` — `E036`'s own fix,
        whose comment read *"THIS ROUTE STAYS GATED… it is still absent from the
        allowlist."*

    ⚠⚠ THAT GATE AND `P1-J0-E316` CONTRADICTED EACH OTHER, and `E362` stopped
    rather than picking a side: `/learn/courses` is PUBLIC because the public hero
    CTA points at it, and it renders the SAME catalog from the SAME
    `getLearnHome(null)` call — so the app had one public catalog and one gated
    one, which is why the duplicate existed at all.

    ⚠ `E364` WS-8 RESOLVES IT IN SCOTT'S FAVOUR: the signed-out case is already
    built and working in this exact component, so `/learn/paths` uses it instead
    of refusing it. `E316`'s *"a live public CTA that leads nowhere"* is closed by
    this line.
    ⚠ AND IT IS REGISTERED IN `public-routes.ts` — the default is DENY, so without
    that entry this would 307 anyway.
  */
  const cards = await getLearnHome(viewer?.userId ?? null);
  const { tab } = await searchParams;

  return (
    <LearnHome
      cards={cards}
      chips={groupChips(cards)}
      signedIn={Boolean(viewer)}
      initialTab={tab === "mine" ? "mine" : "all"}
    />
  );
}
