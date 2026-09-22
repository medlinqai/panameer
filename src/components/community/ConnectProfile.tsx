import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
/* ⚠ `Face` OWNS THE "no photo -> grey silhouette" RULE (`E591`), so the faces
   row asks it rather than deciding the fallback a second time. */
/* ⚠⚠ THE FACES ROW IS GONE (`P2-A2-E598` WS-C item 3) — Scott: *"The colleague
   faces row (`E596` WS-D) is replaced by the count in the hero line."*
   ⚠ SUPERSEDED, quoted not deleted (`E164`):
   //   import { Face } from "@/components/community/Silhouette";
   ⚠⚠⚠ `Silhouette.tsx` AND `Face` ARE UNTOUCHED ON DISK and still used by
   `/community`. This removes an IMPORT, not the rule it owns. */
/*
  ⚠⚠⚠ EVERY EDIT LINK NOW OPENS ONE SECTION (`P2-A2-E597` WS-C). ⚠ SUPERSEDED,
  quoted not deleted (`E164`) — all eight pointed into the REGISTRATION WIZARD,
  which is what Scott filed: *"it takes me back to the registration walk. This
  is wrong… not the right page, not the right menu."*
  //   Bio            /join/provider?step=finish
  //   Skills         /join/provider?step=skills&return=review
  //   Specializations /join/provider?step=specializations&return=review
  //   Certifications /join/provider?step=finish
  //   Education      /join/provider?step=education&return=review
  //   Work History   /join/provider?step=tell_us&return=review
  //   Solo Projects  /join/provider?step=tell_us&return=review
  //   Rates          /join/provider?step=finish
  ⚠⚠ `&return=review` RETURNED TO THE WIZARD'S REVIEW, NOT THE PROFILE — so it
  also re-broke `E131`/`E133`, whose whole subject was that an edit from the
  live profile comes back to the live profile.
  ⚠ `editHref` IS ONE SPELLING for all eight, so a slug cannot drift between a
  link and the route that answers it.
*/
import { editHref } from "@/lib/profile-sections";
import { SCORE_LINE_COPY } from "@/lib/profile-score-copy";
import { lineCounts } from "@/lib/completeness";
import {
  CompletionRing,
  completionHook,
} from "@/components/community/CompletionRing";
import type { ProviderProfileView } from "@/lib/provider-profile-view";
import type { TaughtPath, TakenPath } from "@/lib/learn-home";
import type { UsageStats } from "@/lib/usage-stats";
import type { Testimonial } from "@/lib/recommendations";
import type { CommunitySignal } from "@/lib/community-signal";
import type { ProfileScore } from "@/lib/completeness";
import type { MessagePermission } from "@/lib/messages";
import { CommunitySignalBlock } from "@/components/profile/CommunitySignal";
import {
  CertificationsBody,
  EducationBody,
  /* ⚠ ONE EDIT PATTERN (`E593` WS-B item 6) — `EditLink` lives beside
     `EditButton` in `sections.tsx` and shares its `EDIT_CLASS`, so the link and
     the button render identically. ⚠ It was dead code in `ProviderProfileView`
     until this brief; it was MOVED, not copied. */
  EditLink,
  OverviewBody,
  ProfileCard,
  /* ⚠ THE SAME CHIPS THE OWNER'S HERO USES (`P2-A3-E596` WS-G item 1) — reused,
     never re-implemented. */
  SkillsBody,
  SoloProjectsBody,
  SpecializationsBody,
  WorkHistoryBody,
} from "@/components/profile/sections";
import "./connect-profile.css";

/**
 * ── ⚠⚠ CONNECT HOME IS THE PROFILE (`P2-J3-E588` WS-A, OWNER MODE) ─────────
 *
 * ⚠⚠⚠ SCOTT, 2026-09-19: *"connect is now 'build your profile and connect to
 * other profiles'."* ⚠ `/community` stops being a landing page that links
 * elsewhere and becomes the provider's own profile, in three columns of cards.
 * ⚠ The band's top icons are APPLICATIONS; Connect is one, and this is its home.
 *
 * ── ⚠⚠ WHY THIS IS A NEW COMPONENT AND NOT A REWRITE OF `ProviderProfileView` ─
 *
 * ⚠ WS-A IS OWNER MODE ONLY. `ProviderProfileView` still serves
 * `/providers/[id]`, which is the BUYER-FACING page, and restructuring it now
 * would ship a half-built visitor mode at the WS-A gate.
 * ⚠⚠ SO THERE ARE TWO PROFILE COMPONENTS BETWEEN WS-A AND WS-B, ON PURPOSE.
 * **WS-B converges them** — it adds visitor mode here and repoints
 * `/providers/[id]`, after which `ProviderProfileView` is superseded and quoted
 * (`E164`), never deleted. ⚠ The acceptance criterion *"there is ONE profile
 * component"* is the BRIEF's end state, not WS-A's.
 *
 * ⚠ THE CARD BODIES ARE IMPORTED FROM `sections.tsx`, NOT REWRITTEN. That file
 * is the genuinely shared piece — the `E056` invariant `E562` WS-C relied on —
 * so the onboarding review and this page cannot drift about what a work-history
 * row looks like.
 *
 * ── ⚠⚠ ONE COMPLETENESS SUMMARY ON THE PAGE, NOT TWO ──────────────────────
 *
 * ⚠ The ring REPLACES `E562` WS-A's amber *"Worth adding to your profile"*
 * panel here — both state the same thing and would otherwise render on the same
 * screen. ⚠⚠ **`E562`'s STATUS STRIP IS A DIFFERENT FACT AND IS NOT REPLACED**:
 * the strip is the GATE in words (*"Photo, identity and the required details —
 * all met"*), the ring is the METER. That is `E582`'s own distinction, applied.
 */
/**
 * ── ⚠⚠ NO DIVIDER LINES INSIDE A CARD (`P2-J3-E593` WS-B item 4) ──────────
 *
 * ⚠ Scott, 2026-09-20, on the My Colleagues / Viewing Me card: remove the rule
 * between the rows — *"and others you will see next."*
 * ⚠⚠ SO IT WAS APPLIED TO ALL NINE, NOT JUST THE ONE HE POINTED AT. The card
 * border already groups the rows; a second rule inside it divides what the box
 * has already joined. ⚠ SUPERSEDED, quoted not deleted (`E164`): the rows
 * carried `border-t border-line-2` — as a conditional on `i > 0` in the four
 * list bodies, and inline in the identity, counts and selling cards.
 * ⚠ THE SPACING IS UNCHANGED — only the rule is gone; `py-2`, `mt-3` and `pt-3`
 * all stay, so nothing reflows.
 */
