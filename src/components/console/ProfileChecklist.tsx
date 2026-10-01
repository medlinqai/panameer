import Link from "next/link";
import { StatTile, StatRow } from "@/components/console/StatTile";
/* ⚠ The posting control the validation row offers — moved with the row it
   belongs to, not re-implemented. */
import { RequestValidationAction } from "@/components/console/RequestValidationAction";
/* ⚠ `VISIBILITY_THRESHOLD` is NOT imported: the threshold clause was already
   removed from this card by `E659` — a percentage is not what makes a profile
   visible any more, and the criteria rows name the missing parts instead. */

/**
 * ── ⚠⚠⚠ THE PROFILE CHECKLIST — LIFTED OFF `/usage`, UNMOUNTED (`P2-A1.1-E744`)
 *
 * ⚠ SCOTT, 2026-10-02, on the cards below the gauges: *"do we need this any
 * more?"* — **no**, not on Usage. ⚠⚠ But: *"Keep the checklist and Confirm Your
 * Experience components, unmounted. They move to the dashboard's 'next moves'
 * section later."*
 *
 * ⚠⚠⚠ **`ConfirmExperience` WAS ALREADY A COMPONENT, SO UNMOUNTING IT WAS ONE
 * DELETED LINE. THIS WAS NOT.** The four criteria were built inline in
 * `usage/page.tsx` (the `criteria` array) and rendered inline inside a
 * `StatTile`, so *"keep the checklist"* had nothing to keep — removing the card
 * would have deleted the thing Scott asked to preserve.
 * ⚠ **So it is EXTRACTED, not rewritten.** The builder and the markup are moved
 * byte-for-byte, with their own comments, and nothing about the rules changed.
 *
 * ⚠⚠ **NOTHING RENDERS THIS TODAY — THAT IS THE POINT.** It is here so the
 * dashboard's *"next moves"* section can mount it without rebuilding it. ⚠ A
 * component with no caller is normally a lint problem; this one is exported and
 * typed, so it compiles, and `check:usage` proves it is NOT on `/usage`.
 *
 * ⚠ **DO NOT "TIDY" IT AWAY.** Deleting it is the thing Scott explicitly asked
 * not to happen, and the next person to find an unused export will want to.
 */

/** ⚠ The shape the four criteria have always had. Unchanged. */
export type ProfileCriterion = {
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
};

/**
 * ⚠⚠ The facts the checklist reads. ⚠⚠⚠ **DELIBERATELY DEMANDING ABOUT ITS
 * INPUT** — the same rule `providerMeetsRequired` states: every field is
 * required, so a caller that simply did not load one gets a compile error
 * rather than a checklist that quietly reports a criterion as unmet.
 */
export type ProfileChecklistInput = {
  completeness: number;
  pausedAt: Date | null;
  validationStatus: string;
  visible: boolean;
  counts: {
    skills: number;
    employers: number;
    projects: number;
    packages: number;
    serviceProducts: number;
  };
  /* ⚠⚠ PASSED IN, NOT RE-COUNTED. On `/usage` this was `certCount` — derived
     from `stats.learning.certifications` via `isCounted`, NOT from the profile
     row — and its comment is the reason: *"one number, two renders, which is
     allowed; two counts would not be."* ⚠⚠⚠ Re-deriving it here would create
     the second count that comment forbids. */
  certCount: number;
};

/**
 * ⚠ The four criteria, built. ⚠⚠ MOVED BYTE-FOR-BYTE from `usage/page.tsx`;
 * only the field names changed, because the input is now an explicit object
 * rather than a Prisma row the page happened to have in scope.
 */
