import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/casing/Button";
import { formatCents } from "@/lib/display";
/* ⚠ THE PLATFORM MICRO-SESSION ANCHOR IS PARKED (`P1-ALL-E374`) — see
   `lib/mentors.ts`. This card was a SECOND consumer of it and was NOT named in
   the brief; it was found by following the import when the constants went.
   REPORTED at `E374`. */
import { type MentorCard } from "@/lib/mentors";

/**
 * THE REQUESTER HOME (brief_requester_home_v1 WS-B).
 *
 * Overview → what's in flight → who can help → what you can buy off the shelf.
 * That order is the requester's actual question sequence: is anything happening,
 * can somebody help me decide, and can I just buy the thing.
 *
 * WHAT IS REAL HERE AND WHAT IS NOT, stated plainly because most of this page's
 * backing models do not exist yet:
 *
 *   REAL   the expert cards — marketplace-visible providers, their own names,
 *          photos, headlines, skills and published rate ranges.
 *   REAL   the work-status empty state, which is a genuine count of zero: the
 *          WorkRequest model exists and this requester has none.
 *   STUB   "Book a Consultation" — 1:1 booking is master Phase 4. It links to a
 *          titled placeholder rather than opening a scheduler that isn't there.
 *   STUB   the package search — package BROWSE does not exist (providers can
 *          publish packages; nobody can shop them yet), so the box submits to a
 *          placeholder that says so instead of returning nothing.
 *
 * Nothing on this page invents a count. Where a number would be fabricated —
 * Job Success %, jobs completed, a per-expert consultation price — the field is
 * absent rather than zeroed, because a "0%" job success score on a marketplace
 * with no completed jobs libels every provider on it.
 */
