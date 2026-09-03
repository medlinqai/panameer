import Link from "next/link";
import { Suspense } from "react";
import { getSessionViewer } from "@/lib/session";
import { PublishedDialog } from "@/components/home/PublishedDialog";
import { AttentionStrip } from "@/components/home/AttentionStrip";
import { WorkFeed } from "@/components/home/WorkFeed";
import { getAttentionCards } from "@/lib/attention";
/* ⚠⚠ COMMUNITY CREDITS PARKED 2026-09-03 (`P1-ALL-E375`, amendment A2). Scott:
   *"just comment it out... it is just too much rn. we NEED to move faster. that
   has no real value."* Parked DELIBERATELY, NOT ABANDONED — no ledger, no
   scheduling, and a standing Friday commitment nobody wants. Decision and the
   full call-site list: `src/lib/credits.ts`. */
// import { getCreditsSummary } from "@/lib/credits";
import { getWorkFeed, WORK_FEED_TABS, type WorkFeedTab } from "@/lib/work-feed";
import { Card } from "@/components/Card";
import { prisma } from "@/lib/prisma";
import { displayFirstName } from "@/lib/display";
import { RequesterHome } from "@/components/home/RequesterHome";
import { listMentors } from "@/lib/mentors";

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
    /* ⚠⚠ THE CREDITS FETCH IS PARKED (`P1-ALL-E375`) — one fewer round trip on
       every dashboard load, since nothing renders the result.
       ⚠⚠ THE DESTRUCTURE WAS RE-INDEXED, NOT JUST BLANKED. `Promise.all` returns
       positionally, so leaving `[attention, credits, cards]` over a two-element
       array would have silently bound `cards` to `undefined` and the work feed
       would have rendered empty with no error. Both the array entry and the name
       came out together. */
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
        <Suspense fallback={null}>
          <PublishedDialog />
        </Suspense>

        {/* ⚠ `credits` prop parked with the tile — `P1-ALL-E375`. */}
        <AttentionStrip
          cards={attention.cards}
          completeness={providerProfile.completeness}
        />

        <WorkFeed tab={tab} query={query} cards={cards} />
      </div>
    );
  }

  /*
    THE REQUESTER LANDS ON THEIR OWN HOME (brief_requester_home_v1 WS-C).

    Mirrors the provider pattern: /dashboard branches by who you are rather than
    each role owning a different URL, so "go to my dashboard" means one thing
    everywhere in the product — at the end of onboarding, from the rail's Home,
    and after every login.

    Checked BEFORE the generic buyer surface below, because a requester carries
    `is_service_buyer` too and would otherwise fall through to a card that
    offers them one link.
  */
  const requester = await prisma.requesterProfile.findFirst({
    where: { person: { user_id: viewer.userId }, completed_at: { not: null } },
    select: { id: true, person: { select: { first_name: true } } },
  });

  if (requester) {
    /*
      A REAL COUNT, and today it is genuinely zero for everyone: WorkRequest
      exists and nobody has posted one. That is why the empty state is honest
      rather than fabricated — it is a measurement, not a placeholder.
    */
    const [openWorkCount, experts] = await Promise.all([
      /*
        `buyer` is the Person directly, and POSTED is the only live status the
        enum has — there is no IN_PROGRESS, because nothing can progress yet.
        Counting a status that does not exist would have been a silent zero
        rather than an error, which is exactly the kind of "empty state" that
        looks correct and isn't.
      */
      prisma.workRequest.count({
        where: { buyer: { user_id: viewer.userId }, status: "POSTED" },
      }),
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
              href="/find-work/new"
              className="mt-5 inline-flex rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
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
        /*
          ⚠⚠ THE HALF-FINISHED REQUESTER (`P1-J1.1-E245`, 2026-08-30).

          This branch did not exist, and WITHOUT IT a requester whose
          `completed_at` is null fell all the way through to the `Get Started`
          card below — which tells a BUYER *"Your profile isn't set up yet.
          Build a provider profile to be found by service buyers"* and points at
          `/join`. Wrong side of the marketplace, exactly the defect the comment
          above says was fixed for COMPLETED requesters; it was still live for
          incomplete ones. VERIFIED IN THE APP as `test_user4@medlinq.ai`
          (`onboarding_step = requester_info`) before this was written, not
          reasoned about.

          ⚠ IT IS A PRECONDITION OF `E245`, NOT A FREE ADDITION. That row adds a
          `Finish later` escape to every wizard step, landing here. The brief
          said to render this page first and STOP if it was "a bare header",
          because *"an exit into an empty room is worse than no exit"* — what is
          actually here is worse than an empty room, so the escape could not
          ship until the room was right. REPORTED as a deviation.

          ⚠ THE WIZARD OWNS THE RESUME POINT, so this links at
          `/join/requester/steps` with no `?step=` — the page reads
          `onboarding_step` off the server and opens where they stopped.
        */
        <Card>
          <h2 className="text-lg">Finish Setting Up</h2>
          <p className="mt-2 text-black/70 dark:text-white/70">
            Your account is ready — there are just a few details left before you
            can post work. We saved everything you have entered so far.
          </p>
          <Link
            href="/join/requester/steps"
            className="mt-5 inline-flex rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
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
