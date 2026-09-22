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
import { completionHook } from "@/lib/completion-hook";
import { GROWTH_WEIGHTS } from "@/lib/growth-score";
import { lineCounts } from "@/lib/completeness";
import {
  CompletionRing,
} from "@/components/community/CompletionRing";
import type { ProviderProfileView } from "@/lib/provider-profile-view";
import type { TaughtPath, TakenPath } from "@/lib/learn-home";
/* ⚠ `UsageStats` IS NO LONGER IMPORTED (`P2-A2-E600` WS-B) — the comb and the
   usage one-liner both left this component. ⚠ `lib/usage-stats.ts` is
   untouched and still serves `/stats`. ⚠ SUPERSEDED, quoted not deleted
   (`E164`):
   //   import type { UsageStats } from "@/lib/usage-stats"; */
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
  /* ⚠⚠⚠ `usage`, `colleagueCount` and `profileViews` ARE NO LONGER RENDERED
     HERE (`P2-A2-E600` WS-B), and that is THE PAGE RULE, not an omission.
     ⚠ Scott, 2026-09-22: *"No growth numbers, usage or statistics on My Profile
     beyond the score side card and the Rank Higher card's links."* Layout A's
     name card is photo, name, title, location and two buttons — nothing else.
     ⚠⚠ THE DOORS SURVIVE: `/stats` and `/account-health` are TABS in the
     profile row (`E600` WS-A), which is why `check:visitor-profile`'s door
     assertions still pass.
     ⚠⚠⚠ ONE CONSEQUENCE TO REPORT RATHER THAN BURY: `recordProfileView` still
     WRITES a row on every non-owner render, and **no surface displays the
     count any more**. The figure is Statistics' to show when that page is
     built; until then it is collected and unread.
     ⚠ SUPERSEDED, quoted not deleted (`E164`):
     //   usage = null,
     //   colleagueCount,
     //   profileViews = null,
  */
  testimonials = [],
  community = null,
  score = null,
  /* ⚠ `colleagueFaces` REMOVED (`P2-A2-E598` WS-C) — the hero carries the
     COUNT now and nothing renders the avatars. ⚠ SUPERSEDED, quoted not
     deleted (`E164`):
     //   colleagueFaces = [],
     ⚠⚠ THE CALLER STOPPED PASSING IT IN THE SAME COMMIT, so no dead prop is
     left being computed for nobody — `(app)/profile/page.tsx` no longer slices
     `mine.colleagues`. */
  /* ⚠ The owner's growth score and rank, for the `Grow` card's one-liner
     (`P2-A3-E599` WS-C 4). `null` for a visitor and for a member with none. */
  growth = null,
  youBothKnow = null,
  messagePermission = null,
  connect,
}: {
  p: ProviderProfileView;
  taughtPaths?: TaughtPath[];
  /** ⚠ `LearnEnrollment` rows — paths TAKEN, not taught (`E593` WS-B 17). */
  takenPaths?: TakenPath[];
  /* ⚠ SUPERSEDED, quoted not deleted (`E164`) — the prop and its note:
     //   /** ⚠ The six applications, counted. Owner-only — a visitor is passed
     //    *  none and the comb does not render (`E593`). *\/
     //   usage?: UsageStats | null;
     ⚠ Removed by `P2-A2-E600` WS-B's page rule — see the note on the
     destructure above. */
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
  /**
   * ⚠ VISITOR ONLY — accepted colleagues the viewer and this provider share.
   * A REAL QUERY (`mutualColleagueCount`), unlike `Viewing Me`, which has no
   * data at all. ⚠ `null` on the owner's own page, where the question is
   * meaningless.
   */
  /**
   * ⚠⚠ COMPUTED BY THE PAGE, NOT HERE. `growthScore` is a DATABASE read and
   * this is a shared component — `/providers/[id]` renders it too, and a
   * visitor has no business triggering the owner's scoring query.
   * ⚠ `rank` is `null` when they are not on this month's board, which is not
   * the same as rank 0.
   */
  growth?: { points: number; rank: number | null } | null;
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
  /* ⚠⚠ THE `Account` ONE-LINER WENT WITH THE ONE-LINERS CARD (`E600` WS-B).
     `/account-health` is a TAB now, and the page remains the authority.
     ⚠ SUPERSEDED, quoted not deleted (`E164`):
     //   const accountAllGood =
     //     p.accountHealth.canSignIn && p.accountHealth.receivesMessages &&
     //     p.accountHealth.statusActive && p.accountHealth.emailVerified;
  */

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
    <ProfileCard title="Service Products I Offer">
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
    <div className="pm-cp3">
      {/*
        ── ⚠⚠⚠ SCOTT'S LAYOUT A — NO WIDE HEADER (`P2-A2-E600` WS-B) ─────────

        ⚠ THE PAGE RULE, 2026-09-22: *"This is a My Profile page… different from
        profile scoring, network growth, and usage statistics. Those last three
        will have the dual cards crossing the entire screen… My Profile will not
        have that card."*
        ⚠⚠ SO `E598` WS-C's HERO IS REPLACED, AND THE RATES COME OUT OF IT into
        their own side card (`E014`). ⚠ SUPERSEDED, quoted not deleted (`E164`):
        //   <section className="pm-cp2-hero …">
        //     <div className="pm-cp2-heroin …"> … identity … <div className="pm-cp2-rates"> … </div>
        //   </section>
        ⚠⚠⚠ THE HERO WAS RIGHT FOR OPTION B AND IS WRONG HERE, and that is a
        RULING rather than a regression: option B answered *"who is this and what
        do they cost"* in one band; Layout A puts identity, rates, score and
        growth down one rail and gives the whole width to the record.
      */}
      <aside className="pm-cp3-rail">
        <section className="overflow-hidden rounded-brand border border-line bg-white">
          <div className="h-[72px] bg-gradient-to-br from-ink via-[#4b2d63] to-magenta-dark" />
          <div className="px-[18px] pb-4">
            <span className="-mt-[34px] inline-block overflow-hidden rounded-full ring-[3px] ring-white">
              <Avatar
                firstName={p.person.firstName ?? ""}
                lastName={p.person.lastName ?? ""}
                photoUrl={p.person.photoUrl}
                size={72}
              />
            </span>
            <div className="mt-2 flex items-center gap-1.5">
              {/* ⚠ The OWNER's `<h1>` is the tab row's (`E600` WS-A); a visitor
                  has no row, so the name is the page's title there. */}
              {owner ? (
                <h2 className="font-display text-[20px] font-bold">{fullName}</h2>
              ) : (
                <h1 className="font-display text-[20px] font-bold">{fullName}</h1>
              )}
              {p.validated && (
                <span title="Validated by Panameer" className="text-magenta">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-label="Validated by Panameer" role="img">
                    <path d="M12 2l2.4 1.8 3-.3 1 2.8 2.6 1.5-.9 2.9.9 2.9-2.6 1.5-1 2.8-3-.3L12 22l-2.4-1.8-3 .3-1-2.8L3 16.2l.9-2.9L3 10.4l2.6-1.5 1-2.8 3 .3z" />
                    <path d="M10.6 15.2l-2.8-2.8 1.1-1.1 1.7 1.7 4-4 1.1 1.1z" fill="#fff" />
                  </svg>
                </span>
              )}
            </div>
            {p.headline && (
              <p className="mt-1 text-[13px] leading-snug text-ink-2">{p.headline}</p>
            )}
            {p.location && <p className="mt-1 text-[12.5px] text-ink-3">{p.location}</p>}
            {owner && (
              <div className="mt-3 flex flex-col gap-2">
                <Link
                  href="/community/score"
                  className="rounded-full bg-magenta px-3.5 py-2 text-center text-[13px] font-bold text-white transition-colors hover:bg-magenta-dark"
                >
                  Complete Your Profile
                </Link>
                <Link
                  href={`/providers/${p.id}`}
                  className="rounded-full border border-line px-3.5 py-2 text-center text-[13px] font-bold transition-colors hover:border-magenta/50"
                >
                  See What Buyers See
                </Link>
              </div>
            )}
          </div>
        </section>

        {/*
          ── ⚠⚠ RATES, ITS OWN SIDE CARD AGAIN (`E014`) ────────────────────

          ⚠⚠⚠ RENDERED FOR BOTH PERSONAS, AND THIS IS THE ONE THING NOT TO GET
          WRONG. `/providers/[id]` renders this component in visitor mode, so
          putting it inside the `owner` branch would SILENTLY REMOVE RATES FROM
          THE BUYER'S PAGE. The rule is the VIEW MODEL's — `isOwner ||
          hasCapability(viewer, "canHireTalent")` — and `p.rates` is already
          `null` for anyone who may not see it.
          ⚠ THE WHOLE CARD IS GATED, NOT JUST ITS BODY.
        */}
        {p.rates && (
          <ProfileCard
            id="rates"
            title="Rates"
            edit={owner ? <EditLink href={editHref("rates")} title="Rates" /> : undefined}
          >
            <RateRows p={p} />
          </ProfileCard>
        )}

        {owner ? (
          <>
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

            <section className="rounded-brand border border-line bg-white px-[18px] py-4">
                            {/*
                              ⚠⚠ THE TITLE STAYS `Grow` FOR NOW (Scott, 2026-09-22, at the
                              `E599` WS-B gate): *"keep its title 'Grow' for now. The
                              profile-pages brief renames it once search ranking makes the
                              new title true."* ⚠ A title that promises ranking before
                              ranking exists is the `E579` shape in copy.
                            */}
                            <h2 className="mb-2 font-display text-[15px] font-bold">Grow</h2>
                            <div className="flex flex-col">
                              {[
                                /*
                                  ⚠⚠⚠ THE ONE-LINER IS **ADDED**, NOT SWAPPED IN (`E599`
                                  WS-C 4): *"the profile's Grow card gets its one-liner:
                                  your score and rank, linking here."*
                                  ⚠⚠ THE FIRST BUILD REPLACED `Invite a Colleague` WITH IT
                                  AND LOST A DOOR. `check:visitor-profile` caught it —
                                  *"'Invite a Colleague' vanished from the OWNER's page"* —
                                  which is exactly the assertion `E598` WS-C added for this
                                  class of removal. ⚠ Both rows stand: one invites, the
                                  other reports.
                                  ⚠ The hint is the SCORE, computed by `growthScore`, not a
                                  canned number, and the weight it quotes comes from
                                  `GROWTH_WEIGHTS` — a tuning change moves this line too.
                                */
                                {
                                  label: "Grow the Network",
                                  href: "/community/grow",
                                  hint: growth
                                    ? `${growth.points} points${growth.rank ? ` · #${growth.rank} this month` : ""}`
                                    : `A colleague who joins is worth ${GROWTH_WEIGHTS.JOINED} points`,
                                },
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

      <main className="pm-cp3-main">
        {/* ⚠ `About` IS `Bio` AGAIN (WS-B 5). Anchor and editor unchanged. */}
        <ProfileCard
          id="bio"
          title="Bio"
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
          ── ⚠⚠⚠ SKILLS AND SPECIALIZATIONS ARE TWO CARDS AGAIN (WS-B) ───────

          ⚠ `E598` WS-C merged them on the option-B mockup's instruction.
          Layout A separates them: Skills is full width, Specializations joins
          Certifications and Education in a three-across row.
          ⚠⚠ THIS IS A RULING CHANGE, NOT DRIFT — and the anchors and editors
          are untouched either way, which is what `E597`'s one-section editors
          need. ⚠ SUPERSEDED, quoted not deleted (`E164`): the merged card, with
          `<div id="specializations" className="mt-4 border-t …">` inside it.
        */}
        <ProfileCard
          id="skills"
          title="Skills"
          edit={owner ? <EditLink href={editHref("skills")} title="Skills" /> : undefined}
        >
          {p.skills.length > 0 ? (
            groupSkillsByPillar(p.skills).map((g) => (
              <div key={g.pillar ?? "__none"} className="mb-3 last:mb-0">
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
        </ProfileCard>

        <div className="pm-cp-three">
          <ProfileCard
            id="specializations"
            title="Specializations"
            edit={owner ? <EditLink href={editHref("specializations")} title="Specializations" /> : undefined}
          >
            <SpecializationsBody specializations={p.specializations} />
          </ProfileCard>
          <ProfileCard
            id="certifications"
            title="Certifications"
            edit={owner ? <EditLink href={editHref("certifications")} title="Certifications" /> : undefined}
          >
            <CertificationsBody
              certifications={p.certifications}
              empty="No certifications yet."
              emptyAction={
                owner ? (
                  <Link href="/learn" className="mt-2 inline-block text-[13.5px] font-bold text-magenta hover:underline">
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
                  <Link href="/learn" className="mt-2 inline-block text-[13.5px] font-bold text-magenta hover:underline">
                    Browse Learning Paths
                  </Link>
                ) : undefined
              }
            />
          </ProfileCard>
        </div>

        {/* ⚠⚠ WORK HISTORY AND SOLO PROJECTS ARE TWO CARDS AGAIN (WS-B). They
            were merged as `Experience` by `E598` WS-C; Layout A separates them,
            and each keeps its own anchor and its own editor. */}
        <ProfileCard
          id="work-history"
          title="Work History"
          edit={owner ? <EditLink href={editHref("work-history")} title="Work History" /> : undefined}
        >
          <WorkHistoryBody
            employers={p.employers}
            projects={p.projects}
            isOwner={owner}
            empty="No work history yet."
          />
        </ProfileCard>

        <ProfileCard
          id="solo-projects"
          title="Solo Projects"
          edit={owner ? <EditLink href={editHref("solo-projects")} title="Solo Projects" /> : undefined}
        >
          <SoloProjectsBody
            projects={soloProjects}
            isOwner={owner}
            empty="Employee projects sit under their employer in Work History. No solo projects yet."
          />
        </ProfileCard>

        {owner && serviceProducts}

        <ProfileCard title="Learning Paths I Offer">
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
        {/* ⚠⚠ FORUM INVOLVEMENT — "groups". Renders nothing when the signal is
            null, which is every profile today. `check:community` GUARD 3
            asserts this page supplies it. */}
        <CommunitySignalBlock
          signal={community}
          firstName={p.person.firstName ?? ""}
          isOwner={owner}
        />
      </main>
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
