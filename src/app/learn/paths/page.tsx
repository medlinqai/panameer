import { getLearnHome, groupChips, viewerTeaches } from "@/lib/learn-home";
import { LearnTabs } from "@/components/learn/app/LearnTabs";
import { getSessionViewer } from "@/lib/session";
import { LearnHome } from "@/components/learn/LearnHome";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const mine = (await searchParams).tab === "mine";
  return mine
    ? {
        title: "My Learning Paths — Panameer Learn",
        description: "The Panameer learning paths you are enrolled in.",
      }
    : {
        title: "All Learning Paths — Panameer Learn",
        description: "Every Panameer learning path, searchable by name, domain and instructor.",
      };
}

export default async function LearnPathsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const viewer = await getSessionViewer();
  const cards = await getLearnHome(viewer?.userId ?? null);
  const { tab } = await searchParams;
  const teaches = await viewerTeaches(viewer);

  return (
    <>
      {}
      {viewer && <LearnTabs active="paths" teaches={teaches} />}
      <LearnHome
        cards={cards}
        chips={groupChips(cards)}
        signedIn={Boolean(viewer)}
        initialTab={tab === "mine" ? "mine" : "all"}
      />
    </>
  );
}
