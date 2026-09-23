import Link from "next/link";
import { PageTabs } from "@/components/casing/PageTabs";
import { StatisticsCards, BuyerStatistics } from "@/components/console/StatisticsCards";
import { getStatistics } from "@/lib/statistics";
import type { TrendPeriod } from "@/components/console/StatCardBacks";
import { tabSequenceFor } from "@/lib/nav";
import { profileTabs } from "@/lib/profile-tabs";
import { prisma } from "@/lib/prisma";
import { guardPage } from "@/lib/guard";
import { ownedProviderProfile, providerMeetsRequired } from "@/lib/access";
import { isMarketplaceVisible } from "@/lib/access";
import { missingRequired, VISIBILITY_THRESHOLD } from "@/lib/completeness";
import { readAttestations } from "@/lib/experience-attestation";
import { ConfirmExperience } from "@/components/console/ConfirmExperience";
import { RequestValidationAction } from "@/components/console/RequestValidationAction";
/* ⚠ `StatValue` IS NO LONGER IMPORTED (`E563` WS-A). Both of its callers —
   `Profile Metrics`'s headline and the `Rising Talent` count — are superseded
   above; the merged meter is written out because `StatValue` renders MAGENTA and
   `E433` puts a figure in INK. ⚠ The component itself stays: `StatValue` is
   still the right thing for a tile whose value is a plain measured number. */
import {
  NotTrackedYet,
  StatRow,
  StatTile,
} from "@/components/console/StatTile";

/**
 * MY STATS (J2.4 WS-D / E010).
 *
 * Six tiles from the brief — 12-month earnings, Job Success Score, Proposals,
 * Profile metrics, Client relationships, Rising Talent — and NO Connects tile,
 * per the standing decision that Connects are removed everywhere.
 *
 * TWO OF THE SIX HAVE REAL DATA. Profile metrics reads the profile; Rising
 * Talent is derived from things the schema actually knows. The other four —
 * earnings, job success, proposals, client relationships — all depend on
 * contracts and payments, which are Phase 2 and have no models yet. Those
 * render `NotTrackedYet` rather than zeroes: a provider shown "Job Success 0%"
 * would reasonably think they had failed at something, and "$0 earned" is a
 * claim we have not earned the right to make.
 *
 * Server component. Every number here comes from one query on the viewer's own
 * profile, resolved through `ownedProviderProfile` — no id crosses the wire.
 */
export const metadata = { title: "My Stats · Panameer" };

/* ⚠⚠ ONE READING OF THE PARAM, AND ANYTHING UNRECOGNISED IS THE DEFAULT. A URL
   is user input: `?period=banana` must not throw and must not silently widen a
   window.
   ⚠⚠⚠ THE FRONT-FACE SWITCH IS GONE (`E603` correction 4) — the BACK face owns
   every time window now, so this param drives the TREND back, not the figures.
   ⚠ SUPERSEDED, quoted not deleted (`E164`):
   //   function periodOf(sp: { period?: string }): StatWindow {
   //     return sp.period === "all" ? "all" : "month";
   //   }
   ⚠ The front figures are simply "as they stand today", which is why they need
   no tag and no switch. */
function trendOf(sp: { period?: string }): TrendPeriod {
  return sp.period === "ytd" ? "ytd" : "90d";
}