export function RequesterHome({
  firstName,
  openWorkCount,
  experts,
}: {
  firstName: string;
  /** Real count from the WorkRequest model. */
  openWorkCount: number;
  experts: MentorCard[];
}) {
  /*
    ⚠ THE SPLIT IS HERE, IN THE VIEW, AND NOT IN THE QUERY (`E028` WS-1).
    Scott asked for two carousels, not an exclusion — *"some will still only want
    to work with recruiters"* — so `marketplaceVisibleWhere()` is untouched and
    recruiters remain in search. One fetch, two rows.
  */
  const recruiters = experts.filter((e) => e.isRecruiter);
  const individuals = experts.filter((e) => !e.isRecruiter);

  return (
    <div className="mx-auto w-full max-w-6xl">
      {/*
        ⚠ `Work Requests`, NOT `OVERVIEW` (`P1-J1.1-E265`, 2026-08-30).

        The eyebrow names the card beneath it, and that card is the requester's
        work-request state — an empty state today, because nobody has posted
        one. "Overview" named the page rather than the thing.
        ⚠ THE LITERAL IS MIXED-CASE AND THE CAPITALS COME FROM `uppercase` IN
        THE CLASS LIST. That is why grepping the codebase for a bare `OVERVIEW`
        string finds nothing — the brief looked and could not locate it.
      */}
      <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-ink-2">
        Work Requests
      </h2>

      {/* ---- 1. What is in flight ---------------------------------------- */}
      <section className="mt-3 rounded-brand border border-line bg-white p-8">
        {openWorkCount === 0 ? (
          <div className="mx-auto max-w-lg text-center">
            <span
              aria-hidden
              className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-magenta/10 text-[26px]"
            >
              💼
            </span>
            <p className="mt-4 font-display text-[21px] font-bold">
              No job posts or work orders in progress right now
            </p>
            <p className="mx-auto mt-2 max-w-md text-[14.5px] leading-relaxed text-ink-2">
              Describe what you need and match with validated experts across the
              enterprise-application catalog.
            </p>
            {/*
              E217 — ONE SOLID PRIMARY. The deck shows this button twice, side by
              side; two identical solid CTAs is not emphasis, it is the absence
              of a decision. One button, and it is the only magenta fill on the
              page above the fold.
            */}
            <div className="mt-6 flex justify-center">
              {/*
                ⚠⚠ `Create Work Request` — NO `a` (`P1-J1.1-E266`, 2026-08-30).
                THE SWEEP STOPS AT THIS PAGE, AND THAT IS NOT AN OVERSIGHT.

                `E266` asked for the `a` dropped "everywhere it renders as a
                control". These two buttons on the buyer dashboard are that.
                ⚠ `WORK_CTA_LABEL` IN `lib/work-steps.ts` IS NOT, AND WAS NOT
                TOUCHED: Scott closed that exact wording on 2026-08-26 —
                *"keep Create a Work Request."* (`P1-J4-E024`, THE BUTTON WON) —
                and `e2e/marketing-home.spec.ts:2518` §49 asserts the `a` form on
                `/work`'s hero as "the hero's only primary control". Sweeping it
                would have reversed a four-day-old ruling and reddened a gate.
                REPORTED, NOT DECIDED.
                ⚠ The page TITLE (`create-work/page.tsx:17`) and the wizard's own
                h1 also keep the `a` — titles are not controls, and `E024`'s note
                cites that title as evidence for his choice.
              */}
              <Button href="/create-work">Create Work Request</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-display text-[21px] font-bold">
                {openWorkCount} work request{openWorkCount === 1 ? "" : "s"} in
                progress
              </p>
              <p className="mt-1 text-[14.5px] text-ink-2">
                Track proposals and orders under Manage Work.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button href="/create-work">Create Work Request</Button>
              <Button href="/orders" variant="ghost">
                Manage Work
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* ---- 2. Who can help --------------------------------------------- */}
      {/* ⚠ ONE LIST, TWO ROWS — split in the view so `marketplaceVisibleWhere()`
          and therefore SEARCH stay untouched (`E028` WS-1). */}
      <section className="mt-10">
        {/* ⚠ TITLE CASE (`P2-J1.1-E027`). ⚠ SUPERSEDED, quoted: `Collaborate with
            an expert`. `With` CAPITALIZES and `an` does not — the locked rule
            (`brief_N_title_case.md`) lowercases articles and the short
            prepositions `of/to/in/on/at/by/up/for` mid-phrase, and `with` is not
            among them. */}
        <h2 className="font-display text-[22px] font-bold tracking-[-0.3px]">
          Collaborate With an Expert
        </h2>
        <p className="mt-1 text-[15px] text-ink-2">
          Your goals are our goals.
        </p>

        {/*
          A CAROUSEL, NOT A LIST. Browsing people is a scanning task and faces
          are the thing being scanned — the UI standard is cards for
          discovery. Horizontal scroll with snap, so it works with a trackpad,
          a thumb and a keyboard without a JS carousel library.
        */}
        <div className="-mx-1 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-3">
          {/* The guided-tour promo leads, because someone with nothing in
              flight usually needs to talk before they need to hire. */}
          <article className="flex w-[280px] shrink-0 snap-start flex-col rounded-brand border border-magenta/30 bg-magenta/[0.04] p-5">
            {/* ⚠ TITLE CASE (`P2-J1.1-E027`). ⚠ SUPERSEDED, quoted: `Take the
                guided tour`. `the` stays lowercase — an article mid-phrase. */}
            <p className="font-display text-[18px] font-bold leading-snug">
              Take the Guided Tour
            </p>
            <p className="mt-2 flex-1 text-[14px] leading-relaxed text-ink-2">
              Book a consultation with an expert to review your project&apos;s
              budget, timeline and scope one-on-one.
            </p>
            <Button href="/consultations" variant="ghost" className="mt-4 w-full">
              Book a Consultation
            </Button>
          </article>

          {individuals.map((e) => (
            <ExpertCard key={e.profileId} expert={e} />
          ))}
        </div>

        {experts.length === 0 && (
          <p className="rounded-brand border border-dashed border-line px-5 py-8 text-center text-[14.5px] text-ink-2">
            No experts are marketplace-visible yet. This fills in as providers
            publish their profiles.
          </p>
        )}
      </section>

      {/*
        ── ⚠⚠ RECRUITERS GET THEIR OWN ROW, NEVER A MIXED ONE (`E028` WS-1) ────

        SCOTT, 2026-09-07: *"Ideally, I would like to give the buyers the option
        (some will still only want to work with recruiters) — meaning show both
        in two different carousels. What I do not think we want to do is mix them
        in one grouping/carousel, set of cards."*

        ⚠⚠ SEPARATED, NOT EXCLUDED, AND THAT DISTINCTION IS THE WHOLE RULING.
        `marketplaceVisibleWhere()` IS UNTOUCHED — a global exclusion would have
        removed recruiters from SEARCH too, which Scott did not ask for. The
        split happens here, in the view, on `WorkMethod.RECRUITER`: *"a recruiter
        sells the services of OTHERS and is the app's Coordinator role."*

        ⚠⚠ AN EMPTY ROW DOES NOT RENDER AT ALL — no heading over nothing, no
        empty state. If there are no recruiters this whole section is absent,
        which is why the guard is on the ARRAY and not inside the section.

        ⚠ THE HEADING AND SUB-LINE ARE PLACEHOLDERS AND NEED SCOTT'S WORDS.
        REPORTED, NOT INVENTED: he wrote the copy for every other block on this
        page, and marketing copy for a row he has not seen is exactly the kind of
        thing chat is not allowed to make up.
      */}
      {recruiters.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-[22px] font-bold tracking-[-0.3px]">
            Work With a Recruiter
          </h2>
          <p className="mt-1 text-[15px] text-ink-2">
            Firms that place consultants on your behalf.
          </p>
          <div className="-mx-1 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-3">
            {recruiters.map((e) => (
              <ExpertCard key={e.profileId} expert={e} />
            ))}
          </div>
        </section>
      )}

      {/* ---- 3. What you can buy off the shelf ---------------------------- */}
      <section className="mt-10 rounded-brand border border-line bg-bg-soft p-7">
        {/*
          ── ⚠⚠ SCOTT REWROTE THIS BLOCK RATHER THAN LENGTHENING IT (`E031`) ────

          ⚠ SUPERSEDED, quoted not deleted: `Shop pre-built packages of services`.

          Mechanical Title Case would have produced `Shop Pre-Built Packages of
          Services` — longer and heavier for no gain. Scott changed the WORDS
          instead, and it is a CONSISTENCY WIN rather than only a copy one:
          `Service Products` is ALREADY the product's own term — four times in
          `lib/nav.ts` plus `settings/packages/page.tsx`, `ProviderProfileView`
          and `IntegrationModelDiagram`. `packages of services` was the outlier.

          ⚠ `package` REMAINS A LEGITIMATE CODE WORD — `settings/packages`,
          `seed:catalog-products`, `model Package`. This is a DISPLAY rename on
          one heading and nothing else; it is not swept out of the codebase.
        */}
        <h2 className="font-display text-[22px] font-bold tracking-[-0.3px]">
          Shop Pre-Built Service Products
        </h2>
        {/*
          ⚠⚠ TWO SUB-LINES, AND THE ARRANGEMENT IS REPORTED RATHER THAN DECIDED.

          Scott's new line explains the CATEGORY (what a service product IS); the
          existing line explains the COMMERCIAL MODEL (how it is sold). They do
          different jobs and both are useful, and Scott has NOT said whether the
          new line replaces, joins or sits above the old one.

          ⚠ SO NOTHING SHIPPED IS DELETED. The component has ONE sub-line slot,
          so placement is not obvious from its structure — per the brief the new
          line goes ABOVE the existing one and the arrangement is Scott's to rule
          on. Deleting copy nobody asked to remove is the failure mode being
          avoided here.
        */}
        <p className="mt-1 text-[15px] text-ink-2">
          Service products are pre-built deployables (reports, AI agents, etc.) as
          well as pre-defined services (Docusign Integration with 10 contract
          admins).
        </p>
        <p className="mt-1 text-[15px] text-ink-2">
          Fixed scope, fixed price, published by the provider who delivers it.
        </p>
        <form action="/packages" className="mt-4 flex max-w-xl flex-wrap gap-2">
          <input
            name="q"
            placeholder="Search service provider packages…"
            aria-label="Search service provider packages"
            className="min-w-0 flex-1 rounded-full border border-line bg-white px-5 py-3 text-[15px] outline-none placeholder:text-ink-2/70 focus:border-magenta"
          />
          <Button type="submit" variant="ghost">
            Search
          </Button>
        </form>
      </section>
    </div>
  );
}

