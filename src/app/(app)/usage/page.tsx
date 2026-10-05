import { PageTabs } from "@/components/casing/PageTabs";
import { PatternHeader } from "@/components/casing/PatternHeader";
import { BuyerStatistics } from "@/components/console/StatisticsCards";
import { getStatistics } from "@/lib/statistics";
import { usageAreas, usageHiveCells, usageSummary } from "@/lib/usage-areas";
import { UsageHero } from "@/components/console/UsageHero";
import { UsageActivity } from "@/components/console/UsageActivity";
import { usageActivity, type ActivityRange } from "@/lib/usage-activity";
import { computeProfileScore } from "@/lib/completeness";
import { buildCompletenessInput } from "@/lib/onboarding";
import {
  accountAccessLines,
  accountStandingLines,
  accountCheckCounts,
} from "@/lib/account-standing";
import { type Figure } from "@/lib/figure";
import type { TrendPeriod } from "@/components/console/StatCardBacks";
import { tabSequenceFor } from "@/lib/nav";
import { profileTabs, profileTabLabel, ACCOUNT_MENU_NAME } from "@/lib/profile-tabs";
import { prisma } from "@/lib/prisma";
import { guardPage } from "@/lib/guard";
import { ownedProviderProfile } from "@/lib/access";

export const metadata = { title: "Usage · Panameer" };

function trendOf(sp: { period?: string }): TrendPeriod {
  return sp.period === "ytd" ? "ytd" : "90d";
}

