import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { listMentors } from "@/lib/mentors";
/* ⚠ `P1-ALL-E374` — the platform anchor is parked in `lib/mentors.ts`. The rate
   shown here is the provider's own, through the one decided rule. */
import { rateDisplay, NO_RATE_PUBLISHED } from "@/lib/rate-display";
import { getSessionViewer } from "@/lib/session";
import { getMyCommunity } from "@/lib/connections";
import { ConnectControls } from "@/components/community/ConnectControls";
import { Avatar } from "@/components/Avatar";
/* ⚠ `formatCents` IS NO LONGER IMPORTED HERE (`P1-ALL-E374`). This page used to
   format money itself — a half-range printed as "Their project rate". That is
   now `rateDisplay`'s job, and `check:community` asserts this file does NOT
   call `formatCents`, so the null case cannot be skipped by formatting a value
   straight out of the row. */
// import { formatCents } from "@/lib/display";
import { PageTabs } from "@/components/casing/PageTabs";
import { PAGE_TABS, tabSequenceFor } from "@/lib/nav";
/* ⚠ `P1-ALL-E379` — the unread badge rides on the shared tab row. */
import { tabsWithUnread, unreadCount } from "@/lib/messages";

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
/* ⚠ THE THIRD PLACE `Find a Mentor` LIVED, AND `E374` MISSED IT (`P1-ALL-E378`).
   The heading and the tab were renamed; this browser-tab title was not, so the
   page said `Mentoring` while the tab strip in the OS said `Find a Mentor`.
   ⚠ `Mentoring` NAMES THE TOPIC, NOT THE PEOPLE — `E374` established that nobody
   is a mentor until asked, so a label presenting people as mentors advertises a
   consent nobody gave. */
export const metadata = { title: "Mentoring · Panameer" };

export default async function MentorsPage({
  searchParams,
}: {
  searchParams: Promise<{ skill?: string }>;
}) {
  await guardPage("authenticated");
  /* ⚠ `P1-ALL-E379` — the Messages tab carries the unread count on every
     page that renders this tab row. Zero renders nothing. */
  const unreadViewer = await getSessionViewer();
  const unread = unreadViewer ? await unreadCount(unreadViewer) : 0;
  const { skill } = await searchParams;
  const mentors = await listMentors({ skill: skill?.trim() || undefined });

  /* ⚠ WHO I HAVE ALREADY CONNECTED TO AS A MENTOR, so a card that is already
     connected reads `Disconnect` rather than offering the same action twice.
     ⚠ THIS IS A JOIN BETWEEN TWO LIB READS, NOT A RULE — `getMyCommunity`
     computed `following` and the lib refuses SELF on the way in regardless. */
  const viewer = await getSessionViewer();
  const mine = viewer ? await getMyCommunity(viewer) : null;
  const mentorUserIds = new Set(
    (mine?.following ?? []).filter((f) => f.person).map((f) => f.person!.userId)
  );
  const viewerUserId = viewer?.userId ?? null;

  return (
    <>
      {/* E216 — the Community rail flyout's children are this section's tab row now. */}
      <PageTabs
        sequence={tabSequenceFor("/community")} tabs={tabsWithUnread(PAGE_TABS["/community"], unread)} current="/community/mentors" />
      <div className="mx-auto max-w-5xl space-y-5">
      <header>
        {/* ⚠⚠ NOBODY ON THIS PAGE IS CALLED A MENTOR, AND THAT IS THE POINT
            (`P1-ALL-E374`). Under Scott's rule a member becomes a mentor when
            somebody ASKS them to be one — *"the determining factor is if anyone
            wants you to be...and therefore makes a request from you."* So a page
            that presents people AS mentors advertises a consent nobody gave,
            which is the exact failure `lib/mentors.ts`'s own header was written
            to avoid. THIS PAGE OFFERS PEOPLE YOU CAN ASK.
            ⚠ THE HEADING KEPT THE WORD `Mentor` ONLY AS THE THING YOU ASK FOR —
            "Ask for mentoring", not "here are mentors". Reported verbatim in the
            `E374` report so Scott can overrule the wording. */}
        <h1 className="font-display text-[26px] font-bold tracking-[-0.5px]">
          Ask for Mentoring
        </h1>
        <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          Every member can be asked. These are practitioners on Panameer whose
          profiles show the work — connect as a mentor and their published rate
          is what applies.
        </p>
      </header>

      {/* ⚠⚠ THE HONEST FRAME, REWRITTEN FOR THE NEW MODEL (`P1-ALL-E374`).
          ⚠ SUPERSEDED, QUOTED NOT DELETED — it used to read: *"Mentoring opens
          in a later release... None has set a price or opted in yet, so nothing
          here is bookable, and the buttons say so."* Every clause of that is now
          wrong: there is no opt-in to wait for, the rate is already set, and
          connecting works today. What has NOT changed is that PAYING is not
          built — that runs on WorkRequest -> WorkOrder -> Settlement and there is
          NO BUY BUTTON anywhere, because a checkout that goes nowhere is worse
          than none. */}
      <section className="rounded-brand border border-dashed border-magenta/30 bg-magenta/[0.03] p-4">
        <p className="text-[14px] leading-relaxed text-ink-2">
          <b className="text-ink">Connecting is free and immediate.</b> Nobody
          here has to accept, opt in or be approved — asking is what makes
          somebody a mentor. Their rate is the one they published. Paying for
          time through Panameer arrives with the rest of the commerce path; until
          then you arrange it between yourselves.
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
                {/* ⚠⚠ THEIR OWN RATE, THROUGH THE ONE DECIDED RULE — never a
                    platform constant, and NEVER a `$0` or a placeholder when
                    absent. ⚠ SUPERSEDED: this row used to print
                    `MICRO_SESSION_PRICE / MICRO_SESSION_MINUTES min`, a fixed
                    platform anchor no provider had agreed to. A second row
                    printed a half-range as "Their project rate" — that is now
                    the ONLY rate, and it reads `hourly_rate_cents` too, which
                    carries 19 of 25 live providers. */}
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-2">Their rate</dt>
                  <dd className="font-semibold">
                    {rateDisplay({
                      hourlyRateCents: m.hourlyRateCents,
                      rateMinCents: m.rateMinCents,
                      rateMaxCents: m.rateMaxCents,
                      currency: m.currency,
                    }) ?? <span className="font-normal text-ink-2">{NO_RATE_PUBLISHED}</span>}
                  </dd>
                </div>
                {m.teaches > 0 && (
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-ink-2">Teaches on Learn</dt>
                    <dd className="font-semibold">Yes</dd>
                  </div>
                )}
              </dl>

              <div className="mt-4 flex flex-wrap gap-2">
                {/* ⚠⚠ THERE IS NO BUY BUTTON, AND THE DISABLED ONE IS GONE TOO.
                    ⚠ SUPERSEDED, QUOTED NOT DELETED: *"BOOK IS DISABLED, not a
                    link to nowhere. Booking is PHASE 4; a live-looking button
                    that opened a placeholder would waste a click and teach that
                    buttons here don't work."* PHASE 4 IS CANCELLED, so a button
                    waiting for it is waiting for nothing. Paying runs on
                    WorkRequest -> WorkOrder -> Settlement when that lands; it does
                    not get its own path and it does not get a stub.
                    ⚠ WHAT REPLACES IT WORKS TODAY: connecting is free, instant,
                    and needs nobody's permission. */}
                {m.userId && (
                  <ConnectControls
                    toUserId={m.userId}
                    relation={null}
                    isMentor={mentorUserIds.has(m.userId)}
                    isSelf={m.userId === viewerUserId}
                  />
                )}
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
