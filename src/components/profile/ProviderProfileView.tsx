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
  /* ⚠ `SkillsBody` REMOVED FROM THIS IMPORT (`P2-J2-E562` WS-C 8) — the
     standalone Skills card it rendered is retired and the hero renders the
     chips itself. ⚠ Leaving it imported is a NEW unused-var warning against a
     0-new baseline. ⚠⚠ THE EXPORT IS UNTOUCHED: the onboarding review still
     imports and renders `SkillsBody` in its own editable card. */
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
  /*
    ── ⚠⚠ THE RATE IS NOT RENDERED FOR A RECRUITER (`P1-A1.3-E401` WS-2) ───────

    `p.isRecruiter` is `isRecruiterProfile()` asked in `provider-profile-view.ts`
    — the SAME test `stepsForProfile()` uses to keep a recruiter out of the rate
    step. ⚠ ASKED ONCE, HERE, and read by both the identity block's rate and the
    owner's take-home line below, so the two cannot disagree.

    ⚠ `youGet` IS NOT COMPUTED EITHER. It is the service fee applied to an
    hourly rate a recruiter does not charge; leaving it computed and merely
    unrendered would be a live wrong number one prop away from a page.
    ⚠⚠ NOTHING REPLACES IT — see the note in `provider-profile-view.ts`.
  */
  const { youGet } = p.isRecruiter
    ? { youGet: null }
    : rateBreakdown(p.rates.hourlyCents, p.serviceFeeBps);
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
  /*
    ── ⚠⚠ WS-A (`P2-J2-E562`) — THE EMPTY CARDS COLLAPSE INTO ONE PANEL ───────

    ⚠ MEASURED: six sections each rendered a FULL-WEIGHT CARD saying "No X yet",
    while the banner above listed the same gaps. ⚠⚠ THE PAGE STATED ITS ABSENCES
    TWICE AND ITS STRENGTHS ONCE.

    ⚠⚠⚠ OWNER-ONLY, AND THAT IS THE WHOLE SAFETY ARGUMENT. `gaps` is empty when
    `p.isOwner` is false, so `hidden` is empty, so EVERY card renders exactly as
    it did before for a buyer on `/providers/[id]`. There is no second code path
    for the buyer — the buyer takes the SAME path with an empty set.

    ⚠ A SECTION WITH CONTENT STILL RENDERS AS ITS OWN CARD. Only the empty ones
    fold, and only for the person who can act on them.

    ⚠ `Work History`, `Skills` and `Location` ARE DELIBERATELY NOT IN THIS SET.
    Work History carries the résumé importer and is the page's spine; Skills is
    retired into the hero by WS-C, not folded here; Location is never truly
    empty. ⚠⚠ Adding one later means adding it HERE, not forking a second list.
  */
  const gapSections = [
    { key: "Solo Projects", empty: soloProjects.length === 0, href: "/join/provider?step=tell_us&return=review" },
    { key: "Service Products", empty: p.packages.length === 0, href: "/my-services" },
    { key: "Specializations", empty: p.specializations.length === 0, href: "/join/provider?step=specializations&return=review" },
    { key: "Education", empty: p.education.length === 0, href: "/join/provider?step=education&return=review" },
    { key: "Certifications", empty: p.certifications.length === 0, href: "/join/provider?step=finish" },
    { key: "Recommendations", empty: testimonials.length === 0, href: "/recommendations" },
  ] as const;
  const gaps = p.isOwner ? gapSections.filter((g) => g.empty) : [];
  const hidden = new Set<string>(gaps.map((g) => g.key));

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
        {/*
          ── ⚠⚠⚠ THE STATUS STRIP (`P2-J2-E562` WS-B) — TWO FACTS, NOT ONE BLUR

          ⚠ SUPERSEDED, quoted not deleted (`E164`) — the green banner this
          replaces, as LINE comments per rule 12 because the quoted body carries
          its own block comments:
          // {!banner && p.isOwner && (
          //   <div className={... p.visible ? emerald : magenta ...}>
          //     <p className="font-bold">
          //       {p.paused ? "Your profile is paused"
          //         : p.visible ? "You're live - buyers can find you"
          //         : `You're at ${p.completeness}% - reach ${p.visibilityThreshold}% to go live`}
          //     </p>
          //     (the freshness nudge: "Last updated N days ago ...")
          //     {p.enrichmentGaps.length > 0 && (
          //       <p>Worth adding: {p.enrichmentGaps.join(" . ")}</p>
          //     )}
          //     (a magenta meter + "{p.completeness}% of required details")
          //     <Link href="/join/provider?step=finish">Edit Profile</Link>
          //   </div>
          // )}

          ⚠⚠ THE DEFECT, AND IT IS REAL: the gate sentence carried TWO
          percentages and the meter beside it carried a THIRD, different number.
          One figure contradicting itself. `profile_tiers.md`: *"the UI must
          never imply hit a % -> you're visible."*

          ⚠⚠ SO THEY ARE NOW TWO SEPARATE FACTS:
            · THE GATE — a yes/no, stated in WORDS. No percentage, ever.
            · THE METER — the ONLY percentage on the page, labelled for what it
              actually measures.

          ⚠ `p.visible` IS THE AUTHORITY for what the gate SAYS; `missingRequired`
          only NAMES what is outstanding. They cannot contradict, because the
          sentence never reads the list.

          ⚠ THE "Worth adding" LINE IS GONE FROM HERE — it duplicated the WS-A
          gaps panel directly below it, which is the exact defect WS-A exists to
          kill. ⚠⚠ `p.enrichmentGaps` IS NO LONGER RENDERED ON THIS SURFACE; the
          field stays on the view model, unused here, because other surfaces
          read it.

          ⚠ OWNER-ONLY, unchanged: `!banner && p.isOwner`.
          ⚠ A MET gate stays EMERALD (a fact, earned); an UNMET one is AMBER (a
          thing to do), never magenta — magenta would say "broken", and §2d
          reserves it for what BLOCKS.
        */}
        {!banner && p.isOwner && (
          <section
            className={
              "mb-6 rounded-brand border p-5 " +
              (!p.paused && p.visible
                ? "border-emerald-500/30 bg-emerald-50/60"
                : "border-amber-400/40 bg-amber-50/60")
            }
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                {/* ── FACT 1 — THE GATE. Words only. No percentage. ────────── */}
                <p className="font-bold">
                  {p.paused
                    ? "Your profile is paused"
                    : p.visible
                      ? "Photo, identity and the required details — all met."
                      : "Not visible yet — some required details are missing."}
                </p>
                {!p.paused && !p.visible && p.missingRequired.length > 0 && (
                  /* ⚠ NAMES THEM. A gate that says "something is missing"
                     without saying WHAT is the invisible-profile bug itself. */
                  <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">
                    Still needed: {p.missingRequired.join(" · ")}
                  </p>
                )}
                {!p.paused && p.visible && (
                  <p className="mt-1 text-[14px] text-ink-2">
                    Buyers can find you.
                    {p.daysSinceUpdate !== null &&
                    p.daysSinceUpdate >= STALE_AFTER_DAYS
                      ? ` Last updated ${p.daysSinceUpdate} days ago — buyers see recently-updated profiles first, so a quick pass through pays.`
                      : " Buyers see recently-updated profiles first."}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* ── FACT 2 — THE METER. The only percentage on the page. ─── */}
                <div className="hidden w-40 sm:block">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-line">
                    {/*
                      ⚠ THE BAR IS STILL MAGENTA AND THAT IS DELIBERATE HERE —
                      recolouring progress bars to ink is WS-D item 14, and
                      batching workstreams is what the brief forbids. ⚠ The
                      FIGURE below is ink as of WS-B, per `E433`.
                    */}
                    <div
                      className="h-full bg-magenta transition-[width] duration-500"
                      style={{ width: `${Math.min(100, p.completeness)}%` }}
                    />
                  </div>
                  {/*
                    ⚠⚠ LABELLED FOR WHAT IT MEASURES, NOT FOR WHAT IT LOOKS LIKE.
                    `completeness.ts` RETURNS 100 WHILE SECTIONS ARE EMPTY
                    because it counts the REQUIRED SET only. ⚠ THE FIGURE IS
                    RIGHT; the word `Complete` is what would mislead — so the
                    label names the denominator and that word is not used.
                    ⚠ `completeness.ts` IS NOT CHANGED BY THIS BRIEF; what it
                    would take is in the WS-B report.
                    ⚠ `E433` — a figure, so INK. Superseded: `text-magenta`.
                  */}
                  <p className="mt-1 text-right text-[12px] font-bold text-ink">
                    {p.completeness}% of required details
                  </p>
                </div>
                {/*
                  E133 — `/join/provider` with no step resolves to the RESUME
                  point, so a published provider clicking the button below was
                  dropped at the start of the onboarding train. `step=finish` is
                  the review — the profile-shaped editor.
                */}
                <Link
                  href="/join/provider?step=finish"
                  className="rounded-full bg-magenta px-5 py-2.5 font-bold text-white transition-colors hover:bg-magenta-dark"
                >
                  Edit Profile
                </Link>
              </div>
            </div>
          </section>
        )}

        {/*
          ── ⚠⚠ WS-A (`P2-J2-E562`) — ONE PANEL, NOT SIX EMPTY CARDS ──────────

          ⚠⚠⚠ RENDERS ONLY FOR THE OWNER. `gaps` is empty when `p.isOwner` is
          false, so this block does not exist on `/providers/[id]`. A buyer never
          sees a list of what this provider lacks — ⚠ **the gaps panel tells the
          owner privately; a buyer reads the same page.**

          ⚠⚠ AMBER, NOT MAGENTA, AND THE DISTINCTION IS THE RULE NOT THE PALETTE.
          `profile_tiers.md` §2d reserves magenta for what BLOCKS a buyer seeing
          you. ⚠ NOTHING HERE BLOCKS — every one of these is already met or the
          profile would not be visible. These only STRENGTHEN. Colouring them
          magenta would say "you are broken" to a provider who is live.
          ⚠ `E433` is not in tension with that: magenta marks INTERACTIVE things,
          and the `Add` links below ARE interactive — so they carry it, while the
          panel's frame and its prose do not.

          ⚠⚠ NO INVENTED STATISTICS (§2e). No multiplier, no "3× more likely",
          no "profiles with certifications get hired sooner". ⚠ There are no
          conversion numbers in this product yet, so any such sentence would be
          fabricated — the same defect class as a `0` badge or a fake console
          name. The panel says WHAT is missing and WHERE to add it. Nothing else.
        */}
        {gaps.length > 0 && (
          <section className="mb-6 rounded-brand border border-amber-400/40 bg-amber-50/60 p-5">
            <h2 className="font-display text-[15px] font-bold">
              Worth adding to your profile
            </h2>
            {/* ⚠ STATES THE FACT, MAKES NO PROMISE. */}
            <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">
              None of these affect whether buyers can find you. They give a buyer
              more to go on.
            </p>
            <ul className="mt-3 divide-y divide-amber-400/25">
              {gaps.map((g) => (
                <li
                  key={g.key}
                  className="flex items-center justify-between gap-4 py-2"
                >
                  <span className="text-[14px] font-semibold text-ink">
                    {g.key}
                  </span>
                  {/* ⚠ `E433` — the ACTION is interactive, so it is magenta. */}
                  <Link
                    href={g.href}
                    className="shrink-0 text-[13.5px] font-bold text-magenta hover:underline"
                  >
                    Add
                  </Link>
                </li>
              ))}
            </ul>
            {/*
              ⚠⚠ `E561` HAS NOT LANDED — THE SEAM, NOT THE BUTTON.
              WS-D item 15 puts `Update from my résumé` here, with the gaps it
              would fill. ⚠ The brief is explicit: *"If `E561` has not landed, do
              not render the button."* ⚠⚠ A button that cannot do its job is the
              dead-icon defect `E560` Stage 1 refused for Messages, in a new
              place. It goes here, below the list, when `E561` ships.
            */}
          </section>
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
          /* ⚠ ABSENT, NOT ZEROED (`E401` WS-2). `IdentityBlock` renders the
             whole `Hourly Rate:` row only when it has a figure, so passing null
             removes the line rather than printing an empty one. */
          rateMinCents={p.isRecruiter ? null : p.rates.minCents}
          rateMaxCents={p.isRecruiter ? null : p.rates.maxCents}
          currency={p.rates.currency}
          youGetCents={p.isOwner ? youGet : null}
          language={p.primaryLanguage}
          experience={p.experience}
          country={p.country}
          /* ⚠⚠ WS-C item 8 — skills render IN THE HERO now, capped at eight.
             ⚠ `p.skills` is already the SHOWN set (`E517`'s offer-side filter
             applies in the view model), so this does not widen what a buyer
             sees by one row. */
          skills={p.skills}
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
                    /* `P2-J1.1-E012` — a work-history row is a COMPANY, not an employer.
       A resume row looks identical for employment and for contract work, the
       parser cannot tell them apart, and a user must not have to declare their
       tax status to fill one in. `Company` names the ENTITY, which is constant;
       `Employer` names the RELATIONSHIP, which varies. ⚠ `Company/Employer` was
       considered and REJECTED — a slash label puts the tax question back into a
       UI that had deliberately stopped asking it. ⚠ `Organization` is the fully
       correct superset and was CONSIDERED, NOT CHOSEN (Scott took `Company` for
       length and schema fit); recorded so nobody reopens it unknowing. */
                    label="Company Contact"
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
        {!hidden.has("Solo Projects") && (
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
        )}

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
            {/* ⚠ WS-A: `!hidden` folds it for an OWNER with none. The original
                `|| p.isOwner` is kept so a buyer's behaviour is byte-identical. */}
            {(p.packages.length > 0 || p.isOwner) && !hidden.has("Service Products") && (
              <ProfileCard
                title="Service Products"
                edit={edit("Service Products", "/my-services")}
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
          {/*
            ── ⚠⚠ THE STANDALONE SKILLS CARD IS RETIRED (`P2-J2-E562` WS-C 8) ──

            ⚠ SUPERSEDED, quoted not deleted (`E164`):
            // <ProfileCard
            //   title="Skills"
            //   edit={edit("Skills", "/join/provider?step=catalog&return=review")}
            // >
            //   <SkillsBody skills={p.skills} field={p.field} />
            // </ProfileCard>

            ⚠⚠ RETIRED ONLY BECAUSE THE HERO NOW RENDERS THEM. Removing this
            before the hero took `skills` would have deleted skills from the
            page — which is why the prop landed first.

            ⚠⚠⚠ ONE THING WENT WITH IT AND IT IS REPORTED, NOT HIDDEN: the
            `field` line — *"Role · Domain"* — had no home in the hero and is no
            longer rendered on this surface. ⚠ `E515` measured that the DERIVED
            DOMAIN IS NOT TRUSTWORTHY for a multi-ERP consultant (*"do not
            present it as fact"*), so losing it from a buyer-facing page is
            arguably right — ⚠⚠ BUT THAT IS SCOTT'S CALL, NOT A SIDE EFFECT TO
            SWALLOW. Raised at the WS-C gate.
            ⚠ `p.field` IS STILL ON THE VIEW MODEL and the review still renders
            it in its own editable Skills card; only this card went.
          */}

          {!hidden.has("Specializations") && (
          <ProfileCard
            title="Specializations"
            edit={edit("Specializations", "/join/provider?step=specializations&return=review")}
          >
            <SpecializationsBody specializations={p.specializations} />
          </ProfileCard>
          )}

          {!hidden.has("Education") && (
          <ProfileCard
            title="Education"
            edit={edit("Education", "/join/provider?step=education&return=review")}
          >
            <EducationBody education={p.education} />
          </ProfileCard>
          )}

          {!hidden.has("Certifications") && (
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
          )}

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
          {/*
            ⚠⚠ `Recommendations`, NOT `Testimonials` (`P2-J1.1-E014`).
            ⚠ SUPERSEDED, quoted not deleted: `<ProfileCard title="Testimonials">`.

            SCOTT, 2026-09-06: *"Inconsistency with recommendation vs
            testimonial. BOTH should be recommendation, no? testimonial is for a
            product only."* ⚠ CHAT OBJECTED AND CHAT WAS WRONG, and the objection
            is worth recording because it was built on the wrong object: it cited
            `ProjectValidation.testimonial`, which is a DIFFERENT thing with two
            consent flags. THIS CARD DOES NOT RENDER THAT. `publicTestimonials()`
            queries `recommendationRequest` — solicited recommendations — so on
            this surface the two words were one thing.

            ⚠⚠ THE WORD MOVES ON THIS CARD ONLY. Three different things share it
            and a find-and-replace breaks two features and a marketing page —
            the `E012` lesson. `ProjectValidation.testimonial` and its consent
            flags are UNTOUCHED (and `check:validation-answers` is written around
            that word by regex); so is marketing social proof on `/`,
            `/why-panameer` and the join deck's `DECK_TESTIMONIALS`.

            ⚠ NO PROVENANCE BADGE, AND THAT IS A FINDING RATHER THAN AN OMISSION
            — see the note above `publicTestimonials()` in `lib/recommendations.ts`.
          */}
          {!hidden.has("Recommendations") && (
          <ProfileCard title="Recommendations">
            {testimonials.length === 0 ? (
              <Empty>
                {p.isOwner ? (
                  <>
                    No recommendations yet.{" "}
                    <Link
                      href="/recommendations"
                      className="font-semibold text-magenta hover:underline"
                    >
                      Ask someone you&apos;ve worked with
                    </Link>{" "}
                    — it takes a minute and buyers read them.
                  </>
                ) : (
                  "No recommendations yet."
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
          )}
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
