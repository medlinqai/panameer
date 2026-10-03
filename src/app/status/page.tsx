import Link from "next/link";
import { headers } from "next/headers";
import { isStatusHost } from "@/lib/host";
import { formatInstant, formatStoredDate, todayInSiteZone } from "@/lib/work-tracker/public-time";
import { redirect } from "next/navigation";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { BuildLine } from "@/components/status/BuildLine";
import { planBuildLine } from "@/lib/plan/build-line";
/*
  ── ⚠⚠ THE IMPORT IS BACK, AND IT READS THE PLAN NOW (`P2-ALL-E792`) ────────
  ⚠ **SCOTT, 2026-10-03:** keep the thin Build Line — *"it is cleaner."*
  ⚠⚠ It is fed by `planBuildLine(planRows)`, NOT by `t.phases`/`t.releases`:
  the plan is what Scott maintains, and a line drawn from AIM phase dates beside
  a timeline drawn from plan rows would be two sources describing one build —
  `E790`'s mistake, one screen later.
  ⚠ SUPERSEDED, quoted not deleted (`E164`) — the note that recorded its removal:
  //   ⚠⚠ `BuildLine`'s IMPORT IS GONE, THE COMPONENT IS NOT (`P2-ALL-E785`).
  ⚠ `src/components/status/BuildLine.tsx` is untouched on disk and still exports
  everything it did, including `assignRows`/`MIN_GAP_PCT`, which `check:sr7`
  still exercises directly. ⚠⚠ Dropping an unused IMPORT is not deleting code —
  `E164` protects the code, and leaving the import would add a lint warning
  against a 0-new rule.
  ⚠ SUPERSEDED, quoted not deleted (`E164`):
  //   import { BuildLine } from "@/components/status/BuildLine";
*/
import { PlanView } from "@/components/plan/PlanView";
import { prisma } from "@/lib/prisma";
import { getPanameerPlan } from "@/lib/plan/store";
import { publicPlan, releaseProgressByCode } from "@/lib/plan/public";
import { countableRows } from "@/lib/plan/model";
import { getPublicTracker } from "@/lib/work-tracker/public-view";
import { getSessionViewer } from "@/lib/session";
import {
  FOLLOWER_COUNT_FLOOR,
  follow as applyFollow,
  followerCount,
  isFollowing,
} from "@/lib/work-tracker/followers";
import { FollowButton } from "@/components/status/FollowButton";

/**
 * `/status` — the public Panameer Work Tracker (`P2-ALL-E753` route, `E757` UI).
 *
 * ⚠⚠ **BUILT TO MOCKUP v5, "the Build Line".** Copy is the mockup's, verbatim,
 * except where data replaces example figures — which is the brief's instruction
 * and the reason none of the numbers below are written in the markup.
 *
 * ⚠⚠⚠ **EVERY FIGURE COMES FROM `getPublicTracker()` AND NOTHING ELSE.** That
 * module's types have nowhere to put task text, task ids, criterion text, notes
 * or owners, which is what keeps Scott's *"no cookbook for the competition"*
 * rule enforced by the TYPE rather than by this template. The leak test asserts
 * it against this page's rendered HTML, not just the API.
 *
 * ⚠ Reached two ways: by path on any host, and by a rewrite from
 * `status.panameer.com/` (`src/proxy.ts`). ⚠⚠ `revalidate = 60` — the tracker
 * changes a few times a day and strangers reload it daily.
 *
 * ⚠ **A DELIBERATE LIGHT DESIGN WITH INK BANDS.** Tokens throughout so dark mode
 * reads; `bg-surface`, never `bg-white` (`E723`).
 */
export const revalidate = 60;

/*
  ⚠⚠ THE SHARE PREVIEW IS COPY TOO (`P2-ALL-E764`). Scott: *"This page does not
  sell … it just provides status for Panameer (no 'your app', etc.)."* ⚠ The
  description is what a link preview and a search result show, so leaving the
  sales voice here would have survived every change on the page itself.
  ⚠ SUPERSEDED, quoted not deleted (`E164`):
  //   description: "Watch your platform get built — Panameer, in the open.",
*/
export const metadata = {
  title: "Panameer Work Tracker",
  description: "Daily progress on the Panameer build, from first idea to public beta.",
};

