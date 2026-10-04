import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/casing/Button";
import { formatCents } from "@/lib/display";
import { type MentorCard } from "@/lib/mentors";

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
  const recruiters = experts.filter((e) => e.isRecruiter);
  const individuals = experts.filter((e) => !e.isRecruiter);

  return (
    <div className="mx-auto w-full max-w-6xl">
      {}
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
            {}
            <div className="mt-6 flex justify-center">
              {}
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
      {}
      <section className="mt-10">
        {}
        <h2 className="font-display text-[22px] font-bold tracking-[-0.3px]">
          Collaborate With an Expert
        </h2>
        <p className="mt-1 text-[15px] text-ink-2">
          Your goals are our goals.
        </p>

        {}
        <div className="-mx-1 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-3">
          {}
          {/* The Guided Tour card linked to /consultations, which is not in R1; removed (R1 menus). */}

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

      {}
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
        {}
        <h2 className="font-display text-[22px] font-bold tracking-[-0.3px]">
          Shop Pre-Built Service Products
        </h2>
        {}
        <p className="mt-1 text-[15px] text-ink-2">
          Service products are pre-built deployables (reports, AI agents, etc.) as
          well as pre-defined services (Docusign Integration with 10 contract
          admins).
        </p>
        <p className="mt-1 text-[15px] text-ink-2">
          Fixed scope, fixed price, published by the provider who delivers it.
        </p>
        <form action="/shop" className="mt-4 flex max-w-xl flex-wrap gap-2">
          <input
            name="q"
            placeholder="Search service products…"
            aria-label="Search service products"
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
