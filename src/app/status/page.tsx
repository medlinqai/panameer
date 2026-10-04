import Link from "next/link";
import { headers } from "next/headers";
import { isStatusHost } from "@/lib/host";
import { formatInstant, formatStoredDate, todayInSiteZone } from "@/lib/work-tracker/public-time";
import { redirect } from "next/navigation";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { BuildLine } from "@/components/status/BuildLine";
import { planBuildLine } from "@/lib/plan/build-line";
import { PlanView } from "@/components/plan/PlanView";
import { prisma } from "@/lib/prisma";
import { getPanameerPlan } from "@/lib/plan/store";
import { publicPlan, releaseProgressByCode } from "@/lib/plan/public";
import { firstReleasedAt } from "@/lib/plan/model";
import { releasedSupportCounts } from "@/lib/support-released";
import { getPublicTracker } from "@/lib/work-tracker/public-view";
import { getSessionViewer } from "@/lib/session";
import {
  FOLLOWER_COUNT_FLOOR,
  follow as applyFollow,
  followerCount,
  isFollowing,
} from "@/lib/work-tracker/followers";
import { FollowButton } from "@/components/status/FollowButton";

export const revalidate = 60;

export const metadata = {
  title: "Panameer Work Tracker",
  description: "Daily progress on the Panameer build, from first idea to public beta.",
};

const HEAD = "font-body font-extrabold tracking-[-0.03em]";

export default async function StatusPage({
  searchParams,
}: {
  searchParams: Promise<{ follow?: string }>;
}) {
  const t = await getPublicTracker();
  const viewer = await getSessionViewer();

  const { follow: followIntent } = await searchParams;
  if (viewer && followIntent === "1") {
    await applyFollow(viewer);
    const host =
      (await headers()).get("x-forwarded-host") ?? (await headers()).get("host");
    redirect(isStatusHost(host) ? "/" : "/status");
  }

  const [following, followers] = await Promise.all([isFollowing(viewer), followerCount()]);

  const todayIso = todayInSiteZone();
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
  /* `E806`'s journey list left with the Releases section (`E807`); the helper
     stays in `public.ts`, gated by check:plan, for the release heading to use
     if Scott wants the list back. */
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
  /* Released work: the plan's own Deploy ◆ marked Done (`E810`). `null` until
     one is, which hides the support block rather than showing a zero. */
  const releasedAt = firstReleasedAt(planRows);
  const releasedSupport = releasedAt ? await releasedSupportCounts(releasedAt) : null;
  /*
    ⚠⚠ THE MOVING COUNT COMES FROM `readiness()` NOW (`E797`), not from a second
    pass over the rows here. ⚠ It was always the same rule; since half-credit
    made `moving` part of the PERCENTAGE, a local recount could have drifted from
    the figure it sits under (`E585`).
    ⚠ SUPERSEDED, quoted not deleted (`E164`) - the two lines that stood here:
    //   planCountable := countableRows over planRows
    //   planMoving    := those whose status is "In progress"
  */
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
  /*
    THE HERO IS THE R1 RELEASE ROW'S OWN PERCENTAGE (`P2-ALL-E807`).
    Since the plan has release rows, the release's figure is the subtree beneath
    it — the same half-credit rule, computed once in the view model — so the
    heading in the grid and the hero are literally the same number.
    Falls back to the release_id tags, then to the whole plan, for a plan that
    has no release rows yet.
    SUPERSEDED, quoted not deleted:
    //   rel?.code && planReleasePercent[rel.code] ? planReleasePercent[rel.code].percent : pv.progress.percent
  */
  const releaseRow =
    pv.rows.find((r) => r.type === "release" && r.status === "In progress") ??
    pv.rows.find((r) => r.type === "release") ??
    null;
  const heroPercent =
    releaseRow?.progress?.percent ??
    (rel?.code && planReleasePercent[rel.code]
      ? planReleasePercent[rel.code].percent
      : pv.progress.percent);
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
            {pv.progress.done} done · {pv.progress.moving} moving · {pv.progress.total} rows
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

        {/*
          THE SEPARATE RELEASES SECTION IS GONE (Scott, 2026-10-03, `E807`).
          Each release is now a row in the plan with its own heading, its own
          percentage and its own due date, so a second list of the same releases
          was the same figure in two places (`E585`) — the defect `E806` had just
          finished fixing in the other direction.
          `t.releases` is untouched in `public-view.ts` and still served by
          `/api/status`; only this rendering is removed.
        */}
        {/*
          ── TAKE A LOOK (`P2-ALL-E810`) ─────────────────────────────────────
          Replaces "What changed, day by day", which had nothing to show and so
          said "Nothing published yet" to every visitor. One line and one door.
          `t.shipped` is untouched in `public-view.ts` and still served by
          `/api/status`; only this rendering is removed.
        */}
        <section className="mt-12 border-t border-line pt-6">
          <h2 className={`text-[24px] text-ink ${HEAD}`}>Take a Look</h2>
          <p className="mt-1.5 max-w-[70ch] text-[15px] leading-relaxed text-ink-2">
            Everything is being built in the open. See what is being built and when above, then go
            check it out today.
          </p>
          <p className="mt-4">
            {/* The door changes with the visitor: a member already has an
                account, so "Register Free" would be a dead end for them. */}
            {viewer ? (
              <Link href="/dashboard" className={SQUARE_DARK}>
                Go to the App
              </Link>
            ) : (
              <Link href="/join" className={SQUARE_DARK}>
                Register for Free
              </Link>
            )}
          </p>
        </section>

        {/*
          ── SUPPORT, ONLY FOR RELEASED WORK (`P2-ALL-E810`) ─────────────────
          Scott, 2026-10-03: "until a phase's Deploy ◆ is marked Done, hide the
          section entirely." Asking for bug reports on something nobody can use
          yet invites tickets about work in progress.
          `releasedAt` comes from the plan's own Done milestones, so nothing has
          to be remembered separately.
        */}
        {releasedAt && releasedSupport && (
        <section className="mt-12 border-t border-line pt-6">
          <h2 className={`text-[24px] text-ink ${HEAD}`}>
            Found a problem in a released feature? Tell us.
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
            {/* Released work only — see `support-released.ts` for the rule and
                for what it cannot yet do. */}
            <span className={`text-[30px] text-ink ${HEAD}`}>{releasedSupport.open}</span> open
            <span className="mx-3 text-ink-3">·</span>
            <span className={`text-[30px] text-ink ${HEAD}`}>
              {releasedSupport.resolvedThisWeek}
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
        )}
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