export default async function MyStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; range?: string }>;
}) {
  const viewer = await guardPage("authenticated");

  const profile = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    select: {
      id: true,
      completeness: true,
      status: true,
      paused_at: true,
      validation_status: true,
      person_id: true,
      updated_at: true,
      created_at: true,
      onboarding_completed_at: true,
      role_type_id: true,
      hourly_rate_cents: true,
      rate_min_cents: true,
      rate_max_cents: true,
      onsite_rate_cents: true,
      remote_rate_cents: true,
      skills: { select: { id: true } },
      available_for_messages: true,
      person: {
        select: {
          phone: true,
          title: true,
          photo_url: true,
          site: { select: { addresses: { select: { id: true } } } },
          user: { select: { email_verified: true } },
        },
      },
      _count: {
        select: {
          skills: true,
          employers: true,
          projects: true,
          serviceProducts: true,
        },
      },
    },
  });

  if (!profile) {
    const person = await prisma.person.findFirst({
      where: { user_id: viewer.userId },
      select: { id: true },
    });
    if (!person) {
      return (
        <p className="text-ink-2">
          This account has no profile yet, so there is nothing to measure.
        </p>
      );
    }
    const sp = await searchParams;
    const s = await getStatistics(person.id, viewer.userId, null, "all", trendOf(sp));
    return (
      <>
        <PageTabs
          wrap
          eyebrow={ACCOUNT_MENU_NAME}
          sequence={tabSequenceFor("/profile")}
          tabs={profileTabs(viewer)}
          current="/usage"
        />
        <div className="mx-auto max-w-5xl space-y-4">
          {}
          <PatternHeader
            eyebrow={profileTabLabel("/usage")}
            headline="How your account is doing"
            lede="Anything marked “—” isn’t being counted yet, and says why."
            figures={[
              { label: "Colleagues", value: s.network.colleagues },
              { label: "Lessons Done", value: s.learning.lessonsCompleted },
              { label: "Certificates", value: s.learning.certifications },
            ]}
          />
          <BuyerStatistics s={s} period={trendOf(sp)} />
        </div>
      </>
    );
  }

  const sp = await searchParams;
  const range: ActivityRange = sp.range === "month" ? "month" : "all";
  const stats = await getStatistics(
    profile.person_id,
    viewer.userId,
    profile.id,
    "all",
    trendOf(sp)
  );

  const [publishedProducts, draftProducts, offersReceived, awaitingApproval, payouts, paid] =
    await Promise.all([
      prisma.serviceProduct.count({
        where: { provider_profile_id: profile.id, status: "PUBLISHED" },
      }),
      prisma.serviceProduct.count({
        where: { provider_profile_id: profile.id, status: "DRAFT" },
      }),
      prisma.serviceProductOffer.count({
        where: { provider_person_id: profile.person_id },
      }),
      prisma.settlementRequest.count({
        where: { provider_person_id: profile.person_id, status: "SUBMITTED" },
      }),
      // Pay (usage v4): settled earnings = the member's payouts, net of fee, in dollars.
      prisma.providerPayout.aggregate({ where: { provider_person_id: profile.person_id }, _sum: { net_cents: true } }),
      prisma.providerPayout.aggregate({ where: { provider_person_id: profile.person_id, status: "PAID" }, _sum: { net_cents: true } }),
    ]);

  const healthChecks = accountCheckCounts([
    accountAccessLines({ availableForMessages: profile.available_for_messages }),
    accountStandingLines({
      status: profile.status,
      emailVerified: !!profile.person.user?.email_verified,
    }),
  ]);

  const scoreInput = await buildCompletenessInput(profile.id);
  const searchScore: Figure = scoreInput
    ? computeProfileScore(scoreInput).total
    : { uncounted: "The profile could not be read" };

  const areas = usageAreas({
    views: stats.profile.views,
    searchScore,
    shownInSearch: stats.profile.shownInSearch,
    lessonsDone: stats.learning.lessonsCompleted,
    coursesCompleted: { uncounted: "A course completion is not recorded" },
    learnersInPaths: stats.teaching.learners,
    colleagues: stats.network.colleagues,
    invitesSent: stats.network.invitesSent,
    joinedFromInvites: stats.network.joined,
    workRequests: stats.work.requestsReceived,
    proposalsSent: stats.work.proposalsSent,
    interviews: stats.work.interviews,
    serviceProducts: publishedProducts,
    offersReceived,
    drafts: draftProducts,
    activeOrders: stats.work.workOrders,
    ordersCompleted: { uncounted: "Nothing closes a work order yet" },
    awaitingApproval,
    earnings: stats.work.earnings,
    payoutsPending: { uncounted: "No payout is ever created" },
    invoicesOpen: { uncounted: "There is no invoice record" },
    checksPassing: healthChecks.passing,
    checksFailing: healthChecks.failing,
    payEarnings: Math.round((payouts._sum.net_cents ?? 0) / 100),
    paidOut: Math.round((paid._sum.net_cents ?? 0) / 100),
  });

  // Usage v4: the activity cards count over the chosen range; the hero stays all-time.
  const rangeStats = range === "all" ? stats : await getStatistics(profile.person_id, viewer.userId, profile.id, "month", trendOf(sp));
  const activity = await usageActivity({ range, stats: rangeStats, personId: profile.person_id, userId: viewer.userId, profileId: profile.id, searchScore });
  const hive = usageHiveCells(areas);
  const levels = Object.fromEntries(hive.map((c) => [c.key, c.level]));

  return (
    <>
      {}
      <PageTabs
        wrap
        eyebrow={ACCOUNT_MENU_NAME}
        sequence={tabSequenceFor("/profile")}
        tabs={profileTabs(viewer)}
        current="/usage"
      />
    {}
    {}
    <div className="account-surface pm-usage -mx-4 bg-surface px-4 pb-10 sm:-mx-6 sm:px-6">
    <div className="mx-auto max-w-5xl">
      {}
      <div className="mb-6">
        <UsageHero
          cells={hive}
          stats={[
            { label: "Profile Views", value: stats.profile.views },
            { label: "Colleagues", value: stats.network.colleagues },
            { label: "Lessons Done", value: stats.learning.lessonsCompleted },
          ]}
          summary={usageSummary(areas)}
          scoreComplete={searchScore === 100}
        />
      </div>

      {}
      {}
      <UsageActivity areas={activity} range={range} levels={levels} />

      {}

    </div>
    {}
    </div>
    </>
  );
}
