import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { listMentors, MICRO_SESSION_MINUTES, MICRO_SESSION_PRICE } from "@/lib/mentors";
import { Avatar } from "@/components/Avatar";
import { formatCents } from "@/lib/display";
import { PageTabs } from "@/components/casing/PageTabs";
import { PAGE_TABS } from "@/lib/nav";

/**
 * FIND A MENTOR — the directory shell (PHASE 2 / WS2-E).
 *
 * REAL PROVIDERS, NOT FIXTURES. Every card is a marketplace-visible profile read
 * through the same predicate the public marketplace uses, so a card can never
 * show somebody the marketplace itself would hide. A directory of invented
 * experts would be the most damaging fake data in this whole build: it
 * advertises people who cannot be booked.
 *
 * SHELL, and the page says which parts are which. There is no `MentorProfile`
 * yet, so nobody has OPTED IN to mentoring and nobody has priced a session —
 * PHASE 4 adds that model, the storefront and the booking. So these are
 * providers who are ELIGIBLE, labelled as such, and the Book button routes to a
 * placeholder rather than pretending a booking exists.
 *
 * THE RATE ANCHOR IS THE PLATFORM'S, NOT THE PERSON'S. $49.99 / 15 min is the
 * product anchor; it is rendered as the anchor and explicitly not as a quote,
 * because none of these people has set one. Their own published hourly range is
 * shown separately where they have one — that IS theirs.
 */
export const metadata = { title: "Find a Mentor · Panameer" };

export default async function MentorsPage({
  searchParams,
}: {
  searchParams: Promise<{ skill?: string }>;
}) {
  await guardPage("authenticated");
  const { skill } = await searchParams;
  const mentors = await listMentors({ skill: skill?.trim() || undefined });

  return (
    <>
      {/* E216 — the Community rail flyout's children are this section's tab row now. */}
      <PageTabs tabs={PAGE_TABS["/community"]} current="/community/mentors" />
      <div className="mx-auto max-w-5xl space-y-5">
      <header>
        <h1 className="font-display text-[26px] font-bold tracking-[-0.5px]">
          Find a Mentor
        </h1>
        <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          Senior practitioners who have done the work. A focused{" "}
          {MICRO_SESSION_MINUTES} minutes with the right person beats a week of
          searching — and it books here, so it&apos;s covered by Panameer.
        </p>
      </header>

      {/*
        THE HONEST FRAME, at the top rather than buried on a card. These people
        have not agreed to mentor anybody yet; saying so once, clearly, is what
        makes the rest of the page truthful.
      */}
      <section className="rounded-brand border border-dashed border-magenta/30 bg-magenta/[0.03] p-4">
        <p className="text-[14px] leading-relaxed text-ink-2">
          <b className="text-ink">Mentoring opens in a later release.</b> These
          are practitioners on Panameer whose profiles are complete enough to be
          found — the people who would be first to offer sessions. None has set a
          price or opted in yet, so nothing here is bookable, and the buttons say
          so.
        </p>
      </section>

      {mentors.length === 0 ? (
        <section className="rounded-brand border border-dashed border-line px-5 py-10 text-center">
          <p className="text-[15px] font-semibold">
            {skill ? `Nobody matches “${skill}” yet.` : "No profiles are complete enough yet."}
          </p>
          <p className="mx-auto mt-1.5 max-w-lg text-[14px] leading-relaxed text-ink-2">
            A provider appears here once their profile is visible in the
            marketplace — title, role, skills, rate and photo. That gate is the
            same one buyers search against.
          </p>
        </section>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mentors.map((m) => (
            <article
              key={m.profileId}
              className="flex flex-col rounded-brand border border-line bg-white p-5"
            >
              <div className="flex items-start gap-3">
                <Avatar
                  firstName={m.firstName}
                  lastName={m.lastName}
                  photoUrl={m.photoUrl}
                  size={48}
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-[15px] font-bold">{m.name}</p>
                    {m.validated && (
                      <span
                        title="Validated by Panameer"
                        className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-emerald-800"
                      >
                        Validated
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[13.5px] leading-snug text-ink-2">
                    {m.headline}
                  </p>
                </div>
              </div>

              {m.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {m.skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-line px-2.5 py-0.5 text-[12px] text-ink-2"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}

              <dl className="mt-4 flex-1 space-y-1.5 text-[13px]">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-2">Micro-session</dt>
                  <dd className="font-bold">
                    {MICRO_SESSION_PRICE}{" "}
                    <span className="font-normal text-ink-2">
                      / {MICRO_SESSION_MINUTES} min
                    </span>
                  </dd>
                </div>
                {(m.rateMinCents ?? m.rateMaxCents) != null && (
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-ink-2">Their project rate</dt>
                    <dd className="font-semibold">
                      {formatCents(m.rateMinCents ?? m.rateMaxCents, m.currency)}
                      {m.rateMaxCents != null && m.rateMinCents != null
                        ? `–${formatCents(m.rateMaxCents, m.currency)}`
                        : ""}
                      <span className="font-normal text-ink-2"> / hr</span>
                    </dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-2">Group session</dt>
                  <dd className="text-ink-2">Fridays — not scheduled yet</dd>
                </div>
                {m.teaches > 0 && (
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-ink-2">Teaches on Learn</dt>
                    <dd className="font-semibold">Yes</dd>
                  </div>
                )}
              </dl>

              <div className="mt-4 flex flex-wrap gap-2">
                {/*
                  BOOK IS DISABLED, not a link to nowhere. Booking is PHASE 4;
                  a live-looking button that opened a placeholder would waste a
                  click and teach that buttons here don't work.
                */}
                <button
                  type="button"
                  disabled
                  title="Booking opens when mentor sessions launch"
                  className="rounded-full bg-magenta px-4 py-2 text-[13.5px] font-bold text-white opacity-40"
                >
                  Book {MICRO_SESSION_MINUTES} min
                </button>
                <Link
                  href={`/providers/${m.profileId}`}
                  className="rounded-full border-[1.5px] border-line px-4 py-2 text-[13.5px] font-bold text-ink transition-colors hover:border-magenta hover:text-magenta"
                >
                  View Profile
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
    </>
  );
}
