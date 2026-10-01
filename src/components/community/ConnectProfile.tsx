import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import { ProfileVisibilityCard } from "@/components/profile/ProfileVisibilityCard";
import { HireButton } from "@/components/community/HireButton";
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
import { GROWTH_WEIGHTS } from "@/lib/growth-score";
/*
  ── ⚠⚠ THE SHARED OUTSTANDING-LINES RULE (`P2-A2-E720` item 2) ─────────────────────────

  ⚠⚠ **`SCORE_LINE_COPY` AND `lineCounts` ARE NO LONGER IMPORTED HERE, AND THAT IS THE POINT
  OF THE ITEM:** this file no longer knows how "outstanding" or "minutes" are defined, so it
  cannot answer either question differently from `/community/score`. ⚠ Both names still appear
  below inside `E164` quotes; neither is live code.
  ⚠ SUPERSEDED, quoted not deleted (`E164`):
  //   import { SCORE_LINE_COPY } from "@/lib/profile-score-copy";
  //   import { lineCounts } from "@/lib/completeness";
*/
import { openScoreLines, openScoreMinutes } from "@/lib/score-open";

/**
 * ── ⚠⚠ THE LESSON COUNT ON A COURSE ROW (`P2-A2-E720` item 8) ──────────────────────────
 *
 * ⚠⚠⚠ **A REAL ZERO AND AN EMPTY COURSE MUST NOT READ AS `0 lessons`** (counting rule 2). ⚠ It
 * is not hypothetical: **4 of 24 paths carry no courses at all**, so a bare `0` would appear on
 * a live profile and read as a broken figure rather than as a fact about the course.
 * ⚠ Singular at 1, because *"1 lessons"* is the kind of detail that makes a page look
 * unfinished.
 */
function lessonCount(n: number): string {
  if (n <= 0) return "No lessons yet";
  return `${n} lesson${n === 1 ? "" : "s"}`;
}
/*
  ⚠⚠ `completionHook` AND `CompletionRing` ARE NO LONGER IMPORTED HERE (`P2-A2-E715` row 9).
  ⚠ The rail's score block is now the mockup's thin ink ring with `of 100` and one items-left
  line, so neither the segmented ring nor the hook sentence is drawn on this page.
  ⚠⚠⚠ **BOTH MODULES ARE UNTOUCHED AND STILL LIVE** — `/community/score` renders
  `CompletionRing` and `ProfileScoreView` uses the hook. This is an import leaving one
  consumer, not a feature being removed. ⚠ Left as an unused import it is a lint warning
  against a baseline that must read 0 new.
  ⚠ SUPERSEDED, quoted not deleted (`E164`):
  //   import { completionHook } from "@/lib/completion-hook";
  //   import { CompletionRing } from "@/components/community/CompletionRing";
*/
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
/* ⚠ `OwnerResumeRerun` IS NO LONGER IMPORTED (`E720` item 9) — the rail renders
   `OwnerResumeRebuild`, which offers an UPLOAD first because 59 of 63 profiles have no stored
   document for the re-run to read. ⚠⚠ `OwnerResumeRerun` STAYS ON DISK in `OwnerAiPass.tsx`
   (`E164` — never delete a file), beside `OwnerAiPass` and `OwnerResumeImport`, which the
   wizard still uses.
   ⚠ SUPERSEDED, quoted not deleted (`E164`):
   //   import { OwnerResumeRerun } from "@/components/profile/OwnerAiPass"; */
