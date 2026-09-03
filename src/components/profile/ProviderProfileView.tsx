import Link from "next/link";
import { OwnerAiPass, OwnerResumeImport } from "@/components/profile/OwnerAiPass";
import { formatCents, rateBreakdown } from "@/lib/display";
import type { ProviderProfileView } from "@/lib/provider-profile-view";
import type { TaughtPath } from "@/lib/learn-home";
import type { Testimonial } from "@/lib/recommendations";
import { TaughtPaths } from "@/components/learn/TaughtPaths";
import { CommunitySignalBlock } from "@/components/profile/CommunitySignal";
import { mentorState, type CommunitySignal } from "@/lib/community-signal";
import {
  ProfileCard,
  ProfileHero,
  SoloProjectsBody,
  ArtifactsBody,
  ContactBody,
  LocationBody,
  Empty,
  EDIT_CLASS,
  VerificationsBody,
  LanguagesBody,
  EducationBody,
  SpecializationsBody,
  OverviewBody,
  SkillsBody,
  ProjectsBody,
  WorkHistoryBody,
  CertificationsBody,
} from "@/components/profile/sections";

/**
 * The published provider Profile View (brief_S / E037), modelled on the Upwork
 * reference: a narrow left rail (verifications, languages, education,
 * specializations) beside the main column (overview, packages, projects,
 * skills, employment history, certifications, testimonials).
 *
 * This REPLACES the old thin dashboard as the provider's home, so it carries
 * the owner-only bits too — the completeness banner and per-section edit links
 * back into the wizard. A visitor sees the same page without them.
 *
 * brief_X / E056 moved the section markup into `./sections` so the PRE-PUBLISH
 * review (step 13 of the wizard) renders the same layout from the wizard's
 * local draft. What stays here is what only the published page has: the
 * owner banner, the sellable Packages catalog, and `<Link>` edit affordances.
 *
 * Empty sections render an explicit prompt rather than vanishing: on your own
 * profile a missing project list is a to-do, and silently hiding it is how a
 * provider ends up wondering why nobody contacts them.
 */

/** Per-section edit affordance — navigation, straight back into the wizard. */
/**
 * When a live profile starts reading as stale (J2.4 WS-C / E009).
 *
 * Thirty days, and the number is a judgement rather than a measurement — there
 * is no ranking signal behind it yet to tune against. It is set where it is
 * because a shorter window nags a provider whose profile is simply finished,
 * and a longer one lets a genuinely abandoned profile sit unremarked for a
 * quarter. When search ranking is real, this becomes whatever that ranking
 * actually decays on.
 */
const STALE_AFTER_DAYS = 30;

function EditLink({
  href,
  title,
  label = "Edit",
  icon = "✏️",
}: {
  href: string;
  title: string;
  label?: string;
  icon?: string;
}) {
  return (
    <Link href={href} aria-label={`${label} ${title}`} className={EDIT_CLASS}>
      {icon} {label}
    </Link>
  );
}

