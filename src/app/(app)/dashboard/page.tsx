import Link from "next/link";
import { Suspense } from "react";
import { getSessionViewer } from "@/lib/session";
import { PublishedDialog } from "@/components/home/PublishedDialog";
import { AttentionStrip } from "@/components/home/AttentionStrip";
import { WorkFeed } from "@/components/home/WorkFeed";
import { getAttentionCards } from "@/lib/attention";
// import { getCreditsSummary } from "@/lib/credits";
import { getWorkFeed, WORK_FEED_TABS, type WorkFeedTab } from "@/lib/work-feed";
import { Card } from "@/components/Card";
import { prisma } from "@/lib/prisma";
import { displayFirstName } from "@/lib/display";
import { RequesterHome } from "@/components/home/RequesterHome";
import { listMentors } from "@/lib/mentors";
import { loadMemberFacts } from "@/lib/next-step-facts";
import { FiveThings } from "@/components/home/FiveThings";
import { CompanyLink } from "@/components/company/CompanyLink";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return (
      <Card>
        <p className="text-black/70 dark:text-white/70">
          Please{" "}
          <Link href="/login" className="underline">
            sign in
          </Link>
          .
        </p>
      </Card>
    );
  }

  // First page: everyone lands here; the next-step card reads the member's facts before the visit is marked.
  const facts = await loadMemberFacts(viewer);
  // "5 things you can do today" replaces the single next-step card and its "Why" / "Then" lists.
  const first = facts.seller || facts.buyer ? <FiveThings viewer={viewer} firstName={facts.firstName} /> : null;
  const providerProfile = await prisma.providerProfile.findFirst({
    where: { person: { user_id: viewer.userId } },
    select: { id: true, person_id: true, completeness: true },
  });

  if (providerProfile) {
    const sp = await searchParams;
    const tab: WorkFeedTab = WORK_FEED_TABS.some((t) => t.id === sp.tab)
      ? (sp.tab as WorkFeedTab)
      : "best";
    const query = (sp.q ?? "").trim();

    const [attention, cards] = await Promise.all([
      getAttentionCards({
        personId: providerProfile.person_id,
        profileId: providerProfile.id,
        userId: viewer.userId,
      }),
      // getCreditsSummary(providerProfile.person_id),
      getWorkFeed({ tab, profileId: providerProfile.id, query: query || undefined }),
    ]);

    await prisma.providerProfile.update({
      where: { id: providerProfile.id },
      data: { dashboard_seen_at: new Date() },
    });

    return (
      <div className="mx-auto w-full max-w-6xl">
        {}
        {first}
        <Suspense fallback={null}>
          <PublishedDialog />
        </Suspense>

        {}
        <AttentionStrip
          cards={attention.cards}
          completeness={providerProfile.completeness}
        />

        <WorkFeed tab={tab} query={query} cards={cards} />
      </div>
    );
  }

  const requester = await prisma.requesterProfile.findFirst({
    where: { person: { user_id: viewer.userId }, completed_at: { not: null } },
    select: { id: true, person: { select: { first_name: true } } },
  });

  if (requester) {
    await prisma.requesterProfile.update({ where: { id: requester.id }, data: { dashboard_seen_at: new Date() } });
    const [openWorkCount, experts] = await Promise.all([
      prisma.workRequest.count({
        where: { buyer: { user_id: viewer.userId }, status: "POSTED" },
      }),
      listMentors(),
    ]);

    return (
      <>
        <div className="mx-auto w-full max-w-6xl">{first}</div>
        <RequesterHome
        firstName={displayFirstName(requester.person.first_name ?? "")}
        openWorkCount={openWorkCount}
        experts={experts.slice(0, 8)}
      />
      </>
    );
  }

  // --- Not a provider: buyer / unfinished account ---------------------------
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: {
      first_name: true,
      company: { select: { id: true, name: true } },
      buyerProfile: { select: { subscription_tier: true } },
      requesterProfile: {
        select: {
          completed_at: true,
          approver_name: true,
          workSite: {
            select: { addresses: { take: 1, orderBy: { created_at: "asc" } } },
          },
        },
      },
    },
  });

  const firstName = displayFirstName(person?.first_name ?? "");
  const requesterAddress = person?.requesterProfile?.workSite?.addresses[0];
  const requesterWhere = requesterAddress
    ? [requesterAddress.city, requesterAddress.state, requesterAddress.country]
        .filter(Boolean)
        .join(", ")
    : null;

  return (
    <div className="space-y-8">
      {first}
      <header className={first ? "hidden" : undefined}>
        <h1 className="text-3xl tracking-tight">
          Welcome Back{firstName ? `, ${firstName}` : ""}
        </h1>
        {person?.company?.name && (
          <p className="mt-1 text-black/60 dark:text-white/60">
            <CompanyLink id={person.company.id} name={person.company.name} />
          </p>
        )}
      </header>

      {/* THE REQUESTER'S HOME (P1-J1.2 WS5). */}
      {person?.requesterProfile?.completed_at ? (
        <>
          <Card>
            <h2 className="text-lg">Post Work</h2>
            <p className="mt-2 text-black/70 dark:text-white/70">
              Describe what you need and match with validated experts across the
              enterprise-application catalog.
              {requesterWhere ? (
                <>
                  {" "}
                  Work is delivered to <b>{requesterWhere}</b>
                  {person.requesterProfile.approver_name ? (
                    <>
                      {" "}
                      and approved by{" "}
                      <b>{person.requesterProfile.approver_name}</b>
                    </>
                  ) : null}
                  .
                </>
              ) : null}
            </p>
            <Link
              href="/find-work/new"
              className="mt-5 inline-flex bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Create Work Request
            </Link>
          </Card>

          <Card>
            <h2 className="text-lg">What Comes Next</h2>
            <p className="mt-2 text-black/70 dark:text-white/70">
              These arrive with the fulfillment thread — none of them are built
              yet, so there is nothing here to miss.
            </p>
            <ul className="mt-4 grid gap-2 text-sm text-black/70 dark:text-white/70">
              <li>· Proposals from providers on your requests</li>
              <li>· Work orders, once your company&apos;s payment method is set up</li>
              <li>· Milestones and settlement</li>
            </ul>
          </Card>
        </>
      ) : person?.requesterProfile ? (
        // THE HALF-FINISHED REQUESTER , 2026-08-30).
        <Card>
          <h2 className="text-lg">Finish Setting Up</h2>
          <p className="mt-2 text-black/70 dark:text-white/70">
            Your account is ready — there are just a few details left before you
            can post work. We saved everything you have entered so far.
          </p>
          <Link
            href="/join/requester/steps"
            className="mt-5 inline-flex bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Pick Up Where I Left Off
          </Link>
        </Card>
      ) : person?.buyerProfile ? (
        <Card>
          <h2 className="text-lg">Hire Talent</h2>
          <p className="mt-2 text-black/70 dark:text-white/70">
            Post a work request and match with validated experts across the
            enterprise-application catalog.
          </p>
          <Link
            href="/find-work/new"
            className="mt-5 inline-flex bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Create Work Request
          </Link>
        </Card>
      ) : (
        <Card>
          <h2 className="text-lg">Get Started</h2>
          <p className="mt-2 text-black/70 dark:text-white/70">
            Your profile isn&apos;t set up yet. Build a provider profile to be
            found by service buyers.
          </p>
          <Link
            href="/join"
            className="mt-5 inline-flex bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Build My Profile
          </Link>
        </Card>
      )}
    </div>
  );
}