function ExpertCard({ expert }: { expert: MentorCard }) {
  /*
    ── ⚠⚠ ALL FIVE RATE FIELDS, NOT TWO (`P2-J1.1-E028` WS-4) ─────────────────

    ⚠ SUPERSEDED, quoted: this read `rateMinCents` and `rateMaxCents` ONLY.

    `marketplaceVisibleWhere()` REQUIRES a rate and ORs across FIVE fields —
    hourly, min, max, onsite, remote — so A PROFILE WITH NO RATE CANNOT BE
    VISIBLE AT ALL. Every blank rate on this row was therefore a RENDER bug, not
    an unpriced provider: they had a rate the card refused to read.

    ⚠⚠ AND `hourlyRateCents` WAS ALREADY ON THIS CARD'S OWN TYPE, ADDED BY
    `P1-ALL-E374` FOR EXACTLY THIS REASON — its docblock says the fallback
    "carries 19 of 25 marketplace-visible providers" and that without it the card
    "would show no rate for 76% of the directory — which reads as 'they have not
    priced themselves' and is false." THE FIELD WAS ADDED AND THIS CARD NEVER
    READ IT.

    HOW EACH RENDERS:
      · a RANGE  (min and max, and they differ) -> "$120–$180 / hr"
      · a SINGLE rate (min only, or hourly)     -> "$125 / hr"
      · onsite/remote only                      -> "$140 / hr onsite" etc., so
        the qualifier is never dropped silently — a number with a condition on it
        must not be shown as if it were unconditional.
  */
  const money = (c: number) => formatCents(c, expert.currency);
  let rate: string | null = null;
  if (expert.rateMinCents != null) {
    rate =
      expert.rateMaxCents && expert.rateMaxCents !== expert.rateMinCents
        ? `${money(expert.rateMinCents)}–${money(expert.rateMaxCents)} / hr`
        : `${money(expert.rateMinCents)} / hr`;
  } else if (expert.hourlyRateCents != null) {
    rate = `${money(expert.hourlyRateCents)} / hr`;
  } else if (expert.onsiteRateCents != null) {
    rate = `${money(expert.onsiteRateCents)} / hr onsite`;
  } else if (expert.remoteRateCents != null) {
    rate = `${money(expert.remoteRateCents)} / hr remote`;
  }

  return (
    <article className="flex w-[280px] shrink-0 snap-start flex-col rounded-brand border border-line bg-white p-5">
      <div className="flex items-center gap-3">
        <Avatar
          firstName={expert.firstName}
          lastName={expert.lastName}
          photoUrl={expert.photoUrl}
          size={48}
        />
        <div className="min-w-0">
          <Link
            href={`/providers/${expert.profileId}`}
            className="block truncate font-bold hover:text-magenta"
          >
            {expert.name}
          </Link>
          {/*
            NO JOB SUCCESS %, NO JOB COUNT. The deck asks for both and neither
            exists: nothing has been delivered through Panameer, so every
            provider would show 0% and "0 jobs" — a number that reads as a
            verdict on them rather than on the platform's age. What IS true
            about them shows instead: validation, and what they teach.
          */}
          {/*
            ⚠ ALWAYS RENDERED, GREEN WHEN VALIDATED AND GREY WHEN NOT — Scott:
            *"I do like Validated (greyed out if they are not validated, green if
            they are)."* ⚠ SUPERSEDED, quoted: it rendered ONLY when validated,
            so an unvalidated provider showed nothing and the absence was
            invisible rather than informative.
            ⚠⚠ `Validated` IS PANAMEER'S OWN GRANT — the circle of trust — and
            the grey state says "Panameer has not validated this person", never
            anything about a client's opinion. `check:trust-claims` watches this
            word.
          */}
          <span
            className={
              "text-[12.5px] font-semibold " +
              (expert.validated ? "text-emerald-700" : "text-ink-2/60")
            }
          >
            {expert.validated ? "✓ Validated" : "Not validated"}
          </span>
        </div>
      </div>

      {expert.headline && (
        <p className="mt-3 line-clamp-2 text-[14px] leading-relaxed text-ink-2">
          {expert.headline}
        </p>
      )}

      {/*
        ── ⚠⚠ WHAT A RECRUITER ASKS (`P2-J1.1-E028` WS-2) ────────────────────

        SCOTT: *"EVERY recruiter asks the same questions when we start the
        interview — how many years of experience do you have? How many projects
        have you been on?"*

        ⚠ NOT A FOURTH TAG AND NOT A LONGER HEADLINE. Scott's own diagnosis of
        the three cards he screenshotted was that they were INTERCHANGEABLE — all
        "Oracle Cloud [x] Expert", generic chips, $125/$130. THE FAILURE IS
        NON-DIFFERENTIATION, NOT SPARSENESS, and more fields of the same KIND
        would give three crowded interchangeable cards. These are a different
        kind: counts, which actually differ between people.

        ⚠ NOT LINKED. Scott asked whether they "could also be hyperlinks to the
        projects part of their profile"; `/providers/[id]` has NO anchor for
        employers or projects to land on, and a link to nowhere is the defect
        class this walk has filed five times. Plain facts until there is a
        destination — the NAME above already links to the profile.
        ⚠ ZERO IS NOT RENDERED: "0 Projects" reads as a verdict on the person
        rather than on a young marketplace, which is the same reasoning that kept
        job-success % off this card.
      */}
      {(expert.employerCount > 0 ||
        expert.projectCount > 0 ||
        expert.specialtyCount > 0) && (
        <p className="mt-2.5 text-[12.5px] text-ink-2">
          {expert.employerCount > 0 && (
            <span>
              <b className="font-semibold text-ink">{expert.employerCount}</b>{" "}
              {expert.employerCount === 1 ? "Company" : "Companies"}
            </span>
          )}
          {expert.employerCount > 0 && expert.projectCount > 0 && <span> · </span>}
          {expert.projectCount > 0 && (
            <span>
              <b className="font-semibold text-ink">{expert.projectCount}</b>{" "}
              {expert.projectCount === 1 ? "Project" : "Projects"}
            </span>
          )}
          {(expert.employerCount > 0 || expert.projectCount > 0) &&
            expert.specialtyCount > 0 && <span> · </span>}
          {expert.specialtyCount > 0 && (
            <span>
              <b className="font-semibold text-ink">{expert.specialtyCount}</b>{" "}
              {expert.specialtyCount === 1 ? "Specialty" : "Specialties"}
            </span>
          )}
        </p>
      )}

      {expert.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {expert.skills.slice(0, 3).map((s) => (
            <span
              key={s}
              className="rounded-full border border-line px-2.5 py-0.5 text-[12px] text-ink-2"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto pt-4">
        {rate && <p className="text-[13.5px] text-ink-2">{rate}</p>}
        {/* ⚠⚠ THE PLATFORM ANCHOR AND ITS BOOK BUTTON ARE BOTH PARKED
            (`P1-ALL-E374`). ⚠ SUPERSEDED, QUOTED NOT DELETED: *"The
            micro-session price is the PLATFORM's anchor, not this person's quote
            — none of them has set one. Same constant the mentor directory uses,
            so the two can't drift."* The anchor's own honesty is why it removed
            cleanly — nothing depended on it being true.
            ⚠ AND THE `Book a Consultation` BUTTON WENT WITH IT: there is NO BUY
            BUTTON anywhere, because paying runs on WorkRequest -> WorkOrder ->
            Settlement, which is unbuilt. A checkout that goes nowhere is worse
            than none. ⚠ `rate` ABOVE IS THE PERSON'S OWN and still renders. */}
        {/*
        <p className="text-[13.5px] font-semibold">
          {MICRO_SESSION_PRICE} per {MICRO_SESSION_MINUTES}-minute call
        </p>
        <Button href="/consultations" variant="ghost" className="mt-3 w-full">
          Book a Consultation
        </Button>
        */}
      </div>
    </article>
  );
}