export function ProviderProfileViewPage({
  p,
  taughtPaths = [],
  testimonials = [],
  community = null,
  condensedWorkHistory = false,
  connect = null,
  banner,
  footer,
}: {
  p: ProviderProfileView;
  /** Learn paths this person instructs (E137). Empty renders nothing at all. */
  taughtPaths?: TaughtPath[];
  /**
   * Forum involvement (brief_community_signal WS2). ⚠ NULL RENDERS NOTHING —
   * same contract as `taughtPaths`, and for the same reason: a zeroed block on a
   * profile is a claim about a person rather than an absence of one.
   */
  community?: CommunitySignal | null;
  /**
   * Recommendations this provider has actually been given (J2.4 WS-F / E012).
   *
   * Passed in rather than fetched here: this component renders on the public
   * profile, the owner's profile and the onboarding review, and a query inside
   * it would run three times for three different reasons. The callers that have
   * a profile id supply them; the ones that don't get the honest empty state
   * that was always here.
   */
  testimonials?: Testimonial[];
  /** One tight line per role, for the "You're live" page (WS1/E146). */
  condensedWorkHistory?: boolean;
  /**
   * ⚠⚠ THE CONNECT CONTROL (`P1-ALL-E374` WS-3) — THE LAST LINK IN THE LEARN
   * BRIDGE. The chain lesson -> `InstructorBadge` -> `/providers/{id}` already
   * existed; only this was missing. Scott: *"I should be able to see the
   * instructor on my class and request mentor services from him, no?"*
   *
   * ⚠ PASSED IN RATHER THAN BUILT HERE, and that is not indirection for its own
   * sake: this component is rendered by THREE pages — `/providers/[id]`,
   * `/profile` and `/join/provider`. Only the first is somebody else's profile.
   * The other two would need a control that refuses itself, so the page that
   * knows the answer supplies it and the other two pass nothing.
   *
   * ⚠ NO BUY BUTTON GOES HERE OR ANYWHERE. Paying for mentoring runs on
   * WorkRequest -> WorkOrder -> Settlement, which is unbuilt, and a checkout that
   * goes nowhere is worse than none.
   */
  connect?: React.ReactNode;
  /** Replaces the default owner status banner. */
  banner?: React.ReactNode;
  /** Rendered after every section — the "You're live" CTA lives here. */
  footer?: React.ReactNode;
}) {
  const { youGet } = rateBreakdown(p.rates.hourlyCents, p.serviceFeeBps);
  // E074 — Solo Projects is null-employer ONLY; everything else belongs to its
  // employer in Work History.
  const soloProjects = p.projects.filter(
    (pr) => !p.employers.some((e) => (e.projects ?? []).some((n) => n.id === pr.id))
  );
  /*
    E130 — same two states as the review: an empty section invites you to ADD,
    a populated one to EDIT. Passing `isEmpty` at each call site keeps the rule
    in one place rather than each section deciding for itself.
  */
  /*
    E131 — wizard-step edits carry `&return=review`, so saving lands the provider
    back on their profile instead of dumping them into the middle of the
    onboarding train and walking them forward through steps they didn't ask for.
    `/settings/*` links are left alone: those are real destinations, not a
    detour, and Certifications opens its own modal.
  */
  const edit = (title: string, href: string, isEmpty = false) =>
    p.isOwner ? (
      <EditLink
        href={href}
        title={title}
        label={isEmpty ? `Add ${title}` : "Edit"}
        icon={isEmpty ? "+" : "✏️"}
      />
    ) : undefined;

  return (
    <div className="min-h-screen bg-bg-soft font-body text-ink">
      {/* max-w-6xl, not 5xl (brief §2): with a 300px meta rail the old frame
          left the main column at ~650px, which is cramped for two-up project
          cards. This gives it ~800px. */}
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Owner-only status banner — the completeness/visibility story the old
            dashboard card used to carry. A caller can replace it (the "You're
            live" page supplies its own). */}
        {banner}
        {!banner && p.isOwner && (
          <div
            className={
              "mb-6 flex flex-wrap items-center justify-between gap-4 rounded-brand border p-5 " +
              (p.visible
                ? "border-emerald-500/30 bg-emerald-50/60"
                : "border-magenta/25 bg-magenta/[0.05]")
            }
          >
            <div>
              <p className="font-bold">
                {p.paused
                  ? "Your profile is paused"
                  : p.visible
                    ? "🎉 You're live — buyers can find you"
                    : `You're at ${p.completeness}% — reach ${p.visibilityThreshold}% to go live`}
              </p>
              {/*
                THE FRESHNESS NUDGE (J2.4 WS-C / E009).

                The line here used to be the same sentence every day — "keep
                your profile fresh" — which is advice, not a nudge: it never
                changed, so it never prompted anything. It now says how long it
                has actually been, and only asks for an update once that number
                is worth acting on. Under the threshold the profile is fine and
                the banner says so rather than manufacturing a chore.
              */}
              <p className="mt-1 text-[14px] text-ink-2">
                {!p.visible || p.paused
                  ? "Complete the remaining details to become visible to service buyers."
                  : p.daysSinceUpdate !== null && p.daysSinceUpdate >= STALE_AFTER_DAYS
                    ? `Last updated ${p.daysSinceUpdate} days ago — buyers see recently-updated profiles first, so a quick pass through pays.`
                    : "Your profile is up to date. Buyers see recently-updated profiles first."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden w-40 sm:block">
                <div className="h-2 w-full overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full bg-magenta transition-[width] duration-500"
                    style={{ width: `${Math.min(100, p.completeness)}%` }}
                  />
                </div>
                <p className="mt-1 text-right text-[12px] font-bold text-magenta">
                  {p.completeness}%
                </p>
              </div>
              {/*
                E133 — "/join/provider" with no step resolves to the RESUME
                point, so a published provider clicking Edit Profile was dropped
                at the start of the onboarding train and walked forward through
                steps they had finished months ago. `step=finish` is the review —
                the profile-shaped editor — and being the last step there is no
                train left to walk.
              */}
              <Link
                href="/join/provider?step=finish"
                className="rounded-full bg-magenta px-5 py-2.5 font-bold text-white transition-colors hover:bg-magenta-dark"
              >
                Edit Profile
              </Link>
            </div>
          </div>
        )}

        {/* ---- pg1: full-width hero — photo · name/tagline/bio · meta ---- */}
        <ProfileHero
          firstName={p.person.firstName}
          lastName={p.person.lastName}
          photoUrl={p.person.photoUrl}
          headline={p.headline}
          overview={p.overview}
          validated={p.validated}
          /*
            ⚠ ONLY WHEN THERE IS A SIGNAL TO READ. No forum activity → no
            Mentor row either, for the same reason the block below is absent:
            "answers marked helpful: 0" on a stranger's profile is a zero with a
            person's name on it. The OWNER sees the number regardless, because
            for them it is a mechanic rather than a verdict.
          */
          mentor={
            community || p.isOwner
              ? mentorState(community?.helpfulAnswers ?? 0, p.isOwner)
              : null
          }
          rateMinCents={p.rates.minCents}
          rateMaxCents={p.rates.maxCents}
          currency={p.rates.currency}
          youGetCents={p.isOwner ? youGet : null}
          language={p.primaryLanguage}
          experience={p.experience}
          country={p.country}
        />

        {/* ⚠ NEAR THE TOP, WHERE A VIEWER DECIDES — directly under the identity
            block rather than below the fold. ⚠ Never on your own profile: the
            page passes nothing when `isOwner`, and `lib/connections.ts` refuses
            SELF regardless, so the control is absent rather than disabled.
            ⚠ THE RATE IS NOT PRINTED AGAIN HERE. It already renders in the
            identity block above as `Hourly Rate:` — fed by
            `provider-profile-view.ts:258-266`, which ALREADY falls back to
            `hourly_rate_cents`, so it obeys the WS-0 rule as it stands. Printing
            it twice was the thing the brief told me to check for. */}
        {connect && <div className="mt-4">{connect}</div>}

        {/* ---- pg1: Work History, full width ---------------------------- */}
        <div className="mt-5">
          <ProfileCard
            title="Work History"
            edit={
              // E132 — always reachable, not only when the section is empty.
              p.isOwner ? (
                <span className="flex flex-wrap items-center gap-4">
                  <OwnerResumeImport />
                  {edit(
                    "Work History",
                    "/join/provider?step=tell_us&return=review",
                    p.employers.length === 0
                  )}
                </span>
              ) : undefined
            }
          >
            {/*
              E129 — the live provider's own reachable offer. A provider whose
              import missed their work history sees an empty section here forever
              otherwise; the AI pass previously existed only in the moments after
              an upload. OWNER ONLY — a visitor looking at someone's profile must
              never see a control that re-reads that person's résumé.
            */}
            {p.isOwner && p.employers.length === 0 && (
              <div className="mb-4">
                <OwnerAiPass />
              </div>
            )}
            <WorkHistoryBody
              condensed={condensedWorkHistory}
              /*
                WS4b — the cap moved to MY PROFILE. It used to live on the
                "You're live" page, which this brief retires (E149), so the
                decision it embodied — a long history should not bury the rest
                of the profile — needed a new home. The profile-as-buyers-see-it
                is the right one: it is the surface that scrolls.
              */
              cap={5}
              employers={p.employers}
              projects={p.projects}
              isOwner={p.isOwner}
              contactFor={(id) => {
                const e = p.employers.find((x) => x.id === id);
                if (!e?.hasContact) return null;
                return (
                  <ContactBody
                    contactEmail={e.contactEmail}
                    locked={e.locked}
                    label="Employer Contact"
                  />
                );
              }}
              artifactsFor={(id) => {
                const e = p.employers.find((x) => x.id === id);
                return e?.artifacts?.length ? (
                  <ArtifactsBody artifacts={e.artifacts} />
                ) : null;
              }}
              empty={
                p.isOwner
                  ? "No work history yet. Providers who add work experience and projects are twice as likely to win work."
                  : "No work history yet."
              }
            />
          </ProfileCard>
        </div>

        {/* ---- pg2: Solo Projects, full width (E074) -------------------- */}
        <div className="mt-5">
          <ProfileCard
            title="Solo Projects"
            edit={edit("Solo Projects", "/join/provider?step=tell_us&return=review")}
          >
            <SoloProjectsBody
              isOwner={p.isOwner}
              projects={soloProjects}
              empty={
                p.isOwner
                  ? "No solo projects yet — work you delivered outside a job goes here."
                  : "No solo projects listed."
              }
            />
          </ProfileCard>
        </div>

        {/* Packages (brief_V / E045) — NOT in the pg1/pg2 mockup, kept
            full-width here so the shipped sellable catalog isn't dropped by a
            layout change. Published-only, as before. */}
        <div className="mt-5">
          {/* Packages (brief_V / E045) — the sellable catalog. Sits ABOVE
                Projects deliberately: a buyer landing here should first see
                what they can buy today, then the proof it will be delivered.
                Read-only; purchase is a later stage.

                PUBLISHED-ONLY: packages are a post-publish selling surface, so
                brief_X deliberately leaves them off the pre-publish review. */}
              {/*
                ⚠ `Service Products`, NOT `Packages` (`P1-J1.4-E301`, 2026-09-01).
                ⚠ THE ROUTE `/settings/packages` DOES NOT CHANGE — only the words. The
                `edit(...)` label moves with the title so the card and its control agree.
                ⚠ `P1-J1.4-E045` deliberately established `Solutions` -> `Packages`. THIS
                SUPERSEDES THAT VOCABULARY FOR THIS SURFACE ONLY, so nobody restores
                `Packages` here on E045's authority. `Packages` stays user-facing in ~18
                other places Scott did NOT name — listed in the report, untouched.
              */}
            {(p.packages.length > 0 || p.isOwner) && (
              <ProfileCard
                title="Service Products"
                edit={edit("Service Products", "/settings/packages")}
              >
                {p.packages.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {p.packages.map((pk) => (
                      <article
                        key={pk.id}
                        className="overflow-hidden rounded-brand border border-line"
                      >
                        {pk.coverImageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={pk.coverImageUrl}
                            alt=""
                            className="h-32 w-full object-cover"
                          />
                        )}
                        <div className="p-4">
                          <h3 className="text-[15px]">{pk.title}</h3>
                          <p className="mt-1 text-[14px] font-bold text-ink">
                            {pk.priceCents != null
                              ? formatCents(pk.priceCents, pk.currency)
                              : "Price on request"}
                            {pk.durationWeeks != null && (
                              <span className="font-semibold text-ink-2">
                                {" · "}
                                {pk.durationWeeks} week
                                {pk.durationWeeks === 1 ? "" : "s"}
                              </span>
                            )}
                          </p>
                          {pk.summary && (
                            <p className="mt-2 line-clamp-3 text-[14px] text-ink-2">
                              {pk.summary}
                            </p>
                          )}
                          {pk.deliverables.length > 0 && (
                            <ul className="mt-3 space-y-1">
                              {/* A few, not all — the card is a pitch, not the
                                  statement of work. */}
                              {pk.deliverables.slice(0, 4).map((d) => (
                                <li
                                  key={d.id}
                                  className="flex gap-2 text-[13.5px] text-ink-2"
                                >
                                  <span className="text-magenta">✓</span>
                                  <span>{d.text}</span>
                                </li>
                              ))}
                              {pk.deliverables.length > 4 && (
                                <li className="text-[13px] text-ink-2">
                                  +{pk.deliverables.length - 4} more
                                </li>
                              )}
                            </ul>
                          )}
                          {pk.milestones.length > 0 && (
                            <p className="mt-3 border-t border-line pt-3 text-[13px] text-ink-2">
                              {pk.milestones
                                .map((m) => `${m.percent}% ${m.label}`)
                                .join(" · ")}
                            </p>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <Empty>
                    No packages published yet. A package is a fixed scope, a
                    timeline and a price — the simplest thing for a buyer to say
                    yes to.
                  </Empty>
                )}
              </ProfileCard>
            )}

        </div>


        {/* ---- pg2: the 2-column grid ----------------------------------- */}
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <ProfileCard
            title="Skills"
            edit={edit("Skills", "/join/provider?step=catalog&return=review")}
          >
            <SkillsBody skills={p.skills} field={p.field} />
          </ProfileCard>

          <ProfileCard
            title="Specializations"
            edit={edit("Specializations", "/join/provider?step=specializations&return=review")}
          >
            <SpecializationsBody specializations={p.specializations} />
          </ProfileCard>

          <ProfileCard
            title="Education"
            edit={edit("Education", "/join/provider?step=education&return=review")}
          >
            <EducationBody education={p.education} />
          </ProfileCard>

          <ProfileCard
            title="Certifications"
            // "certifications" is not a wizard STEP, so this resolved to the
            // resume point and started the train. The review owns the
            // certifications editor (E057), so that is where it goes (E133).
            edit={edit("Certifications", "/join/provider?step=finish")}
          >
            <CertificationsBody
              certifications={p.certifications}
              empty={
                p.isOwner
                  ? "No certifications yet. Adding your credentials increases your chances of getting hired."
                  : "No certifications listed."
              }
            />
          </ProfileCard>

          <ProfileCard title="Location">
            <LocationBody location={p.location} country={p.country} />
          </ProfileCard>

          {/*
            E039's honest empty state, now with a way OUT of it (J2.4 WS-F).

            It used to say "you'll collect these as you deliver work", which was
            true and useless: the provider could do nothing about it today. They
            can now — asking a past client is a page away — so the empty state
            points at the action instead of at the future.
          */}
          <ProfileCard title="Testimonials">
            {testimonials.length === 0 ? (
              <Empty>
                {p.isOwner ? (
                  <>
                    No testimonials yet.{" "}
                    <Link
                      href="/recommendations"
                      className="font-semibold text-magenta hover:underline"
                    >
                      Ask someone you&apos;ve worked with
                    </Link>{" "}
                    — it takes a minute and buyers read them.
                  </>
                ) : (
                  "No testimonials yet."
                )}
              </Empty>
            ) : (
              <ul className="space-y-4">
                {testimonials.map((t) => (
                  <li key={t.id}>
                    <blockquote className="border-l-[3px] border-magenta/40 pl-3.5 text-[14.5px] leading-relaxed text-ink-2">
                      {t.body}
                    </blockquote>
                    <p className="mt-1.5 pl-3.5 text-[13px] font-semibold">
                      {t.author}
                      {(t.title || t.company) && (
                        <span className="font-normal text-ink-2">
                          {" · "}
                          {[t.title, t.company].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </ProfileCard>
        </div>

        {/*
          E137 — the courses half of the profile↔courses loop, on the provider's
          own profile too so they can see what a buyer sees. Renders nothing
          when they teach nothing.
        */}
        {taughtPaths.length > 0 && (
          <div className="mt-6">
            <TaughtPaths
              paths={taughtPaths}
              name={`${p.person.firstName ?? ""} ${p.person.lastName ?? ""}`.trim()}
              isOwner={p.isOwner}
            />
          </div>
        )}

        {/*
          Community involvement, below the courses strip and above the footer.
          Renders nothing when the signal is null — which, measured on the live DB
          2026-08-19, is every profile on the platform, because the forums have
          zero threads and zero posts.
        */}
        {community && (
          <div className="mt-6">
            <CommunitySignalBlock
              signal={community}
              firstName={p.person.firstName ?? ""}
              isOwner={p.isOwner}
            />
          </div>
        )}

        {footer}
      </div>
    </div>
  );
}
