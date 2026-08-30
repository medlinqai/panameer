import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/casing/Button";
import { formatCents } from "@/lib/display";
import {
  MICRO_SESSION_MINUTES,
  MICRO_SESSION_PRICE,
  type MentorCard,
} from "@/lib/mentors";

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
              <Button href="/contracts" variant="ghost">
                Manage Work
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* ---- 2. Who can help --------------------------------------------- */}
      <section className="mt-10">
        <h2 className="font-display text-[22px] font-bold tracking-[-0.3px]">
          Collaborate with an expert
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
            <p className="font-display text-[18px] font-bold leading-snug">
              Take the guided tour
            </p>
            <p className="mt-2 flex-1 text-[14px] leading-relaxed text-ink-2">
              Book a consultation with an expert to review your project&apos;s
              budget, timeline and scope one-on-one.
            </p>
            <Button href="/consultations" variant="ghost" className="mt-4 w-full">
              Book a Consultation
            </Button>
          </article>

          {experts.map((e) => (
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

      {/* ---- 3. What you can buy off the shelf ---------------------------- */}
      <section className="mt-10 rounded-brand border border-line bg-bg-soft p-7">
        <h2 className="font-display text-[22px] font-bold tracking-[-0.3px]">
          Shop pre-built packages of services
        </h2>
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
  const rate =
    expert.rateMinCents != null
      ? `${formatCents(expert.rateMinCents, expert.currency)}${
          expert.rateMaxCents && expert.rateMaxCents !== expert.rateMinCents
            ? `–${formatCents(expert.rateMaxCents, expert.currency)}`
            : ""
        } / hr`
      : null;

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
          {expert.validated && (
            <span className="text-[12.5px] font-semibold text-emerald-700">
              ✓ Validated
            </span>
          )}
        </div>
      </div>

      {expert.headline && (
        <p className="mt-3 line-clamp-2 text-[14px] leading-relaxed text-ink-2">
          {expert.headline}
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
        {/* The micro-session price is the PLATFORM's anchor, not this person's
            quote — none of them has set one. Same constant the mentor
            directory uses, so the two can't drift. */}
        <p className="text-[13.5px] font-semibold">
          {MICRO_SESSION_PRICE} per {MICRO_SESSION_MINUTES}-minute call
        </p>
        <Button href="/consultations" variant="ghost" className="mt-3 w-full">
          Book a Consultation
        </Button>
      </div>
    </article>
  );
}
