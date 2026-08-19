import { getLearnHome, groupChips } from "@/lib/learn-home";
import { getSessionViewer } from "@/lib/session";
import { LearnHome } from "@/components/learn/LearnHome";
import { LearnPublic } from "@/components/learn/LearnPublic";

export const metadata = {
  title: "Learn — Panameer",
  description:
    "Free Oracle Cloud courses: procurement, finance, supply chain and HR, taught by the people who implement them.",
};

/**
 * Learn Home (brief_learn_experience WS1, design ref E136).
 *
 * ONE page for both audiences. The layout picks the shell; the page folds a
 * signed-in learner's enrolments and progress into the same grid a visitor
 * sees. The design's All / My Learning Paths tabs are a FILTER over one
 * catalog, not two pages — building them as two would let a path look
 * different depending on which door you came through.
 *
 * Replaces the audience → group → path browse that brief_learn_v1 WS2 shipped.
 * That page grouped by facet and was right when the catalog was a list to read;
 * cards fronted by the instructor's face are right now that the instructor IS
 * the proposition.
 */
export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const viewer = await getSessionViewer();

  /*
    ── ⚠ SIGNED OUT, `/learn` IS A SALES PAGE (E223) ──────────────────────────
    Scott: "the public facing pages are sales... pretty much only. They are to get you
    to create an account." The layout already branched on the viewer for the SHELL;
    this is the same branch for the CONTENT. No new route, no redirect, no second URL.

    ⚠ THE RETURN IS BEFORE `getLearnHome`, DELIBERATELY. `LearnPublic` renders no
    catalog data, so a visitor must not cost a catalog query — asserted from the server
    log, not from reading this.

    ⚠ AND IT CHANGES WHAT `?tab=mine` DOES SIGNED OUT. That used to render the catalog
    with an empty "Sign in to keep track" state; a shared `?tab=mine` link now lands on
    the sales page instead. That is correct — the tab is a filter over a catalog the
    visitor no longer sees — but it is a change in what an existing link does.

    ⚠ `searchParams` IS STILL AWAITED BELOW, not here: awaiting it on this branch would
    make the sales page depend on the request's query string for nothing, and a page
    that reads searchParams cannot be statically rendered.
  */
  if (!viewer) return <LearnPublic />;

  const cards = await getLearnHome(viewer.userId);
  /*
    WS1-B — `?tab=mine` opens on My Learning Paths. The rail lists the two as
    separate submenu entries; they are one page with the filter flipped, which
    is what the tabs already were. Anything else falls back to "all" rather
    than erroring — a bad query in a URL should not be a broken page.
  */
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