export function ConnectProfile({
  p,
  taughtPaths = [],
  takenPaths = [],
  usage = null,
  testimonials = [],
  community = null,
  score = null,
  colleagueCount,
  /* ⚠ `colleagueFaces` REMOVED (`P2-A2-E598` WS-C) — the hero carries the
     COUNT now and nothing renders the avatars. ⚠ SUPERSEDED, quoted not
     deleted (`E164`):
     //   colleagueFaces = [],
     ⚠⚠ THE CALLER STOPPED PASSING IT IN THE SAME COMMIT, so no dead prop is
     left being computed for nobody — `(app)/profile/page.tsx` no longer slices
     `mine.colleagues`. */
  profileViews = null,
  youBothKnow = null,
  messagePermission = null,
  connect,
}: {
  p: ProviderProfileView;
  taughtPaths?: TaughtPath[];
  /** ⚠ `LearnEnrollment` rows — paths TAKEN, not taught (`E593` WS-B 17). */
  takenPaths?: TakenPath[];
  /** ⚠ The six applications, counted. Owner-only — a visitor is passed none
   *  and the comb does not render (`E593`). */
  usage?: UsageStats | null;
  testimonials?: Testimonial[];
  /**
   * ⚠⚠ FORUM INVOLVEMENT — CARRIED OVER DELIBERATELY, NOT IN THE MOCKUP.
   *
   * ⚠ `/profile` supplied this to `ProviderProfileView` and `/profile` is now a
   * redirect, so without this prop the owner's profile would SILENTLY LOSE a
   * surface that existed yesterday. ⚠⚠ `check:community` GUARD 3 exists to
   * catch exactly that — *"both profile surfaces actually supply it, or the
   * block can never appear"* — and it caught it.
   *
   * ⚠ NULL RENDERS NOTHING, which is today's real answer for every profile on
   * the platform: `community-signal.ts` returns null with 0 threads and 0 posts
   * platform-wide. ⚠⚠ So this costs nothing visually and keeps the guarantee.
   * ⚠ **Reported at the WS-A gate — the brief's card list omits it, and whether
   * Scott wants it on the new page is his call, not a silent deletion.**
   */
  community?: CommunitySignal | null;
  /**
   * ⚠⚠ THE PER-LINE BREAKDOWN, for the completion card (`P2-J3-E590` WS-C).
   * ⚠ OPTIONAL AND OWNER-ONLY BY CONSTRUCTION: the card is inside the
   * `owner` branch, and `/providers/[id]` does not compute or pass it — a
   * visitor's payload never contains somebody else's score.
   * ⚠ `null` renders no card at all rather than a ring of zeroes.
   */
  score?: ProfileScore | null;
  /** ⚠ A REAL COUNT of accepted COLLEAGUE connections. The Counters decision is
   *  locked — *"count it and print it, seeded rows included."* The seeded graph
   *  is small, so the number is small. That is correct, not a bug. */
  colleagueCount: number;
  /**
   * ⚠⚠ OWNER ONLY — up to seven colleague faces for the row under the count
   * (`P2-A3-E596` WS-D). ⚠ The CARD is the summary; `/community/colleagues` is
   * the list. This never grows into a directory.
   * ⚠⚠⚠ NOT THE WEB. Scott asked whether the web belonged here and the answer
   * was no: repeated as a thumbnail in a rail it becomes a small tangle, sits
   * directly under the completion ring and competes with it near the top on a
   * phone. The web is Community's hero and stays there.
   */
  /* ⚠ SUPERSEDED, quoted not deleted (`E164`):
     //   colleagueFaces?: { personId: string; name: string; photoUrl: string | null }[]; */
  /**
   * ⚠⚠ OWNER ONLY — how many people have looked at this profile, one per viewer
   * per day, all time (`P0-E595` A2). ⚠ `null` on a visitor's view, where the
   * question is about somebody else's audience and is nobody's business.
   * ⚠⚠⚠ IT IS A REAL COUNT OF ROWS IN `profile_views`, NOT A WINDOW: the
   * `Counters` decision is locked — *"count it and print it"* — and a trailing
   * 30-day window is a product choice nobody has made.
   */
  profileViews?: number | null;
  /**
   * ⚠ VISITOR ONLY — accepted colleagues the viewer and this provider share.
   * A REAL QUERY (`mutualColleagueCount`), unlike `Viewing Me`, which has no
   * data at all. ⚠ `null` on the owner's own page, where the question is
   * meaningless.
   */
  youBothKnow?: number | null;
  /**
   * ⚠⚠ THE MESSAGE VERDICT, READ FROM `canMessage` — THE BUTTON READS THE RULE
   * AND DOES NOT RESTATE IT. ⚠ `canMessage` is BYTE-UNCHANGED by this brief.
   */
  messagePermission?: MessagePermission | null;
  /** ⚠ `ConnectControls`, resolved by the page that knows it is showing
   *  somebody else. Carried over unchanged from `/providers/[id]`. */
  connect?: ReactNode;
}) {
  /*
    ── ⚠⚠⚠ THE SINGLE `isOwner` POINT (`P2-J3-E588` WS-B) ────────────────────

    ⚠⚠ `p.isOwner` IS READ EXACTLY ONCE IN THIS COMPONENT, HERE. Everything
    owner-only downstream keys off `owner`, and everything visitor-only off
    `!owner`. ⚠ That is `E562` WS-A's discipline: one gate, so "is every owner
    affordance absent for a visitor" is answerable by reading one line instead
    of auditing thirty.
    ⚠ **A future edit that reaches for `p.isOwner` again has broken the
    guarantee.** Add to this block instead.
  */
  const owner = p.isOwner;

  /* ⚠ The groups this profile belongs to — see the card in the right rail.
     ⚠⚠ DERIVED FROM PROPS THIS COMPONENT ALREADY RECEIVES; no new read, and no
     group model is invented. A path taught AND taken is one group. */
  /*
    ⚠⚠ IT LISTS `LearningPath.group`, NOT `title`, AND THE CHOICE IS MEASURED.

    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   new Set([...taughtPaths, ...takenPaths].map((t) => t.title))

    ⚠⚠ BOTH READINGS OF *"the groups this profile belongs to"* ARE DEFENSIBLE:
    `E383` creates ONE FORUM PER LEARNING PATH, so a path IS a group and its
    TITLE is that group's name. ⚠⚠⚠ BUT THE TITLES MEASURE BADLY — the live
    catalogue holds paths called `1. Background`, `2. Overview` and
    `4. How to Login & Get Started`, so a card headed **Groups** rendered a list
    of numbered steps. ⚠ `group` holds the real names: `Procurement`, `Payroll`,
    `Finance & Accounting`, `Supply Chain Execution`.
    ⚠ SHORTER AND TRUER FOR A VISITOR SUMMARY, which is what this card is — not
    a directory. ⚠⚠ THE STEP-LIKE TITLES ARE A CATALOGUE DATA OBSERVATION, NOT
    A DEFECT HERE, and are reported at the gate rather than papered over.
    ⚠ Falls back to the title when a path carries no group — one live row has an
    empty string, and dropping it would silently under-report a membership.
  */
  const visitorGroups = Array.from(
    new Set(
      [...taughtPaths, ...takenPaths].map((t) => (t.group?.trim() ? t.group : t.title))
    )
  );

  const fullName = [p.person.firstName, p.person.lastName]
    .filter(Boolean)
    .join(" ");

  /* ⚠ A SOLO PROJECT IS ONE NO EMPLOYER CLAIMS. ⚠⚠ THE DERIVATION IS COPIED
     FROM `ProviderProfileView.tsx:156` DELIBERATELY, not re-invented — there is
     no `employerId` on the project view type, and the two surfaces must agree
     about which projects are solo. ⚠ WS-B converges these components; this is
     one of the things that converges. */
  /*
    ── ⚠⚠ THE RAIL'S DERIVED VALUES (`P2-A2-E598` WS-C) ──────────────────────

    ⚠⚠⚠ EVERY ONE OF THESE REUSES AN EXISTING COMPUTATION. The score card's two
    "next" lines and its `See all N` come from `score.lines` and
    `SCORE_LINE_COPY` — THE SAME TABLE `/community/score` renders — so the card
    and the page cannot quote different work or different minutes. A second
    table here would be `E585` in a new place.
  */
  /* ⚠ `unanswered` IS THE OPEN SET, and `lineCounts` is the one rule for it:
     a line answered *"I have none"* COUNTS and is not outstanding (`E590`). */
  const openLines = (score?.lines ?? [])
    .filter((l) => !lineCounts(l.state))
    /* ⚠ BIGGEST FIRST — the step worth most points is the one worth doing
       first, the same ordering the score page uses. */
    .sort((a, b) => b.points - a.points);
  const remainingLines = openLines.length;
  /* ⚠⚠ TWO, BECAUSE THE BRIEF SAYS TWO: *"the ring, the two next items with
     minutes, and 'See all N →'"*. The card is a prompt, not the list. */
  const nextLines = openLines.slice(0, 2).map((l) => ({
    key: l.key,
    /* ⚠ THE ACTION, NOT THE FIELD NAME — *"Add your education"* reads as a next
       step; *"Education"* reads as a heading. Same copy table as the page. */
    label: SCORE_LINE_COPY[l.key].action,
    minutes: SCORE_LINE_COPY[l.key].minutes,
  }));
  /*
    ⚠⚠ `All good` IS EVERY ACCOUNT-HEALTH FLAG, not a score. The full card that
    listed these four rows is gone (WS-C item 3) and `/account-health` remains
    the authority — this is its verdict in one line, computed from the SAME
    `p.accountHealth` the card read.
    ⚠ Deliberately NOT `lib/account-standing.ts`: that module answers for the
    ACCOUNT MENU off `status` + `email_verified`, while the view model's
    `accountHealth` carries two more facts (sign-in and message reachability).
    ⚠⚠⚠ REPORTED AT THE GATE RATHER THAN MERGED — making one serve both is a
    real tidy-up, but it would change what the menu claims, and that is a
    ruling, not a refactor.
  */
  const accountAllGood =
    p.accountHealth.canSignIn &&
    p.accountHealth.receivesMessages &&
    p.accountHealth.statusActive &&
    p.accountHealth.emailVerified;

  const soloProjects = p.projects.filter(
    (pr) => !p.employers.some((e) => (e.projects ?? []).some((n) => n.id === pr.id))
  );


  /*
    ── ⚠⚠ ONE SERVICE-PRODUCTS CARD, TWO POSITIONS AND TWO AFFORDANCES ───────

    ⚠ OWNER sees an inventory with prices and a link to manage them.
    ⚠ VISITOR sees the same rows priced WITH A BUY AFFORDANCE, moved up.

    ⚠⚠⚠ NO PURCHASE FLOW IS BUILT IN THIS BRIEF, AND THE BUTTON SAYS SO RATHER
    THAN PRETENDING. There is no checkout, no cart and no order for a `Package`
    — `WorkOrder` holds zero rows. ⚠ A `Buy` button that silently did nothing
    would be the worst kind of dead control: it looks like the product works.
  */
  const serviceProducts = (
    <ProfileCard title="Service Products">
      {p.packages.length === 0 ? (
        <p className="text-[13.5px] leading-relaxed text-ink-2">
          {owner ? (
            <>
              Nothing listed yet. A service product is what a buyer actually
              buys.{" "}
              <Link
                href="/my-services"
                className="font-bold text-magenta hover:underline"
              >
                Add a Service Product
              </Link>
            </>
          ) : (
            "This provider hasn't listed any service products yet."
          )}
        </p>
      ) : (
        <>
          {!owner && (
            <p className="-mt-1.5 mb-3 text-[13.5px] leading-relaxed text-ink-2">
              Fixed scope, fixed fee.
            </p>
          )}
          <div className="flex flex-col">
            {p.packages.map((pk) => (
              <div
                key={pk.id}
                className={
                  "flex items-center justify-between gap-3.5 py-3" +
                  ""
                }
              >
                <div className="min-w-0">
                  <span className="text-[14.5px] font-bold">{pk.title}</span>
                  {pk.summary && (
                    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
                      {pk.summary}
                    </p>
                  )}
                </div>
                <div className="shrink-0 whitespace-nowrap text-right">
                  {/* ⚠ `E433` — a price is a figure, so ink. */}
                  {pk.priceCents != null && (
                    <b className="text-[14px] tabular-nums text-ink">
                      {money(pk.priceCents, pk.currency)}
                    </b>
                  )}
                  {/* ⚠⚠ THE BUY AFFORDANCE IS DISABLED AND NAMED. Nobody buys
                      their own product, so it is visitor-only; and there is no
                      purchase flow yet, so it refuses rather than misleads. */}
                  {!owner && (
                    <button
                      type="button"
                      disabled
                      title="Buying isn't open yet"
                      className="mt-1.5 block cursor-not-allowed rounded-full bg-line px-4 py-1.5 text-[13px] font-bold text-ink-3"
                    >
                      Buy
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {!owner && (
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink-2">
              Buying isn&rsquo;t open yet. Connect as a colleague to talk to this
              provider about the work.
            </p>
          )}
        </>
      )}
    </ProfileCard>
  );

  return (
    <div className="pm-cp2">
      {/*
        ── ⚠⚠⚠ THE HERO: WHO THIS IS, AND WHAT THEY COST (`P2-A2-E598` WS-C) ──

        ⚠ Scott, on the option-B mockup: *"way too much on this page."* The
        mockup's own note says why this card exists: *"Identity and rates moved
        into one hero card across the top, so the first screen answers 'who is
        this, and what does he cost.'"*
        ⚠⚠ THREE COLUMNS BECAME TWO. Identity was a left-rail card and Rates was
        a second card beneath it; both are here now, side by side.
        ⚠ SUPERSEDED, quoted not deleted (`E164`) — identity as a rail card:
        //   <aside className="pm-cp-rail-l">
        //     <section className="overflow-hidden rounded-brand border border-line bg-white">
        //       <div className="h-[76px] bg-gradient-to-br …" />   // the cover
        //       …Avatar 64, name, headline, location…
        //     </section>
      */}
      <section className="pm-cp2-hero overflow-hidden rounded-brand border border-line bg-white">
        {/* ⚠ The cover is a brand gradient, not an uploaded image — there is no
            cover-image column on `ProviderProfile`, and inventing one is not
            this brief. */}
        <div className="h-[84px] bg-gradient-to-br from-ink via-[#4b2d63] to-magenta-dark" />
        <div className="pm-cp2-heroin px-[18px] pb-4">
          {/* ⚠⚠ THE PHOTO SITS **BESIDE** THE NAME, not above it — the mockup's
              `.idt` is a row. ⚠ Stacking them left a column of empty space to
              the left of the name at desktop width; caught on the screenshot. */}
          <div className="flex min-w-0 items-start gap-3.5">
            {/* ⚠ The white ring lifts the photo off the cover gradient. It is a
                WRAPPER because `Avatar` takes no `className` — widening its
                props for one caller is a change six surfaces share. */}
            <span className="-mt-[34px] inline-block flex-none overflow-hidden rounded-full ring-[3px] ring-white">
              <Avatar
                firstName={p.person.firstName ?? ""}
                lastName={p.person.lastName ?? ""}
                photoUrl={p.person.photoUrl}
                size={72}
              />
            </span>
            <div className="min-w-0 pt-1">
            <div className="flex items-center gap-1.5">
              {/*
                ⚠⚠ THE NAME IS AN `<h2>` FOR AN OWNER AND THE `<h1>` FOR A
                VISITOR. `(app)/profile/page.tsx` owns the owner's `<h1>` (`My
                Profile`, the WS-B crumb); a second one here would be two page
                titles. ⚠ On `/providers/[id]` there is no crumb, so the name IS
                the title. ⚠⚠⚠ MEASURED AT THE WS-B GATE — shipping both gave
                one page two `<h1>`s and the same words twice.
              */}
              {owner ? (
                <h2 className="font-display text-[22px] font-bold">{fullName}</h2>
              ) : (
                <h1 className="font-display text-[22px] font-bold">{fullName}</h1>
              )}
              {p.validated && (
                <span title="Validated by Panameer" className="text-magenta">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-label="Validated by Panameer" role="img">
                    <path d="M12 2l2.4 1.8 3-.3 1 2.8 2.6 1.5-.9 2.9.9 2.9-2.6 1.5-1 2.8-3-.3L12 22l-2.4-1.8-3 .3-1-2.8L3 16.2l.9-2.9L3 10.4l2.6-1.5 1-2.8 3 .3z" />
                    <path d="M10.6 15.2l-2.8-2.8 1.1-1.1 1.7 1.7 4-4 1.1 1.1z" fill="#fff" />
                  </svg>
                </span>
              )}
            </div>
            {p.headline && (
              <p className="mt-1 text-[14px] leading-snug text-ink-2">{p.headline}</p>
            )}
            {/*
              ── ⚠⚠⚠ ONE LINE REPLACES THE COLLEAGUE FACES ROW (WS-C item 3) ──

              ⚠ SCOTT: *"The colleague faces row (`E596` WS-D) is replaced by the
              count in the hero line. Say so at the gate."*
              ⚠ SUPERSEDED, quoted not deleted (`E164`) — seven avatars, stacked
              with negative margins, plus a `Viewing Me` row beneath them:
              //   {owner && colleagueFaces.length > 0 && (
              //     … colleagueFaces.map((c, i) => <Avatar … style={{ marginLeft: i === 0 ? 0 : -9 }} />)
              //   )}
              //   <span className="text-ink-2">Viewing Me</span>
              ⚠⚠ `colleagueFaces` IS STILL A PROP AND STILL PASSED. It is unused
              by this layout; the prop is kept so `(app)/profile/page.tsx` does
              not change shape in the same commit that changes the layout, and
              removing it is its own small job.
              ⚠⚠⚠ THE COUNTS ARE THE SAME TWO QUERIES AS BEFORE — `colleagueCount`
              (`mine.colleagues.length`) and `profileViews` (`countProfileViews`,
              one row per viewer per day, all time). ⚠ NOTHING NEW IS COMPUTED
              AND NOTHING IS ESTIMATED: the wording says *"profile views"* with
              no window, because the figure has none.
            */}
            <p className="mt-1.5 text-[12.5px] text-ink-3">
              {[
                p.location,
                colleagueCount > 0
                  ? `${colleagueCount} ${colleagueCount === 1 ? "colleague" : "colleagues"}`
                  : null,
                owner && (profileViews ?? 0) > 0
                  ? `${profileViews} profile ${profileViews === 1 ? "view" : "views"}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {owner && (
              <div className="mt-3 flex flex-wrap gap-2">
                {/*
                  ── ⚠⚠⚠ `Edit Profile` GOES TO THE SCORE PAGE, AND THAT IS A
                     CHOICE THE BRIEF DID NOT MAKE — FLAGGED AT THE GATE ───────

                  ⚠ There is NO global profile editor. `E597` WS-C built EIGHT
                  ONE-SECTION editors at `/profile/edit/<section>`, and each card
                  already carries its own `Edit` link to its own.
                  ⚠⚠ SO A BUTTON CALLED `Edit Profile` HAS NO OBVIOUS TARGET, and
                  pointing it at one arbitrary section (`/profile/edit/bio`) would
                  both mislead and break `check:profile-edit`, whose rule is that
                  a control's label names the section it opens.
                  ⚠⚠⚠ `/community/score` IS THE ONE PAGE THAT LISTS EVERY LINE
                  AND LINKS TO EACH EDITOR — it is the closest thing to "edit my
                  profile" that exists. ⚠ Scott rules whether the label should
                  say so; nothing was invented to fill the gap.
                */}
                <Link
                  href="/community/score"
                  className="rounded-full border border-line px-3.5 py-2 text-[13px] font-bold transition-colors hover:border-magenta/50"
                >
                  {/* ⚠ RENAMED BY SCOTT AT THE WS-C GATE, 2026-09-22: *"The
                      'Edit Profile' button becomes 'Complete Your Profile',
                      still pointing to /community/score."*
                      ⚠⚠ IT NAMES WHAT THE PAGE ACTUALLY DOES — lists every line
                      you have not answered, with a door to each editor — rather
                      than promising a global editor that does not exist.
                      ⚠ TITLE CASE WITH THE PRONOUN CAPITALISED (`E568`) —
                      `Your` is a pronoun, the half of that rule most often
                      missed.
                      ⚠ SUPERSEDED, quoted not deleted (`E164`):
                      //   Edit Profile */}
                  Complete Your Profile
                </Link>
                {/* ⚠ YOUR OWN PUBLIC PAGE. `/providers/[id]` renders THIS
                    component in visitor mode, so the button is a real preview
                    rather than a mock of one. */}
                <Link
                  href={`/providers/${p.id}`}
                  className="rounded-full border border-line px-3.5 py-2 text-[13px] font-bold transition-colors hover:border-magenta/50"
                >
                  See What Buyers See
                </Link>
              </div>
            )}
            </div>
          </div>

          {/*
            ── ⚠⚠ RATES, IN THE HERO (WS-C item 1) ──────────────────────────

            ⚠⚠⚠ RENDERED FOR BOTH PERSONAS AND THAT IS THE ONE THING NOT TO GET
            WRONG. `/providers/[id]` renders this component in visitor mode, so
            putting the block inside the `owner` branch would SILENTLY REMOVE
            RATES FROM THE BUYER'S PAGE — the rule is the VIEW MODEL's
            (`isOwner || hasCapability(viewer, "canHireTalent")`), and `p.rates`
            is already `null` for anyone who may not see it.
            ⚠ THE WHOLE BLOCK IS GATED, NOT JUST ITS BODY: an empty box headed
            `Rates` tells a visitor a rate exists and is being withheld.
          */}
          {p.rates && (
            <div className="pm-cp2-rates">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-display text-[11px] font-bold uppercase tracking-[0.1em] text-ink-3">
                  Rates
                </p>
                {owner && <EditLink href={editHref("rates")} title="Rates" />}
              </div>
              <div className="mt-2">
                <RateRows p={p} />
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="pm-cp2-body">
        {/* ═══════════ MAIN ═══════════ */}
        <main className="pm-cp2-main">
          <ProfileCard
            id="bio"
            title="About"
            edit={owner ? <EditLink href={editHref("bio")} title="Bio" /> : undefined}
          >
            <OverviewBody
              overview={p.overview}
              empty="Nothing here yet. A short bio is the first thing a buyer reads."
            />
          </ProfileCard>

          {/* ⚠ THE VISITOR'S BUYING SURFACE, HIGH UP — a buyer is here to buy. */}
          {!owner && serviceProducts}

          {/*
            ── ⚠⚠ SKILLS AND SPECIALIZATIONS ARE ONE CARD (WS-C item 2) ──────

            ⚠ The mockup's note: *"Skills and Specializations are one card."*
            They are the same question asked at two grains, and two headings for
            it cost a card's worth of height each.
            ⚠⚠ BOTH KEEP THEIR OWN `Edit` LINK AND THEIR OWN ANCHOR `id` —
            `E597`'s editors are per-section and the profile is scrolled back to
            `#specializations` after saving one. ⚠⚠⚠ MERGING THE CARDS MUST NOT
            MERGE THE EDITORS: that would be the second save path `E595` exists
            to prevent.
            ⚠ SUPERSEDED, quoted not deleted (`E164`) — two cards, in two rows:
            //   {p.skills.length > 0 && (<div className="pm-cp-two"><ProfileCard id="skills" …/></div>)}
            //   <div className="pm-cp-three"><ProfileCard id="specializations" …/> … </div>
            ⚠⚠ THE CARD RENDERS EVEN WITH NO SKILLS NOW, because Specializations
            lives inside it and an owner needs the door. The old `skills.length
            > 0` guard existed so a heading never sat over a blank box; that is
            preserved by the inner `SkillsBody` being conditional instead.
          */}
          <ProfileCard
            id="skills"
            title="Skills"
            edit={owner ? <EditLink href={editHref("skills")} title="Skills" /> : undefined}
          >
            {p.skills.length > 0 ? (
              groupSkillsByPillar(p.skills).map((g) => (
                <div key={g.pillar ?? "__none"} className="mb-3 last:mb-0">
                  {/* ⚠ THE HEADING IS THE PILLAR'S NAME VERBATIM — catalog data
                      is never re-cased (`E568`). ⚠ A skill whose pillar is null
                      gets one honest heading rather than an invented domain. */}
                  <p className="mb-1.5 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-ink-3">
                    {g.pillar ?? "Other"}
                  </p>
                  <SkillsBody skills={g.skills} />
                </div>
              ))
            ) : (
              <p className="text-[13.5px] text-ink-2">
                No skills listed yet.{" "}
                {owner && (
                  <Link href={editHref("skills")} className="font-bold text-magenta hover:underline">
                    Add your skills
                  </Link>
                )}
              </p>
            )}
            {/* ⚠ SPECIALIZATIONS, INSIDE THE SAME CARD, WITH ITS OWN ANCHOR AND
                ITS OWN EDITOR. The divider is what keeps them legible as two
                facts rather than one list. */}
            <div id="specializations" className="mt-4 border-t border-line pt-3.5">
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <p className="font-display text-[11px] font-bold uppercase tracking-[0.1em] text-ink-3">
                  Specializations
                </p>
                {owner && (
                  <EditLink href={editHref("specializations")} title="Specializations" />
                )}
              </div>
              <SpecializationsBody specializations={p.specializations} />
            </div>
          </ProfileCard>

          {/*
            ── ⚠⚠ EXPERIENCE: WORK HISTORY AND SOLO PROJECTS IN ONE CARD ─────

            ⚠ The mockup: *"Work History and Solo Projects are one Experience
            card."* ⚠⚠ BOTH KEEP THEIR ANCHOR AND THEIR EDITOR, for the same
            reason Specializations does — `E597` routes `/profile/edit/work-history`
            and `/profile/edit/solo-projects` to the SAME shared editor through
            two slugs, precisely so each card can return to its own place.
            ⚠ SUPERSEDED, quoted not deleted (`E164`) — two full-width cards:
            //   <ProfileCard id="work-history" title="Work History" …>…</ProfileCard>
            //   <ProfileCard id="solo-projects" title="Solo Projects" …>…</ProfileCard>
          */}
          <ProfileCard
            id="work-history"
            title="Experience"
            edit={owner ? <EditLink href={editHref("work-history")} title="Work History" /> : undefined}
          >
            <WorkHistoryBody
              employers={p.employers}
              projects={p.projects}
              isOwner={owner}
              empty="No work history yet."
            />
            <div id="solo-projects" className="mt-4 border-t border-line pt-3.5">
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <p className="font-display text-[11px] font-bold uppercase tracking-[0.1em] text-ink-3">
                  Solo Projects
                </p>
                {owner && (
                  <EditLink href={editHref("solo-projects")} title="Solo Projects" />
                )}
              </div>
              <SoloProjectsBody
                projects={soloProjects}
                isOwner={owner}
                empty="No solo projects yet. Employee projects sit under their employer."
              />
            </div>
          </ProfileCard>

          {/*
            ── ⚠⚠ ONE ROW SHARES CERTIFICATIONS, EDUCATION AND SERVICE PRODUCTS

            ⚠ The mockup: *"Certifications, Education and Service Products share
            one row."* ⚠⚠ `serviceProducts` FOR AN OWNER ONLY — the visitor gets
            it high up, above the record, because a buyer is here to buy.
            ⚠⚠⚠ EMPTY STATES ARE DOORS (`E593` item 16), and `Grow Your Income
            Faster`'s two links land HERE, in the Service Products empty state,
            exactly as the mockup's note says.
          */}
          <div className="pm-cp-three">
            <ProfileCard
              id="certifications"
              title="Certifications"
              edit={owner ? <EditLink href={editHref("certifications")} title="Certifications" /> : undefined}
            >
              {/*
                ⚠ Owner-only action: a visitor cannot act on it, and *"Earn One
                in Learn"* on somebody else's profile aims an instruction at the
                wrong person. ⚠⚠ IT SAYS WHERE TO GET ONE, NOT WHAT IS MISSING —
                `/community/score` owns the second sentence.
              */}
              <CertificationsBody
                certifications={p.certifications}
                empty="No certifications yet."
                emptyAction={
                  owner ? (
                    <Link
                      href="/learn"
                      className="mt-2 inline-block text-[13.5px] font-bold text-magenta hover:underline"
                    >
                      Earn One in Learn
                    </Link>
                  ) : undefined
                }
              />
            </ProfileCard>
            <ProfileCard
              id="education"
              title="Education"
              edit={owner ? <EditLink href={editHref("education")} title="Education" /> : undefined}
            >
              <EducationBody
                education={p.education}
                emptyAction={
                  owner ? (
                    <Link
                      href="/learn"
                      className="mt-2 inline-block text-[13.5px] font-bold text-magenta hover:underline"
                    >
                      Browse Learning Paths
                    </Link>
                  ) : undefined
                }
              />
            </ProfileCard>
            {owner && serviceProducts}
          </div>

          <ProfileCard title="Learning Paths">
            {taughtPaths.length === 0 && takenPaths.length === 0 ? (
              <p className="text-[13.5px] leading-relaxed text-ink-2">
                {owner
                  ? "You aren\u2019t teaching or taking any learning paths yet."
                  : "No learning paths yet."}
              </p>
            ) : (
              <div className="flex flex-col gap-3.5">
                {taughtPaths.length > 0 && (
                  <div>
                    <p className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.07em] text-ink-3">
                      {owner ? "You Teach" : "Teaches"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {taughtPaths.map((t) => (
                        <Link
                          key={t.slug}
                          href={`/learn/${t.slug}`}
                          className="rounded-full border border-magenta/25 bg-magenta/[0.06] px-3.5 py-1.5 text-[13px] font-bold text-magenta-dark hover:underline"
                        >
                          {t.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {takenPaths.length > 0 && (
                  <div>
                    <p className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.07em] text-ink-3">
                      {owner ? "You&rsquo;re Taking" : "Taking"}
                    </p>
                    {/* ⚠ INK, NOT MAGENTA — `E433`. These are still links, so
                        they keep the underline on hover, but a taken path is
                        not an offer and must not read as one beside the set
                        this person actually teaches. */}
                    <div className="flex flex-wrap gap-2">
                      {takenPaths.map((t) => (
                        <Link
                          key={t.slug}
                          href={`/learn/${t.slug}`}
                          className="rounded-full border border-line bg-white px-3.5 py-1.5 text-[13px] font-bold text-ink-2 hover:underline"
                        >
                          {t.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ProfileCard>

          <ProfileCard title="Recommendations">
            {testimonials.length === 0 ? (
              <p className="text-[13.5px] leading-relaxed text-ink-2">
                {owner ? (
                  <>
                    No recommendations yet.{" "}
                    {/* ⚠ OWNER-ONLY — a visitor cannot request recommendations
                        on somebody else's behalf. */}
                    <Link
                      href="/recommendations"
                      className="font-bold text-magenta hover:underline"
                    >
                      Request a Recommendation
                    </Link>
                  </>
                ) : (
                  "No recommendations yet."
                )}
              </p>
            ) : (
              <div className="flex flex-col">
                {testimonials.map((t) => (
                  <div
                    key={t.id}
                    className={
                      "flex items-start gap-3 py-3" +
                      ""
                    }
                  >
                    <Avatar
                      firstName={t.author.split(" ")[0] ?? ""}
                      lastName={t.author.split(" ").slice(1).join(" ")}
                      photoUrl={null}
                      size={40}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[14.5px] font-bold">{t.author}</span>
                      {(t.title || t.company) && (
                        <p className="text-[12.5px] text-ink-2">
                          {[t.title, t.company].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {t.body && (
                        <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">
                          {t.body}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ProfileCard>

          {/*
            ⚠⚠ FORUM INVOLVEMENT — "groups", in the brief's words. Renders
            NOTHING when the signal is null, which is every profile today.
            ⚠⚠⚠ RESTORED AT THE WS-C GATE AFTER THE REDESIGN DROPPED IT. It was
            not removed on purpose: the whole left rail went, and this went with
            it. ⚠ LINT IS WHAT CAUGHT IT — `CommunitySignalBlock` and `community`
            both went unused, +6 warnings against a freshly measured baseline,
            and two of the six were real losses rather than dead code.
            ⚠ WS-D requires it: *"The visitor still sees skills, experience,
            colleague count and groups (`E593` item 13)."* And `check:community`
            GUARD 3 asserts this page supplies the signal.
          */}
          <CommunitySignalBlock
            signal={community}
            firstName={p.person.firstName ?? ""}
            isOwner={owner}
          />
        </main>

        {/* ═══════════ RAIL ═══════════ */}
        <aside className="pm-cp2-rail">
          {owner ? (
            <>
              {/*
                ⚠⚠⚠ THE COMPLETION RING IS OWNER-ONLY AND THAT IS A JUDGEMENT,
                NOT A LAYOUT CHOICE: **never show a stranger how incomplete
                someone is.**
                ⚠ THE WHOLE CARD IS A LINK (`E590` WS-C) — a real anchor, never
                an `onClick` on a div.
                ⚠⚠ WS-C ADDS THE TWO NEXT LINES WITH THEIR MINUTES, and the
                mockup's *"See all N →"*. The lines come from `score.lines`,
                which `/community/score` renders in full — ⚠⚠⚠ ONE COMPUTATION,
                TWO RENDERINGS, so the card and the page cannot disagree.
              */}
              {score && (
                <Link
                  href="/community/score"
                  className="group block rounded-brand border border-line bg-white px-[18px] py-4 transition-colors hover:border-magenta/40"
                >
                  <CompletionRing score={score} />
                  <p className="mt-2 text-center text-[12.5px] font-bold text-ink-2">
                    Complete Profiles Sell Services
                  </p>
                  {/* ⚠⚠ COMPUTED, NOT HARD-CODED, and it says something else at
                      100% rather than printing "0 lines left". */}
                  <p className="mt-1.5 text-center text-[12px] leading-snug text-ink-3">
                    {completionHook(score)}
                  </p>
                  {nextLines.length > 0 && (
                    <ul className="mt-3 border-t border-line pt-2.5">
                      {nextLines.map((l) => (
                        <li
                          key={l.key}
                          className="flex items-center justify-between gap-2 py-1 text-[12.5px]"
                        >
                          <span className="min-w-0 truncate text-ink-2">{l.label}</span>
                          {/* ⚠ `E433` — a figure is INK, never magenta. */}
                          <span className="flex-none font-semibold tabular-nums text-ink-3">
                            {l.minutes} min
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {/* ⚠ `E433` — the one magenta thing in the card is the
                      affordance that says it is a link. */}
                  <p className="mt-2 text-center text-[12.5px] font-bold text-magenta group-hover:underline">
                    {remainingLines > 0 ? `See all ${remainingLines} \u2192` : "See your score"}
                  </p>
                </Link>
              )}

              {/*
                ── ⚠⚠ `Grow`: THREE CARDS BECAME THREE ROWS (WS-C item 2) ──────

                ⚠ The mockup's note: *"Invite, Recommendation and Mentor are
                rows in one Grow card."* ⚠ SUPERSEDED, quoted not deleted
                (`E164`) — three separate `ActionCard`s, each its own box:
                //   <ActionCard title="Invite a Colleague" label="Invite Colleague to Register" href="/invite-colleague" />
                //   <ActionCard title="Request Recommendation" label="Request a Recommendation" href="/recommendations" />
                //   <ActionCard title="Request a Mentor" label="Request a Mentor" href="/community/mentors" />
                ⚠⚠ EVERY DESTINATION IS UNCHANGED. This is three boxes becoming
                three rows, not three links becoming something else.
                ⚠⚠⚠ `Request a Recommendation` ARRIVES HERE AND LEAVES THE
                ACCOUNT MENU IN THE SAME CHANGE (`E598` WS-A kept it there until
                this card existed), so the page never has two doors to it and
                never has none.
              */}
              <section className="rounded-brand border border-line bg-white px-[18px] py-4">
                <h2 className="mb-2 font-display text-[15px] font-bold">Grow</h2>
                <div className="flex flex-col">
                  {[
                    { label: "Invite a Colleague", href: "/invite-colleague", hint: "Join = 50 points" },
                    { label: "Request a Recommendation", href: "/recommendations", hint: null },
                    { label: "Request a Mentor", href: "/community/mentors", hint: null },
                  ].map((a) => (
                    <Link
                      key={a.href}
                      href={a.href}
                      className="-mx-2 flex items-center justify-between gap-2 rounded-[10px] px-2 py-2 transition-colors hover:bg-black/[0.03]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] font-semibold">
                          {a.label}
                        </span>
                        {a.hint && (
                          <span className="block text-[12px] text-ink-3">{a.hint}</span>
                        )}
                      </span>
                      <span aria-hidden className="flex-none text-ink-3">
                        &rsaquo;
                      </span>
                    </Link>
                  ))}
                </div>
              </section>

              {/*
                ── ⚠⚠ ONE CARD OF ONE-LINERS (WS-C item 2) ────────────────────

                ⚠ The mockup's note: *"Network, Usage Stats and Account Health
                are one line each with a link, because each already has its own
                page."*
                ⚠ SUPERSEDED, quoted not deleted (`E164`) — the full Account
                Health card, four ticked rows deep:
                //   <ProfileCard title="Account Health" edit={<EditLink href="/account-health" … label="Manage" />}>
                //     {[{ label: "Sign in and manage your profile", ok: … }, … ].map(…)}
                //   </ProfileCard>
                ⚠⚠ THE PAGE REMAINS THE AUTHORITY and always did — that card
                already carried *"no score, no count and no verdict of its own"*.
                This keeps the verdict and drops the four rows, which is what the
                card was already saying it was for.
                ⚠⚠⚠ `Network` IS SPECIFIED AND IS **NOT** HERE. Scott, 2026-09-22:
                *"The Network one-liner has no destination yet, so leave it out
                rather than linking nowhere."* ⚠ MEASURED AT `E598` WS-A: `/grow`
                and `/community/grow` both 404 and the string `Grow Your Network`
                appears nowhere in `src/`.
                ⚠ THE `Usage Stats` COMB AND THE `Grow Your Network` MINI-WEB ARE
                GONE FROM THE PAGE (WS-C item 3) — `/stats` is where they live.
              */}
              <section className="rounded-brand border border-line bg-white px-[18px] py-4">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between gap-2 py-1.5 text-[13px]">
                    <span className="min-w-0 truncate">
                      <b className="font-bold">Usage</b>
                      <span className="text-ink-2">
                        {" \u00b7 "}
                        {/* ⚠ `usage.learn`, NOT a `lessons` field — `UsageStats`
                            counts the SIX APPLICATIONS (`connect · learn · work
                            · sell · orders` + `earnedCents`). The mockup's line
                            said "16 lessons"; the figure that exists is the
                            Learn count, so that is what is printed. */}
                        {usage?.learn ?? 0} {(usage?.learn ?? 0) === 1 ? "lesson" : "lessons"}
                      </span>
                    </span>
                    <Link
                      href="/stats"
                      className="flex-none text-[12.5px] font-bold text-magenta hover:underline"
                    >
                      Stats &rarr;
                    </Link>
                  </div>
                  <div className="flex items-center justify-between gap-2 py-1.5 text-[13px]">
                    <span className="min-w-0 truncate">
                      <b className="font-bold">Account</b>
                      <span className="text-ink-2">{" \u00b7 "}</span>
                      {/* ⚠ `E433` does not apply — this is a STATE, not a figure.
                          ⚠⚠ Green for good, ink for a problem, never red: a
                          pending verification is a to-do, not an alarm. */}
                      <span
                        className={
                          accountAllGood ? "font-semibold text-emerald-600" : "font-semibold text-ink-2"
                        }
                      >
                        {accountAllGood ? "\u2713 All good" : "Needs attention"}
                      </span>
                    </span>
                    <Link
                      href="/account-health"
                      className="flex-none text-[12.5px] font-bold text-magenta hover:underline"
                    >
                      Manage &rarr;
                    </Link>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <>
              {/*
                ── ⚠⚠ `You Both Know` — MUTUAL COLLEAGUES (visitor only) ───────

                ⚠⚠⚠ RESTORED AT THE WS-C GATE. It lived in the left rail's
                colleague card, which the redesign removed whole; `youBothKnow`
                went unused and lint reported it.
                ⚠ A REAL QUERY (`mutualColleagueCount`) — accepted colleague
                edges on BOTH sides — unlike `Viewing Me`, which is the owner's.
                ⚠⚠ `null` ON THE OWNER'S OWN PAGE, where the question is
                meaningless, which is why it sits in the visitor branch.
                ⚠ The hero already carries the profile's own colleague COUNT for
                both personas; this is the overlap with the VIEWER, a different
                fact.
              */}
              <section className="rounded-brand border border-line bg-white px-[18px] py-4">
                <div className="flex items-center justify-between gap-2.5 text-[13.5px]">
                  <span className="text-ink-2">You Both Know</span>
                  {/* ⚠ `E433` — a figure is INK. */}
                  <b className="text-ink">{youBothKnow ?? 0}</b>
                </div>
              </section>
            {/*
              ── ⚠⚠ THE TRUST CARD. FACTS THE RECORD HOLDS, NOTHING DERIVED. ──
              ⚠ Every row renders only when its value exists. A missing rate is
              absent, never `$0`; a missing language is absent, never "English"
              as a default — that would be a fact about a person nobody stated.
            */}
            <section className="rounded-brand border border-line bg-white px-[18px] py-4">
              {p.validated ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-magenta">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" role="img" aria-label="Validated by Panameer">
                        <path d="M12 2l2.4 1.8 3-.3 1 2.8 2.6 1.5-.9 2.9.9 2.9-2.6 1.5-1 2.8-3-.3L12 22l-2.4-1.8-3 .3-1-2.8L3 16.2l.9-2.9L3 10.4l2.6-1.5 1-2.8 3 .3z" />
                        <path d="M10.6 15.2l-2.8-2.8 1.1-1.1 1.7 1.7 4-4 1.1 1.1z" fill="#fff" />
                      </svg>
                    </span>
                    <b className="text-[14px]">Validated by Panameer</b>
                  </div>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">
                    Panameer has confirmed this provider&rsquo;s identity and
                    work history.
                  </p>
                </>
              ) : (
                /* ⚠⚠ NOT VALIDATED SAYS NOTHING BAD. `validation_status` is
                   granted on merit and most providers have never requested it
                   — 13 of 111 are validated. An "unvalidated" badge would read
                   as a mark against 98 people for a process they were never
                   offered (the door only shipped in `E563`). So the card simply
                   leads with the facts instead. */
                <b className="text-[14px]">About this provider</b>
              )}

              <TrustRow label="Experience" value={p.experience} />
              <TrustRow label="Rate" value={rateRange(p)} />
              <TrustRow
                label={p.languages.length > 1 ? "Languages" : "Language"}
                value={
                  p.languages.length > 0
                    ? p.languages.map((l) => l.name).join(", ")
                    : null
                }
              />
            </section>

            {/*
              ⚠ `Connect as a Colleague` IS `ConnectControls`, PASSED IN. It
              already knows the four relation states (none / pending / accepted
              / mentor) and posts through the same rules the server re-checks.
              ⚠⚠ REBUILDING IT HERE WOULD BE A SECOND COPY OF THE CONNECT RULE.
            */}
            {/*
              ── ⚠⚠ THE GROUPS THIS PROFILE BELONGS TO (`E593` WS-C item 13) ──

              ⚠ Scott's *"360"*: a visitor should see which groups this person
              is in. ⚠⚠ `E593` WS-A NAMED THE FORUMS SURFACE `Groups`, and
              `E383` creates ONE FORUM PER LEARNING PATH with the path — so the
              groups somebody belongs to ARE the paths they teach or take.
              ⚠⚠⚠ SO THIS INVENTS NOTHING AND ADDS NO QUERY: both lists are
              already props on this component, for the Learning Paths card.
              **A group model does not exist and is not being modelled here.**

              ⚠ DEDUPED — a path can be both taught and taken, and it is still
              one group. ⚠ Capped at six, with the rest counted rather than
              listed: a visitor card is a summary, and the row is not a
              directory.
              ⚠⚠ IT LINKS TO `/community/forums`, THE SURFACE — not to a
              specific board, because board access is gated on enrolment or
              teaching (`canAccessPathForum`) and this viewer may have neither.
              **A link that 403s is a dead door with a nicer sign.**
            */}
            {visitorGroups.length > 0 && (
              <section className="rounded-brand border border-line bg-white px-[18px] py-4">
                <h3 className="mb-2.5 font-display text-[14.5px] font-bold leading-tight">
                  Groups
                </h3>
                <div className="flex flex-wrap gap-2">
                  {visitorGroups.slice(0, 6).map((g) => (
                    <span
                      key={g}
                      className="rounded-full border border-line bg-white px-3 py-1 text-[12.5px] text-ink-2"
                    >
                      {g}
                    </span>
                  ))}
                </div>
                {visitorGroups.length > 6 && (
                  <p className="mt-2 text-[12px] text-ink-3">
                    +{visitorGroups.length - 6} more
                  </p>
                )}
                <Link
                  href="/community/forums"
                  className="mt-2.5 inline-block text-[13px] font-bold text-magenta hover:underline"
                >
                  Browse Groups
                </Link>
              </section>
            )}

            {connect && (
              <section className="rounded-brand border border-line bg-white px-[18px] py-4">
                <h3 className="mb-2.5 font-display text-[14.5px] font-bold leading-tight">
                  Connect as a Colleague
                </h3>
                {connect}
                <p className="mt-2.5 text-[12px] leading-relaxed text-ink-2">
                  Colleagues can message each other.
                </p>
              </section>
            )}

            {/* ⚠ ONLY WHEN THE PROVIDER SAID SO. `open_for_mentoring` is the
                provider's own statement; absent it, the card does not render. */}
            {p.openForMentoring && (
              <ActionCard
                title="Request Mentoring"
                label="Request Mentoring"
                href="/community/mentors"
                note="Open to mentoring."
              />
            )}

            {/*
              ── ⚠⚠⚠ `Message` READS THE RULE, IT DOES NOT RESTATE IT ─────────
              ⚠ The verdict comes from `canMessage`, which is BYTE-UNCHANGED by
              this brief. The button is disabled exactly when the lib says no,
              and the caption is THE LIB'S OWN STRING.
              ⚠⚠ THE MOCKUP'S SINGLE SENTENCE — *"Available once you are
              colleagues."* — WOULD BE WRONG IN THREE OF THE FIVE DENIAL STATES:
              a pending request, a member who turned messages off, and someone
              with no account are all different answers, and telling all three
              "become colleagues" sends people to do something that will not
              help. ⚠ **Reported at the WS-B gate.**
            */}
            <section className="rounded-brand border border-line bg-white px-[18px] py-4 text-center">
              <h3 className="mb-2.5 font-display text-[14.5px] font-bold leading-tight">
                Message
              </h3>
              {messagePermission?.ok ? (
                <Link
                  href={`/messages?with=${p.person.userId ?? ""}`}
                  className="block w-full rounded-full bg-magenta px-3.5 py-2.5 text-[13.5px] font-bold leading-tight text-white transition-colors hover:bg-magenta-dark"
                >
                  Message
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    disabled
                    className="block w-full cursor-not-allowed rounded-full bg-line px-3.5 py-2.5 text-[13.5px] font-bold leading-tight text-ink-3"
                  >
                    Message
                  </button>
                  {messagePermission && !messagePermission.ok && (
                    <p className="mt-2.5 text-[12px] leading-relaxed text-ink-2">
                      {messagePermission.message}
                    </p>
                  )}
                </>
              )}
            </section>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}


/**
 * ── ⚠⚠ THE USAGE COMB — SIX APPLICATIONS, SIX FIGURES (`P2-J3-E593`) ──────
 *
 * ⚠ Scott, 2026-09-20: *"six cells, ink, Get Paid the only magenta one, $0
 * earned footer and See your stats →"*, and — ⚠⚠ THE PART THAT SHAPES IT —
 * *"Add a one-word label under each figure. Six unlabelled numbers can't be
 * read — you can't tell which application owns which."*
 *
 * ⚠⚠⚠ THE SIX ARE THE SIX APPLICATIONS IN THE BAND, IN BAND ORDER. That is
 * what makes the labels readable at one word: the reader has already seen
 * `Connect · Learn · Work · Sell · Orders · Get Paid` across the top of every
 * page, so the comb is the same row of names with this member's numbers under
 * them. ⚠ A different order, or different words, would make six one-word labels
 * a puzzle rather than a key.
 *
 * ── ⚠⚠ INK, AND ONE DELIBERATE EXCEPTION ──────────────────────────────────
 *
 * ⚠ `E433` — MAGENTA MARKS INTERACTIVE THINGS; counts and figures stay ink. All
 * six are figures, so all six are ink. ⚠⚠ `Get Paid` IS MAGENTA ON SCOTT'S
 * EXPLICIT RULING, twice: *"focus on the pay and make it look like they are
 * making money"*, and the WS-B ruling that `Pay` is *"visually dominant by
 * DESIGN WEIGHT: size, position, colour and label."*
 * ⚠⚠⚠ RULE 13 — the newest dated statement is the live one, and this is a
 * DELIBERATE EXCEPTION rather than a drift. **It is recorded here so the next
 * reader does not "fix" it back to ink**, and so the exception cannot spread:
 * it applies to this one cell, for the reason Scott gave, and nowhere else.
 */
// ── ⚠⚠⚠ THE USAGE COMB IS GONE FROM THE PROFILE (`P2-A2-E598` WS-C item 3) ──
// 
// ⚠ Scott's brief: *"Removed from the profile: … The Usage Stats comb."* It is
// one line in the rail now — *"Usage · N lessons · Stats →"* — because `/stats`
// already owns the surface.
// ⚠⚠ QUOTED, NOT DELETED (`E164`). The component is preserved in full below; it
// is commented out rather than left live because an unused export is a lint
// warning against a freshly measured baseline, and the rule is 0 NEW.
// ⚠ `getUsageStats` IS UNTOUCHED and still feeds the one-liner.
// 
  // function UsageComb({ usage }: { usage: UsageStats }) {
  //   /* ⚠ BAND ORDER, and the labels are the band's own words. */
  //   const cells: { label: string; value: string; pay?: boolean }[] = [
  //     { label: "Connect", value: String(usage.connect) },
  //     { label: "Learn", value: String(usage.learn) },
  //     { label: "Work", value: String(usage.work) },
  //     { label: "Sell", value: String(usage.sell) },
  //     { label: "Orders", value: String(usage.orders) },
  //     {
  //       label: "Get Paid",
  //       /*
  //         ⚠⚠⚠ THE DASH CONVENTION WHEN IT IS NOT MEASURABLE, exactly as
  //         `Viewing Me` does. `earnedCents` is `null` the moment a work order
  //         exists, because earnings are not modelled and a number would then be a
  //         guess. ⚠ Until then `$0` is not a placeholder — it is entailed by having
  //         zero orders. See `lib/usage-stats.ts`.
  //       */
  //       value: usage.earnedCents === null ? "—" : money(usage.earnedCents, "USD"),
  //       pay: true,
  //     },
  //   ];
  //
  //   return (
  //     <section className="rounded-brand border border-line bg-white px-[18px] py-4">
  //       <p className="mb-3 text-[11.5px] font-bold uppercase tracking-[0.07em] text-ink-3">
  //         Usage Stats
  //       </p>
  //       <div className="grid grid-cols-3 gap-y-3">
  //         {cells.map((c) => (
  //           <div key={c.label} className="text-center">
  //             <p
  //               className={
  //                 "font-display text-[19px] font-bold leading-none tabular-nums " +
  //                 (c.pay ? "text-magenta" : "text-ink")
  //               }
  //             >
  //               {c.value}
  //             </p>
  //             {/* ⚠ SMALL ON PURPOSE — Scott: *"Keep it small; the full Stats page
  //                 carries the detail."* The label names the application, it does
  //                 not explain the figure. */}
  //             <p className="mt-1 text-[10.5px] leading-tight text-ink-3">{c.label}</p>
  //           </div>
  //         ))}
  //       </div>
  //
  //       {/* ⚠⚠ THE LINE NAMES WHAT WOULD FILL IT (Scott's WS-B stats ruling), so a
  //           row of zeroes reads as a beginning rather than a failure. ⚠ NO
  //           projected, estimated, potential or example figure — anywhere. */}
  //       <p className="mt-3.5 text-[12px] leading-relaxed text-ink-2">
  //         This is where your earnings land.
  //       </p>
  //       <Link
  //         href="/stats"
  //         className="mt-1 inline-block text-[13px] font-bold text-magenta hover:underline"
  //       >
  //         See your stats &rarr;
  //       </Link>
  //     </section>
  //   );
  // }

/**
 * ⚠⚠ GROUPED BY THE CATALOG'S OWN DOMAIN LEVEL (`P2-A3-E596` WS-G item 1).
 *
 * ⚠ ORDER IS FIRST-APPEARANCE, which is the view model's order, which is
 * `shownSkills`' order — so the grouping re-arranges nothing and adds no second
 * ranking rule. ⚠⚠ THE NULL PILLAR SORTS LAST because "Other" is a remainder,
 * not a domain.
 */
function groupSkillsByPillar(
  skills: { id: string; name: string; pillar: string | null }[]
): { pillar: string | null; skills: { id: string; name: string }[] }[] {
  const groups = new Map<string, { pillar: string | null; skills: { id: string; name: string }[] }>();
  for (const s of skills) {
    const key = s.pillar ?? "__none";
    if (!groups.has(key)) groups.set(key, { pillar: s.pillar, skills: [] });
    groups.get(key)!.skills.push({ id: s.id, name: s.name });
  }
  return [...groups.values()].sort((a, b) =>
    a.pillar === null ? 1 : b.pillar === null ? -1 : 0
  );
}

/**
 * ⚠ ENGAGEMENT RATES ONLY. A row renders only when its column holds a value —
 * a rate nobody set is absent, never `$0.00`, which would be a price.
 */
function RateRows({ p }: { p: ProviderProfileView }) {
  /* ⚠⚠ `p.rates` IS `null` FOR A NON-OWNER (`E593` WS-C item 13) — the rate is
     absent from the PAYLOAD, not merely unrendered. ⚠ This returns nothing
     rather than an empty state: "no rates set" would be a claim about the
     provider, and the truth is that this viewer is not being shown them. */
  if (!p.rates) return null;
  const rates = p.rates;
  /*
    ── ⚠⚠ EVERY RATE THE GATE COUNTS (`P2-A3-E596` WS-G item 2) ─────────────

    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   const rows = [
    //     { label: "Onsite", cents: rates.onsiteCents },
    //     { label: "Fully Remote", cents: rates.remoteCents },
    //   ].filter((r) => r.cents != null);

    ⚠⚠⚠ THE CARD SHOWED TWO OF THE FIVE COLUMNS `providerMeetsRequired`
    ACCEPTS, so a provider could pass the visibility gate on `hourly_rate_cents`
    and still be told *"No rates set yet"* on their own page. Priya Nair was
    exactly that.
    ⚠ THE LIST IS NOT REBUILT HERE — it comes from the view model, so the card
    cannot drift from the columns the gate reads.
  */
  const rows = rates.columns.filter((r) => r.cents != null);

  if (rows.length === 0) {
    return (
      <p className="text-[13.5px] leading-relaxed text-ink-2">
        No rates set yet. Buyers filter on rate, so this is worth adding.
      </p>
    );
  }

  return (
    <dl className="m-0">
      {rows.map((r) => (
        <div
          key={r.label}
          className={
            "flex justify-between gap-3 py-2 text-[14px]" +
            ""
          }
        >
          <dt className="text-ink-2">{r.label}</dt>
          {/* ⚠ `E433` — a rate is a figure, so ink. */}
          <dd className="m-0 font-bold tabular-nums text-ink">
            {money(r.cents!, rates.currency)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ActionCard({
  title,
  label,
  href,
  note,
}: {
  title: string;
  label: string;
  href: string;
  /** ⚠ One line under the button saying why it is offered. Optional. */
  note?: string;
}) {
  return (
    <section className="rounded-brand border border-line bg-white px-[18px] py-4 text-center">
      <h3 className="mb-2.5 font-display text-[14.5px] font-bold leading-tight">
        {title}
      </h3>
      {/* ⚠ MAGENTA, and that is the rule working as intended (`E433`): the ring
          above is a figure and is ink; these are the interactive things. */}
      <Link
        href={href}
        className="block w-full rounded-full bg-magenta px-3.5 py-2.5 text-[13.5px] font-bold leading-tight text-white transition-colors hover:bg-magenta-dark"
      >
        {label}
      </Link>
      {note && (
        <p className="mt-2.5 text-[12px] leading-relaxed text-ink-2">{note}</p>
      )}
    </section>
  );
}

/**
 * ⚠ ONE FACT PER ROW, AND A ROW WITH NO VALUE DOES NOT RENDER. An empty row on
 * a trust card is worse than a missing one — it reads as a fact we checked and
 * could not confirm.
 */
function TrustRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-2.5 py-2 text-[13.5px]">
      <span className="text-ink-2">{label}</span>
      {/* ⚠ `E433` — a figure, so ink. */}
      <b className="text-ink">{value}</b>
    </div>
  );
}

/**
 * ⚠ THE ADVERTISED RANGE, exactly as `E078c` stores it. Returns null when no
 * rate is set — the row then does not render, rather than printing `$0`.
 */
function rateRange(p: ProviderProfileView): string | null {
  /* ⚠ `null` for a non-owner (`E593` WS-C 13) — the `TrustRow` that calls this
     renders nothing on a null, so the Rate row simply is not there. */
  if (!p.rates) return null;
  const { minCents, maxCents, currency } = p.rates;
  if (minCents == null && maxCents == null) return null;
  const lo = minCents ?? maxCents!;
  const hi = maxCents ?? minCents!;
  return lo === hi
    ? money(lo, currency)
    : `${money(lo, currency)} – ${money(hi, currency)}`;
}

/** ⚠ Integer cents, like every other money value in the app. */
function money(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(cents / 100);
}