/**
 * ⚠⚠⚠ THE TYPEFACE ON `/status` IS MONTSERRAT 800, NOT COMFORTAA (Scott,
 * walking the page 2026-10-02: *"headings and numerals in Montserrat 800, tight
 * tracking, as in the mockup. No Comfortaa anywhere on /status."*).
 *
 * ⚠⚠ **`font-display` IS COMFORTAA AND CAPS AT 700** (`globals.css` loads
 * 500/600/700), and `@layer base` puts it on every `h1`–`h3` — so a heading here
 * inherited it without asking. ⚠ `font-body` is Montserrat, which IS loaded at
 * 800, and a utility beats `@layer base`.
 * ⚠ `HEAD` is the one definition of that pairing; every heading and every numeral
 * on this page uses it, so they cannot drift apart (`E585`).
 */
const HEAD = "font-body font-extrabold tracking-[-0.03em]";

/*
  ⚠⚠ THE JOURNEY-STAGE VOCABULARY, SUPERSEDED BY THE PLAN (`P2-ALL-E785`).
  ⚠ The ten journey cells and their four-segment stage bars left this page when
  the plan replaced them. A plan row has a STATUS, not a stage, so neither of
  these is read any more.
  ⚠⚠ Quoted and not deleted (`E164`), as LINE comments rather than a nested
  block, so a close-comment sequence in the quoted body cannot end this comment
  early (load-bearing rule 12).
  ⚠⚠⚠ AND THE RULE BIT THE SENTENCE THAT EXPLAINS IT: this paragraph originally
  spelled that sequence out literally, which closed the comment here and broke
  the parse. Paraphrase it — never type it.
  //   const STAGE_WORD: Record<string, string> = {
  //     design: "Designing",
  //     build: "Building",
  //     test: "Testing now",
  //     live: "Live",
  //   };
  //   // The four segments. A `null` stage fills none - an honest "not started".
  //   const STAGE_INDEX: Record<string, number> = { design: 1, build: 2, test: 3, live: 4 };
*/

