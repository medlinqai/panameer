import Link from "next/link";
import { Suspense } from "react";
import { getSessionViewer } from "@/lib/session";
import { PublishedDialog } from "@/components/home/PublishedDialog";
import { AttentionStrip } from "@/components/home/AttentionStrip";
import { WorkFeed } from "@/components/home/WorkFeed";
import { getAttentionCards } from "@/lib/attention";
import { getCreditsSummary } from "@/lib/credits";
import { getWorkFeed, WORK_FEED_TABS, type WorkFeedTab } from "@/lib/work-feed";
import { Card } from "@/components/Card";
import { prisma } from "@/lib/prisma";
import { displayFirstName } from "@/lib/display";

/**
 * HOME — the PROVIDER dashboard (brief_sp_dashboard; supersedes MASTER WS12).
 *
 * This page used to render the provider's entire profile view, which is why the
 * post-publish landing was "mixing two pages" (E146): Home and my-profile were
 * the same endless scroll. They are now separate concerns —
 *
 *   Home     = what needs you, then go find work          (here)
 *   Profile  = what buyers see, and Edit Profile          (/profile, /providers/[id])
 *
 * THE WORK FEED IS THE BODY and the attention strip sits above it. That order is
 * the brief's central claim: work is what brings a provider back, so it gets the
 * page, and the cross-cutting things that would otherwise hide in submenus get
 * one compact line above it.
 *
 * A buyer, or an account with no provider profile, keeps the lightweight
 * surface below — Home for them is a different job and out of this brief.
 */
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

    /*
      COUNT BEFORE STAMPING. "New Matches" means "since your last visit", so the
      read has to happen against the OLD `dashboard_seen_at`; stamping first
      would zero the card on the very render that is supposed to show it. The
      stamp is deliberately after the await for that reason and not by accident
      of ordering.
    */
    const [attention, credits, cards] = await Promise.all([
      getAttentionCards({
        personId: providerProfile.person_id,
        profileId: providerProfile.id,
        userId: viewer.userId,
      }),
      getCreditsSummary(providerProfile.person_id),
      getWorkFeed({ tab, profileId: providerProfile.id, query: query || undefined }),
    ]);

    await prisma.providerProfile.update({
      where: { id: providerProfile.id },
      data: { dashboard_seen_at: new Date() },
    });

    return (
      <div className="mx-auto w-full max-w-6xl">
        <Suspense fallback={null}>
          <PublishedDialog />
        </Suspense>

        <AttentionStrip
          cards={attention.cards}
          credits={credits}
          completeness={providerProfile.completeness}
        />

        <WorkFeed tab={tab} query={query} cards={cards} />
      </div>
    );
  }

  // --- Not a provider: buyer / unfinished account ---------------------------
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: {
      first_name: true,
      company: { select: { name: true } },
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
      <header>
        <h1 className="text-3xl tracking-tight">
          Welcome Back{firstName ? `, ${firstName}` : ""}
        </h1>
        {person?.company?.name && (
          <p className="mt-1 text-black/60 dark:text-white/60">
            {person.company.name}
          </p>
        )}
      </header>

      {/*
        THE REQUESTER'S HOME (P1-J1.2 WS5).

        Without this branch a requester who just finished onboarding and clicked
        "Go to my dashboard" was told "Your profile isn't set up yet. Build a
        provider profile" — the wrong side of the marketplace, one click after
        finishing the right one. A Requester has no BuyerProfile, so they fell
        through to the unfinished-account case.

        Post-a-work-request is the ONLY live action. Everything else the
        fulfillment thread will hang here — proposals, work orders, settlement —
        is named and marked as not built, rather than shown as an empty list
        that reads like nothing is happening.
      */}
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
              href="/work/new"
              className="mt-5 inline-flex rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Create Work Request
            </Link>
          </Card>

          <Card>
            <h2 className="text-lg">What comes next</h2>
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
      ) : person?.buyerProfile ? (
        <Card>
          <h2 className="text-lg">Hire Talent</h2>
          <p className="mt-2 text-black/70 dark:text-white/70">
            Post a work request and match with validated experts across the
            enterprise-application catalog.
          </p>
          <Link
            href="/work/new"
            className="mt-5 inline-flex rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
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
            className="mt-5 inline-flex rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Build My Profile
          </Link>
        </Card>
      )}
    </div>
  );
}
