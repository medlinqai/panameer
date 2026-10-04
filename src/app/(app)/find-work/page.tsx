import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ownedProviderProfile } from "@/lib/access";
import { WorkFeed } from "@/components/home/WorkFeed";
import { getWorkFeed, WORK_FEED_TABS, type WorkFeedTab } from "@/lib/work-feed";

export const metadata = { title: "Find Work · Panameer" };

export default async function FindWorkPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  await guardPage("canProvideServices");
  const viewer = await getSessionViewer();

  const sp = await searchParams;
  const tab: WorkFeedTab = WORK_FEED_TABS.some((t) => t.id === sp.tab)
    ? (sp.tab as WorkFeedTab)
    : "best";
  const query = (sp.q ?? "").trim();

  // Owner-scoped: the profile comes from the session, never from the request.
  const profile = viewer
    ? await prisma.providerProfile.findFirst({
        where: ownedProviderProfile(viewer),
        select: { id: true },
      })
    : null;

  const cards = await getWorkFeed({
    tab,
    profileId: profile?.id ?? null,
    query: query || undefined,
  });

  return (
    <div className="mx-auto w-full max-w-6xl">
      <WorkFeed tab={tab} query={query} cards={cards} basePath="/find-work" />
    </div>
  );
}