import { OwnerResumeRebuild } from "@/components/profile/OwnerResumeRebuild";
import { CommunitySignalBlock } from "@/components/profile/CommunitySignal";
import {
  CertificationsBody,
  EducationBody,
  LanguagesBody,
  /* ⚠ ONE EDIT PATTERN (`E593` WS-B item 6) — `EditLink` lives beside
     `EditButton` in `sections.tsx` and shares its `EDIT_CLASS`, so the link and
     the button render identically. ⚠ It was dead code in `ProviderProfileView`
     until this brief; it was MOVED, not copied. */
  OverviewBody,
  /* ⚠ THE SAME CHIPS THE OWNER'S HERO USES (`P2-A3-E596` WS-G item 1) — reused,
     never re-implemented. */
  SkillsBody,
  SoloProjectsBody,
  SpecializationsBody,
  WorkHistoryBody,
  /* ⚠ `CHIP_TAG` IS NO LONGER IMPORTED (`E720` item 5) — the Groups chips read `CLEAN_CHIP`,
     the Skills chip, which is the one definition Scott named. `CHIP_TAG` still exists and is
     still read by `/join/provider`; this surface simply no longer has a second chip.
     ⚠ SUPERSEDED, quoted not deleted (`E164`):  //   CHIP_TAG, */
  locationLines,
} from "@/components/profile/sections";
import "./connect-profile.css";
/*
  ⚠⚠⚠ THE CLEAN DIRECTION'S OWN PIECES (`P2-A2-E713` WS-A). ⚠ `ProfileCard`/`EditLink`
  are still imported below where this file needs them — they are NOT deleted, because
  `/join/provider` renders them and must look exactly as it does now (premise 2).
*/
import {
  CleanSection,
  CleanEdit,
  CLEAN_CHIP,
  CleanSide,
} from "@/components/profile/CleanSection";


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
  canHire = false,
  messagePermission = null,
  connect,
  mentor,
  previewAsBuyer = false,
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
  /**
   * ── ⚠⚠⚠ MAY THIS VIEWER BUY? (`P2-A8-E719`) ──────────────────────────────
   *
   * ⚠ **COMPUTED BY THE PAGE FROM `hasCapability(viewer, "canHireTalent")`**, and deliberately
   * NOT derived here — the same rule `active` follows on the account menu (ruling 72): this
   * component renders what it is told about permission and decides nothing about it.
   * ⚠⚠ **THE OWNER'S PREVIEW PASSES `false`** even though the owner is often a buyer, because
   * Scott's rule is *"Owner preview: no Hire"* — you do not sole-source yourself.
   * ⚠⚠⚠ **AND IT IS NOT THE PERMISSION.** `/api/work-requests/sole-source` guards on the same
   * capability and `resolveBuyer` checks the column again; this only decides what is drawn.
   */
  canHire?: boolean;
  messagePermission?: MessagePermission | null;
  /** ⚠ `ConnectControls`, resolved by the page that knows it is showing
   *  somebody else. Carried over unchanged from `/providers/[id]`.
   *  ⚠⚠ SINCE `E720` item 10 THIS IS THE COLLEAGUE HALF ONLY (`part="colleague"`). */
  connect?: ReactNode;
  /**
   * ── ⚠⚠ THE MENTOR HALF OF `ConnectControls` (`P2-A2-E720` item 10) ─────────────────────
   *
   * ⚠ **SCOTT: *"Request as Mentor joins the visitor actions after Connect as a Colleague
   * (white, ink border), reusing ConnectControls. It shows state once followed."***
   * ⚠⚠ **IT IS A SLOT, LIKE `connect`, FOR THE SAME REASON:** only the page knows the viewer's
   * relation to this provider, and the component must not learn to query it.
   */
  mentor?: ReactNode;
  /**
   * ── ⚠⚠⚠ THE BUYER'S VIEW, EVEN WHEN THE OWNER IS LOOKING (`E602` WS-D) ──
   *
   * ⚠ SCOTT'S WALK (`E022`/`E023`): `/providers/[id]` showed the owner their own
   * Grow card, Edit controls, *"Complete Your Profile"* and a
   * *"See What Buyers See"* button **pointing at the page they were already on.**
   * ⚠⚠ *"See What Buyers See" MEANS EXACTLY THAT* — a page that shows the
   * owner's tools while claiming to be the buyer's view teaches the wrong thing
   * about what buyers see.
   * ⚠⚠⚠ IT DOES **NOT** MAKE `isOwner` FALSE. The page still knows who is
   * looking — that is how the owner gets a way back, and how `recordProfileView`
   * keeps NOT writing a view row for the owner (`E598`).
   */
  previewAsBuyer?: boolean;
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
  /*
    ⚠⚠⚠ `previewAsBuyer` FOLDS IN **HERE**, AT THE ONE POINT, AND NOWHERE ELSE
    (`E602` WS-D). That is what makes *"every owner affordance is absent in the
    buyer preview"* answerable by reading one line — the same guarantee `E588`
    WS-B bought, extended rather than bypassed.
    ⚠ A second flag threaded through thirty branches is how this component
    stops being auditable.
  */
  const owner = p.isOwner && !previewAsBuyer;

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
  /*
    ── ⚠⚠⚠ IT READS THE SCORE PAGE'S OWN LIST NOW (`P2-A2-E720` item 2) ──────────────────

    ⚠ **SCOTT: *"`ConnectProfile.tsx:341` `openLines` is a second definition, `E585`."*** He is
    right that it was a second definition; ⚠⚠ **it was in fact the second of THREE** — this,
    `ProfileScoreView`'s `open`, and `completionHook`'s. All three are now
    `openScoreLines`.
    ⚠⚠⚠ **AND THE HONEST FINDING IS THAT THEY AGREED: measured on two personas before any edit
    — Scott Walls 2 open / 4 min, Priya Nair 7 open / 16 min, IDENTICAL on both surfaces.** So
    no number on this page was wrong. **What was wrong is that nothing stopped one from
    becoming wrong**, and the copies had already begun to diverge in a smaller way: this one
    guarded the minutes lookup with `?? 0` and the score page's did not.
    ⚠ SUPERSEDED, quoted not deleted (`E164`). ⚠⚠ THE INNER COMMENT IS PARAPHRASED RATHER THAN
    COPIED (load-bearing rule 12 — it held a comment terminator, which would close THIS comment
    early): the sort was BIGGEST FIRST, the same ordering the score page uses.
    //   const openLines = (score?.lines ?? [])
    //     .filter((l) => !lineCounts(l.state))
    //     .sort((a, b) => b.points - a.points);
  */
  const openLines = openScoreLines(score);
  const remainingLines = openLines.length;
  /* ⚠⚠ TWO, BECAUSE THE BRIEF SAYS TWO: *"the ring, the two next items with
     minutes, and 'See all N →'"*. The card is a prompt, not the list. */
  /*
    ⚠⚠ THE MINUTES ON THE SEARCH SCORE BLOCK (`E715` row 9), SUMMED FROM THE SAME
    `SCORE_LINE_COPY` TABLE the two "next" lines below read. ⚠⚠⚠ **IT IS EVERY OUTSTANDING
    LINE, NOT THE TWO THAT ARE SHOWN** — the block says *"N items left · about M min"*, so
    the minutes must describe the same N the sentence names. Summing only the visible two
    would understate the work while naming the full count, which is a figure disagreeing with
    its own label on the surface a member is asked to act on.
  */
  /* ⚠ SUPERSEDED, quoted not deleted (`E164`) — the sum now lives beside the list it sums:
     //   const minutesLeft = openLines.reduce(
     //     (sum, l) => sum + (SCORE_LINE_COPY[l.key]?.minutes ?? 0), 0); */
  const minutesLeft = openScoreMinutes(openLines);
  /*
    ⚠⚠ `nextLines` IS GONE WITH THE CARD THAT LISTED IT (`P2-A2-E715` row 9). The mockup's
    block states the COUNT and the total minutes; the per-line detail is one click away on
    `/community/score`, which is the same page the block links to.
    ⚠ `minutesLeft` above replaces it and reads the SAME `SCORE_LINE_COPY` table, so the copy
    source is unchanged — only how much of it this page renders.
    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   const nextLines = openLines.slice(0, 2).map((l) => ({
    //     key: l.key,
    //     (comment: the ACTION, not the field name - "Add your education" reads as a next
    //      step; "Education" reads as a heading. Same copy table as the page.)
    //     label: SCORE_LINE_COPY[l.key].action,
    //     minutes: SCORE_LINE_COPY[l.key].minutes,
    //   }));
  */
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

  /*
    ── ⚠⚠⚠ WHAT A VISITOR MAY SEE OF SOMEBODY'S LEARNING (WS-A item 6 / brief item 11) ──

    ⚠ **SCOTT: *"Completed items are visible to buyers. In-progress items stay private to
    the member."*** ⚠⚠ So the owner sees everything they are enrolled in; **a visitor sees
    only what was finished.**
    ⚠⚠⚠ **THE FILTER IS HERE, ONCE, AND NOT AT EACH RENDER POINT.** A second place deciding
    who may see an in-progress enrolment is a second place to get somebody's privacy wrong.
    ⚠ `completed` is DERIVED in `getPathsTakenBy` (every lesson of the path has a progress
    row) — no column was added, and `t > 0` there stops an empty path certifying itself.
    ⚠⚠ **MEASURED 2026-09-29: `LearnEnrollment` 2, `LessonProgress` 4 — NOTHING IS COMPLETE
    FOR ANYBODY, so the buyer-visible half is EMPTY BY CONSTRUCTION today.** That is the
    data being young, not a defect, and the empty-section rule already hides it from a
    visitor rather than showing them a heading with nothing under it.
  */
  const visibleTaken = owner ? takenPaths : takenPaths.filter((t) => t.completed);

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
  /*
    ⚠⚠ RENAMED `Services` (`P2-A2-E713` WS-A item 7 / brief item 10). ⚠ Scott:
    `Service Products I Offer` → **`Services`**. ⚠⚠⚠ THE MODEL KEEPS ITS NAME —
    `ServiceProduct` is what `E697` renamed it TO, and this is the heading a member
    READS, not the noun the schema uses.
    ⚠⚠ A JSX COMMENT COULD NOT GO HERE: this is the first element of the expression, so a
    braced JSX comment made it a second root. The comment belongs OUTSIDE the parenthesis.
    ⚠⚠⚠ AND THE FIRST ATTEMPT AT THIS NOTE BROKE THE PARSE — it spelled that JSX comment
    out literally, and a block comment CANNOT CONTAIN a comment terminator. Load-bearing
    rule 12, third recorded occurrence. **PARAPHRASE, NEVER QUOTE, INSIDE A BLOCK.**
    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   <CleanSection title="Service Products I Offer">
  */
  const serviceProducts = (
    <CleanSection
          /*
            ── ⚠⚠⚠ THE OWNER AND THE VISITOR READ DIFFERENT NAMES (`P2-A2-E718` item 6) ──

            ⚠ **SCOTT, 2026-09-30.** Owner: `My Service Products · My Courses · Courses Taken
            / In-Process`. Visitor: `Service Products · Courses · Courses Taken`.
            ⚠⚠ **THIS SUPERSEDES `E713`'s `Services` / `Teaching` / `Learning`**, quoted not
            deleted (`E164`) at each call site below.
            ⚠⚠⚠ **THE POSSESSIVE IS THE WHOLE POINT: the owner is looking at THEIR record and
            the visitor is looking at SOMEBODY'S.** `My Courses` on a stranger's profile would
            claim the reader teaches them.
            ⚠ **`/ In-Process` IS OWNER-ONLY BECAUSE THE DATA IS:** `visibleTaken` already
            filters a visitor to completed paths (`owner ? takenPaths : takenPaths.filter(t =>
            t.completed)`, shipped at `E713`), so a visitor's list genuinely holds only
            finished courses and naming in-progress ones would describe rows that are not
            there. **The rule Scott states was already built; only the titles change.**
          */
          title={owner ? "My Service Products" : "Service Products"}
          /* ⚠ SUPERSEDED, quoted not deleted (`E164`): title="Services" */
          count={p.packages.length}
          showWhenEmpty={owner}
        >
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
                data-row
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
    </CleanSection>
  );

  /*
    ── ⚠⚠ THE SCORE BLOCK IS EXTRACTED SO THE PHONE ROW CAN HOLD IT (`E718` item 1) ─────

    ⚠ It is rendered inside `pm-rail-top`, beside the photo. ⚠⚠ **NOTHING ABOUT IT CHANGED**
    — same `CleanSide`, same `titleHref`, same two doors, same figure. Only WHERE it is
    rendered moved, which is what kept this a layout change rather than a rewrite.
  */
  const scoreBlock = owner && score ? (
        /*
          ── ⚠⚠⚠ SCOPED SO ONLY *THIS* BLOCK GROWS (`P2-A2-E723` item 8) ────────────

          ⚠ **SCOTT'S SKETCH ENLARGES THE SEARCH SCORE LABEL, THE RING, THE NUMBER, *"out of
          100"* AND THE ITEMS-LEFT LINE — one step each, with more air between them.**
          ⚠⚠ **`CleanSide` ALSO DRAWS `Rates`, `Visibility` AND `Rank Higher`**, so enlarging
          its own 12px eyebrow would have grown all four blocks from inside an item about one.
          ⚠⚠⚠ **THE WRAPPER IS THE SCOPE.** Same component, same markup, one extra class.
        */
        <div className="pm-score-block">
        <CleanSide title="Search Score" titleHref="/community/score">
          <div className="flex items-center gap-4">
            <span
              className="pm-score-ring"
              style={{
                background: `conic-gradient(var(--color-ink) 0 ${score.total}%, var(--color-line) ${score.total}% 100%)`,
              }}
            >
              <span className="tabular-nums">{score.total}</span>
            </span>
            <span className="min-w-0 text-[13px] leading-snug text-ink-2">
              {/* ⚠ SCOTT (`E720` item 12): the figure's unit reads **"out of 100"**.
                  ⚠ SUPERSEDED, quoted not deleted (`E164`):  //   of 100 */}
              out of 100
              <br />
              {/* ⚠⚠ A REAL ZERO AND A FINISHED PROFILE MUST NOT READ THE SAME (counting
                  rule 2). At zero outstanding lines this says so in words rather than
                  printing "0 items left".
                  ⚠⚠⚠ **BOTH STATES ARE THE LINK, NOT JUST THE ONE WITH A COUNT IN IT.** A
                  provider at zero outstanding still has a score page worth reading, and a
                  door that disappears at 100% is a door that vanishes exactly when the
                  member has earned the right to look. */}
              <Link
                href="/community/score"
                data-e716-items
                className="font-semibold text-magenta-dark hover:underline"
              >
                {remainingLines > 0 ? (
                  <>
                    {/* ⚠ SCOTT (`E720` item 12): **"N items left – about M mins"** — an en
                        dash, not the middot, and `mins` not `min`.
                        ⚠ SUPERSEDED, quoted not deleted (`E164`):
                        //   {remainingLines} item{…} left{minutesLeft > 0 ? ` · about ${minutesLeft} min` : ""} */}
                    {remainingLines} item{remainingLines === 1 ? "" : "s"} left
                    {minutesLeft > 0 ? ` – about ${minutesLeft} mins` : ""}
                  </>
                ) : (
                  "Nothing outstanding"
                )}
              </Link>
            </span>
          </div>
        </CleanSide>
        </div>
  ) : null;

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
        {/*
          ── ⚠⚠⚠ THE IDENTITY BOX IS GONE (`P2-A2-E713` WS-A item 1 / brief item 2) ──

          ⚠⚠ **SCOTT: *"The cards are not obvious, bordered"* · *"No grey background… boxes
          cut up the page."*** ⚠ So the border, the radius, the white fill and the
          `overflow-hidden` that existed only to clip that radius are all removed.
          ⚠⚠⚠ **AND THE 72px GRADIENT BANNER GOES WITH THEM.** It was the boxiest thing on
          the page and the only place a second colour appeared — brief item 4 is *"all one
          color, on white"*, so a three-stop ink→purple→magenta gradient is exactly what that
          rules out. ⚠ It also existed to give the avatar something to overlap (`-mt-[34px]`
          below), so that offset goes too.
          ⚠ SUPERSEDED, quoted not deleted (`E164`):
          //   <section className="overflow-hidden rounded-brand border border-line bg-white">
          //     <div className="h-[72px] bg-gradient-to-br from-ink via-[#4b2d63] to-magenta-dark" />
          //     <div className="px-[18px] pb-4">
          ⚠⚠ **`/join/provider` IS UNAFFECTED: this markup is local to `ConnectProfile`**, not
          `ProfileCard`, so nothing shared changed to achieve it.
        */}
        {/*
          ── ⚠⚠⚠ THE RAIL IS SIX NAMED BLOCKS NOW (`P2-A2-E718` items 1–3) ─────────────────

          ⚠ **DESKTOP ORDER (= DOM ORDER): photo → Search Score → button → Visibility → Rank
          Higher → Rates.** ⚠⚠ **PHONE ORDER: [photo | Search Score] side by side → name ·
          title · meta · bio → button → sections → Rates → Visibility → Rank Higher.**
          ⚠⚠⚠ **THE IDENTITY BLOCK IS SPLIT** — the photo and the button were one `<section>`,
          and they now sit at opposite ends of the phone layout (the photo first, the button
          under the bio), so they cannot remain one element.
          ⚠ **EVERY BLOCK CARRIES A NAME AND THE PHONE ORDER KEYS ON THOSE NAMES**, never on
          `:nth-child` — `E717` records what positional rules do when the DOM is reordered:
          they silently re-target a different block.
          ⚠ SUPERSEDED, quoted not deleted (`E164`):
          //   ⚠ `pm-rail-identity` IS LOAD-BEARING AT PHONE WIDTH — the one-column order keys
          //     on it (see `connect-profile.css`), so this block stays above the record.
          //   <section className="pm-rail-identity">
        */}
        {/* ⚠⚠ `pm-rail-top` IS A PLAIN BLOCK ON DESKTOP — the photo and the score simply stack
            inside it, which is the order Scott asked for — and becomes a FLEX ROW at phone
            width, putting them side by side. One wrapper, two layouts, no duplicated markup.
            ⚠ **MEASURED AT 1280: photo 260×260 at y=195, score 260×115 at y=483** — stacked,
            with `CleanSide`'s own 28px margin doing the spacing, so no extra rule is needed.
            ⚠⚠⚠ **THIS COMMENT FIRST CLAIMED `display: contents` ON DESKTOP AND THAT RULE WAS
            NEVER WRITTEN.** The layout was right anyway, so nothing looked wrong — **a comment
            describing CSS that does not exist is the half of the defect that survives**, and
            the next reader would have gone looking for it. Corrected against the measurement
            rather than against the intention. */}
        <div className="pm-rail-top">
        <section className="pm-rail-photo">
          <div>
            {/*
              ── ⚠⚠⚠ EACH EDIT CONTROL MOVES BESIDE WHAT IT EDITS (WS-B) ────────

              ⚠ SCOTT, of the six links that used to sit in a row under this
              card: **"These are in the wrong place."** ⚠⚠ They were a block of
              six identical `✏️ Edit` links — **indistinguishable without their
              `aria-label`, and a member had to guess which one reached the
              thing they were looking at.**
              ⚠⚠⚠ **THIS IS THE COUNTING RULES' THIRD LINE APPLIED TO CONTROLS:**
              *a control says what it governs AT THE POINT IT GOVERNS IT.*
            */}
            {/*
              ── ⚠⚠⚠ ROW 1 — THE PHOTO IS THE COLUMN ───────────────────────────────

              ⚠ **THE MOCKUP: a LARGE SQUARE photo the full width of the rail (260px), 4px
              corners, with `Edit photo` sitting on it at the bottom right.** ⚠⚠ `E713`
              shipped a 72px round avatar, which is why Scott read the page as *"not the
              same"* even though every PROPERTY matched.
              ⚠⚠⚠ **`<Avatar>` IS NOT REUSED HERE AND THAT IS DELIBERATE: IT IS ROUND BY
              CONSTRUCTION AND IT IS SHARED.** It renders a `rounded-full` box at a `size`,
              and it is used across the member rows, the community cards and the band — so
              making it square, or adding a `shape` prop and defaulting it wrong, reaches
              every one of those. **The square photo is local markup, exactly as `E713` kept
              the boxless section local rather than editing `CARD`.**
              ⚠ The initials fallback keeps `Avatar`'s own rule (`E591`): a missing photo is
              a face with initials, never a broken image.
              ⚠ SUPERSEDED, quoted not deleted (`E164`):
              //   <span className="flex items-end gap-2">
              //     <span className="inline-block overflow-hidden rounded-full ring-[3px] ring-white">
              //       <Avatar firstName={…} lastName={…} photoUrl={…} size={72} />
              //     </span>
              //     {owner && <CleanEdit href={editHref("photo")} title="Photo" />}
              //   </span>
              ⚠⚠ **AND THE LAYER BEFORE IT, CARRIED FORWARD RATHER THAN DROPPED (`E713`):** the
              span once had a negative top margin so the avatar overlapped a gradient banner,
              and `E713` removed both together — *"left in place it would pull the avatar up
              into the tab row."* ⚠ SUPERSEDED, quoted not deleted (`E164`):
              //   <span className="-mt-[34px] flex items-end gap-2">
              ⚠⚠⚠ **THAT QUOTE WAS ABOUT TO BE LOST.** It is a quote OF a quote — `E713`
              preserving `E600`'s markup — and replacing this block wholesale dropped it. **A
              supersession chain breaks at whichever link nobody re-copies**, which is exactly
              how the history stops reading.
            */}
            <div className="pm-photo" data-e715-photo>
              {p.person.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.person.photoUrl} alt="" />
              ) : (
                <span className="pm-photo-initials">
                  {`${p.person.firstName?.[0] ?? ""}${p.person.lastName?.[0] ?? ""}`.toUpperCase() ||
                    "?"}
                </span>
              )}
              {owner && (
                <Link
                  href={editHref("photo")}
                  aria-label="Edit Photo"
                  className="pm-photo-edit text-magenta-dark hover:underline"
                >
                  Edit photo
                </Link>
              )}
            </div>
          </div>
        </section>
        {/* ⚠ THE SCORE BLOCK IS RENDERED HERE, INSIDE `pm-rail-top`, so the phone row can put
            it beside the photo. On desktop the wrapper dissolves and it is simply the second
            block in the column — the order Scott asked for in both layouts. */}
        {scoreBlock}
        </div>

        {/*
          ── ⚠⚠ ITEM 2 — THE BUTTON IS ITS OWN BLOCK ────────────────────────────────────

          ⚠ **SCOTT: on the phone it is sized to its text, about 40px tall, left-aligned, and
          sits UNDER THE BIO; on desktop it keeps the same style, under the photo and Search
          Score.** ⚠⚠ Those are two different places in two different layouts, which is why it
          can no longer live inside the photo's section.
          ⚠⚠⚠ **IT IS NO LONGER FULL-WIDTH ON THE PHONE** — `pm-btn` stretches to its column,
          and a 390px-wide ink slab under the bio reads as a banner rather than a control.
        */}
        <div className="pm-rail-button">
            {/*
              ── ⚠⚠⚠ ROWS 2 AND 13 — THE NAME, TITLE, LOCATION AND `How You Work` HAVE LEFT
                  THE RAIL FOR THE RECORD (`P2-A2-E715`) ────────────────────────────────

              ⚠ **THE MOCKUP PUTS THEM AT THE TOP OF THE MAIN COLUMN**, at 30px/700 with a
              meta line under them — not as small text beside the photo. They are rendered
              by `IdentityHead` below, ONCE, and this is the only place they used to be.
              ⚠⚠ **THE `<h1>`/`<h2>` RULE MOVED WITH THEM AND IS NOT LOST** (`E600` WS-A):
              the owner's `<h1>` is the tab row's, so the owner gets `<h2>` and a visitor —
              who has no tab row — gets the `<h1>`. Rendering both here and there would give
              the page two `<h1>` candidates, which is the `E598` defect.
              ⚠⚠⚠ **`Edit` CONTROLS TRAVELLED WITH THEIR SUBJECTS**, which is WS-B's whole
              rule — *a control says what it governs at the point it governs it.* Title keeps
              its `Edit`, Languages keeps its own, and `How You Work` is now a link in the
              meta line rather than a stray control under the location (row 13).
              ⚠ SUPERSEDED, quoted not deleted (`E164`) — what stood here:
              //   <div className="mt-2 flex items-center gap-1.5">
              //     {owner ? <h2 className="font-display text-[20px] font-bold">{fullName}</h2>
              //            : <h1 className="font-display text-[20px] font-bold">{fullName}</h1>}
              //     {p.validated && <span title="Validated by Panameer" …>…</span>}
              //   </div>
              //   {(p.headline || owner) && (
              //     <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-[13px] leading-snug text-ink-2">
              //       {p.headline}
              //       {owner && <CleanEdit href={editHref("title")} title="Title" />}
              //     </p>
              //   )}
              //   {(() => {
              //     const lines = locationLines(p.location, p.country);
              //     return lines ? (
              //       <p className="mt-1 text-[12.5px] text-ink-3">
              //         {lines.primary}{lines.secondary ? ` · ${lines.secondary}` : ""}
              //       </p>
              //     ) : null;
              //   })()}
              ⚠ **RULING 31c IS UNCHANGED AND TRAVELS WITH THE TITLE:** `"+AI Enabled…"` is
              an EXAMPLE of a title, sample text, not a feature — no placeholder, no hint, no
              default is built toward it.
              ⚠ **AND `locationLines` IS STILL THE ONE RULE** the Location card uses, so the
              two cannot disagree (`E585`); only where it renders has changed.
            */}
            {/*
              ── ⚠⚠⚠ THE IDENTITY CARD GROWS ITS EDIT CONTROLS (`E600` WS-F) ──

              ⚠ Scott: *"The profile grows an Edit control for each of these
              where one is missing."* ⚠⚠ THESE FOUR FACTS ARE ALL RENDERED IN
              THIS CARD — photo, name/title, location and how you work — and
              none of them had a way to edit from the profile. `E597` WS-C
              measured exactly that: *"No Edit Title link exists."*
              ⚠⚠⚠ `check:profile-edit` COLLECTS THEM BY SHAPE, so each one's
              destination is asserted to render in the profile's frame and to
              show the section its label names.
              ⚠ `Contact` COVERS TWO SCORE LINES — identity and location — one
              address, one editor, one save (`E595`).
            */}
            {/*
              ── ⚠⚠⚠ WHAT IS LEFT OF THE ROW, AND WHY EACH ONE IS STILL HERE ──

              ⚠ `Title` and `Photo` have MOVED beside their subjects above.
              ⚠⚠⚠ **`Role` IS REMOVED.** Scott, 2026-09-24: *"Role is not
              something I want them to edit... but all the other fields are
              editable."*
              ⚠⚠ **REPORTED AS THE BRIEF REQUIRES — WHAT CAN STILL SET A ROLE:**
              · the DERIVATION from the provider's own matched skills
                (`E507`/`E509`) — *"Role is derived from the skills"*, a PREFILL
                that never overwrites a role the provider chose;
              · the onboarding wizard's role step.
              ⚠⚠⚠ **AND WHAT CANNOT: THERE IS NO ADMIN SURFACE FOR A PROVIDER'S
              ROLE.** Measured — `role_type_id` appears under `src/app/admin`
              only in the skill CATALOG editor, which sets a SKILL's role, never
              a provider's. ⚠ **Reported, not built: rule 5 and ruling 21 keep an
              admin surface out of this brief.**

              ── ⚠⚠ THREE THAT HAVE NOT MOVED, EACH FOR A MEASURED REASON ──────

              ⚠⚠⚠ **`Contact Details` STAYS UNTIL ITS DESTINATION EXISTS.** WS-B
              says the address *"lives in Settings"* — ⚠ **MEASURED: IT DOES
              NOT.** `/settings/contact` renders the sentence *"Your address
              lives with your profile"* and **points back here.** ⚠⚠ Removing
              this link today would leave **no entrance at all** to the one
              editor that writes it — `CLAUDE.md` rule 5, and the failure `E598`
              avoided by making a control *"leave and arrive in the same
              commit."* **The move is a real build and gets its own slice.**
              ⚠ `Address.country` **already exists** as a column, so *"ADD
              COUNTRY — Panameer is global"* is a RENDER-and-EDIT job, **not a
              schema window.** Measured, so nobody briefs a migration for it.

              ⚠⚠⚠ **`Languages` HAS LEFT THIS ROW (`P2-A2-E671`).** ⚠ SUPERSEDED,
              quoted not deleted (`E164`):
              //   ⚠⚠ **`Languages` STAYS UNTIL ITS CARD EXISTS.** WS-B: it
              //   *"becomes its own CARD, with its own Edit, and each language
              //   carries its abilities."* That is a card build, not a link
              //   move, and the same leave-and-arrive rule applies.
              ⚠⚠ **THE CARD LANDED IN `0429791` (`E643`) AND THIS LINK WAS NEVER
              REMOVED**, so the page carried TWO doors to
              `/profile/edit/languages` — and the sentence above went on
              justifying a link whose condition had already been met.
              ⚠⚠⚠ **THAT IS THE 2026-09-23 RULES ITEM 6 IN ITS PUREST FORM: the
              code was right, the stated rule was wrong, and the stated rule is
              what the next reader would have implemented.** Found by reading
              during `E670`'s verification pass — no gate asserts it.

              ⚠⚠⚠ **`How You Work` HAS NOW MOVED (`P2-A2-E715` row 13) AND THE
              SENTENCE BELOW IS SUPERSEDED.** ⚠ SUPERSEDED, quoted not deleted
              (`E164`):
              //   **`How You Work` STAYS BECAUSE THIS CARD DOES NOT RENDER IT.**
              //   There is no work-method line here to sit beside, so moving the
              //   control would mean **moving it to nothing.**
              ⚠⚠ **ITS CONDITION WAS MET BY THIS BRIEF, NOT BY A CHANGE OF MIND:**
              the meta line now renders location, member-since and languages, so
              there IS somewhere for it to sit. ⚠ Standing rule 6 — the code moved
              and the stated rule had to move with it, or the next reader restores
              a control to a card that no longer holds its subject.
            */}
            {/*
              ⚠⚠⚠ **THEY NAME WHAT THEY EDIT WHILE THEY ARE STILL A ROW.**
              ⚠ MEASURED AT 390px: three bare `✏️ Edit` links side by side, each
              identical, each reaching a different editor — **a member has to
              guess, and the guess is a page load.** ⚠⚠ That is Scott's *"in the
              wrong place"* complaint in its purest form: the label was carried
              only by `aria-label`, so **a sighted member had strictly less
              information than a screen-reader one.**
              ⚠ `EditLink`'s `label` prop already existed for exactly this; the
              `aria-label` still reads *"Edit Contact Details"* and is unchanged.
              ⚠⚠ **THIS IS NOT A SUBSTITUTE FOR MOVING THEM** — each still goes
              beside its subject once its destination exists. It is the honest
              state until then, rather than three anonymous controls left as-is
              because the real fix is queued.
            */}
            {/*
              ── ⚠⚠ THE EDIT ROW IS EMPTY AND SO IT IS GONE (`P2-A2-E715` row 13) ────────

              ⚠ It held three controls, then two, then one. `How You Work` was the last and it
              has moved into the meta line, so the wrapper had nothing left to lay out.
              ⚠⚠ **AN `{owner && <div …>}` CONTAINING ONLY COMMENTS STILL RENDERS A DIV WITH A
              MARGIN** — an invisible 10px of dead space on every owner's page, and the kind of
              residue that survives three briefs because nothing points at it.
              ⚠ The three reasons below are KEPT, because each records why a control left and
              where it went — that history is the point of `E164`.

                  ── ⚠⚠⚠ `Contact` HAS LEFT FOR SETTINGS (brief 10 WS-B) ───────

                  ⚠ SCOTT: *"Edit Address → lives in Settings."*
                  ⚠⚠⚠ **IT LEAVES IN THE SAME COMMIT THE EDITOR ARRIVES THERE**
                  — `E598`'s leave-and-arrive, and `69b` aimed at a route.
                  **`/settings/contact` now mounts the address fields**; before
                  this commit it rendered *"Your address lives with your
                  profile"* and pointed BACK here, so removing this link on its
                  own would have left **the only writer of the address with no
                  entrance at all** (rule 5).
                  ⚠⚠ **THE TWO SEARCH-SCORE LINES MOVED WITH IT** — `identity`
                  and `location` in `profile-score-copy.ts` — or they would have
                  become the dead ends this removal exists to avoid.
                  ⚠ **THE LOCATION LINE ON THE CARD STAYS**, because it is
                  DERIVED from the address and is what Scott asked to keep.
                  ⚠ SUPERSEDED, quoted not deleted (`E164`):
                  //   <EditLink href={editHref("contact")} title="Contact Details" label="Contact" />
                */}
                {/* ⚠⚠⚠ REMOVED (`P2-A2-E671`): THE LANGUAGES CARD NOW EXISTS AND
                    CARRIES ITS OWN EDIT, so this row link was a SECOND door to
                    `/profile/edit/languages` — and one that is not beside the
                    thing it edits, which is the whole point of WS-B.
                    ⚠ It is residue: `0429791` (`E643`) ADDED the card and never
                    removed this line. ⚠⚠ The comment above that justified keeping
                    it — *"`Languages` STAYS UNTIL ITS CARD EXISTS"* — became false
                    the moment that commit landed, and is corrected there.
                    ⚠ SUPERSEDED, quoted not deleted (`E164`):
                    //   <EditLink href={editHref("languages")} title="Languages" label="Languages" /> */}
                {/* ⚠⚠⚠ `How You Work` MOVED INTO THE META LINE (`E715` row 13), where it sits
                    as a plain link beside location, member-since and languages.
                    ⚠ **IT IS NOT DROPPED — rule 5: it may be the only entrance** to
                    `/profile/edit/work-method`, and MEASURED, it is: nothing else on this page
                    links there. ⚠ SUPERSEDED, quoted not deleted (`E164`):
                    //   <CleanEdit href={editHref("work-method")} title="How You Work" label="How You Work" /> */}
            {owner && (
              <div className="mt-4 flex flex-col">
                {/*
                  ── ⚠⚠⚠ ROW 4 — SQUARE, FULL WIDTH, INK. NOT A MAGENTA PILL ─────────────

                  ⚠ **SCOTT: *"I like your black buttons and angles better."*** ⚠⚠ 4px corners
                  and solid ink with white text; the secondary is white with a 1px ink border.
                  ⚠⚠⚠ **THIS DOES NOT REOPEN RULING `31e`.** That ruling keeps the CHIPS
                  magenta and reserves magenta for the affordance that says *"this is a
                  link"* (`E433`). These two are the page's primary controls, they are the
                  only things the mockup draws in ink, and every other magenta affordance on
                  the page is untouched.
                  ⚠ The classes live in `connect-profile.css` as `.pm-btn` — the geometry is
                  declared in one place, the same rule this file's grid already follows.
                  ⚠ SUPERSEDED, quoted not deleted (`E164`):
                  //   className="rounded-full bg-magenta px-3.5 py-2 text-center text-[13px] font-bold text-white transition-colors hover:bg-magenta-dark"
                  //   className="rounded-full border border-line px-3.5 py-2 text-center text-[13px] font-bold transition-colors hover:border-magenta/50"
                */}
                {/*
                  ── ⚠⚠⚠ `What's Missing or Incomplete?` IS REMOVED (`P2-A2-E716`) ──────────

                  ⚠ **SCOTT, 2026-09-30.** The button went to `/community/score`; **the
                  Search Score block directly below it is about that page and now carries the
                  door itself** — its small-caps label and its items-left line both link there.
                  ⚠⚠⚠ **RULE 5 IS THE RISK AND IT IS MEASURED, NOT ASSERTED:** removing a
                  control can remove a capability's only entrance. `e2e-e716/door.spec.ts`
                  RECORDS this button's `href` from the running page BEFORE the change, then
                  asserts the new links carry **the same href**, then **clicks one and asserts
                  where it lands.** ⚠ A comparison against a string typed into a spec would
                  pass even if this button had always pointed somewhere else.
                  ⚠⚠ **THE OTHER ENTRANCE IS THE `Score` TAB** in the profile's own row, which
                  is untouched — so the page was never reachable from here alone.
                  ⚠ SUPERSEDED, quoted not deleted (`E164`) — the button, its label history
                  and the reasoning for that label:
                  //   <Link href="/community/score" data-e715-btn className="pm-btn pm-btn-primary transition-colors">
                  //     (comment: Scott, WS-B, renamed it to "What's Missing or Incomplete?" —
                  //      "(page is correct)", so the DESTINATION was untouched and only the
                  //      label changed. The older label promised an action the page does not
                  //      perform: "Complete Your Profile" reads as a button that completes it,
                  //      while /community/score SHOWS you what is missing.)
                  //     (comment: superseded before that — "Complete Your Profile")
                  //     What&rsquo;s Missing or Incomplete?
                  //   </Link>
                */}
                {/*
                  ── ⚠⚠ AND THIS ONE TAKES THE INK (`E716`) ────────────────────────────────

                  ⚠ **SCOTT: `How Others See My Profile` becomes the solid ink button — the
                  style the removed one had.** ⚠⚠ With the primary gone, a lone outlined
                  button reads as a secondary action with no primary above it; the column's
                  one remaining control is now its principal one and is drawn that way.
                  ⚠ **PROVED BY COMPARISON, NOT BY EYE:** the spec reads the REMOVED button's
                  computed `backgroundColor` and `color` from the before-run and asserts this
                  button now matches them.
                  ⚠ SUPERSEDED, quoted not deleted (`E164`):
                  //   className="pm-btn transition-colors"
                */}
                <Link
                  href={`/providers/${p.id}`}
                  data-e715-btn
                  className="pm-btn pm-btn-primary transition-colors"
                >
                  {/*
                    ⚠ SCOTT, WS-B: rename to **"How Others See My Profile"**.
                    ⚠⚠ IT IS MORE THAN A TIDY-UP — ruling 39 settled that **ONE
                    preview button is the only entrance** and a switch inside the
                    preview chooses `As a Buyer` / `As a Provider`. ⚠⚠⚠ *"See
                    What Buyers See"* names ONE of the two audiences, so the
                    label would be **false for half of what the page now does.**
                    "Others" is the word that covers both.
                    ⚠ SUPERSEDED, quoted not deleted (`E164`):
                    //   See What Buyers See
                  */}
                  How Others See My Profile
                </Link>
                {/*
                  ── ⚠⚠⚠ `Rebuild From New Résumé` LIVES HERE NOW (`P2-A2-E720` item 9) ──────

                  ⚠ **SCOTT: *"a magenta text link under How Others See My Profile"*** — and
                  *"Remove it from the Work History slot."*
                  ⚠⚠ **WHY THE WORK HISTORY SLOT WAS THE WRONG HOME:** the control rewrites
                  skills, specializations, education, certifications, languages, the headline
                  and the overview — **nine categories, of which work history is one** — so
                  hanging it off that one section's header understated it and buried it under a
                  heading that could itself be collapsed.
                  ⚠⚠⚠ **AND IT WAS INVISIBLE THERE ANYWAY, FOR A REASON THAT HAD NOTHING TO DO
                  WITH PLACEMENT: `ResumeImportAction` RETURNS `null` WITHOUT A STORED
                  DOCUMENT, AND 59 OF 63 PROFILES HAVE NONE.** Moving it would not have fixed
                  that, which is why the new component offers an UPLOAD rather than assuming a
                  file is already there. See its header for the full measurement.
                */}
                <OwnerResumeRebuild />
              </div>
            )}
        </div>

        {/*
          ── ⚠⚠⚠ ROW 10 — THE RAIL'S ORDER IS THE MOCKUP'S ─────────────────────────────

          ⚠ **Photo · buttons · SEARCH SCORE · Rates · Visibility · Rank Higher**, each block
          separated by a thin line and headed by a small-caps grey label.
          ⚠⚠ It was identity · Visibility · Rates · score · Rank Higher, so **Visibility — a
          switch — sat above the two blocks a member actually reads.**
          ⚠⚠⚠ **THE PHONE ORDER IS NOW KEYED ON THE CLASSES `pm-rail-identity` AND
          `pm-rail-rates`, NOT ON `:nth-child`.** Reordering these blocks under the old
          positional rules would have lifted Search Score above the record and dropped Rates
          below it — reversing Scott's own phone ruling silently. See `connect-profile.css`.
        */}

        {/*
          ── ⚠⚠ ROW 9 — SEARCH SCORE, AND THE FIGURE IS NOT A NEW ONE ────────────────

          ⚠⚠⚠ **`score.total` IS THE VALUE `/community/score` RENDERS.** Both come from
          `computeProfileScore(buildCompletenessInput(profileId))` — measured at
          `community/score/page.tsx:101` against `profile/page.tsx`'s `ownerScore()`. **One
          definition (`E585`); nothing is recomputed here and no second rule is written.**
          ⚠⚠ `CompletionRing` IS DELIBERATELY NOT REUSED: it is the SEGMENTED, hover-targeted
          ring the score PAGE draws, and the mockup asks for a thin ink ring with the number
          in it. ⚠ **The ring is presentation; the number is the definition.** Reusing the
          figure and drawing it differently is the correct split — the opposite would be
          computing a second figure to feed the same picture.
          ⚠ The minutes are summed from the SAME `SCORE_LINE_COPY` table the two "next" lines
          below already use, so the block cannot quote work the score page does not.
          ⚠ SUPERSEDED, quoted not deleted (`E164`) — the score block used to sit BELOW Rates
          and Visibility, as a bare `<Link className="group mt-7 block border-t …">` with
          `<CompletionRing score={score} />` and a `Complete Profiles Sell Services` caption.
        */}
        {/*
          ── ⚠⚠⚠ TWO NAMED DOORS, NOT ONE BLOCK-WIDE LINK (`P2-A2-E716`) ──────────────

          ⚠ **SCOTT: the label links to the Score tab, and the items-left line links to the
          destination the removed button had.** Both are `/community/score`.
          ⚠⚠ **THE WHOLE BLOCK USED TO BE ONE `<Link>`, AND THAT WAS WORSE THAN IT LOOKED:**
          a screen reader announced the ring, the number, `of 100` and the items line as a
          SINGLE link whose accessible name was all of that text run together. ⚠⚠⚠ **TWO
          links that say what they are beat one link that swallows the block** — the same
          reasoning as `E600` WS-B's six identical `Edit` controls, where the label was
          carried only by `aria-label`.
          ⚠ **THE RING AND `of 100` ARE NOW PLAIN, AND THAT IS DELIBERATE:** a figure is not
          a control (`E433`). The two things a member can act on are the two things that
          look like links.
          ⚠ SUPERSEDED, quoted not deleted (`E164`):
          //   <CleanSide title="Search Score">
          //     <Link href="/community/score" className="group flex items-center gap-4">
          //       <span className="pm-score-ring" style={…}><span>{score.total}</span></span>
          //       <span className="min-w-0 text-[13px] leading-snug text-ink-2">
          //         of 100<br />
          //         {remainingLines > 0 ? (<span className="group-hover:underline">…</span>)
          //                             : (<span className="group-hover:underline">Nothing outstanding</span>)}
          //       </span>
          //     </Link>
          //   </CleanSide>
        */}
        {/* ⚠ SUPERSEDED POSITION, quoted not deleted (`E164`): the Search Score block used
            to be rendered here, second in the rail. It is now `scoreBlock`, rendered inside
            `pm-rail-top` so the phone can place it beside the photo. */}

        {/*
          ── ⚠ SUPERSEDED POSITION (`P2-A2-E718` item 3) ──────────────────────────────

          ⚠ **RATES WAS RENDERED HERE, THIRD IN THE RAIL. IT IS NOW LAST**, immediately above
          `</aside>` — *"so the work is seen before the cost."*
          ⚠⚠ The reasoning that lived here travelled WITH the block and is unchanged at its
          new position: it is rendered for BOTH personas and must never be moved inside the
          `owner` branch, because `/providers/[id]` renders this component in visitor mode and
          that would silently remove Rates from the buyer's page. `p.rates` is already `null`
          for anyone who may not see it — the view model's decision, not this component's.
          ⚠ **THE LABELS AND AMOUNTS ARE UNTOUCHED** (ruling 64c): nothing is relabelled until
          the three-rate migration. `RateRows` is not edited; only where the column renders.
        */}

        {/*
          ── ⚠⚠⚠ VISIBILITY ARRIVES FROM SETTINGS (ruling 78) ───────────────

          ⚠ The Profile Visibility SECTION is deleted and this one control moves
          here, **in the same commit** (`E598`'s leave-and-arrive). ⚠⚠ It is the
          only lever that touches the marketplace gate, so a window where it has
          no home is a window where a provider **cannot take themselves out of
          the market**.
          ⚠⚠⚠ OWNER ONLY, and that is not cosmetic: `p.paused` and
          `p.completeness` are the owner's own figures, and a visitor must not
          be told whether somebody has paused themselves.
          ⚠ IT MOVED BELOW RATES (`E715` row 10) — a switch does not lead a column.
        */}
        {/* ⚠⚠ `P2-A1.1-E738` — the two public-preview switches and the member's
            own `/in/<slug>` link join this card. ⚠ `publicUrl` is resolved by
            the OWNER'S PAGE and is null on every other surface, so a visitor
            render cannot mint a slug. */}
        {owner && (
          <ProfileVisibilityCard
            paused={p.paused}
            previewHidden={p.previewHidden}
            publicName={p.publicName}
            publicUrl={p.publicUrl}
          />
        )}

        {owner ? (
          <>
            {/*
              ── ⚠⚠⚠ THE OLD SCORE CARD IS GONE; ROW 9's BLOCK REPLACED IT ABOVE ─────────

              ⚠ It sat FOURTH in the rail, below Visibility, and carried a segmented
              `CompletionRing`, a `Complete Profiles Sell Services` caption, a hook line, the
              two next items with minutes, and a `See all N` link. ⚠⚠ **THE MOCKUP'S BLOCK IS
              A THIN INK RING, `of 100` AND ONE ITEMS-LEFT LINE**, SECOND in the column.
              ⚠⚠⚠ **NOTHING COUNTED IS LOST — IT IS RELOCATED OR NAMED:** the score is the
              ring, `remainingLines` is the items-left line, and the minutes are now SUMMED
              across every outstanding line rather than only the two that were listed. The
              whole block is still one link to `/community/score`, where the per-line detail
              lives, so **no entrance is removed** (rule 5).
              ⚠⚠ `completionHook` AND `CompletionRing` ARE NOT DELETED — `/community/score`
              still renders the ring exactly as before; only this page stopped drawing it.
              ⚠ **QUOTED WITH `//`, INNER COMMENTS PARAPHRASED — load-bearing rule 12.** The
              block carried two inner comment terminators, so wrapping it in a block comment
              would have closed this one early and cascaded.
              ⚠⚠⚠ **AND IT CAUGHT ME WRITING THIS VERY NOTE:** the sentence above originally
              spelled the terminator out, which closed this comment at that word and produced
              four parse errors. **The rule applies to prose ABOUT the rule** — name the
              character, never type it.
              ⚠ SUPERSEDED, quoted not deleted (`E164`):
              //   {score && (
              //     <Link href="/community/score" className="group mt-7 block border-t border-line pt-5">
              //       <CompletionRing score={score} />
              //       <p className="mt-2 text-center text-[12.5px] font-bold text-ink-2">
              //         Complete Profiles Sell Services
              //       </p>
              //       (comment: computed, not hard-coded; says something else at 100%
              //        rather than printing "0 lines left")
              //       <p className="mt-1.5 text-center text-[12px] leading-snug text-ink-3">
              //         {completionHook(score)}
              //       </p>
              //       {nextLines.length > 0 && (
              //         <ul className="mt-3 border-t border-line pt-2.5">
              //           {nextLines.map((l) => (
              //             <li key={l.key} className="flex items-center justify-between gap-2 py-1 text-[12.5px]">
              //               <span className="min-w-0 truncate text-ink-2">{l.label}</span>
              //               (comment: E433 - a figure is INK, never magenta)
              //               <span className="flex-none font-semibold tabular-nums text-ink-3">
              //                 {l.minutes} min
              //               </span>
              //             </li>
              //           ))}
              //         </ul>
              //       )}
              //       (comment: E433 - the one magenta thing in the card is the affordance
              //        that says it is a link)
              //       <p className="mt-2 text-center ... text-magenta group-hover:underline">
              //         {remainingLines > 0 ? `See all ${remainingLines} ->` : "See your score"}
              //       </p>
              //     </Link>
              //   )}
            */}

            <section className="pm-rail-rank mt-7 border-t border-line pt-5">
                            {/*
                              ⚠⚠ THE TITLE STAYS `Grow` FOR NOW (Scott, 2026-09-22, at the
                              `E599` WS-B gate): *"keep its title 'Grow' for now. The
                              profile-pages brief renames it once search ranking makes the
                              new title true."* ⚠ A title that promises ranking before
                              ranking exists is the `E579` shape in copy.
                            */}
                            {/*
                  ── ⚠⚠⚠ `Rank Higher in Search Results` (`E013`) ─────────────

                  ⚠ `E598` WS-C and `E600` WS-B both kept the title `Grow`
                  DELIBERATELY, because the new one promised something the
                  product did not do. ⚠⚠ `E600` WS-E MAKES IT TRUE and ships the
                  rename in the same merge, which is the condition Scott set.
                  ⚠ SUPERSEDED, quoted not deleted (`E164`):
                  //   <h2 …>Grow</h2>

                  ⚠⚠⚠ IT IS TRUE ON ONE SURFACE TODAY — `Invite More` on a work
                  request, where `growthScore` breaks the tie below match weight
                  and skill overlap. ⚠ Scott, 2026-09-22: *"it is mostly
                  marketing… but it is important to give the younger users a
                  fighting chance to rank."*
                  ⚠ KNOWN-OPEN, recorded in the brief: the title is FULLY true
                  once Shop and Work search exist, and both must use growth the
                  same way — after relevance.
                */}
                {/*
                  ⚠ **THE WORDS ARE UNCHANGED, ONLY THE WEIGHT** (`E715` row 10): every rail
                  block is *"headed by a small-caps grey label"*, and this was the one heading
                  still set as a 15px bold title.
                  ⚠⚠ **RENAMING IT WOULD REOPEN A RULING.** `Rank Higher in Search Results`
                  was withheld until `E600` WS-E made it true, on Scott's condition; the
                  mockup's shorter `Rank Higher` is a LAYOUT sketch, not a re-ruling of copy.
                  ⚠ SUPERSEDED, quoted not deleted (`E164`):
                  //   <h2 className="mb-2 font-display text-[15px] font-bold">
                */}
                <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                  Rank Higher in Search Results
                </h2>
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
                                  /* ⚠⚠⚠ `Grow Your Community` (`E601` WS-C). Scott, 2026-09-22:
                                     *"'Grow Your Community' wins. 'Network' is retired, not kept
                                     as a second name for the same thing."*
                                     ⚠ A RULING AGAINST A RULING, NOT DRIFT (rule 13) — `E599`
                                     shipped this label deliberately. ⚠ SUPERSEDED, quoted not
                                     deleted (`E164`):
                                     //   label: "Grow the Network", */
                                  label: "Grow Your Community",
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
              <section className="mt-7 border-t border-line pt-5">
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
            {/*
              ── ⚠⚠⚠ THE RATE LINE IS GONE; THE `RATES` BLOCK KEEPS IT (`E718` item 9) ──────

              ⚠ **SCOTT: *"Rates shown twice in the visitor view… the `About this provider ·
              Rate $145.00` line repeats what the RATES block shows below it."*** ⚠⚠ Both were
              reading the same view-model field, so a buyer met the same number twice on one
              screen — `E585` in its plainest form.
              ⚠⚠⚠ **RULING 9 IS UNCHANGED AND NOTHING IS WITHHELD: BUYERS SEE RATES.** What is
              removed is the DUPLICATE, not the fact. The `RATES` block still renders for both
              personas, from `p.rates`, which the view model already nulls for anyone who may
              not see it — **and `E718` item 3 put it near the bottom for the visitor too**, so
              the two views now agree on where the cost is stated.
              ⚠ **THE WHOLE SECTION IS NOW CONDITIONAL.** With the Rate row gone, an
              unvalidated provider with no `experience` would have rendered a lone
              `About this provider` heading over nothing — Scott: *"If `About this provider` is
              left empty, remove the heading too."*
              ⚠ SUPERSEDED, quoted not deleted (`E164`):
              //   <TrustRow label="Rate" value={rateRange(p)} />
            */}
            {(p.validated || p.experience) && (
            <section className="mt-7 border-t border-line pt-5">
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
              {/*
                ⚠⚠⚠ THE LANGUAGES ROW LEFT THIS STRIP FOR ITS OWN CARD (WS-B).
                ⚠ It flattened every language to a name and dropped the ability
                the view model was already carrying. ⚠⚠ **IT IS NOT DUPLICATED
                BELOW AND ABOVE** — the card replaces it, so the page states
                each language once, with what the member can actually do in it.
                ⚠ SUPERSEDED, quoted not deleted (`E164`):
                //   <TrustRow
                //     label={p.languages.length > 1 ? "Languages" : "Language"}
                //     value={p.languages.length > 0
                //       ? p.languages.map((l) => l.name).join(", ") : null}
                //   />
              */}
            </section>
            )}

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
              ⚠⚠ IT LINKS TO `/community/groups`, THE SURFACE — not to a
              specific board, because board access is gated on enrolment or
              teaching (`canAccessPathForum`) and this viewer may have neither.
              **A link that 403s is a dead door with a nicer sign.**
            */}
            {visitorGroups.length > 0 && (
              <section className="mt-7 border-t border-line pt-5">
                <h3 className="mb-2.5 font-display text-[14.5px] font-bold leading-tight">
                  Groups
                </h3>
                <div className="flex flex-wrap gap-2">
                  {visitorGroups.slice(0, 6).map((g) => (
                    /*
                      ── ⚠⚠⚠ THE SKILLS CHIP, NOT A SECOND MAGENTA (`P2-A2-E720` item 5) ────

                      ⚠ **SCOTT: *"every chip on /profile and /providers/[id] (Groups,
                      Teaching, all of them) uses the Skills chip. One definition."***
                      ⚠⚠ `CHIP_TAG` WAS ALREADY *"the one definition"* — of a DIFFERENT chip.
                      It and `CLEAN_CHIP` were both magenta tags and differed in five
                      utilities at once: a real `border` (which adds 2px to the box) against
                      an inset shadow, a `bg-magenta/[0.06]` wash against none, `13px` against
                      `12px`, `font-semibold` against `font-medium`.
                      ⚠⚠⚠ **SO THE COMMENT BELOW WAS TRUE AND STILL LEFT TWO CHIPS ON ONE
                      PAGE** — it is the exact failure `E585` describes, one step up: each
                      family had one definition, and nothing said the families were one thing.
                      ⚠ **`CHIP_TAG` ITSELF IS NOT EDITED, DELIBERATELY:** it is also read by
                      `/join/provider`'s review step in three places, and repainting a surface
                      this brief never looked at is not in scope. The CALL SITE moves instead.
                      ⚠ SUPERSEDED, quoted not deleted (`E164`) — its reasoning was sound:
                      //   A TAG CHIP, SO MAGENTA (ruling 31e, P2-A2-E670) - and it reads the
                      //   ONE definition rather than hand-rolling a second magenta string,
                      //   which is how the skill/spec split arose in the first place (E585).
                      //   <span key={g} className={CHIP_TAG}>
                    */
                    <span key={g} className={CLEAN_CHIP}>
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
                  href="/community/groups"
                  className="mt-2.5 inline-block text-[13px] font-bold text-magenta hover:underline"
                >
                  Browse Groups
                </Link>
              </section>
            )}

            {/*
              ── ⚠⚠⚠ `Hire` IS FIRST, AND THE OTHER TWO STEP BACK (`P2-A8-E719`) ─────────────

              ⚠ **SCOTT: solid ink, first of the actions, above `Message` and `Connect as a
              Colleague`, which become white with an ink border.**
              ⚠⚠ **THE RAIL HAD THREE CONTROLS OF EQUAL WEIGHT AND NO PRIMARY** — a buyer who
              wanted to hire had to find the action among two social ones.
              ⚠⚠⚠ **IT RENDERS ONLY FOR A SIGNED-IN MEMBER WHO CAN BUY AND IS NOT THE OWNER.**
              `canHire` is the page's answer; the route checks the same capability again, and
              `resolveBuyer` checks the column a third time. **The button is what is drawn,
              never who may act.**
              ⚠ `p.person.personId` is the PROVIDER's person id — the same id
              `ShortlistLine.provider_person_id` holds — so nothing is looked up twice.
            */}
            {canHire && p.person.personId && (
              <section className="mt-7 border-t border-line pt-5">
                <h3 className="mb-2.5 font-display text-[14.5px] font-bold leading-tight">
                  Hire
                </h3>
                <HireButton providerPersonId={p.person.personId} />
                <p className="mt-2.5 text-[12px] leading-relaxed text-ink-2">
                  {/* ⚠ It says what the click DOES, because it creates a row. A control that
                      writes something and does not say so is the surprise this sentence
                      exists to remove. */}
                  Starts a work request for this provider only. You can complete the
                  details before anyone is contacted.
                </p>
              </section>
            )}

            {/*
              ── ⚠⚠⚠ THE ORDER IS SCOTT'S (`P2-A3-E723` item 4) ──────────────────────────────

              ⚠ **`Hire` · `Message` · `Connect as a Colleague` · `Request to Mentor`.**
              ⚠⚠ `Message` MOVED FROM LAST TO SECOND. It was written last because `E719` added
              `Hire` above an existing pair; the rail then read Hire · Connect · Mentor ·
              Message, which buries the one action a buyer already has permission to take
              under two that ask the provider for something.
              ⚠⚠⚠ **NOTHING ABOUT THE CONTROLS CHANGED — ONLY THEIR ORDER.** Each section keeps
              its own heading, guard and copy, so the `canMessage` verdict, the capability
              gate on `Hire` and the `open_for_mentoring` consent gate are untouched.
            */}
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
            <section className="mt-7 border-t border-line pt-5 text-center">
              <h3 className="mb-2.5 font-display text-[14.5px] font-bold leading-tight">
                Message
              </h3>
              {messagePermission?.ok ? (
                <Link
                  href={`/messages?with=${p.person.userId ?? ""}`}
                  /* ⚠ WHITE WITH AN INK BORDER (`E719`) — `Hire` is the primary on this rail
                     now, and two solid fills would say there are two primaries. `pm-btn` is
                     the same shape the profile's own button uses, so the three controls read
                     as one family. ⚠ SUPERSEDED, quoted not deleted (`E164`):
                     //   className="block w-full rounded-full bg-magenta px-3.5 py-2.5 text-[13.5px] font-bold leading-tight text-white transition-colors hover:bg-magenta-dark" */
                  className="pm-btn transition-colors"
                >
                  Message
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    disabled
                    /* ⚠ THE DISABLED FACE KEEPS THE FAMILY'S SHAPE BUT NOT ITS BORDER
                       (`E719`). Scott asked for Message to become white with an ink border;
                       **that is the ENABLED face.** A disabled control drawn like an enabled
                       one is the defect `E579` names — a door onto a wall — so this stays
                       visibly dead and only stops being a pill among 4px neighbours.
                       ⚠ SUPERSEDED, quoted not deleted (`E164`):
                       //   className="block w-full cursor-not-allowed rounded-full bg-line px-3.5 py-2.5 text-[13.5px] font-bold leading-tight text-ink-3" */
                    className="pm-btn cursor-not-allowed border-line bg-line text-ink-3"
                  >
                    Message
                  </button>
                  {/*
                    ── ⚠⚠⚠ THREE STATES, NOT TWO. `null` IS NOT `!ok`. ─────────

                    ⚠ SCOTT'S WALK: ***"Message Profile (Viewing in 360) —
                    button is not clickable."*** ⚠⚠ **MEASURED ON HIS OWN 360
                    PREVIEW:** the section renders, the button is `disabled`,
                    and **the reason paragraph does not render at all** — so the
                    control was **greyed out and silent.**
                    ⚠⚠⚠ **THAT IS A DASH WITH NO REASON, IN BUTTON FORM** — the
                    exact thing `PatternHeader`'s type makes unrepresentable for
                    a figure, and the counting rules' second line: *a real zero
                    and an uncountable must not look the same.*

                    ⚠ **WHY IT WAS SILENT:** `/providers/[id]` passes
                    `messagePermission: null` when `profile.isOwner`, because
                    `canMessage` is never asked about somebody messaging
                    themselves. ⚠⚠ The old guard tested `messagePermission &&
                    !ok`, so **`null` fell through both branches** — it is
                    neither a yes nor a stated no.

                    ⚠⚠⚠ **THE VERDICT IS NOT FABRICATED TO FILL THE GAP.**
                    Inventing a `MessagePermission` for the owner in the page
                    would put a verdict in the lib's shape that the lib never
                    gave — `canMessage` stays byte-unchanged and this component
                    still *reads* the rule rather than restating it. **`null`
                    means "not applicable to this viewer", and that is rendered
                    as its own honest sentence.**
                    ⚠ **THE PREVIEW STAYS FAITHFUL** (`E602` WS-D: *"See What
                    Buyers See MEANS EXACTLY THAT"*) — the control still appears
                    where a buyer would find it, so the owner learns it exists;
                    it simply says why *they* cannot press it.
                  */}
                  <p className="mt-2.5 text-[12px] leading-relaxed text-ink-2">
                    {messagePermission
                      ? messagePermission.message
                      : "This is where buyers message you. You can't message yourself."}
                  </p>
                </>
              )}
            </section>

            {connect && (
              <section className="mt-7 border-t border-line pt-5">
                <h3 className="mb-2.5 font-display text-[14.5px] font-bold leading-tight">
                  Connect as a Colleague
                </h3>
                {connect}
                <p className="mt-2.5 text-[12px] leading-relaxed text-ink-2">
                  Colleagues can message each other.
                </p>
              </section>
            )}

            {/*
              ── ⚠⚠⚠ THE REAL CONTROL, NOT A DOOR TO A DIRECTORY (`P2-A2-E720` item 10) ─────

              ⚠ **SCOTT: *"Request as Mentor joins the visitor actions after Connect as a
              Colleague (white, ink border), reusing ConnectControls. It shows state once
              followed."***
              ⚠⚠ **WHAT WAS HERE WAS AN `ActionCard` LINKING TO `/community/mentors`** — a link
              to the mentors DIRECTORY, which is a different page about different people. It
              could not follow anybody and it could not show state, so *"Request Mentoring"*
              named an action the control did not perform. `ConnectControls` performs it.
              ⚠ **IT SITS AFTER `Connect as a Colleague` AND BEFORE `Message`**, which is the
              order Scott named.

              ── ⚠⚠⚠ THE CONSENT GATE IS KEPT, AND IT MAKES THIS INVISIBLE TODAY ───────────

              ⚠ **`p.openForMentoring` IS `ProviderProfile.open_for_mentoring`
              (`schema.prisma:1102`)** — a real column whose own 23-line docblock says **THE
              CHECKBOX IS THE CONSENT** and *"EXPLICIT OPT-IN, NEVER A DEFAULT"*, and which is
              why `ConnectionKind.MENTOR` needs no PENDING state. ⚠⚠ **SO THE SCHEMA CAN ANSWER
              SCOTT'S QUESTION AND NO FIELD WAS ADDED.**
              ⚠⚠⚠ **MEASURED, AND REPORTED RATHER THAN QUIETLY WORKED AROUND: 0 OF 63 PROFILES
              HAVE THE FLAG SET, AND THERE ARE 0 `MENTOR` ROWS — SO THIS SECTION RENDERS FOR
              NOBODY UNTIL A PROVIDER TICKS THE BOX.** ⚠ Dropping the gate would have made it
              appear immediately and would have offered to attach mentees to 63 providers who
              never opted in — **overturning a documented consent ruling inside a styling
              item**, which rule 13 says is a decision to RAISE, not to make quietly.
              ⚠ SUPERSEDED, quoted not deleted (`E164`):
              //   {p.openForMentoring && (<ActionCard title="Request Mentoring"
              //     label="Request Mentoring" href="/community/mentors" note="Open to mentoring." />)}
            */}
            {mentor && p.openForMentoring && (
              <section className="mt-7 border-t border-line pt-5">
                <h3 className="mb-2.5 font-display text-[14.5px] font-bold leading-tight">
                  {/*
                    ── ⚠⚠⚠ BACK TO `Request to Mentor` (`P2-A3-E721` item 3) ─────────────

                    ⚠ **SCOTT CONFIRMED `Request to Mentor`, 2026-09-30**, which is the label
                    he ruled on 2026-09-25 and which the BUTTON inside this section has said
                    all along. ⚠⚠ `E720` took *"Request as Mentor"* from the wording of the
                    brief and **shipped a heading that disagreed with the control underneath
                    it** — two names for one action, six lines apart.
                    ⚠⚠⚠ **`E720` RAISED IT RATHER THAN PICKING A SIDE, AND THIS IS THE ANSWER
                    COMING BACK** — rule 13 working in the direction it is meant to: the
                    question went to Scott and his ruling is now the code.
                    ⚠ SUPERSEDED, quoted not deleted (`E164`):  //   Request as Mentor
                  */}
                  Request to Mentor
                </h3>
                {mentor}
                <p className="mt-2.5 text-[12px] leading-relaxed text-ink-2">
                  {/* ⚠⚠ IT SAYS WHAT THE BUTTON DOES. A `MENTOR` row is created `ACCEPTED`
                      unilaterally — the connection model's one-way exception — so nobody
                      approves this and the copy must not imply a wait. */}
                  This provider is open to mentoring. Following them does not need their
                  approval, and it does not let either of you message the other.
                </p>
              </section>
            )}

          </>
        )}
        {/*
          ── ⚠⚠⚠ ITEM 3 — RATES MOVES TO THE BOTTOM OF THE RAIL (`P2-A2-E718`) ────────────

          ⚠ **SCOTT: *"Rates move near the bottom, so the work is seen before the cost."***
          ⚠⚠ It was SECOND in the column, directly under the photo, so the first thing a
          buyer read about a provider was their price.
          ⚠⚠⚠ **IT MOVES IN THE DOM, NOT BY A CSS `order`** — so the keyboard and a screen
          reader meet it last too, which is the same claim the page makes visually. A CSS-only
          reorder would have moved the picture and left the reading order saying the opposite.
          ⚠ **THE SAME IN THE VISITOR VIEW**, which is Scott's instruction and is automatic
          here: this block sits OUTSIDE the owner/visitor branch, so both personas get one
          position. ⚠⚠ `p.rates` is already `null` for anyone who may not see it — the view
          model's decision, untouched.
        */}
        {p.rates && (
          /*
            ── ⚠⚠⚠ RATES IS A SIDE BLOCK, NOT A SECTION (`P2-A2-E713` WS-A item 9) ──

            ⚠ **SCOTT: Rates, Search Score, Visibility and Rank Higher *"lose their boxes
            too, and are separated by thin lines."*** ⚠⚠ `CleanSide` is that treatment — a
            12px uppercase eyebrow over a thin top rule — and it is deliberately NOT
            `CleanSection`: **the left column does not fold.** A chevron on a three-row rate
            list would be a control with nothing to reveal.
            ⚠ The `owner`/visitor rule is untouched: `p.rates` is already `null` for anyone
            who may not see it, which is the VIEW MODEL's decision and not this component's.
            ⚠⚠ THE WRAPPER CARRIES `pm-rail-rates` because the PHONE ORDER KEYS ON IT — see
            the row 10 note above. Without the class Rates would fall below the record.
          */
          <div className="pm-rail-rates">
            <CleanSide
              title="Rates"
              action={owner ? <CleanEdit href={editHref("rates")} title="Rates" /> : undefined}
            >
              <RateRows p={p} />
            </CleanSide>
          </div>
        )}
      </aside>

      <main className="pm-cp3-main">
        {/*
          ── ⚠⚠⚠ ROWS 2, 3 AND 13 — THE RECORD OPENS WITH WHO THIS IS ────────────────────

          ⚠ **THE MOCKUP: the name large and bold at the TOP OF THE MAIN COLUMN, then the
          title with `Edit`, then a meta line — location · member since · languages — then
          the bio as PLAIN TEXT with `Edit` at the end.** ⚠⚠ All of it was small text beside
          the photo, and the bio was a folding section.
          ⚠⚠⚠ **THE `<h1>` RULE IS PRESERVED EXACTLY (`E600` WS-A):** the owner's `<h1>` is
          the tab row's, so the owner gets `<h2>` here and a visitor — who has no tab row —
          gets the `<h1>`. Two `<h1>` candidates on one page is the `E598` defect.
        */}
        <header className="pm-main-head">
          <div className="flex items-center gap-2">
            {owner ? (
              <h2 className="text-[30px] font-bold leading-[1.2] tracking-[-0.01em]">
                {fullName}
              </h2>
            ) : (
              <h1 className="text-[30px] font-bold leading-[1.2] tracking-[-0.01em]">
                {fullName}
              </h1>
            )}
            {p.validated && (
              <span title="Validated by Panameer" className="text-magenta">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-label="Validated by Panameer" role="img">
                  <path d="M12 2l2.4 1.8 3-.3 1 2.8 2.6 1.5-.9 2.9.9 2.9-2.6 1.5-1 2.8-3-.3L12 22l-2.4-1.8-3 .3-1-2.8L3 16.2l.9-2.9L3 10.4l2.6-1.5 1-2.8 3 .3z" />
                  <path d="M10.6 15.2l-2.8-2.8 1.1-1.1 1.7 1.7 4-4 1.1 1.1z" fill="#fff" />
                </svg>
              </span>
            )}
          </div>

          {/* ⚠ RULING 31c travels with the title: `"+AI Enabled…"` is an EXAMPLE of a title,
              sample text, not a feature — no placeholder, no hint, no default. */}
          {(p.headline || owner) && (
            <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2.5 text-[16px] text-ink-2">
              {p.headline}
              {owner && <CleanEdit href={editHref("title")} title="Title" />}
            </p>
          )}

          {/*
            ── ⚠⚠ THE META LINE. EVERY ITEM IS A FACT THAT EXISTS ─────────────────────────

            ⚠⚠⚠ **`Available for new work` IS NOT HERE, AND THAT IS THE BRIEF'S OWN
            INSTRUCTION.** There is **no availability field in the schema** — measured
            2026-09-30, only `available_for_messages` and `available_from` — so the mockup's
            green `Available` dot would be a fact about a person nobody stated. It is SIT 3.3
            and gets its own brief.
            ⚠ **Each item renders only when its value exists** — a missing location is absent,
            never an empty bullet, and the separators come from the flex gap rather than from
            punctuation that would strand a `·` beside nothing.
            ⚠ `locationLines` is the SAME rule the Location card uses (`E585`).
          */}
          <div className="mt-3.5 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-[14px] text-ink-2">
            {/*
              ── ⚠⚠⚠ ITEM 11 — THE MAP LINK, AND WHAT IS NOT IN IT ────────────────────────

              ⚠ **SCOTT: *"City, state and country only. The street address is never put in
              the URL."*** ⚠⚠ **THAT HOLDS BY CONSTRUCTION, NOT BY FILTERING HERE:**
              `provider-profile-view.ts:263` builds this value as
              `formatLocality({ city: addr?.city, state: addr?.state })` — **only those two
              fields are passed in**, so the street never reaches the component that would
              have to strip it, and neither does the postal code `formatLocality` would
              otherwise append.
              ⚠⚠⚠ **THE SAFEST PLACE TO REMOVE A FIELD IS BEFORE IT IS LOADED.** A regex here
              that stripped a street would be a guard that has to stay right forever; a view
              model that never carries one cannot leak it.
              ⚠ `locationLines` is still the one rule (`E585`) — the link wraps its output
              rather than re-deriving the text.
              ⚠ **NO LINK WHEN THERE IS NO LOCATION** — `lines` is null and the whole span
              does not render, so nothing links to a search for the empty string.
            */}
            {(() => {
              const lines = locationLines(p.location, p.country);
              if (!lines) return null;
              const query = [lines.primary, lines.secondary].filter(Boolean).join(", ");
              const map = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
              return (
                <span className="flex items-center gap-1.5">
                  <MetaIcon kind="pin" />
                  {/* ⚠ A new tab, and `noreferrer` with it: the profile's URL is not Google's
                      business. `noopener` is implied by `noreferrer` but both are named so a
                      later edit cannot drop the wrong one. */}
                  <a
                    href={map}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="hover:underline"
                  >
                    {lines.primary}
                    {lines.secondary ? ` · ${lines.secondary}` : ""}
                  </a>
                </span>
              );
            })()}
            {/* ⚠ `Person.created_at`, a real column with a real writer (`schema.prisma:464`).
                Month and year only: the DAY somebody joined is not a fact anyone needs. */}
            {p.person.memberSince && (
              <span className="flex items-center gap-1.5">
                <MetaIcon kind="calendar" />
                Member since{" "}
                {new Date(p.person.memberSince).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
            )}
            {p.languages.length > 0 && (
              <span className="flex items-center gap-2">
                {p.languages.map((l) => l.name).join(" · ")}
                {owner && <CleanEdit href={editHref("languages")} title="Languages" />}
              </span>
            )}
            {/* ⚠⚠⚠ ROW 13 — `How You Work` LANDS HERE, AS A PLAIN LINK. It was a stray
                control under the location with nothing to sit beside.
                ⚠ **IT IS NOT DROPPED: rule 5, it may be the only entrance** — and MEASURED,
                it is the only link to `/profile/edit/work-method` on this page. */}
            {owner && (
              <Link
                href={editHref("work-method")}
                className="font-semibold text-magenta-dark hover:underline"
              >
                How You Work
              </Link>
            )}
          </div>

          {/*
            ── ⚠⚠⚠ ROW 3 — THE BIO IS PLAIN TEXT, NOT A FOLDING SECTION ────────────────

            ⚠ **THE MOCKUP PUTS IT UNDER THE META LINE WITH `Edit` AT THE END.** ⚠⚠ A
            disclosure on the first thing a buyer reads is a click in front of the sentence
            the whole page exists to deliver.
            ⚠⚠⚠ **`id="bio"` IS KEPT ON THE WRAPPER AND THAT IS LOAD-BEARING:** the
            What's-Missing links on `/community/score` scroll to `#bio`, and `scroll-mt-24`
            keeps the target out from under the pinned band. Dropping the id would leave those
            links pointing at nothing — a dead end with no error (`E579`).
            ⚠ **THE EMPTY RULE IS UNCHANGED:** a visitor sees nothing when there is no bio; the
            owner sees the prompt. That was `CleanSection`'s `isEmpty`/`showWhenEmpty`, and it
            is spelled out here because this block no longer goes through it.
          */}
          {(p.overview || owner) && (
            <div id="bio" className="mt-5 scroll-mt-24 text-[15px] leading-relaxed">
              <OverviewBody
                overview={p.overview}
                empty="Nothing here yet. A short bio is the first thing a buyer reads."
              />
              {/*
                ⚠⚠ **THE MOCKUP TRAILS `Edit` AFTER THE BIO'S LAST WORD; THIS SITS IT ON THE
                NEXT LINE, LEFT-ALIGNED — REPORTED RATHER THAN FORCED.** `OverviewBody`
                renders `RichText`, which is BLOCK-LEVEL, MULTI-PARAGRAPH and CLAMPED at 8
                lines. ⚠⚠⚠ A trailing inline link would sit after the clamp's ellipsis on any
                long bio — i.e. **`Edit` would disappear for exactly the providers with the
                most to edit.** ⚠ The mockup's bio is one short `<p>`; a real one is not.
              */}
              {owner && (
                <div className="mt-1">
                  <CleanEdit href={editHref("bio")} title="Bio" />
                </div>
              )}
            </div>
          )}
        </header>
        {/*
          ⚠ SUPERSEDED, quoted not deleted (`E164`) — the Bio was a folding section:
          //   <CleanSection id="bio" title="Bio" isEmpty={!p.overview} showWhenEmpty={owner}
          //     action={owner ? <CleanEdit href={editHref("bio")} title="Bio" /> : undefined}>
          //     <OverviewBody overview={p.overview} empty="Nothing here yet. A short bio is
          //       the first thing a buyer reads." />
          //   </CleanSection>
        */}

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
        <CleanSection
          id="skills"
          /*
            ── ⚠⚠⚠ CLOSED AT LOAD (`P2-A2-E716`, Scott 2026-09-30) ─────────────────────
            ⚠ **Skills, Specializations, Certifications, Education and Languages load CLOSED;
            Work History and everything below it load OPEN.** ⚠⚠ **THE SAME FOR THE OWNER AND
            THE VISITOR** — this is one call site serving both personas, so there is no branch
            here and no way for the two views to drift apart.
            ⚠ The chevron still opens it: `open` is the INITIAL state of a real `<details>`,
            not a lock, so nothing about the disclosure changes.
          */
          open={false}
          title="Skills"
          count={p.skills.length}
          showWhenEmpty={owner}
          action={owner ? <CleanEdit href={editHref("skills")} title="Skills" /> : undefined}
        >
          {p.skills.length > 0 ? (
            groupSkillsByPillar(p.skills).map((g) => (
              <div key={g.pillar ?? "__none"} className="mb-3 last:mb-0">
                <p className="mb-1.5 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-ink-3">
                  {g.pillar ?? "Other"}
                </p>
                <SkillsBody skills={g.skills} chipClass={CLEAN_CHIP} />
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
        </CleanSection>

        {/*
          ── ⚠⚠⚠ SPECIALIZATIONS SPANS THE PAGE (`P2-A2-E602` WS-C 1 + 3) ─────

          ⚠ SCOTT'S WALK (`E020`): *"The Specializations card spans the page,
          like Skills — not a third of a row."* ⚠⚠ AND IT NOW HAS SOMETHING TO
          SPEND THE WIDTH ON: grouped by `kind` with a labelled eyebrow per
          group, exactly as Skills groups by product family. In a third of a row
          the group headings had nowhere to go.
          ⚠⚠⚠ THE THREE-ACROSS ROW BECOMES **TWO**: Certifications · Education,
          with Specializations above them, and it uses a NEW `pm-cp-pair`.
          ⚠⚠ `pm-cp-three` IS A FIXED `repeat(3, …)`, NOT `auto-fit` — keeping
          it would have left a DEAD THIRD COLUMN and made both remaining cards
          narrower than the full-width card above them. ⚠ MEASURED: a first pass
          kept the class on the strength of a comment that said `auto-fit`, and
          the stylesheet said otherwise. ⚠ `pm-cp-three` is now unused and is
          LEFT ON DISK (`E164`).
          ⚠ SUPERSEDED, quoted not deleted (`E164`) — Specializations inside the
          three-across row:
          //   <div className="pm-cp-three">
          //     <ProfileCard id="specializations" title="Specializations" …>
          //       <SpecializationsBody specializations={p.specializations} />
          //     </ProfileCard>
          //     <ProfileCard id="certifications" …>
        */}
        <CleanSection
          id="specializations"
          /*
            ── ⚠⚠⚠ CLOSED AT LOAD (`P2-A2-E716`, Scott 2026-09-30) ─────────────────────
            ⚠ **Skills, Specializations, Certifications, Education and Languages load CLOSED;
            Work History and everything below it load OPEN.** ⚠⚠ **THE SAME FOR THE OWNER AND
            THE VISITOR** — this is one call site serving both personas, so there is no branch
            here and no way for the two views to drift apart.
            ⚠ The chevron still opens it: `open` is the INITIAL state of a real `<details>`,
            not a lock, so nothing about the disclosure changes.
          */
          open={false}
          title="Specializations"
          count={p.specializations.length}
          showWhenEmpty={owner}
          action={owner ? <CleanEdit href={editHref("specializations")} title="Specializations" /> : undefined}
        >
          <SpecializationsBody specializations={p.specializations} chipClass={CLEAN_CHIP} />
        </CleanSection>

        <div className="pm-cp-pair">
          <CleanSection
            id="certifications"
          /*
            ── ⚠⚠⚠ CLOSED AT LOAD (`P2-A2-E716`, Scott 2026-09-30) ─────────────────────
            ⚠ **Skills, Specializations, Certifications, Education and Languages load CLOSED;
            Work History and everything below it load OPEN.** ⚠⚠ **THE SAME FOR THE OWNER AND
            THE VISITOR** — this is one call site serving both personas, so there is no branch
            here and no way for the two views to drift apart.
            ⚠ The chevron still opens it: `open` is the INITIAL state of a real `<details>`,
            not a lock, so nothing about the disclosure changes.
          */
          open={false}
            title="Certifications"
          count={p.certifications.length}
          showWhenEmpty={owner}
            action={owner ? <CleanEdit href={editHref("certifications")} title="Certifications" /> : undefined}
          >
            <CertificationsBody
              certifications={p.certifications}
              empty="No certifications yet."
              emptyAction={
                owner ? (
                  /*
                    ── ⚠⚠⚠ THE LINE SHIPS, BECAUSE THE TEST EXISTS (`E602` WS-E 1)

                    ⚠ SCOTT: the line ships *"only if a free certification test
                    actually exists"*, and `E600` had recorded that path tests
                    *"may be unbuilt"*.
                    ⚠⚠ MEASURED 2026-09-22, AND THAT CAVEAT IS SUPERSEDED: **two
                    `LearnAssessment` rows are `PUBLISHED`** — Basic Procurement
                    (30 questions) and Advanced Procurement (20) — six more are
                    `DRAFT`, `/learn/<slug>/test` renders 200, and the page
                    contains **no price, no paywall, no upgrade**. It is free.

                    ⚠⚠⚠ IT LINKS TO `/learn`, NOT TO `/test`, AND THAT IS THE
                    HONEST DESTINATION. The test is GATED ON FINISHING THE PATH
                    — the gate persona sees *"Finish the path first. You've
                    completed 0 of 65 lessons."* ⚠ A link straight to `/test`
                    would be a door that opens onto a wall (`E579`); the path is
                    where the certificate actually begins.
                    ⚠ Scott's own wording — *"linking to Learn's certification
                    path"* — is the path, and `/learn` is where the two
                    certification paths are chosen from.

                    ⚠ SUPERSEDED, quoted not deleted (`E164`):
                    //   <Link href="/learn" …>Earn One in Learn</Link>
                    ⚠⚠ The DESTINATION is unchanged; only the promise is new,
                    and it is one the destination keeps.
                  */
                  <Link href="/learn" className="mt-2 inline-block text-[13.5px] font-bold text-magenta hover:underline">
                    Click Here to Take a Free Certification Test Now
                  </Link>
                ) : undefined
              }
            />
          </CleanSection>
          <CleanSection
            id="education"
          /*
            ── ⚠⚠⚠ CLOSED AT LOAD (`P2-A2-E716`, Scott 2026-09-30) ─────────────────────
            ⚠ **Skills, Specializations, Certifications, Education and Languages load CLOSED;
            Work History and everything below it load OPEN.** ⚠⚠ **THE SAME FOR THE OWNER AND
            THE VISITOR** — this is one call site serving both personas, so there is no branch
            here and no way for the two views to drift apart.
            ⚠ The chevron still opens it: `open` is the INITIAL state of a real `<details>`,
            not a lock, so nothing about the disclosure changes.
          */
          open={false}
            title="Education"
          count={p.education.length}
          showWhenEmpty={owner}
            action={owner ? <CleanEdit href={editHref("education")} title="Education" /> : undefined}
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
          </CleanSection>
          {/*
            ── ⚠⚠⚠ LANGUAGES BECOMES ITS OWN CARD (brief 10 WS-B) ─────────────

            ⚠ SCOTT: *"Edit Language → becomes its own CARD, with its own Edit,
            and **each language carries its abilities**."*
            ⚠⚠ **IT WAS A `TrustRow` THAT FLATTENED THEM TO NAMES** —
            `p.languages.map((l) => l.name).join(", ")` — so **the ability was
            loaded, carried on the view model, and thrown away at the last
            step.** ⚠⚠⚠ *"Spanish, French"* tells a buyer **nothing about
            whether this provider can run a meeting in either.**

            ⚠⚠ **`LanguagesBody` ALREADY EXISTS AND ALREADY RENDERS THE ABILITY**
            (`components/profile/sections.tsx`), reading `LEVEL_LABELS` for the
            enum and falling back to the legacy free text. ⚠ **RULING 53a
            CHECKED, NOT ASSUMED:** it is importable, it is NOT orphaned — the
            wizard's review page mounts it — so **ruling 63's question does not
            arise: the world has not moved on around it.** ⚠⚠⚠ **THE PROFILE
            HAND-ROLLED A LESSER VERSION OF A COMPONENT THAT WAS ALREADY RIGHT**,
            which is `E585` exactly.

            ⚠ **MEASURED BEFORE BUILDING:** 4 language rows exist, **all four
            carry both** an enum `level` (1 `NATIVE_OR_BILINGUAL`, 3 `FLUENT`)
            **and** the legacy free text — so there is a real ability to show on
            every row that exists, and no dash is needed.
            ⚠⚠ **RULING 67c CHECKED ON ITS WRITER:** the `languages` step goes
            through `replaceList`, which **throws** when the key is absent, and
            it enforces a floor of one. **Absent and empty are already
            distinguished; nothing to fix.**
          */}
          <CleanSection
            id="languages"
          /*
            ── ⚠⚠⚠ CLOSED AT LOAD (`P2-A2-E716`, Scott 2026-09-30) ─────────────────────
            ⚠ **Skills, Specializations, Certifications, Education and Languages load CLOSED;
            Work History and everything below it load OPEN.** ⚠⚠ **THE SAME FOR THE OWNER AND
            THE VISITOR** — this is one call site serving both personas, so there is no branch
            here and no way for the two views to drift apart.
            ⚠ The chevron still opens it: `open` is the INITIAL state of a real `<details>`,
            not a lock, so nothing about the disclosure changes.
          */
          open={false}
            title="Languages"
            count={p.languages.length}
            showWhenEmpty={owner}
            action={owner ? <CleanEdit href={editHref("languages")} title="Languages" /> : undefined}
          >
            <LanguagesBody languages={p.languages} />
          </CleanSection>
        </div>

        {/* ⚠⚠ WORK HISTORY AND SOLO PROJECTS ARE TWO CARDS AGAIN (WS-B). They
            were merged as `Experience` by `E598` WS-C; Layout A separates them,
            and each keeps its own anchor and its own editor. */}
        <CleanSection
          id="work-history"
          title="Work History"
          count={p.employers.length}
          showWhenEmpty={owner}
          /*
            ── ⚠⚠⚠ THE RÉSUMÉ RE-RUN, MOUNTED (`P2-A2-E602` WS-E 2) ────────────

            ⚠ SCOTT'S WALK (`E021`): *"an icon on the profile to re-run the AI
            resume parser… it asks first, naming what it will replace, and never
            silently overwrites a field the person edited by hand."*

            ⚠⚠⚠ NOTHING NEW WAS BUILT, AND THAT IS THE FINDING.
            `OwnerResumeRerun` ALREADY EXISTS in `components/profile/OwnerAiPass.tsx`,
            wrapping `ResumeImportAction` — which already implements the exact
            rule Scott asked for: **confirm → PREVIEW (parses, writes NOTHING) →
            a ticked diff → save.** ⚠ MEASURED: **nothing imported it.** It was
            rendered in the gaps panel `E600` WS-B rebuilt away, so the component
            survived and its entry point did not.
            ⚠⚠ BUILDING A SECOND ONE WOULD HAVE BEEN A SECOND CONFIRM DIALOG
            AND A SECOND OVERWRITE RULE TO KEEP IN STEP — `E585`'s shape, which
            this brief has already paid for twice.

            ⚠ THE OVERWRITE RULE, RE-READ AT THE PREMISE CHECK RATHER THAN
            ASSUMED: skills use `skipDuplicates`, so a hand-added row is never
            downgraded; `headline` and `overview` are **fill-only-when-empty**,
            computed inside the writer from the PROFILE. ⚠⚠ THAT IS WHY THE COPY
            READS *"a title (yours is empty)"* AND NEVER *"will replace"* — the
            component says what it will do, and what it will do is add.
          */
          /*
            ── ⚠⚠⚠ THE RÉSUMÉ RE-RUN IS GONE FROM THIS SLOT (`P2-A2-E720` item 9) ───────────

            ⚠ **SCOTT: *"Remove it from the Work History slot."*** It now sits under
            `How Others See My Profile` in the rail, as `OwnerResumeRebuild`.
            ⚠⚠ **THE `E602` WS-E 2 REASONING ABOVE IS NOT WRONG AND IS NOT DELETED — IT IS
            SUPERSEDED ON PLACEMENT ONLY.** Its finding still stands: the component already
            existed, already implemented confirm → preview → ticked diff → save, and nothing
            imported it. ⚠⚠⚠ **WHAT THAT BRIEF COULD NOT SEE IS THAT MOUNTING IT HERE STILL
            SHOWED NOTHING, because `ResumeImportAction` returns `null` without a stored
            document and 59 of 63 profiles have none.** A control with an entry point and no
            renderable state is the same invisibility in a new place.
            ⚠ SUPERSEDED, quoted not deleted (`E164`):
            //   action={owner ? (<span className="flex items-center gap-3">
            //     <OwnerResumeRerun />
            //     <CleanEdit href={editHref("work-history")} title="Work History" />
            //   </span>) : undefined}
          */
          action={
            owner ? <CleanEdit href={editHref("work-history")} title="Work History" /> : undefined
          }
        >
          <WorkHistoryBody
            employers={p.employers}
            projects={p.projects}
            isOwner={owner}
            /* ⚠ THE CLEAN PROFILE IS THE ONLY CALLER THAT ASKS FOR THE TIMELINE (WS-A item 7). */
            timeline
            /*
              ⚠⚠⚠ ROW 12 — THE ROLE LEADS, THE COMPANY SITS UNDER IT IN GREY. ⚠ Opt-in for
              the same reason `timeline` is: `WorkHistoryBody` is the ONE SHARED component
              (`E084`) and `/join/provider` renders it at `:2525` and `:3907`. **Swapping the
              default would restyle the onboarding review — the one page this brief may not
              touch.**
            */
            roleFirst
            empty="No work history yet."
          />
        </CleanSection>

        <CleanSection
          id="solo-projects"
          title="Solo Projects"
          count={soloProjects.length}
          showWhenEmpty={owner}
          action={owner ? <CleanEdit href={editHref("solo-projects")} title="Solo Projects" /> : undefined}
        >
          <SoloProjectsBody
            projects={soloProjects}
            isOwner={owner}
            /* ⚠ THE EXPLANATION IS `SoloProjectsBody`'s OWN LINE AND IS ALREADY ON SCREEN
               (`E720` item 7) — this string is the count, nothing else.
               ⚠ SUPERSEDED, quoted not deleted (`E164`):
               //   empty="Employee projects sit under their employer in Work History. No solo projects yet." */
            empty="No solo projects yet."
          />
        </CleanSection>

        {owner && serviceProducts}

        {/*
          ── ⚠⚠ THE TITLE IS WRONG FOR HALF ITS OWN ROWS (`P2-A3-E678`) ──────

          ⚠ The card renders TWO groups — paths the provider **teaches** and
          paths they are **taking** (`Teaches` / `You're Taking` below) — so
          *"Learning Paths I Offer"* is false for the second group, on a page a
          **visitor** reads. ⚠⚠ It also says *"I"* on somebody else's profile.
          ⚠ `Learning Paths` is the mockup's own word
          (`connect_profile_visitor_2026-09-19.html`), and it is true of both
          groups for both readers.
          ⚠ SUPERSEDED, quoted not deleted (`E164`):
          //   <ProfileCard title="Learning Paths I Offer">
        */}
        {/* ⚠⚠ RENAMED `Teaching` (WS-A item 7 / brief item 10). ⚠ Scott: `Learning Paths I
            Offer` / `You Teach` → **`Teaching`**. ⚠⚠ One word for the capacity, not a
            sentence about it.
            ⚠ SUPERSEDED, quoted not deleted (`E164`):
            //   <CleanSection title="Learning Paths"> */}
        <CleanSection
          title={owner ? "My Courses" : "Courses"}
          /* ⚠ SUPERSEDED, quoted not deleted (`E164`): title="Teaching" — and before it,
             `title="Learning Paths"`. See the naming note on the Service Products section. */
          count={taughtPaths.length}
          showWhenEmpty={owner}
        >
          {taughtPaths.length === 0 ? (
            <p className="text-[13.5px] leading-relaxed text-ink-2">
              {owner
                ? "You aren\u2019t teaching any learning paths yet."
                : "Not teaching any learning paths yet."}
            </p>
          ) : (
            /*
              ── ⚠⚠⚠ ROWS, NOT CHIPS (`P2-A2-E720` item 8) ────────────────────────────────

              ⚠ **SCOTT: *"My Courses / Courses Taken are rows, not chips: name, lesson count,
              link."***
              ⚠⚠ **A CHIP CARRIES ONE FACT AND A COURSE HAS TWO.** The pill could only hold
              the title, so the lesson count — the figure that says how much course there
              actually is — had nowhere to go, and a wrapped row of pills gave no column for
              it to line up in.
              ⚠⚠⚠ **THE COUNT IS `t.lessons`, WHICH `TaughtPath` HAS ALWAYS CARRIED** and this
              surface never rendered. Nothing is computed here and no query changed.
              ⚠ **THE `You Teach` / `Teaches` EYEBROW IS GONE WITH THE CHIPS, AND ITS JOB IS
              DONE BY THE SECTION TITLE** — `My Courses` for the owner, `Courses` for a
              visitor. A sub-heading over a single group restated the heading above it.
              ⚠ SUPERSEDED, quoted not deleted (`E164`):
              //   <div className="flex flex-col gap-3.5">{taughtPaths.length > 0 && (<div>
              //     <p className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.07em] text-ink-3">
              //       {owner ? "You Teach" : "Teaches"}</p>
              //     <div className="flex flex-wrap gap-2">{taughtPaths.map((t) => (
              //       <Link key={t.slug} href={`/learn/${t.slug}`}
              //         className="rounded-full border border-magenta/25 bg-magenta/[0.06] px-3.5 py-1.5 text-[13px] font-bold text-magenta-dark hover:underline">
              //         {t.title}</Link>))}</div></div>)}</div>
            */
            <ul className="pm-course-rows">
              {taughtPaths.map((t) => (
                <li data-row key={t.slug}>
                  <Link href={`/learn/${t.slug}`} className="pm-course-row">
                    <span className="pm-course-name">{t.title}</span>
                    <span className="pm-course-meta">{lessonCount(t.lessons)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CleanSection>

        {/*
          ── ⚠⚠⚠ LEARNING — ITS OWN SECTION (`P2-A2-E713` WS-A item 6 / brief item 11) ──

          ⚠ **SCOTT: a new section for *"paths and courses the member takes"*, with
          *"completed items visible to buyers"* and *"in-progress items private to the
          member."***
          ⚠⚠ **IT WAS THE SECOND HALF OF `Teaching` AND THAT WAS THE DEFECT.** One card
          rendered `You Teach` and `You're Taking` together, so **what somebody OFFERS and
          what they are STUDYING read as one claim** — and a visitor saw the studying half,
          which Scott has now ruled private until it is finished.
          ⚠⚠⚠ **THE TWO ARE DIFFERENT STATEMENTS ABOUT A PERSON:** teaching is an offer a
          buyer can act on; learning is a fact about them that only counts once complete.
          ⚠ SUPERSEDED, quoted not deleted (`E164`) — the block that lived inside Teaching:
          //   {takenPaths.length > 0 && ( <div> "You're Taking" … ink chips … </div> )}
        */}
        <CleanSection
          title={owner ? "Courses Taken / In-Process" : "Courses Taken"}
          /* ⚠ SUPERSEDED, quoted not deleted (`E164`): title="Learning". ⚠⚠ The visitor
             name carries no "In-Process" because `visibleTaken` gives them only completed
             paths — the title and the data say the same thing. */
          count={visibleTaken.length}
          showWhenEmpty={owner}
        >
          {visibleTaken.length === 0 ? (
            <p className="text-[13.5px] leading-relaxed text-ink-2">
              {/* ⚠ Ruling 18: neutral, no apology, no roadmap, nothing blaming the member. */}
              You aren&rsquo;t enrolled in a learning path yet.{" "}
              <Link href="/learn" className="font-bold text-magenta hover:underline">
                Browse learning paths
              </Link>
            </p>
          ) : (
            /*
              ⚠ ROWS, NOT CHIPS (`E720` item 8) — see the note on `My Courses` above.
              ⚠⚠ `t.lessons` IS NEW ON `TakenPath` and costs no query: it is the same total
              `completed` is already decided against (`learn-home.ts`).
              ⚠ SUPERSEDED, quoted not deleted (`E164`) — the chip row this replaces. ⚠⚠ ITS
              OWN INNER COMMENT IS PARAPHRASED RATHER THAN COPIED, per load-bearing rule 12:
              it carried a comment terminator, and quoting that character closes THIS comment
              early. The paraphrase: the chip was deliberately INK and not magenta (`E433`),
              because a path somebody is TAKING is not an offer and must not read as one.
              //   <div className="flex flex-wrap gap-2">{visibleTaken.map((t) => (
              //     <Link key={t.slug} href={`/learn/${t.slug}`}
              //       className="rounded-full border border-line bg-white px-3.5 py-1.5 text-[13px] font-bold text-ink-2 hover:underline">
              //       {t.title}
              ⚠⚠⚠ THE `E433` REASONING SURVIVES THE CHANGE AND IS NOW IN THE STYLESHEET:
              `.pm-course-row` is ink for both lists, and neither reads as an offer.
            */
            <ul className="pm-course-rows">
              {visibleTaken.map((t) => (
                <li data-row key={t.slug}>
                  <Link href={`/learn/${t.slug}`} className="pm-course-row">
                    <span className="pm-course-name">{t.title}</span>
                    <span className="pm-course-meta">
                      {lessonCount(t.lessons)}
                      {/*
                        ⚠⚠⚠ THE WORD IS ONLY PRINTED WHEN IT IS TRUE. `Completed` on a
                        half-finished path would be a false claim on the page Panameer sells
                        on. ⚠ And the OWNER is the only reader who ever sees an unfinished
                        one, so the absence of the word is never ambiguous to a visitor —
                        everything they can see is complete.
                      */}
                      {t.completed && (
                        <span className="pm-course-done">· Completed</span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CleanSection>

        <CleanSection
          title="Recommendations"
          count={testimonials.length}
          showWhenEmpty={owner}
        >
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
                  data-row
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
        </CleanSection>
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

/*
  ── ⚠⚠⚠ `ActionCard` IS REMOVED — ITS LAST CALLER WENT (`P2-A2-E720` item 10) ────────────

  ⚠ Its only remaining use was the `Request Mentoring` card, which item 10 replaced with the
  real `ConnectControls` mentor control. ⚠⚠ **IT IS QUOTED AND NOT LEFT IN PLACE BECAUSE A
  DEAD FUNCTION IS A NEW LINT WARNING AGAINST A ZERO-NEW BASELINE** — the same call `AppBand`
  records for the `HOME_NAV` import it stopped rendering.
  ⚠ **CHECKED FIRST, PER THE STANDING RULE: NO GATE ASSERTS A LIVE RULE AGAINST IT.** Grepped
  `scripts/` and every end-to-end spec directory — zero hits — so removing it cannot take an
  assertion with it.
  ⚠⚠⚠ **AND THE SENTENCE ABOVE ORIGINALLY NAMED THOSE DIRECTORIES WITH A GLOB, WHICH BROKE THE
  BUILD.** The pattern for them ends in a star followed by a slash — **a comment terminator** —
  so it closed this block early and produced 20 parse errors. ⚠ **LOAD-BEARING RULE 12 IS NOT
  ONLY ABOUT QUOTED CODE: ANY comment terminator in PROSE does it, including a file glob**,
  and that is a new instance of the trap worth recording.
  ⚠⚠ ITS TWO INNER COMMENTS ARE PARAPHRASED, NOT COPIED (load-bearing rule 12 — they carry
  comment terminators): the `note` prop was *one line under the button saying why it is
  offered, optional*, and the link was deliberately MAGENTA because `E433` makes the ring above
  a figure in ink while these are the interactive things.
  ⚠ SUPERSEDED, quoted not deleted (`E164`):
  //   function ActionCard({ title, label, href, note }: {
  //     title: string; label: string; href: string; note?: string;
  //   }) {
  //     return (
  //       <section className="mt-7 border-t border-line pt-5 text-center">
  //         <h3 className="mb-2.5 font-display text-[14.5px] font-bold leading-tight">{title}</h3>
  //         <Link href={href}
  //           className="block w-full rounded-full bg-magenta px-3.5 py-2.5 text-[13.5px] font-bold leading-tight text-white transition-colors hover:bg-magenta-dark">
  //           {label}
  //         </Link>
  //         {note && (<p className="mt-2.5 text-[12px] leading-relaxed text-ink-2">{note}</p>)}
  //       </section>
  //     );
  //   }
*/

/**
 * ── ⚠⚠ THE META LINE'S ICONS (`P2-A2-E718` item 11) ─────────────────────────
 *
 * ⚠ **THE MOCKUP'S OWN GLYPHS AND ITS OWN RULE:** `.meta svg { width:15px; height:15px;
 * stroke: var(--ink3); fill: none; stroke-width: 1.6 }` — outlined, grey, 15px. The paths are
 * copied from `profile_clean_2026-09-26.html` rather than redrawn.
 * ⚠⚠ **INLINE SVG, NOT AN ICON FONT OR A NETWORK REQUEST** — two shapes on the page a member
 * lands on should not cost a fetch, and `RailIcon`'s set is the band's, not this.
 * ⚠⚠⚠ **`aria-hidden` AND `flex-none`:** they decorate text that already says what they mean,
 * so a screen reader announcing "pin" before the location would be noise (the same rule the
 * section chevron follows), and without `flex-none` a long location squeezes them out of
 * square.
 * ⚠ `stroke-ink-3` resolves to the mockup's `#8a869a` inside `.account-surface` — see the
 * scoped rule in `connect-profile.css`. **`--color-ink-3` is still undeclared app-wide**,
 * which is `E715`'s open finding; on this surface the colour is real.
 */
function MetaIcon({ kind }: { kind: "pin" | "calendar" }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-[15px] w-[15px] flex-none stroke-ink-3"
      fill="none"
      strokeWidth="1.6"
    >
      {kind === "pin" ? (
        <>
          <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </>
      ) : (
        <>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </>
      )}
    </svg>
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

/*
  ── ⚠⚠ `rateRange` IS RETIRED WITH THE ROW IT FED (`P2-A2-E718` item 9) ────────────────

  ⚠ Its ONLY caller was the visitor trust card's `Rate` line, which duplicated the `RATES`
  block below it. ⚠⚠ **LEFT IN PLACE IT IS A NEW LINT WARNING AGAINST A ZERO-NEW BASELINE**,
  and a helper with no callers invites the next person to find a use for it — which here would
  mean printing the rate twice again.
  ⚠⚠⚠ **NOTHING ABOUT WHAT BUYERS SEE CHANGED (ruling 9).** `RateRows` renders the rates from
  the same `p.rates`, and the view model still nulls that field for anyone who may not see it.
  ⚠ SUPERSEDED, quoted not deleted (`E164`) — including the reasoning it carried:
  //   (comment: THE ADVERTISED RANGE, exactly as E078c stores it. Returns null when no rate
  //    is set — the row then does not render, rather than printing $0.)
  //   function rateRange(p: ProviderProfileView): string | null {
  //     (comment: null for a non-owner (E593 WS-C 13) — the TrustRow that calls this renders
  //      nothing on a null, so the Rate row simply is not there.)
  //     if (!p.rates) return null;
  //     const { minCents, maxCents, currency } = p.rates;
  //     if (minCents == null && maxCents == null) return null;
  //     const lo = minCents ?? maxCents!;
  //     const hi = maxCents ?? minCents!;
  //     return lo === hi ? money(lo, currency)
  //                      : `${money(lo, currency)} – ${money(hi, currency)}`;
  //   }
*/

/** ⚠ Integer cents, like every other money value in the app. */
function money(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(cents / 100);
}
