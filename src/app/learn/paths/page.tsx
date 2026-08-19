import { redirect } from "next/navigation";
import { getLearnHome, groupChips } from "@/lib/learn-home";
import { getSessionViewer } from "@/lib/session";
import { LearnHome } from "@/components/learn/LearnHome";

export const metadata = {
  title: "All learning paths — Panameer Learn",
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
  if (!viewer) redirect("/learn");

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
