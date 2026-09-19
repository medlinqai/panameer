import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { guardPage } from "@/lib/guard";
import { ownedProviderProfile } from "@/lib/access";
import { isMarketplaceVisible } from "@/lib/access";
import { VISIBILITY_THRESHOLD } from "@/lib/completeness";
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

export default async function MyStatsPage() {
  /* ⚠ `authenticated` (`P2-J1.1-E040`) — ⚠ SUPERSEDED, quoted:
     `guardPage("canProvideServices")`. The null-profile empty state below is
     what makes this safe, and it was already here. */
  const viewer = await guardPage("authenticated");

  const profile = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    select: {
      completeness: true,
      status: true,
      paused_at: true,
      validation_status: true,
      rating: true,
      updated_at: true,
      created_at: true,
      onboarding_completed_at: true,
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
  const certificationCount = await prisma.certification.count({
    where: { user_id: viewer.userId },
  });

  if (!profile) {
    return (
      <p className="text-ink-2">
        This account has no provider profile, so there is nothing to measure yet.
      </p>
    );
  }

  const visible = isMarketplaceVisible({
    status: profile.status,
    completeness: profile.completeness,
    paused_at: profile.paused_at,
  });
  const validated = profile.validation_status === "VALIDATED";

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
        ⚠⚠⚠ THE ONE CRITERION WITH NO DOOR, AND IT IS A MEASURED DEFECT, NOT A
        DESIGN CHOICE. `POST /api/settings/request-validation` EXISTS, is
        owner-scoped and works — and NOTHING IN THE APPLICATION CALLS IT.
        ⚠ Measured at this brief's premise check, 2026-09-19: zero UI callers.
        ⚠⚠ `ProjectModal.tsx`'s `Request Validation` button is a DIFFERENT
        THING — it POSTs `/api/provider/project-validation`, which validates ONE
        PROJECT with a named contact, not the profile's merit badge.
        ⚠ So a provider CANNOT move themselves to `REQUESTED`. The only writer
        of `VALIDATED` is an admin on `/admin/providers`.
        ⚠⚠ THE PAGE THIS FOLDS FROM WAS WORSE THAN SILENT — `/account-health`
        told providers *"Ask for it from your profile once your work history is
        complete"*, pointing at a button that has never existed.
        ⚠⚠⚠ SO THIS ROW STATES THE TRUTH AND OFFERS NOTHING. Recorded for
        Scott's ruling at the WS-A gate; DO NOT invent a door here.
      */
      note: validated
        ? "Granted by Panameer on the quality of your work."
        : "Granted by Panameer on the quality of your work. It is never sold, and there is nothing to apply for yet.",
      action: null,
    },
  ];
  const metCount = criteria.filter((c) => c.met).length;

  return (
    <div className="mx-auto max-w-5xl">
      <p className="mb-5 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
        How your profile is performing. Anything marked “—” isn&apos;t being
        counted yet — those tiles fill in once transactions go live on Panameer.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile label="Earnings (12 Months)">
          <NotTrackedYet unlocks="you complete your first paid work order" />
        </StatTile>

        <StatTile label="Job Success Score">
          <NotTrackedYet unlocks="buyers rate completed work orders" />
        </StatTile>

        <StatTile label="Proposals">
          <NotTrackedYet unlocks="you start bidding on work requests" />
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
          <p className="font-display text-[30px] font-bold leading-none text-ink">
            {profile.completeness}% of required details
          </p>

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
                <span
                  aria-hidden
                  className={
                    "mt-[3px] grid h-[18px] w-[18px] flex-none place-items-center rounded-full text-[11px] font-black text-white " +
                    (c.met ? "bg-emerald-500" : "bg-ink-2/30")
                  }
                >
                  {c.met ? "✓" : "!"}
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

        <StatTile label="Client Relationships">
          <NotTrackedYet unlocks="you work with your first buyer" />
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

      <p className="mt-6 text-[13px] text-ink-2">
        Something look wrong?{" "}
        <Link href="/profile" className="font-semibold text-magenta hover:underline">
          Check your profile
        </Link>
        .
      </p>
    </div>
  );
}
