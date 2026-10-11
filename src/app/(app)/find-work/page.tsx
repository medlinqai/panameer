import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ownedProviderProfile } from "@/lib/access";
import { WorkFeed } from "@/components/home/WorkFeed";
import { getWorkFeed, WORK_FEED_TABS, type WorkFeedTab } from "@/lib/work-feed";
import { workHome } from "@/lib/work-home";
import { WorkHome } from "@/components/work/WorkHome";

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
        select: { id: true, person_id: true },
      })
    : null;

  // WS-E003: no tab = Work Home.
  if (!sp.tab && !query && profile) {
    const [home, best] = await Promise.all([workHome(profile.person_id), getWorkFeed({ tab: "best", profileId: profile.id, personId: profile.person_id })]);
    return (
      <div className="mx-auto w-full max-w-6xl">
        <WorkHome home={home} best={best} />
      </div>
    );
  }

  const cards = await getWorkFeed({
    tab,
    profileId: profile?.id ?? null,
    query: query || undefined,
    personId: profile?.person_id ?? null,
  });

  return (
    <div className="mx-auto w-full max-w-6xl">
      <WorkFeed tab={tab} query={query} cards={cards} basePath="/find-work" />
    </div>
  );
}