export default async function MyStatsPage({
  searchParams,
}: {
  /* ⚠ The period is a URL param, so a view is shareable and survives a
     refresh (`E603` WS-A item 3). */
  searchParams: Promise<{ period?: string }>;
}) {
  /* ⚠ `authenticated` (`P2-J1.1-E040`) — ⚠ SUPERSEDED, quoted:
     `guardPage("canProvideServices")`. The null-profile empty state below is
     what makes this safe, and it was already here. */
  const viewer = await guardPage("authenticated");

  const profile = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    select: {
      id: true,
      completeness: true,
      status: true,
      paused_at: true,
      validation_status: true,
      /* ⚠ `E563` WS-C — the sourcing documents key on the PERSON, not the
         profile. `BidRequest.provider_person_id` and
         `InterviewRequest.provider_person_id` are both person ids. */
      person_id: true,
      rating: true,
      updated_at: true,
      created_at: true,
      onboarding_completed_at: true,
      /*
        ⚠⚠ WIDENED BY `E563` WS-B item 7 — the fields `missingRequired` needs to
        NAME the gaps rather than merely count them.
        ⚠ THE SHAPE MIRRORS `provider-profile-view.ts:254` FIELD FOR FIELD, and
        that is deliberate: the profile's status strip and this card answer the
        same question, and two surfaces that compute one answer from two
        different inputs is how they start disagreeing.
      */
      /* ⚠ `headline` COLUMN IS GONE (`E595` WS-B) — the title is on the person. */
      role_type_id: true,
      hourly_rate_cents: true,
      rate_min_cents: true,
      rate_max_cents: true,
      onsite_rate_cents: true,
      remote_rate_cents: true,
      skills: { select: { id: true } },
      person: {
        select: {
          phone: true,
          /* ⚠ `title` — the profile's title lives on the PERSON since `E595` WS-B. */
          title: true,
          photo_url: true,
          site: { select: { addresses: { select: { id: true } } } },
        },
      },
      _count: {
        select: {
          skills: true,
          employers: true,
          projects: true,
          packages: true,
        },
      },
    },
  });


  /* ⚠ COUNTED ON THE USER, NOT THE PROFILE (`P1-J3-E019`). A credential belongs to
     the person, so a seller's own stats include a `LEARN` credential they earned
     before they were a seller — which has no `provider_profile_id` at all. */
  /*
    ⚠⚠ THE GUARD MOVED UP (`E563` WS-C). It used to sit below the queries that
    follow; the WS-C counts need `profile.id` and `profile.person_id`, so the
    null case has to be settled BEFORE them rather than after. ⚠ Behaviour is
    unchanged for a provider — only the order of a check that already existed.
  */
  if (!profile) {
    /*
      ── ⚠⚠⚠ A BUYER HAS STATISTICS TOO (`E603` WS-A item 5) ────────────────

      ⚠ MEASURED AT THE PREMISE CHECK: this branch rendered ONE SENTENCE and no
      tab row, for every member without a provider profile. ⚠⚠ THAT WAS WRONG
      IN THE OTHER DIRECTION — a buyer HAS colleagues, sends invites and takes
      lessons, and was shown none of it.
      ⚠ SUPERSEDED, quoted not deleted (`E164`):
      //   return (
      //     <p className="text-ink-2">
      //       This account has no provider profile, so there is nothing to measure yet.
      //     </p>
      //   );
      ⚠⚠ THE SELLER CARDS BELOW STILL DO NOT RENDER — they need the profile this
      branch does not have, which is the rule stated in `StatisticsCards`: a
      card renders when the viewer HAS the thing it measures.
    */
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
          eyebrow="MY PROFILE"
          sequence={tabSequenceFor("/profile")}
          tabs={profileTabs(viewer)}
          current="/stats"
        />
        <div className="mx-auto max-w-5xl space-y-4">
          <p className="max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
            How your account is doing. Anything marked &ldquo;&mdash;&rdquo;
            isn&apos;t being counted yet, and says why.
          </p>
          <BuyerStatistics s={s} period={trendOf(sp)} />
        </div>
      </>
    );
  }

  const certificationCount = await prisma.certification.count({
    where: { user_id: viewer.userId },
  });

  /* ⚠ ONE CALL, THE SAME MODULE THE BUYER BRANCH USES — two shapes of this page
     asking two different questions is how the figures start to disagree. */
  const sp = await searchParams;
  /* ⚠ `"all"` — the FRONT face shows figures as they stand, with no window
     (`E603` correction 4). The trend back does the windowing. */
  const stats = await getStatistics(
    profile.person_id,
    viewer.userId,
    profile.id,
    "all",
    /* ⚠⚠ THE PERIOD REACHES THE QUERY, NOT JUST THE PILL. Until this argument
       existed the trend back drew the SAME EIGHT WEEKS under both periods, so
       `YTD` moved the highlight and nothing else. */
    trendOf(sp)
  );

  /* ⚠ OWNER-SCOPED INSIDE THE HELPER — the profile is resolved from the
     session, never from a parameter (`E563` WS-B item 8). */
  const attestations = await readAttestations(viewer);

  /*
    ── ⚠⚠ THE WS-C COUNTS (`P2-J2-E563`) ─────────────────────────────────────

    ⚠⚠ THESE ARE REAL COUNTS OF REAL ROWS, and today every sourcing one is
    ZERO — measured 2026-09-19: `BidRequest` 0, `ProviderBid` 0,
    `InterviewRequest` 0, across the WHOLE database. ⚠ That is a TRUE zero, not
    an untracked one, and the distinction decides how each tile renders:
      · a model exists and the count is 0 → PRINT 0. The Counters decision is
        LOCKED: *"a real count of what is in the database… Count it and print
        it."* ⚠⚠ A provider who has sent no proposals has sent no proposals.
      · nothing counts it at all → `NotTrackedYet` and a dash. That is
        `Earnings` and `Job Success Score`, and item 13 keeps them that way.
    ⚠ DO NOT convert these to dashes when they read 0; that hides a real answer.

    ── ⚠⚠⚠ THE `E366` AGGREGATION BAN APPLIES HERE AND IT IS ENFORCED ────────

    ⚠⚠ *"A recorded refusal becomes a scarlet letter on a marketplace."*
    `check:sourcing` FAILS THE BUILD on a named decline counter in any file that
    also handles a sourcing document — and this file now does.
    ⚠ SO: no `prisma.bidRequest.count()` filtered to `DECLINED`, no `groupBy`
    over a bid document, and NO IDENTIFIER matching `declineCount` /
    `declineRate` / `responsivenessScore` / `acceptanceRate` and friends.
    ⚠⚠ THE INVITATION COUNT IS DELIBERATELY BLIND TO THE ANSWER — it counts what
    was ISSUED. The brief: *"An invitation counts even when declined — a buyer
    asking directly is the signal, not the answer."* ⚠ That is the opposite of a
    decline counter and stays that way.
  */
  const [
    publishedProducts,
    draftProducts,
    invitationsToPropose,
    proposalsSent,
    interviewsOffered,
    interviewsTaken,
    interviewsClosed,
  ] = await Promise.all([
    prisma.package.count({
      where: { provider_profile_id: profile.id, status: "PUBLISHED" },
    }),
    prisma.package.count({
      where: { provider_profile_id: profile.id, status: "DRAFT" },
    }),
    /* ⚠ `issued_at: { not: null }` RATHER THAN A STATUS LIST. A DRAFT ITB was
       never sent, so it is not an invitation anybody received; and keying on the
       timestamp instead of a status keeps the answer out of this query
       entirely. */
    prisma.bidRequest.count({
      where: { provider_person_id: profile.person_id, issued_at: { not: null } },
    }),
    prisma.providerBid.count({
      where: {
        provider_person_id: profile.person_id,
        submitted_at: { not: null },
      },
    }),
    /* ⚠ OFFERED IS EVERY REQUEST AIMED AT THIS PROVIDER, whatever became of it —
       the denominator the brief wants beside `taken`. */
    prisma.interviewRequest.count({
      where: { provider_person_id: profile.person_id },
    }),
    prisma.interviewRequest.count({
      where: { provider_person_id: profile.person_id, status: "COMPLETED" },
    }),
    /*
      ⚠⚠ THE BRIEF SAYS *"declined or expired"* AND THE SCHEMA HAS NO `EXPIRED`.
      `InterviewStatus` is REQUESTED · SLOTS_OFFERED · SCHEDULED · COMPLETED ·
      DECLINED · CANCELLED. ⚠ So this counts DECLINED + CANCELLED and the label
      says so. Rendering the word "expired" would name a state that cannot
      occur — reported at the WS-C gate rather than invented here.
      ⚠ This is `interviewRequest`, NOT a bid document: `E366`'s ban covers the
      ITB and the bid, and says nothing about interviews. The name avoids every
      banned token regardless.
    */
    prisma.interviewRequest.count({
      where: {
        provider_person_id: profile.person_id,
        status: { in: ["DECLINED", "CANCELLED"] },
      },
    }),
  ]);

  /*
    ⚠⚠ `meetsRequired` IS NOW REQUIRED (`P2-J3-E590` WS-A0). This call site was
    one of the five that fell back to `completeness >= 80` — the second gate
    `E585` recorded. ⚠ SUPERSEDED, quoted not deleted (`E164`):
    // const visible = isMarketplaceVisible({
    //   status: profile.status,
    //   completeness: profile.completeness,
    //   paused_at: profile.paused_at,
    // });
    ⚠ NO QUERY CHANGE WAS NEEDED HERE — `E563` WS-B already widened this select
    for `missingRequired`, so every field the predicate reads was in memory and
    this page was answering the wrong question with the right data.
  */
  const visible = isMarketplaceVisible({
    status: profile.status,
    completeness: profile.completeness,
    paused_at: profile.paused_at,
    meetsRequired: providerMeetsRequired(profile),
  });
  const validated = profile.validation_status === "VALIDATED";
  /*
    ⚠⚠ `REQUESTED` IS ITS OWN STATE, NOT A FLAVOUR OF UNMET (Scott's ruling,
    2026-09-19). A provider who has asked must not be told again to ask.
  */
  const validationRequested = profile.validation_status === "REQUESTED";

  /* ⚠ NAMES THE GAPS. `E562` WS-B's strip does the same from the same fields —
     see the note on the widened select above. */
  const gaps = missingRequired({
    /* SOURCE IS Person.title SINCE E595 WS-B. */
    headline: profile.person.title,
    role_type_id: profile.role_type_id,
    skills: profile.skills,
    photoUrl: profile.person.photo_url,
    hasAddress: (profile.person.site?.addresses?.length ?? 0) > 0,
    hasPhone: Boolean(profile.person.phone?.trim()),
    hourly_rate_cents: profile.hourly_rate_cents,
    rate_min_cents: profile.rate_min_cents,
    rate_max_cents: profile.rate_max_cents,
    onsite_rate_cents: profile.onsite_rate_cents,
    remote_rate_cents: profile.remote_rate_cents,
  });

  /*
    ── ⚠⚠ THE FOUR CRITERIA, NOW THE ONLY COPY OF THEM (`P2-J2-E563` WS-A) ─────

    ⚠ SUPERSEDED, quoted not deleted (`E164`). This was `risingCriteria`, feeding
    a SEPARATE `Rising Talent` tile that sat beside `Profile Metrics`:
    // const risingCriteria = [
    //   { label: "Profile complete enough to be visible", met: profile.completeness >= VISIBILITY_THRESHOLD },
    //   { label: "Work history added", met: profile._count.employers > 0 },
    //   { label: "At least one service package listed", met: profile._count.packages > 0 },
    //   { label: "Identity validated by Panameer", met: validated },
    // ];
    // const risingMet = risingCriteria.filter((c) => c.met).length;

    ⚠⚠ SCOTT, 2026-09-17: *"How is Rising Talent not the same as Profile
    Metrics?"* ⚠ MEASURED, AND IT WAS NOT: THREE OF THE FOUR READ VALUES THAT
    ALREADY RENDERED IN THE TILE NEXT TO IT — completeness was the Profile
    Metrics headline, `employers` its Companies row, `packages` its Packages row.
    ⚠⚠ ONE IDEA COUNTED TWICE, AND A THIRD TIME on `/account-health`.

    ⚠⚠⚠ EACH UNMET CRITERION NOW CARRIES THE ACTION THAT FIXES IT. That is the
    thing the split version could not do: a checklist beside an inventory says
    what is wrong twice and how to fix it never.

    ⚠ `href` IS NULL ONLY WHEN NO DOOR EXISTS — see the validation row below.
    ⚠⚠ A NULL `href` MUST NEVER BE FAKED INTO A LINK. Rendering a button that
    goes nowhere is worse than rendering none.
  */
  const criteria: {
    label: string;
    met: boolean;
    note: string;
    action: { label: string; href: string } | null;
    /* ⚠⚠ A THIRD STATE, NOT A SECOND BOOLEAN FOR "MET". `pending` means the
       provider has done the only thing they can do and is waiting on somebody
       else. ⚠ Rendering that as an unmet `!` would blame them for a queue. */
    pending?: boolean;
    /* ⚠ A POSTING CONTROL rather than a link. `null` means no door is offered
       from this state. */
    control?: "request-validation" | null;
  }[] = [
    {
      label: "Profile complete enough to be visible",
      met: profile.completeness >= VISIBILITY_THRESHOLD,
      /* ⚠ THE CONSEQUENCE, NOT THE FLAG — folded from `/account-health`'s
         `Appear in buyer searches` row, which said the same thing about the
         same boolean. Its `Sell service packages` row read the SAME flag again,
         so its meaning is carried here too. */
      note:
        profile.paused_at
          ? "Paused by you — resume from Settings when you're ready."
          : profile.completeness >= VISIBILITY_THRESHOLD
            ? "Buyers can find you, and your service products are purchasable."
            : "Buyers cannot find you yet, and your service products are not on sale.",
      action:
        profile.completeness >= VISIBILITY_THRESHOLD
          ? null
          : /* ⚠ `E133` — `step=finish` is the review, the profile-shaped editor.
               `/join/provider` with no step resolves to the RESUME point and
               would drop a published provider at the start of the train. */
            { label: "Finish Your Profile", href: "/join/provider?step=finish" },
    },
    {
      label: "Work history added",
      met: profile._count.employers > 0,
      note: "Buyers read work history before anything else on your profile.",
      action:
        profile._count.employers > 0
          ? null
          : {
              label: "Add Work History",
              href: "/join/provider?step=tell_us&return=review",
            },
    },
    {
      /* ⚠⚠ `package` IS GONE FROM THE RENDERED WORD (`E563` WS-A item 6). The
         field is still `_count.packages` — the MODEL is `Package` and renaming
         it is not this brief's job; only the COPY changes. */
      label: "At least one service product listed",
      met: profile._count.packages > 0,
      note: "A service product is what a buyer actually buys.",
      action:
        profile._count.packages > 0
          ? null
          : { label: "Add a Service Product", href: "/my-services" },
    },
    {
      label: "Identity validated by Panameer",
      met: validated,
      /*
        ── ⚠⚠ THE DOOR IS WIRED (Scott's ruling, 2026-09-19) ─────────────────

        ⚠⚠⚠ SCOTT: *"Panameer is the ONLY one that can validate profiles. AND,
        there is a subscription level for the buyers that allows them to ONLY
        see validated profiles."* ⚠ VALIDATION IS A REVENUE MECHANISM, NOT A
        BADGE — which is why it earns a control rather than a note.

        ⚠ SUPERSEDED, quoted not deleted (`E164`) — true at the WS-A gate, and
        no longer true:
        // note: validated
        //   ? "Granted by Panameer on the quality of your work."
        //   : "Granted by Panameer on the quality of your work. It is never sold, and there is nothing to apply for yet.",
        // action: null,

        ⚠⚠ WHAT WS-A MEASURED AND THIS FIXES: `POST
        /api/settings/request-validation` existed, was owner-scoped, worked —
        and NOTHING CALLED IT. ⚠ The route is REUSED, not replaced (Scott: *"Do
        not write a new route."*).
        ⚠ `ProjectModal.tsx`'s identically-named button is a DIFFERENT THING —
        it POSTs `/api/provider/project-validation`, one project, one named
        contact. Do not merge the two.

        ⚠⚠⚠ THE `brief_K` INVARIANT, AND IT BINDS ANY LATER EDIT: VALIDATION
        GATES WHICH BUYERS SEE A PROVIDER, NEVER WHETHER THE PROVIDER IS
        VISIBLE. `isMarketplaceVisible` does not read `validation_status` and
        must not learn to.
      */
      note: validated
        ? "Granted by Panameer on the quality of your work."
        : validationRequested
          ? "You've asked for validation. Panameer reviews it — we'll let you know."
          : "Only Panameer can grant this, and it is never sold. Some buyers choose to see validated providers only.",
      action: null,
      pending: validationRequested,
      /* ⚠ A BUTTON, NOT A LINK — it POSTs. The component decides whether to
         render at all, mirroring `requestValidation`'s own state guard. */
      control: validated || validationRequested ? null : ("request-validation" as const),
    },
  ];
  const metCount = criteria.filter((c) => c.met).length;

  return (
    <>
      {/* ⚠⚠ THE PROFILE TAB ROW (`P2-A2-E600` WS-A) — one row for every page
          under the avatar, using the same words as the menu. */}
      <PageTabs
        eyebrow="MY PROFILE"
        sequence={tabSequenceFor("/profile")}
        tabs={profileTabs(viewer)}
        current="/stats"
      />
    <div className="mx-auto max-w-5xl">
      <p className="mb-5 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
        How your profile is performing. Anything marked “—” isn&apos;t being
        counted yet — those tiles fill in once transactions go live on Panameer.
      </p>

      {/*
        ── ⚠⚠ THE TWO ACTIONS, AT THE TOP (`P2-J2-E563` WS-B) ────────────────

        ⚠ Scott, 2026-09-17, on what he wants providers to do: *"ONE — complete
        their profile. TWO — check their 'have you done this for > 3 years'
        related to auto-service product creation."* ⚠⚠ THEY SIT ABOVE THE TILES
        BECAUSE THAT IS THE ORDER HE NAMED THEM IN — the measurements are what
        you read after you have done the two things.

        ⚠ `Finish Your Profile` RENDERS ONLY WHEN THERE IS SOMETHING TO FINISH.
        A permanent card telling a complete provider to complete their profile
        is the "states its absences twice" defect `E562` removed from the
        profile page.
      */}
      {gaps.length > 0 && (
        <section className="mb-4 rounded-brand border border-line bg-white p-5">
          <h2 className="font-display text-[16px] font-bold">
            Finish Your Profile
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
            {/* ⚠⚠ IT NAMES THEM. A card that says "something is missing"
                without saying WHAT is the invisible-profile bug itself — the
                same sentence `E562` WS-B's strip carries, for the same reason. */}
            Still needed: {gaps.join(" · ")}.
          </p>
          <Link
            href="/join/provider?step=finish"
            className="mt-4 inline-block rounded-full bg-magenta px-5 py-2.5 text-[14.5px] font-bold text-white transition-colors hover:bg-magenta-dark"
          >
            Finish Your Profile
          </Link>
        </section>
      )}

      <div className="mb-4">
        <ConfirmExperience initial={attestations} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/*
          ── ⚠⚠ `Service Products` (`E563` WS-C item 9) ─────────────────────

          ⚠⚠⚠ TWO OF THIS ITEM'S THREE PARTS HAVE NO DATA BEHIND THEM, AND
          NEITHER IS BUILT HERE. Measured 2026-09-19:

          1. ⚠ THE `Generic` / `Custom` SPLIT CANNOT BE COMPUTED. `Package` has
             no column that distinguishes a product Panameer generated from one
             the provider wrote — `kind` is DELIVERABLE/DEPLOYABLE/HOURS, a
             different axis. ⚠⚠ ADDING THAT COLUMN IS PART OF THE AUTO-CREATION
             MODEL, AND THIS BRIEF FORBIDS INVENTING IT: *"REPORT WHAT
             AUTO-CREATION WOULD NEED. DO NOT INVENT THE MODEL."*
             ⚠ Rendering `Generic 0 · Custom N` would be true only by accident —
             true today because nothing auto-creates, and SILENTLY WRONG the
             first day something does. That is the `HERO_SCRIM` failure shape:
             correct-looking and dead.
          2. ⚠ THERE IS NO VIEW TRACKING ANYWHERE. No `view_count`, no
             `PackageView`, nothing. So views take the dash convention.

          ⚠ `Published` and `Drafts` ARE real counts and render as numbers.
        */}
        <StatTile label="Service Products">
          <p className="font-display text-[30px] font-bold leading-none text-ink">
            {publishedProducts}
          </p>
          <p className="mt-1.5 text-[13px] text-ink-2">Published</p>
          <div className="mt-4">
            <StatRow label="Drafts" value={String(draftProducts)} />
          </div>
          {/* ⚠ THE DASH CONVENTION, APPLIED TO A SUB-FACT: a sentence saying
              what would start it beats a fabricated `0` views. */}
          <p className="mt-3 text-[12.5px] leading-relaxed text-ink-2">
            Views aren&rsquo;t counted yet. Products Panameer builds for you from
            your experience will be listed here separately once we build them.
          </p>
          <Link
            href="/my-services"
            className="mt-3 inline-block text-[13.5px] font-bold text-magenta hover:underline"
          >
            Manage Service Products
          </Link>
        </StatTile>

        <StatTile label="Earnings (12 Months)">
          <NotTrackedYet unlocks="you complete your first paid work order" />
        </StatTile>

        <StatTile label="Job Success Score">
          <NotTrackedYet unlocks="buyers rate completed work orders" />
        </StatTile>

        {/*
          ── ⚠⚠ `Proposals` (`E563` WS-C item 10) ───────────────────────────

          ⚠ SUPERSEDED, quoted not deleted (`E164`):
          // <StatTile label="Proposals">
          //   <NotTrackedYet unlocks="you start bidding on work requests" />
          // </StatTile>

          ⚠⚠ IT IS NO LONGER UNTRACKED — `BidRequest` and `ProviderBid` are in
          the schema and `lib/sourcing.ts` writes them, so these are real counts.
          ⚠ They read 0 today because the marketplace holds zero of both, and a
          TRUE zero is printed, not hidden behind a dash (the Counters decision
          is LOCKED: *"Count it and print it."*).

          ⚠⚠⚠ INVITATIONS COUNT EVEN WHEN DECLINED. The brief: *"a buyer asking
          directly is the signal, not the answer."* ⚠ This is NOT a decline
          counter and must never become one — `E366`, enforced by
          `check:sourcing`.
        */}
        <StatTile label="Proposals">
          {/* ⚠ `E433` — a count is a figure, so INK. */}
          <p className="font-display text-[30px] font-bold leading-none text-ink">
            {proposalsSent}
          </p>
          <p className="mt-1.5 text-[13px] text-ink-2">Sent</p>
          <div className="mt-4">
            <StatRow
              label="Invitations to propose"
              value={String(invitationsToPropose)}
            />
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-ink-2">
            An invitation counts whether or not you bid — a buyer asking you
            directly is the signal.
          </p>
        </StatTile>

        {/*
          ── ⚠⚠ ONE `Profile` TILE (`P2-J2-E563` WS-A) ─────────────────────────

          ⚠ ORDER IS THE BRIEF'S: the meter, the gate IN WORDS, the four
          criteria as a checklist, then the inventory counts.
          ⚠⚠ IT SPANS TWO COLUMNS because it now carries what two tiles carried.
        */}
        <StatTile label="Profile" span={2}>
          {/*
            ── FACT 1 — THE METER ───────────────────────────────────────────
            ⚠⚠ LABELLED "of required details", BYTE FOR BYTE WITH
            `ProviderProfileView.tsx` (`E562` WS-B). ⚠ THE TWO SURFACES MUST NOT
            DISAGREE — whichever of the two briefs landed second had to match the
            first, and `E562` landed first.
            ⚠ `completeness.ts` RETURNS 100 WHILE SECTIONS ARE EMPTY because it
            counts the REQUIRED SET only. The FIGURE is right; the word
            `Complete` is what would mislead, so the label names the denominator.
            ⚠ SUPERSEDED, quoted not deleted (`E164`) — the caption that used it:
            // caption={visible
            //   ? "Complete - your profile is live in the marketplace"
            //   : `Complete - ${VISIBILITY_THRESHOLD - profile.completeness}% to go before buyers can find you`}
            ⚠⚠ `E433` — A FIGURE, SO INK. `StatValue` renders magenta, which is
            why this meter is written out rather than reusing it; the remaining
            magenta figures on this page are recorded, not swept, because a
            page-wide recolour is not this workstream.
          */}
          {/*
            ── ⚠⚠⚠ THE COMPLETION FIGURE IS GONE FROM `/stats` (`E603` WS-A, 2 of 2) ──

            ⚠ SCOTT, 2026-09-23: *"Profile completion and application usage are
            different things. Completion belongs to the score page. Statistics
            measures what the application DID with the profile."*
            ⚠⚠ WS-A TOOK IT OFF THE NEW CARDS AND LEFT IT HERE, so the ruling was
            half-applied and the page still led with the number it forbade. **The
            correction is not complete until the OLD surface changes too.**

            ⚠⚠⚠ THE CARD IS NOT DELETED, AND THAT IS THE LOAD-BEARING PART.
            Removing it outright would take away the only entrance to the score
            page from this screen — `E579`'s inverse, and the same defect as
            `E601`'s `OwnerResumeRerun`, which survived intact and unreachable.
            ⚠ **A ZERO IS INFORMATION; AN ABSENT CARD IS A DEAD END.** So the
            figure is replaced by the door it was sitting on top of.

            ⚠ THE GATE, THE CHECKLIST AND THE INVENTORY COUNTS BELOW ALL STAY:
            they are VISIBILITY — whether buyers can find you — which is a
            different question from how complete the profile is, and is squarely
            what this page measures.

            ⚠ SUPERSEDED, quoted not deleted (`E164`):
            //   <p className="font-display text-[30px] font-bold leading-none text-ink">
            //     {profile.completeness}% of required details
            //   </p>
          */}
          <Link
            href="/community/score"
            className="inline-block font-display text-[19px] font-bold leading-tight text-magenta hover:underline"
          >
            See Your Profile Score &rarr;
          </Link>

          {/*
            ── FACT 2 — THE GATE, IN WORDS. No percentage in this sentence. ──
            ⚠ Same three-state shape as the profile's status strip, so a
            provider reading both surfaces is told the same thing twice in the
            same words rather than two different things.
          */}
          <p className="mt-3 text-[14px] font-bold">
            {profile.paused_at
              ? "Your profile is paused"
              : visible
                ? "Photo, identity and the required details — all met."
                : "Not visible yet — some required details are missing."}
          </p>

          {/*
            ── FACT 3 — THE CHECKLIST, EACH UNMET ROW CARRYING ITS ACTION ───
            ⚠⚠ THE ONLY COPY OF THESE FOUR IN THE APPLICATION as of `E563` WS-A.
          */}
          <ul className="mt-4 space-y-3">
            {criteria.map((c) => (
              <li key={c.label} className="flex items-start gap-2.5">
                {/*
                  ⚠⚠ THREE STATES, AND THE MIDDLE ONE IS THE POINT. A provider
                  waiting on Panameer's review has done everything they can, so
                  the mark must not read as a fault. ⚠ The glyph carries the
                  state as well as the colour — colour is not a label.
                */}
                <span
                  aria-hidden
                  className={
                    "mt-[3px] grid h-[18px] w-[18px] flex-none place-items-center rounded-full text-[11px] font-black text-white " +
                    (c.met
                      ? "bg-emerald-500"
                      : c.pending
                        ? "bg-ink-2"
                        : "bg-ink-2/30")
                  }
                >
                  {c.met ? "✓" : c.pending ? "…" : "!"}
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold">
                    {c.label}
                  </span>
                  <span className="block text-[13px] leading-relaxed text-ink-2">
                    {c.note}
                  </span>
                  {/* ⚠⚠ ONLY WHEN UNMET AND ONLY WHEN A DOOR EXISTS. A met
                      criterion needs no action, and a criterion with no door
                      must not grow a fake one. */}
                  {!c.met && c.action && (
                    <Link
                      href={c.action.href}
                      className="mt-1.5 inline-block text-[13.5px] font-bold text-magenta hover:underline"
                    >
                      {c.action.label}
                    </Link>
                  )}
                  {/* ⚠ THE ONE CRITERION WHOSE ACTION IS A POST, NOT A
                      NAVIGATION (Scott's ruling, 2026-09-19). */}
                  {c.control === "request-validation" && (
                    <RequestValidationAction status={profile.validation_status} />
                  )}
                </span>
              </li>
            ))}
          </ul>
          {/*
            ⚠ THE COUNT THE `Rising Talent` TILE CARRIED, KEPT. ⚠⚠ THE THRESHOLD
            CLAUSE ONLY RENDERS WHEN IT IS STILL AHEAD OF THEM — telling a
            provider already at 100% what they need to reach 80% is the kind of
            sentence that makes a page read as unaware of its own state.
            ⚠ `E433` — a count, so ink.
          */}
          <p className="mt-3 text-[12.5px] text-ink-2">
            {metCount} of {criteria.length} met
            {visible
              ? "."
              : ` · buyers can find you at ${VISIBILITY_THRESHOLD}% of required details.`}
          </p>

          {/* ── FACT 4 — THE INVENTORY ──────────────────────────────────── */}
          <div className="mt-4">
            <StatRow label="Skills" value={String(profile._count.skills)} />
            {/* `P2-J1.1-E012` — a work-history row is a COMPANY, not an employer.
       A resume row looks identical for employment and for contract work, the
       parser cannot tell them apart, and a user must not have to declare their
       tax status to fill one in. `Company` names the ENTITY, which is constant;
       `Employer` names the RELATIONSHIP, which varies. ⚠ `Company/Employer` was
       considered and REJECTED — a slash label puts the tax question back into a
       UI that had deliberately stopped asking it. ⚠ `Organization` is the fully
       correct superset and was CONSIDERED, NOT CHOSEN (Scott took `Company` for
       length and schema fit); recorded so nobody reopens it unknowing. */}
            <StatRow label="Companies" value={String(profile._count.employers)} />
            <StatRow label="Projects" value={String(profile._count.projects)} />
            {/*
              ⚠⚠ `Packages` LEAVES THE COUNTS (`E563` WS-A item 6). It moves to
              the `Service Products` tile, and the WORD becomes service products.
              ⚠ SUPERSEDED, quoted not deleted (`E164`):
              // <StatRow label="Packages" value={String(profile._count.packages)} />
              ⚠⚠ THE COUNT IS NOT LOST IN THE MEANTIME — the third criterion
              above reads the same `_count.packages`, so nothing goes dark
              between this workstream and WS-C.
            */}
            <StatRow
              label="Certifications"
              value={String(certificationCount)}
            />
          </div>
        </StatTile>

        {/*
          ── ⚠⚠ `Client Relationships` IS DELETED (`E563` WS-C item 12) ──────

          ⚠ Scott, 2026-09-17. ⚠ SUPERSEDED, quoted not deleted (`E164`):
          // <StatTile label="Client Relationships">
          //   <NotTrackedYet unlocks="you work with your first buyer" />
          // </StatTile>
          ⚠⚠ NOTHING REPLACES IT AND NOTHING IS LOST — it counted nothing, and
          the thing it would have counted has no model.
        */}

        {/*
          ── ⚠⚠ `Interviews` (`E563` WS-C item 11) ──────────────────────────

          ⚠ *"The gap between offered and taken is the only part a provider
          controls; that is why both render."*

          ⚠⚠ THE THIRD ROW SAYS `Declined or cancelled`, NOT *"declined or
          expired"* AS THE BRIEF ASKS. `InterviewStatus` HAS NO `EXPIRED` —
          it is REQUESTED · SLOTS_OFFERED · SCHEDULED · COMPLETED · DECLINED ·
          CANCELLED. ⚠ Naming a state that cannot occur would be a fabricated
          fact; reported at the WS-C gate instead.
        */}
        <StatTile label="Interviews">
          <p className="font-display text-[30px] font-bold leading-none text-ink">
            {interviewsOffered}
          </p>
          <p className="mt-1.5 text-[13px] text-ink-2">Offered</p>
          <div className="mt-4">
            <StatRow label="Taken" value={String(interviewsTaken)} />
            <StatRow
              label="Declined or cancelled"
              value={String(interviewsClosed)}
            />
          </div>
        </StatTile>

        {/*
          ── ⚠⚠ THE `Rising Talent` TILE IS GONE (`P2-J2-E563` WS-A item 3) ────

          ⚠ SUPERSEDED, quoted not deleted (`E164`). It rendered a count and the
          same four criteria the `Profile` tile above now owns:
          // <StatTile
          //   label="Rising Talent"
          //   hint="Panameer's version is a checklist, not a secret score - these are the things that make a new provider findable."
          // >
          //   <StatValue value={`${risingMet}/${risingCriteria.length}`} caption="Criteria met" />
          //   <ul className="mt-4 space-y-1.5">
          //     {risingCriteria.map((c) => (
          //       <li key={c.label} className="flex items-start gap-2 text-[13.5px]">
          //         <span
          //           aria-hidden
          //           className={
          //             "mt-[3px] grid h-4 w-4 flex-none place-items-center rounded-full text-[10px] font-black text-white " +
          //             (c.met ? "bg-emerald-500" : "bg-line")
          //           }
          //         >
          //           {c.met ? "✓" : ""}
          //         </span>
          //         <span className={c.met ? "text-ink-2" : ""}>{c.label}</span>
          //       </li>
          //     ))}
          //   </ul>
          // </StatTile>

          ⚠⚠ WHAT IS DELIBERATELY NOT CARRIED OVER: the `hint`, which argued that
          Panameer's badge is *"a checklist, not a secret score"*. ⚠ THAT
          ARGUMENT ONLY EXISTED TO DEFEND A BADGE THAT NO LONGER RENDERS —
          with the criteria merged into the `Profile` tile there is no badge to
          contrast with Upwork's, and keeping the sentence would defend
          something absent.
          ⚠ The COUNT survives as the `{metCount} of {criteria.length} met` line.
        */}
      </div>

      {/*
        ── ⚠⚠ THE CARDS `E600` FOLDED IN (`E603` WS-A) ────────────────────────
        ⚠ Usage is part of Statistics — one tab, one page. Network, Learning and
        Teaching sit BELOW the seller tiles above, which are this page's
        existing subject and are untouched.
      */}
      <div className="mt-6 space-y-4">
        <StatisticsCards s={stats} period={trendOf(sp)} />
      </div>

      <p className="mt-6 text-[13px] text-ink-2">
        Something look wrong?{" "}
        <Link href="/profile" className="font-semibold text-magenta hover:underline">
          Check your profile
        </Link>
        .
      </p>
    </div>
    </>
  );
}
