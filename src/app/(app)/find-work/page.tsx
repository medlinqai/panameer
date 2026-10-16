import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ownedProviderProfile } from "@/lib/access";
import { WorkFeed } from "@/components/home/WorkFeed";
import { getWorkFeed, WORK_FEED_TABS, type WorkFeedTab } from "@/lib/work-feed";
import { workHome } from "@/lib/work-home";
import { workFilterDefs, type WorkFilters } from "@/lib/work-filters";
import { WorkHome } from "@/components/work/WorkHome";

export const metadata = { title: "Find Work · Panameer" };

export default async function FindWorkPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string } & WorkFilters>;
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
        select: { id: true, person_id: true, onboarding_completed_at: true },
      })
    : null;
  // SO-E004: browsing is open; proposals wait for Go Live.
  const notLive = profile && !profile.onboarding_completed_at ? (
    <p data-not-live-jobs className="mb-4 border-l-2 border-magenta py-1 pl-3 text-[14px]">
      Finish Create Products &amp; Services to send proposals. <a href="/join/provider" className="font-bold text-magenta-dark underline underline-offset-4">Start</a>
    </p>
  ) : null;

  // WS-E003: no tab = Work Home.
  if (!sp.tab && !query && !Object.keys(sp).length && profile) {
    const [home, best] = await Promise.all([workHome(profile.person_id), getWorkFeed({ tab: "best", profileId: profile.id, personId: profile.person_id })]);
    return (
      <div className="mx-auto w-full max-w-6xl">
        {notLive}
        <WorkHome home={home} best={best} />
      </div>
    );
  }

  const cards = await getWorkFeed({
    tab,
    profileId: profile?.id ?? null,
    query: query || undefined,
    personId: profile?.person_id ?? null,
    filters: sp,
  });

  return (
    <div className="mx-auto w-full max-w-6xl">
      {notLive}
      <WorkFeed tab={tab} query={query} cards={cards} basePath="/find-work" filters={await workFilterDefs(sp)} />
    </div>
  );
}