export default async function StatusPage({
  searchParams,
}: {
  searchParams: Promise<{ follow?: string }>;
}) {
  const t = await getPublicTracker();
  /* ⚠⚠ THE PAGE STAYS PUBLIC — reading the session is what lets the button know
     which of its two jobs it has, and a signed-out visitor simply gets the
     sign-up path. Nothing below is gated on it. */
  const viewer = await getSessionViewer();

  /*
    ⚠⚠⚠ `?follow=1` IS WHAT ACTUALLY APPLIES THE SIGN-UP INTENT (`E758`).
    ⚠ The signed-out button sends the person to `/join?next=/status&follow=1`;
    whichever route they take back here, arriving with `follow=1` while signed in
    completes what they asked for. ⚠⚠ It is IDEMPOTENT (`person_id` is unique), so
    a reload, a back button or a replayed link all land on one row — which is the
    property that makes a side effect on a GET acceptable here.
    ⚠ A signed-OUT arrival with `follow=1` does nothing and shows the button, so
    the link cannot be used to make anybody follow anything.
  */
  const { follow: followIntent } = await searchParams;
  if (viewer && followIntent === "1") {
    await applyFollow(viewer);
    /*
      ⚠⚠⚠ AND THEN DROP THE PARAM, WHICH IS NOT TIDINESS — IT IS A BUG FIX.
      ⚠ Measured: with `?follow=1` still in the URL, the Unfollow button's
      `router.refresh()` re-rendered this page, the intent fired again, and the
      person was RE-FOLLOWED. Unfollowing was impossible while the param was
      there. ⚠⚠ A redirect to the clean URL also stops `/status?follow=1` being
      pasted into a chat where every signed-in reader quietly follows.
    */
    /*
      ⚠⚠⚠ AND IT LANDS ON THE CLEAN URL **FOR THE HOST IT IS ON** (`P2-ALL-E781`).

      ⚠ On `status.panameer.com` the tracker IS the root: the proxy rewrites `/`
      to `/status`, so a visitor never sees `/status` in the address bar. ⚠⚠
      Redirecting to `/status` there would end the follow round trip on
      `status.panameer.com/status` — a URL that works but that the site otherwise
      never shows, and which `E780` deliberately does NOT redirect because the
      host is excluded.
      ⚠ Everywhere else `/status` IS the page's own address and stays correct.
      ⚠ SUPERSEDED, quoted not deleted (`E164`):
      //   redirect("/status");
    */
    const host =
      (await headers()).get("x-forwarded-host") ?? (await headers()).get("host");
    redirect(isStatusHost(host) ? "/" : "/status");
  }

  const [following, followers] = await Promise.all([isFollowing(viewer), followerCount()]);

  /*
    ── ⚠⚠ THE PLAN, AND THE DATE EVERYTHING IS MEASURED AGAINST (`P2-ALL-E785`) ──

    ⚠⚠⚠ **`today` IS RESOLVED ONCE, IN THE SITE'S ZONE, AND PASSED DOWN.** The
    Today line on the timeline, every `Past due` mark and the day a bar is
    compared against all come from this one value. ⚠ A component reaching for
    `new Date()` itself would put the Today line on one day and the overdue
    badges on another — on Vercel, which runs UTC, that is a real four-hour
    window every evening (`E775`).
  */
  const todayIso = todayInSiteZone();
  /** ⚠ id↔code only. The uuid is used to join plan rows to a release and is
   *  NEVER sent to the browser — `PublicRelease` carries `code`, not `id`. */
  const [plan, releaseIds] = await Promise.all([
    getPanameerPlan(),
    prisma.workTrackerRelease.findMany({ select: { id: true, code: true } }),
  ]);
  const planRows = plan?.rows ?? [];
  const pv = publicPlan(
    { title: plan?.plan.title ?? "Panameer build" },
    planRows,
    new Date(`${todayIso}T12:00:00Z`),
  );
  /*
    ⚠⚠ RELEASE PERCENTAGES NOW COME FROM THE PLAN, KEYED BY CODE. A release's
    scope is the plan rows tagged to it, so this is the one definition of the
    figure (`E585`); `public-view.ts` still counts a release's AIM tasks and that
    number is **no longer rendered anywhere**.
  */
  const planReleasePercent = releaseProgressByCode(planRows, releaseIds);
  /*
    ── ⚠⚠⚠ THE SECONDARY FIGURES COME FROM THE PLAN TOO (`P2-ALL-E790`) ───────

    ⚠⚠ **FOUND ON THE LIVE PAGE MINUTES AFTER `E785` DEPLOYED, AND IT IS THE
    EXACT FAILURE `E785` EXISTED TO END:** the hero read **0%** (R1's readiness,
    counted from the plan) while the lines beneath it read **"31% of the whole
    plan"** and **"66 done · 36 moving"** — those three came from the AIM task
    states. ⚠⚠⚠ **TWO DEFINITIONS OF PROGRESS, SIDE BY SIDE, AND BOTH LABELLED
    AS THE PLAN** (`E585`, on the page a stranger lands on).
    ⚠ `countableRows` is the same rule `readiness()` uses, so "done", "moving"
    and the total cannot disagree with the percentage above them.
  */
  /** ⚠ The Build Line's two inputs, from the plan's top-level rows. */
  const line = planBuildLine(planRows);
  const planCountable = countableRows(planRows);
  const planMoving = planCountable.filter((r) => r.status === "In progress").length;
  /*
    ⚠ The CURRENT PHASE section it fed left this page with `E785`; the plan's own
    in-progress phase is the accordion that opens by default instead.
    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   const current = t.phases.find((p) => p.current) ?? null;
    //   const currentIndex = t.phases.findIndex((p) => p.current) + 1;
  */
  /*
    ⚠ `gatesPassed` HAS NO RENDER SINCE `E790` took the gates clause off the
    hero. ⚠⚠ Quoted rather than deleted (`E164`), and `t.gates` itself is
    untouched in `public-view.ts` and still served by `/api/status` — the AIM
    checklist's data was never discarded, only unrendered here.
    //   const gatesPassed = t.gates.filter((g) => g.passed).length;
  */
  const rel = t.currentRelease;
  /*
    ⚠ The hero shows the RELEASE's percentage when there is one, and the whole
    plan's otherwise — Scott: *"I like the percent complete (but that should
    differ based on MVP R1 and R2."*
    ⚠⚠ BOTH HALVES NOW COME FROM THE PLAN. ⚠ SUPERSEDED, quoted not deleted
    (`E164`) — it was counted from AIM task states:
    //   const heroPercent = rel ? rel.percent : t.overallPercent;
  */
  const heroPercent =
    rel?.code && planReleasePercent[rel.code]
      ? planReleasePercent[rel.code].percent
      : pv.progress.percent;
  /*
    ⚠⚠⚠ TWO KINDS OF VALUE, TWO RULES (`P2-ALL-E775`) — see `public-time.ts`.
    ⚠ **A RELEASE TARGET IS A PURE DATE** and is printed as itself. Shifting
    `2026-11-01T00:00:00Z` into `America/New_York` would print **Oct 31**.
    ⚠⚠ **`updated` IS A TIMESTAMP** and belongs in the reader's day. It named NO
    zone before, so it used the SERVER's — ET on a mac, **UTC on Vercel** — which
    is why it read *"updated Oct 3"* in production on the evening of Oct 2.
    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   const updated = new Date(t.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  */
  const dueLabel = rel?.date ? formatStoredDate(rel.date) : null;
  const updated = formatInstant(t.generatedAt);

  return (
    <div className="bg-surface">
      <MarketingHeader />

      {/* ── HERO (ink band) ─────────────────────────────────────────────── */}
      {/*
        ── ⚠⚠⚠ THE BANDS ARE PINNED DARK IN BOTH SCHEMES (Scott, 2026-10-02) ────

        ⚠ **MEASURED AND REPORTED FIRST:** with `bg-ink text-surface` the bands
        INVERTED in dark mode — the hero became the LIGHT part of the page and the
        body the dark part. It read, but it was the opposite of the design intent,
        and Scott ruled them pinned.

        ⚠⚠ **`bg-rail` IS THE PINNED TOKEN AND THE SWITCH IS FREE IN LIGHT.**
        `--color-rail` is `#272334`, defined ONCE outside the dark block, so it
        does not invert — and the LIGHT `--color-ink` is `#272334` too, so this is
        byte-identical in light mode and changes only dark.
        ⚠ `text-white` likewise: only `.bg-white` carries a dark override in
        `globals.css`, never `.text-white`.
        ⚠⚠ Contrast on the pinned band: white **15.26:1**; the magenta accent
        **3.79:1**, which is used only on the two large headings (3:1 floor).
        ⚠ SUPERSEDED, quoted not deleted (`E164`): `bg-ink … text-surface`.
      */}
      <section className="bg-rail px-5 py-12 text-white sm:px-8">
      {/*
        ── ⚠⚠ TWO COLUMNS AT ≥900px (Scott, walking the page 2026-10-02) ────────
        ⚠ Copy left, the overall figure right-aligned at the mockup's scale.
        ⚠⚠ `min-[900px]:` and not `lg:` — he named 900, and Tailwind's `lg` is
        1024, so the named breakpoint is written literally rather than rounded to
        the nearest token. ⚠ Below it the two stack, copy first.
      */}
      <div className="mx-auto grid max-w-[1040px] gap-x-10 gap-y-8 min-[900px]:grid-cols-[1fr_auto] min-[900px]:items-end">
        {/*
          ⚠⚠ THE COPY COLUMN IS THE SIZING CONTAINER (`P2-ALL-E776`). See the
          headline below — it is sized against THIS box, not against the viewport.
        */}
        <div className="@container">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/70">
            {/* ⚠⚠⚠ "Day N" IS DROPPED UNTIL DEFINE HAS A START DATE (Scott,
                2026-10-02: *"no NaN, no invented date"*). The clause disappears;
                nothing stands in for it. */}
            Work Tracker · Building in the open
            {t.dayNumber !== null && <> · Day {t.dayNumber}</>}
          </p>
          {/*
            ⚠⚠⚠ "PANAMEER", NOT "YOUR PLATFORM" (`P2-ALL-E764`, Scott 2026-10-02).
            ⚠ The page reports on ONE build — ours. *"Your platform"* addressed a
            buyer who is not the reader here, and it is the whole reason the close
            band went too. ⚠ The exclamation mark is his.
            ⚠ SUPERSEDED, quoted not deleted (`E164`):
            //   Watch your platform <em>get built.</em>
          */}
          {/*
            ── ⚠⚠⚠ THE HEADLINE HOLDS ONE LINE (`P2-ALL-E776`) ─────────────

            ⚠ **SCOTT:** it wraps as *"get / built!"* beside the big %.

            ⚠⚠⚠ **IT IS SIZED AGAINST THE COLUMN, NOT THE VIEWPORT, AND THAT IS THE
            WHOLE FINDING.** Measured: the copy column is **686px at 1280, at 1440
            AND at 1600** — it does not grow, because this grid is capped at
            `max-w-[1040px]` (all three containers on the page are, so the hero
            lines up with the body). ⚠⚠ **A VIEWPORT-BASED `clamp()` WOULD HAVE
            CHANGED NOTHING ABOVE ~1080px**, which is where the brief expected the
            room to come from.

            ⚠ **THE NUMBERS:** one line needs **709px** at 52px. The column is
            **686px** with a two-digit figure (23px short — which is why it wraps
            today) and **558px** with a three-digit one.
            ⚠⚠ So `cqw` sizes the type to whatever the column actually is: **52px
            whenever it fits, stepping down only as far as the figure squeezes it**,
            and one line in every case. `7.2cqw` of 558px is 40.2px, which needs
            548px — inside 558 with room to spare.

            ⚠ **BELOW `@container` SUPPORT OR BELOW the two-column breakpoint the
            `34px` floor applies and it wraps**, which is the graceful case Scott
            asked for.
            ⚠ SUPERSEDED, quoted not deleted (`E164`):
            //   className={`mt-2 text-[34px] leading-[1.02] sm:text-[52px] ${HEAD}`}
          */}
          <h1
            className={`mt-2 leading-[1.02] text-[clamp(34px,7.2cqw,52px)] ${HEAD}`}
          >
            Watch Panameer <em className="not-italic text-magenta">get built!</em>
          </h1>
          {/*
            ⚠ REPLACED WHOLESALE (`E764`). The old lede sold the tracker as a
            product buyers and providers would use on *their* projects — two
            sentences of pitch on a page whose job is to report.
            ⚠ SUPERSEDED, quoted not deleted (`E164`):
            //   This is the Panameer Work Tracker, the same tracker buyers and
            //   providers will use on their own projects. Here it follows ours,
            //   every day, from first idea to public beta.
          */}
          {/*
            ⚠⚠ THE SUBLINE SAYS WHY THIS PAGE IS PUBLIC AT ALL (`P2-ALL-E787`,
            Scott 2026-10-03). ⚠ From this lane the tracker is the front door, so
            the first thing a stranger reads has to explain the choice: the tool
            on screen is the tool they will get.
            ⚠ SUPERSEDED, quoted not deleted (`E164`):
            //   Daily progress on the Panameer build, from first idea to public beta.
          */}
          <p className="mt-3 max-w-[68ch] text-[15px] leading-relaxed text-white/80">
            We&apos;re eating our own cooking — this is the project tracker you&apos;ll use on your
            Panameer work orders, and we&apos;re using it to build Panameer.
          </p>

          <p className="mt-7 flex flex-wrap items-center gap-4">
            <FollowButton signedIn={viewer !== null} initiallyFollowing={following} testId="follow-hero" />
            {/* ⚠⚠ THE COUNT IS HIDDEN BELOW 25 (the brief), not shown small. "3
                people following" makes a young page look emptier than silence. */}
            {followers >= FOLLOWER_COUNT_FLOOR && (
              <span className="text-[14px] text-white/75">
                {followers} people following the build
              </span>
            )}
          </p>
        </div>

        {/*
          ── ⚠⚠⚠ THE FIGURE, AT THE MOCKUP'S SCALE ───────────────────────────
          ⚠ ~184px, right-aligned, with the `%` as a MAGENTA SUPERSCRIPT — it is
          the one number this page exists to show, and at body scale it read as a
          statistic rather than the headline.
          ⚠⚠ `tabular-nums` so 9% and 11% occupy the same width and the column
          does not shift as the build progresses.
        */}
        <div className="min-[900px]:text-right">
          {/*
            ── ⚠⚠⚠ THE BIG FIGURE IS THE CURRENT RELEASE, NOT THE WHOLE PLAN ─────
            ⚠ Scott: *"I like the percent complete (but that should differ based on
            MVP R1 and R2."* The plan percentage becomes the small secondary line.
            ⚠⚠ **`Scope being set` WHEN NO TASKS ARE ASSIGNED — NEVER `0%`.** A
            release nobody has scoped has not achieved nothing; it has not been
            measured, and the two must not look the same.
          */}
          {/*
            ── ⚠⚠⚠ THE TEST AND THE FIGURE MUST BE THE SAME NUMBER (`P2-ALL-E785`) ──

            ⚠ This branch used to ask `rel.percent === null` — the AIM-derived
            release percentage from `public-view.ts` — while the figure printed
            below it came from the PLAN. ⚠⚠ **Two definitions of one number, and
            they disagreed the moment the plan replaced the catalog:** with R1
            carrying AIM task states, `rel.percent` was a number, so this took the
            else branch and printed a bare `—` for an empty plan.
            ⚠⚠⚠ **A DASH WITH NO REASON IS EXACTLY WHAT THE COUNTING RULE FORBIDS**
            (`decisions_2026-09-23.md` §1), and this is the public page.
            ⚠ So it now tests `heroPercent`, the number it is about. When that is
            uncountable the page says WHY instead of printing a dash, and the else
            branch is guaranteed a real figure — including a measured `0`, in ink.
            ⚠ SUPERSEDED, quoted not deleted (`E164`):
            //   {rel && rel.percent === null ? (
          */}
          {heroPercent === null ? (
            <p className={`text-[34px] leading-tight text-white/90 sm:text-[44px] ${HEAD}`}>
              Scope being set
            </p>
          ) : (
            <p className={`flex items-start justify-start leading-[0.82] min-[900px]:justify-end ${HEAD}`}>
              {/* ⚠ A stable hook so a gate can assert the FIGURE rather than
                  searching the hero for a dash — the hero legitimately contains
                  "R1 — Public beta", and a text search for an em-dash matches
                  that. */}
              <span data-hero-figure className="text-[112px] tabular-nums sm:text-[184px]">
                {heroPercent}
              </span>
              <span className="mt-[0.22em] text-[40px] text-magenta sm:text-[64px]">%</span>
            </p>
          )}
          <p className="mt-1 text-[14px] text-white/75">
            {rel ? (
              <>
                {rel.code ? `${rel.code} — ` : ""}
                {rel.name}
                {rel.date && <> · due {dueLabel}</>}
              </>
            ) : pv.progress.percent === null ? (
              /* ⚠ SUPERSEDED, quoted not deleted (`E164`) — it tested the AIM
                 figure while describing the plan:
                 //   ) : t.overallPercent === null ? ( "nothing countable yet"
                 //   ) : ( "of the plan complete" ) */
              "nothing countable yet"
            ) : (
              "of the plan complete"
            )}{" "}
            · updated {updated}
          </p>
          {/* ⚠ The WHOLE plan's figure, secondary to the release's. ⚠⚠ It is
              the PLAN's now, not the AIM catalog's (`E790`).
              ⚠ SUPERSEDED, quoted not deleted (`E164`):
              //   {rel && t.overallPercent !== null && (
              //     <p …>{t.overallPercent}% of the whole plan</p>
              //   )} */}
          {rel && pv.progress.percent !== null && (
            <p className="mt-1 text-[13px] text-white/60">
              {pv.progress.percent}% of the whole plan
            </p>
          )}
          {/*
            ⚠⚠⚠ `moving` IS EVERY ROW IN PROGRESS, AND SCOTT'S RULE SURVIVES THE
            CHANGE OF SOURCE: *"it must be every task with status In Progress"* —
            it is now every countable PLAN ROW with that status, counted by the
            same `countableRows` rule as the percentage above.
            ⚠⚠ **THE GATES CLAUSE IS GONE.** Gates are an AIM-catalog concept with
            no equivalent in a plan, and `E785` took the gate section off this
            page — leaving "0 of 4 gates" under a plan figure described something
            the page no longer shows.
            ⚠ SUPERSEDED, quoted not deleted (`E164`):
            //   {t.doneCount} done · {t.movingCount} moving · {gatesPassed} of {t.gates.length} gates
            ⚠ `gatesPassed` and `t.gates` are untouched in `public-view.ts` and
            still served by `/api/status`; only this render went.
          */}
          <p className="mt-1 text-[14px] text-white/75">
            {pv.progress.done} done · {planMoving} moving · {pv.progress.total} rows
          </p>
        </div>
      </div>
      </section>

      <div className="mx-auto max-w-[1040px] px-5 sm:px-8">
        {/*
          ── ⚠⚠⚠ THE PLAN REPLACES THE AIM PHASES, STAGES AND JOURNEYS (`P2-ALL-E785`) ──

          ⚠ **SCOTT, 2026-10-03:** the AIM tracker *"is good for me, but even for
          me too complicated."* ⚠⚠ So this page stops rendering a fixed catalog —
          four phases, their stages, the ten journey cells and the figure counted
          from 212 task states — and renders **the rows Scott typed in Build
          Plan**: a timeline, then an accordion per phase.

          ⚠⚠ **THE AIM DATA IS NOT DELETED AND THE AIM ADMIN STAYS REACHABLE**
          (renamed *AIM checklist*). `work_tracker_*` keeps every row it had;
          what changed is which of them this page reads.

          ⚠ SUPERSEDED, quoted not deleted (`E164`) — the three blocks that stood
          here, in order, are kept in full in the brief and in git history:
          //   <BuildLine phases={t.phases} releases={t.releases} now={Date.parse(t.generatedAt)} />
          //   {current && ( ... CURRENT PHASE: NN/NN, name, purpose, currentPhaseStages ... )}
          //   <section> ... JOURNEYS: "Ten parts of one platform." + the 5-across grid ... </section>
          ⚠⚠ `BuildLine`, `Segments` and `t.currentPhaseStages` are **still on
          disk and still exported** — nothing is deleted (`E164`) — they simply
          render on no page now.
        */}
        {/*
          ⚠⚠ ORDER, AS SCOTT ASKED: **Build Line on top → the plan's timeline
          under it → the accordions.** ⚠ The line is the one-glance answer and
          the Gantt is the detail, so the cheap read comes first.
          ⚠ It renders only when the plan has a dated row — `planBuildLine`
          returns empty arrays otherwise, and a line with nothing on it is worse
          than no line (`E769`).
        */}
        {line.phases.length > 0 && (
          <BuildLine phases={line.phases} releases={line.releases} now={Date.parse(`${todayIso}T12:00:00Z`)} />
        )}
        <PlanView plan={pv} today={todayIso} />

        {/* ── RELEASES ────────────────────────────────────────────────── */}
        {t.releases.length > 0 && (
          <section className="mt-12 border-t border-line pt-6">
            {/*
              ⚠⚠⚠ RELEASES REPLACE MILESTONES (`P2-ALL-E765`). A milestone was a
              date; a release is a date WITH SCOPE, which is what lets each row
              carry its own percentage and its own journeys.
              ⚠ SUPERSEDED, quoted not deleted (`E164`): a `Milestones` section
              listing date · title · description · status, with no figure.
            */}
            <h2 className={`text-[24px] text-ink ${HEAD}`}>Releases</h2>
            <ul className="mt-5 border-t border-line">
              {t.releases.map((r) => (
                <li
                  key={`${r.code ?? r.name}-${r.date ?? "nodate"}`}
                  className="grid grid-cols-1 gap-x-4 gap-y-1 border-b border-line py-3.5 sm:grid-cols-[72px_1fr_auto]"
                >
                  <span className={`text-[15px] text-ink ${HEAD}`}>{r.code ?? "—"}</span>
                  <span>
                    <span className="text-[15px] font-bold text-ink">{r.name}</span>
                    {r.summary && (
                      <span className="mt-0.5 block text-[13.5px] leading-snug text-ink-2">{r.summary}</span>
                    )}
                    {/* ⚠ Journey NAMES — segments, never task text. */}
                    {r.journeys.length > 0 && (
                      <span className="mt-1 block text-[12.5px] text-ink-3">
                        {r.journeys.join(" · ")}
                      </span>
                    )}
                  </span>
                  <span className="text-[13px] text-ink-2 sm:text-right">
                    {/* ⚠⚠ `Scope being set`, NEVER `0%` — a release nobody has
                        scoped has not achieved nothing. */}
                    <span className={`block text-[17px] text-ink ${HEAD}`}>
                      {r.percent === null ? "Scope being set" : `${r.percent}%`}
                    </span>
                    {r.date && <span className="block">due {r.date}</span>}
                    <span className="block">{r.status}</span>
                    {r.percent !== null && (
                      <span className="block text-ink-3">
                        {r.doneCount} of {r.taskCount} done
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── SHIPPED ─────────────────────────────────────────────────── */}
        <section className="mt-12 border-t border-line pt-6">
          <h2 className={`text-[24px] text-ink ${HEAD}`}>
            What changed, day by day.
          </h2>
          <p className="mt-1.5 max-w-[70ch] text-[15px] leading-relaxed text-ink-2">
            Every entry is live on app.panameer.com. Written in plain language from the day&apos;s work.
          </p>
          {t.shipped.length === 0 ? (
            <p className="mt-5 text-[14px] text-ink-2">Nothing published yet.</p>
          ) : (
            <ul className="mt-5 border-l-2 border-magenta pl-4">
              {t.shipped.map((s, i) => (
                <li key={`${s.date}-${i}`} className="pb-4">
                  <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink-3">{s.date}</span>
                  <span className="mt-0.5 block text-[15px] font-bold text-ink">{s.title}</span>
                  {s.body && <span className="mt-0.5 block text-[14px] leading-relaxed text-ink-2">{s.body}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── SUPPORT ─────────────────────────────────────────────────── */}
        <section className="mt-12 border-t border-line pt-6">
          <h2 className={`text-[24px] text-ink ${HEAD}`}>
            Found a problem? Tell us.
          </h2>
          <p className="mt-1.5 max-w-[70ch] text-[15px] leading-relaxed text-ink-2">
            Issues from testers and users, and how fast they close. What you write in a ticket stays
            private.
          </p>
          {/* ⚠⚠⚠ TWO NUMBERS ONLY (Scott, final): Open and Resolved this week.
              Median first reply is DROPPED — nothing records a first reply, and a
              dash with a reason is still a row on a page meant to be scanned in
              seconds. Both of these are measured counts and render in ink. */}
          <p className="mt-4 text-[15px] text-ink-2">
            <span className={`text-[30px] text-ink ${HEAD}`}>{t.support.open}</span> open
            <span className="mx-3 text-ink-3">·</span>
            <span className={`text-[30px] text-ink ${HEAD}`}>
              {t.support.resolvedThisWeek}
            </span>{" "}
            resolved this week
          </p>
          <p className="mt-4 flex flex-wrap gap-3">
            <Link href="/support" className={SQUARE_DARK}>
              Report an Issue
            </Link>
            <Link href="/support/tickets" className={SQUARE_LIGHT}>
              See Your Tickets
            </Link>
          </p>
        </section>
      </div>

      {/*
        ── ⚠⚠⚠ THE CLOSE BAND IS GONE, AND A PLAIN FOOTER TAKES ITS PLACE (`E764`)

        ⚠ **SCOTT, 2026-10-02:** *"This page does not sell … it just provides
        status for Panameer (no 'your app', etc.) — so [the 'Build it once' band]
        makes no sense."*
        ⚠⚠ **IT IS REMOVED, NOT HIDDEN.** The band carried a pitch, a lede about
        packaging service products, and a `Join the beta` button — a sales close on
        a page whose job is to report. ⚠ `Follow the Build` stays, in the hero
        only, because following a build is not a purchase.
        ⚠ SUPERSEDED, quoted not deleted (`E164`) — what stood here:
        //   <section className="mt-14 bg-rail px-5 py-12 text-white sm:px-8">
        //     <h2>Build it once… / sell it for years.</h2>
        //     <p>Package the reports, integrations, dashboards and agents you
        //        have already built, and offer them to new Oracle clients as
        //        service products. Showcased free during the beta.</p>
        //     <Link href="/join">Join the Beta</Link>
        //     <FollowButton … testId="follow-close" />
        //   </section>

        ⚠⚠ **A MINIMAL FOOTER, NOT `MarketingFooter`** (Scott's option (a)): that
        component carries a sales CTA, which is the thing this change removes.
        ⚠ `Report an issue` is a LINK to the existing support form, not a button —
        it is the one thing a reader of a status page may actually need to do.
      */}
      <footer className="mt-16 border-t border-line px-5 py-7 sm:px-8">
        <p className="mx-auto flex max-w-[1040px] flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-2">
          <span>© {new Date(t.generatedAt).getFullYear()} Panameer Inc</span>
          <span aria-hidden className="text-ink-3">·</span>
          {/* ⚠ The marketing root, not `app.` — a public page points at the public
              front door. */}
          <a href="https://panameer.com" className="text-ink-2 underline underline-offset-4 hover:text-magenta">
            panameer.com
          </a>
          <span aria-hidden className="text-ink-3">·</span>
          <Link href="/support" className="text-ink-2 underline underline-offset-4 hover:text-magenta">
            Report an issue
          </Link>
        </p>
      </footer>
    </div>
  );
}

const SQUARE_DARK =
  "inline-flex min-h-[44px] items-center rounded-[4px] bg-ink px-5 text-[14px] font-bold text-surface transition-opacity hover:opacity-85";
const SQUARE_LIGHT =
  "inline-flex min-h-[44px] items-center rounded-[4px] border border-ink bg-surface px-5 text-[14px] font-bold text-ink transition-colors hover:bg-ink/5";

/**
 * ⚠ FOUR SEGMENTS. `filled` is how many are ink; the one after them is magenta
 * when work is moving. ⚠⚠ `filled = 0` draws four empty segments, which is what
 * a `null` journey stage must look like — present, and honestly empty.
 */
/*
  ⚠⚠ `Segments` — SUPERSEDED BY THE PLAN (`P2-ALL-E785`), QUOTED NOT DELETED.
  ⚠ It drew the four-segment stage bar for a journey cell and for the current
  phase’s stage list. Both sections are gone; a plan row shows a status, not a
  stage, and its bar is drawn by `PlanView` from real dates.
  ⚠ Line comments, not a nested block, so nothing in the quoted body can end
  this comment early (load-bearing rule 12).
  //   function Segments({ filled, testing = false }: { filled: number; testing?: boolean }) {
  //     return (
  //       <span aria-hidden className="flex shrink-0 gap-1">
  //         {[0, 1, 2, 3].map((i) => (
  //           <span
  //             key={i}
  //             className={
  //               "h-1.5 w-7 rounded-full " +
  //               (i < filled ? "bg-ink" : i === filled && testing ? "bg-magenta motion-safe:animate-pulse" : "bg-line")
  //             }
  //           />
  //         ))}
  //       </span>
  //     );
  //   }
*/
