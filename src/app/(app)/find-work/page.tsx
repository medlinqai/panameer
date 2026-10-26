import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ownedProviderProfile } from "@/lib/access";
import { WorkFeed } from "@/components/home/WorkFeed";
import { getWorkFeed, WORK_FEED_TABS, type WorkFeedTab } from "@/lib/work-feed";
import { workFilterDefs, type WorkFilters } from "@/lib/work-filters";
import { redirect } from "next/navigation";
import { FindJobsFilters } from "@/components/work/JobsAppViews";

export const metadata = { title: "Find Work · Panameer" };

export default async function FindWorkPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; view?: string; slice?: string; show?: string; date?: string } & WorkFilters>;
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
  // SO-E004: browsing is open; responses wait for Go Live.
  const notLive = profile && !profile.onboarding_completed_at ? (
    <p data-not-live-jobs className="mb-4 border-l-2 border-magenta py-1 pl-3 text-[14px]">
      Finish Create What You Sell to say I Want This Job. <a href="/catalog/create" className="font-bold text-magenta-dark underline underline-offset-4">Start</a>
    </p>
  ) : null;

  // WK-E003: the old Sell tabs moved into Work — their URLs keep working.
  const keep = (extra: Record<string, string | undefined>) => { const q = new URLSearchParams(Object.entries(extra).filter((e): e is [string, string] => !!e[1])).toString(); return q ? `?${q}` : ""; };
  if (!sp.tab && !query && (!Object.keys(sp).length || sp.view)) redirect("/work/home");
  if (sp.tab === "interviews") redirect(`/work/interviews${keep({ view: sp.view, show: sp.show, date: sp.date })}`);
  if (sp.tab === "tests") redirect(`/work/interviews${keep({ stage: "tests", slice: sp.slice })}`);
  if (sp.tab === "invitations") redirect("/work/jobs?stage=They%20Requested");
  if (sp.tab === "proposals") redirect("/work/jobs?stage=You%20Applied");

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
      {["best", "recent", "us", "saved"].includes(tab) && <FindJobsFilters tab={tab} />}
      <WorkFeed tab={tab} query={query} cards={cards} basePath="/find-work" filters={await workFilterDefs(sp)} />
    </div>
  );
}