export function buildProfileCriteria(
  p: ProfileChecklistInput,
  opts: { visible: boolean; validated: boolean; validationRequested: boolean }
): { criteria: ProfileCriterion[]; metCount: number } {
  const { visible, validated, validationRequested } = opts;
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
  const criteria: ProfileCriterion[] = [
    {
      /*
        ── ⚠⚠⚠ `E590`'s REMOVED GATE WAS STILL ALIVE HERE (`P2-A2-E659`) ──────

        ⚠⚠ **FOUND BY LOOKING AT THE SCREENSHOT, NOT BY A MEASUREMENT** (73b).
        On `sw_user21@straterp.com` this card said both of these at once:
          · *"Photo, identity and the required details — all met."* (bold, from
            `visible`)
          · *"Buyers cannot find you yet, and your service products are not on
            sale."* (this row, from `completeness >= VISIBILITY_THRESHOLD`)
        ⚠⚠⚠ **TWO DEFINITIONS OF "CAN BUYERS FIND YOU", CONTRADICTING EACH
        OTHER ON ONE CARD, THREE LINES APART.**

        ⚠ **`E590` WS-A0 ALREADY RULED THIS.** `isMarketplaceVisible`'s own
        comment: *"THE PERCENTAGE FALLBACK IS GONE… there is ONE gate now"*, and
        it measured the two gates disagreeing on **6 real profiles — visible on
        five surfaces, invisible on three, at the same moment.** ⚠⚠ So this is
        not a new decision; it is a surviving copy of a gate that was removed.

        ⚠⚠⚠ **AND HERE IS WHY `E590`'s OWN SAFEGUARD DID NOT CATCH IT.** That
        brief made `meetsRequired` a REQUIRED parameter precisely so *"the type
        checker found all five sites"* — and it did. ⚠ **BUT THIS LINE NEVER
        CALLS `isMarketplaceVisible`. It RE-IMPLEMENTS the comparison by hand**,
        so there was no call for the compiler to flag. ⚠⚠ **A REQUIRED TYPE
        FINDS CALLERS; IT CANNOT FIND RE-IMPLEMENTATIONS.** That is the gap
        between `E585` and the compile-error pattern, and it is worth stating:
        the strongest tool in this codebase is blind to a copy that does not
        call the thing it copies.

        ⚠ SUPERSEDED, quoted not deleted (`E164`):
        //   met: p.completeness >= VISIBILITY_THRESHOLD,
      */
      label: "Profile complete enough to be visible",
      met: visible,
      /* ⚠ THE CONSEQUENCE, NOT THE FLAG — folded from `/account-health`'s
         `Appear in buyer searches` row, which said the same thing about the
         same boolean. Its `Sell service packages` row read the SAME flag again,
         so its meaning is carried here too. */
      /* ⚠ THE SAME PREDICATE AS `met` ABOVE — see that block. The note and the
         mark beside it must never disagree about one boolean. */
      note:
        p.pausedAt
          ? "Paused by you — resume from Settings when you're ready."
          : visible
            ? "Buyers can find you, and your service products are purchasable."
            : "Buyers cannot find you yet, and your service products are not on sale.",
      action:
        visible
          ? null
          : /* ⚠ `E133` — `step=finish` is the review, the profile-shaped editor.
               `/join/provider` with no step resolves to the RESUME point and
               would drop a published provider at the start of the train. */
            { label: "Finish Your Profile", href: "/join/provider?step=finish" },
    },
    {
      label: "Work history added",
      met: p.counts.employers > 0,
      note: "Buyers read work history before anything else on your profile.",
      action:
        p.counts.employers > 0
          ? null
          : {
              label: "Add Work History",
              href: "/join/provider?step=tell_us&return=review",
            },
    },
    {
      /* ⚠⚠ `package` IS GONE FROM THE RENDERED WORD (`E563` WS-A item 6) AND NOW
         FROM THE FIELD TOO (`P2-A6-E697`) — the copy and the model finally agree.
         ⚠ SUPERSEDED, quoted not deleted (`E164`):
         //   The field is still `_count.packages` — the MODEL is `Package` and
         //   renaming it is not this brief's job; only the COPY changes.
         ⚠⚠ That comment was accurate when written and named the job it was
         deferring. `E697` is that job. */
      label: "At least one service product listed",
      met: p.counts.serviceProducts > 0,
      note: "A service product is what a buyer actually buys.",
      action:
        p.counts.serviceProducts > 0
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
  return { criteria, metCount };
}

/**
 * ⚠⚠ THE CARD ITSELF — the meter, the gate in words, the four criteria, the
 * inventory counts. ⚠ Unchanged from what `/usage` rendered; it simply has a
 * home of its own now.
 */
export function ProfileChecklist({
  p,
  visible,
  validated,
  validationRequested,
}: {
  p: ProfileChecklistInput;
  visible: boolean;
  validated: boolean;
  validationRequested: boolean;
}) {
  const { criteria, metCount } = buildProfileCriteria(p, {
    visible,
    validated,
    validationRequested,
  });
  return (
    <>
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
          //   : `Complete - ${VISIBILITY_THRESHOLD - p.completeness}% to go before buyers can find you`}
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
          //     {p.completeness}% of required details
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
          {p.pausedAt
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
                  <RequestValidationAction status={p.validationStatus} />
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
        {/*
          ⚠⚠⚠ THE THRESHOLD CLAUSE IS GONE, FOR THE SAME REASON THE CRITERION
          ABOVE CHANGED (`E659`). It read *"buyers can find you at 80% of
          required details"* — ⚠ **a statement of the gate `E590` REMOVED**,
          printed to the member as the rule. ⚠⚠ A percentage is not what makes
          a profile visible any more; the required SET is, and the rows above
          name exactly which parts of it are missing and link to each.
          ⚠ SUPERSEDED, quoted not deleted (`E164`):
          //   {visible
          //     ? "."
          //     : ` · buyers can find you at ${VISIBILITY_THRESHOLD}% of required details.`}
          ⚠ `E433` — a count, so ink.
        */}
        <p className="mt-3 text-[12.5px] text-ink-2">
          {metCount} of {criteria.length} met.
        </p>

        {/* ── FACT 4 — THE INVENTORY ──────────────────────────────────── */}
        <div className="mt-4">
          <StatRow label="Skills" value={String(p.counts.skills)} />
          {/* `P2-J1.1-E012` — a work-history row is a COMPANY, not an employer.
     A resume row looks identical for employment and for contract work, the
     parser cannot tell them apart, and a user must not have to declare their
     tax status to fill one in. `Company` names the ENTITY, which is constant;
     `Employer` names the RELATIONSHIP, which varies. ⚠ `Company/Employer` was
     considered and REJECTED — a slash label puts the tax question back into a
     UI that had deliberately stopped asking it. ⚠ `Organization` is the fully
     correct superset and was CONSIDERED, NOT CHOSEN (Scott took `Company` for
     length and schema fit); recorded so nobody reopens it unknowing. */}
          <StatRow label="Companies" value={String(p.counts.employers)} />
          <StatRow label="Projects" value={String(p.counts.projects)} />
          {/*
            ⚠⚠ `Packages` LEAVES THE COUNTS (`E563` WS-A item 6). It moves to
            the `Service Products` tile, and the WORD becomes service products.
            ⚠ SUPERSEDED, quoted not deleted (`E164`):
            // <StatRow label="Packages" value={String(p.counts.packages)} />
            ⚠⚠ THE COUNT IS NOT LOST IN THE MEANTIME — the third criterion
            above reads the same `_count.packages`, so nothing goes dark
            between this workstream and WS-C.
          */}
          <StatRow
            label="Certifications"
            value={String(p.certCount)}
          />
        </div>
      </StatTile>
    </>
  );
}
