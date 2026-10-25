import Link from "next/link";
import { Suspense } from "react";
import { getSessionViewer } from "@/lib/session";
import { PublishedDialog } from "@/components/home/PublishedDialog";
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
  searchParams: Promise<{ tab?: string; q?: string; step?: string; view?: string; period?: string }>;
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
  const providerProfile = await prisma.providerProfile.findFirst({
    where: { person: { user_id: viewer.userId } },
    select: { id: true, person_id: true, completeness: true, dashboard_seen_at: true, onboarding_completed_at: true },
  });
  // BD-E001: buyers' first visit comes from requesterProfile.dashboard_seen_at, read before it's stamped below.
  const requesterSeen = providerProfile ? null : await prisma.requesterProfile.findFirst({ where: { person: { user_id: viewer.userId } }, select: { dashboard_seen_at: true, completed_at: true } });
  const firstVisit = providerProfile
    ? !providerProfile.dashboard_seen_at || (!!providerProfile.onboarding_completed_at && providerProfile.dashboard_seen_at < providerProfile.onboarding_completed_at)
    : !!requesterSeen && (!requesterSeen.dashboard_seen_at || (!!requesterSeen.completed_at && requesterSeen.dashboard_seen_at < requesterSeen.completed_at));
  const sp0 = await searchParams;
  const first = facts.seller || facts.buyer ? <FiveThings viewer={viewer} firstName={facts.firstName} firstVisit={firstVisit} step={sp0.step ?? null} view={sp0.view ?? null} period={sp0.period ?? null} /> : null;

  if (providerProfile) {
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

        {/* Scott 10-15: nothing below the cards (same as the buyer dashboard). */}

        {/* Find Work feed hidden here (lives at /find-work). */}
      </div>
    );
  }

  const requester = await prisma.requesterProfile.findFirst({
    where: { person: { user_id: viewer.userId }, completed_at: { not: null } },
    select: { id: true, person: { select: { first_name: true } } },
  });

  if (requester) {
    await prisma.requesterProfile.update({ where: { id: requester.id }, data: { dashboard_seen_at: new Date() } });
    // BD-E002: greeting · Your Path · Things You Can Do Today — nothing below for buyers.
    if (first) return <div className="mx-auto w-full max-w-6xl">{first}</div>;
    const [openWorkCount, experts] = await Promise.all([
      prisma.job.count({ where: { buyer: { user_id: viewer.userId }, status: "OPEN" } }),
      listMentors(),
    ]);
    return (
      <RequesterHome
        firstName={displayFirstName(requester.person.first_name ?? "")}
        openWorkCount={openWorkCount}
        experts={experts.slice(0, 8)}
      />
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

  // BR-E005: a buyer's dashboard ends at Waiting on You — nothing below it.
  if (first) return <div className="mx-auto w-full max-w-6xl">{first}</div>;
  return (
    <div className="space-y-8">
      <header>
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
      {/* MD-E007: the old Post Work / What Comes Next cards are gone — Hire and Shop are the way in. */}
      {person?.requesterProfile?.completed_at ? (
        <Card>
          <h2 className="text-lg">Get Work Done</h2>
          <p className="mt-2 text-black/70 dark:text-white/70">Create a Job and choose a provider, or buy a service product in Shop.</p>
          <div className="mt-5 flex gap-2">
            <Link href="/hire" className="inline-flex bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90">Create a Job</Link>
            <Link href="/shop" className="inline-flex border border-foreground px-4 py-2 text-sm font-medium">Shop</Link>
          </div>
        </Card>
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
          <h2 className="text-lg">Hire</h2>
          <p className="mt-2 text-black/70 dark:text-white/70">
            Tell us what you need done. We show you who fits, and you choose
            whose availability to request.
          </p>
          <Link
            href="/hire"
            className="mt-5 inline-flex bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Start Hiring
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
