import Link from "next/link";
/* ⚠ `ShieldCheck`, `LayoutGrid` and `GraduationCap` went with the tile row
   (`P2-A4-E615`, ruling 5) — they were its icons and nothing else used them.
   ⚠ SUPERSEDED, quoted not deleted (`E164`):
   //   import { Play, ShieldCheck, LayoutGrid, GraduationCap, ArrowRight, Compass } from "lucide-react"; */
import { Play, ArrowRight, Compass, Award, BookOpen } from "lucide-react";
import { InstructorAvatar } from "@/components/learn/InstructorBadge";
/* ⚠ `ProgressRing` went with the level badge (`E606` R1). ⚠ SUPERSEDED (`E164`):
   //   import { ProgressRing } from "@/components/learn/app/ProgressRing"; */
/* ⚠ `StatTile` IS NO LONGER IMPORTED HERE (`P2-A4-E615`, ruling 5). ⚠⚠ THE
   COMPONENT STAYS ON DISK (`E164`) and other surfaces use it; only this page
   stopped rendering the four `0 of N` tiles.
   ⚠ SUPERSEDED, quoted not deleted (`E164`):
   //   import { StatTile } from "@/components/learn/app/StatTile"; */
import { CourseSpineBar } from "@/components/learn/app/CourseSpineBar";
/*
  ⚠ THESE TWO ARE CLIENT-ONLY, NOT MERELY CLIENT COMPONENTS. Both compute a
  streak, which needs the browser's timezone; server-rendering a placeholder and
  patching it on hydration threw a real mismatch. See ClientOnly.tsx.
*/
/* ⚠ `StreakTile` IS NO LONGER IMPORTED HERE (`P1-J3-E364` WS-2) — it left the
   stat row because `0 days` was the first thing a new learner saw. ⚠ THE
   COMPONENT AND ITS EXPORT STAY (`E164`); only this page stopped rendering it. */
import type { DashPath, MyLearning as MyLearningData } from "@/lib/learn-dashboard";
import type { Suggestion } from "@/lib/learn-suggestion";

/**
 * MY LEARNING — the signed-in `/learn` (brief_learn_app_shell WS2).
 *
 * Scott: *"The layout and design i started with is boring and sucks... Remember,
 * the visual is HUGE here. Seeing total learning paths vs the LPs, courses, and
 * lessons i have taken. Gamify it and make the UI look BEAUTIFUL."*
 *
 * ── ⚠ WHAT WAS HERE BEFORE IS NOT DELETED ────────────────────────────────────
 *
 * The catalog browser this replaces — search, domain chips, All / My tabs, the
 * PathCard grid — is the only way to search 23 paths by name or instructor, and
 * the brief does not ask for it to go. It now lives at `/learn/paths`, rendering
 * the SAME `LearnHome` component unchanged, and the two section links below
 * ("All my paths", "Browse all N") point at it. Flagged in the report: this is
 * one route more than the brief describes, and the alternative was losing a
 * working surface silently.
 *
 * ── ⚠ NOTHING ON THIS PAGE IS HARDCODED COPY ─────────────────────────────────
 *
 * The headline is computed (`headlineFor`), the counts are query results, and the
 * level band is a banding of lessons completed with NO stored field behind it.
 * The state that catches a hardcoded sentence is a brand-new account, and that is
 * the state this was verified in first.
 *
 * ── NO AGGREGATE HOURS ───────────────────────────────────────────────────────
 *
 * The mockup's `41.5 hrs invested` tile is a count of finished courses instead.
 * `run_time` is spreadsheet display copy — 290 of 522 rows null, and the rest
 * including "Intro", "NA", "Done" and "3:22:00" for a three-minute lesson. There
 * is no total to add up, so the page shows counts, which are exact.
 */
export function MyLearning({ data }: { data: MyLearningData }) {
  /* ⚠ `level` IS GONE (R1) — the badge it fed is retired and `LevelState` no
     longer travels. ⚠ SUPERSEDED, quoted not deleted (`E164`):
     //   const { level, totals, mine, continueCard, inProgress, paths, suggestion } = data; */
  /* ⚠ `mine` LEFT THIS DESTRUCTURE WITH THE TILE ROW (`P2-A4-E615`, ruling 5) —
     it fed the four `0 of N` figures and nothing else on this page reads it.
     ⚠⚠ IT STILL TRAVELS ON THE VIEW MODEL and other surfaces use it; only this
     page stopped reading it.
     ⚠ SUPERSEDED, quoted not deleted (`E164`):
     //   const { totals, mine, continueCard, inProgress, paths, suggestion } = data; */
  const { totals, continueCard, inProgress, paths, suggestion, certificates, teaching } = data;

  return (
    <div className="-mx-5 -mt-6 sm:-mx-8">
      {/*
        FULL-BLEED INSIDE AppShell's PADDED `main`. The negative margins exactly
        cancel `px-5 py-6 sm:px-8`, so the hero meets the rail the way the mockup
        shows. `overflow-hidden` is load-bearing: the radial wash is wider than
        the box on purpose.

        ── ⚠⚠ THE 0% STOP IS `--color-rail`, AND THAT IS THE SEAM FIX (`E400`) ──

        Scott: *"we talked about matching the colors at the top, but i have not
        seen that change happen."* ⚠ THERE ARE TWO HERO SYSTEMS AND ONLY THIS ONE
        WAS WRONG. `casing/ConsoleHero.tsx` already starts at `var(--color-rail)`,
        so Work, Sell and Orders have matched the rail all along — which is exactly
        why the step showed up on Learn and nowhere else.

        ⚠ MEASURED off the running app, sampled not asserted, at four heights:
            BEFORE   rail #272334  |  hero left edge #0f0b1c–#100b1e
            AFTER    rail #272334  |  hero left edge #272334
        This section is FULL-BLEED, so its left edge physically abuts the rail;
        that is what makes the step visible here and not on `LearnHome` or
        `FindWorkHero`, which are rounded cards inside padded content.

        ⚠⚠ THE STOP MOVED, NOT THE TOKEN. `--color-learn-night` is untouched, and
        `globals.css:93` says why: *"Repointing --color-learn-hot to #6b1a6e would
        have silently restyled…"*. Learn keeps its own palette from the 44% stop
        onward — only the first stop, the one that touches the rail, is the rail.
      */}
      <section className="relative overflow-hidden bg-[radial-gradient(900px_340px_at_84%_-10%,rgba(215,44,214,0.42),transparent_62%),linear-gradient(118deg,var(--color-rail)_0%,var(--color-learn-plum)_44%,#3d1560_72%,#5c1668_100%)] px-5 pt-7 pb-[78px] text-white sm:px-8">
        <div className="relative z-[2] grid items-center gap-8 min-[900px]:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            {/* ⚠ THE EYEBROW IS THE PAGE NAME (`P2-J1.1-E048` WS-3), so `Learn`.
                ⚠ SUPERSEDED, quoted not deleted: `My Learning`.
                ⚠⚠ THE EYEBROW ONLY. The headline below is COMPUTED by
                `headlineFor`, and this file's docblock warns that NOTHING ON THIS
                PAGE IS HARDCODED COPY — the headline, the counts and the level
                band are untouched. The component keeps its name: `MyLearning` is
                a symbol, not a label. */}
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
              Learn
            </p>
            <h1 className="max-w-[560px] font-display text-[26px] font-bold leading-[1.16] tracking-[-0.4px] sm:text-[31px]">
              {data.headline}
            </h1>
            <p className="mt-3 max-w-[520px] text-[14.5px] leading-relaxed text-white/80">
              {subhead(data)}
            </p>
          </div>

          {/*
            ── ⚠⚠⚠ THE LEVEL BADGE IS RETIRED (`P2-A4-E606` R1) ───────────────

            ⚠ RULING 1: **there is no XP and there are no levels in Panameer.**
            This rendered a numeral `1`, the band name *"Newcomer"*, a progress
            ring, a progress bar, and *"5 more lessons to Starter"*.
            ⚠⚠ ITS OWN COMMENT ARGUED IT WAS NOT A CURRENCY — *"a BANDING of
            lessons completed and nothing else"* — and that argument is exactly
            what the ruling overrides: **a band with a name, a numeral and a
            next rung IS a level, whatever the column behind it is called.**

            ⚠⚠⚠ THE HOLE IS LEFT AND REPORTED, NOT FILLED (Scott's instruction).
            The hero now runs headline → counts, with nothing where the badge
            sat. **No replacement was invented.**

            ⚠ `levelFor` AND `LEVEL_BANDS` ARE DELETED WITH IT (R2) — this was
            their only consumer. ⚠⚠ I PREVIOUSLY REPORTED THEM AS DEAD EXPORTS
            AND THAT WAS WRONG: the grep that "proved" it was truncated by
            `head -5`, which cut the `learn-dashboard.ts` hits and left only the
            unrelated `levelFor` in `user-levels.ts`. **A truncated grep is not
            a measurement.**

            ⚠ SUPERSEDED, quoted not deleted (`E164`):
            //   {/*
            //   THE LEVEL BADGE. ⚠ NOT A CURRENCY. "Level 3 · Practitioner" is a
            //   BANDING of lessons completed and nothing else — no XP column, no
            //   Community Credits (those still return a hard zero with pending:true
            //   and stay future tense). The ring shows progress through the band, and
            //   the line under it counts LESSONS to the next one, which is the thing
            //   it is actually a band of.
            //   <div className="flex items-center gap-4 rounded-[16px] border border-white/20 bg-white/10 px-5 py-4 backdrop-blur-[6px]">
            //   <ProgressRing
            //   value={Math.round(level.fraction * 100)}
            //   max={100}
            //   size={74}
            //   stroke={7}
            //   gradient={{ id: "lvl", from: "var(--color-learn-gold)", to: "var(--color-magenta)" }}
            //   label={String(level.level)}
            //   labelClassName="text-[23px] text-white"
            //   />
            //   <div className="min-w-0">
            //   <h4 className="font-display text-[15px] font-bold">{level.name}</h4>
            //   <p className="mt-1 text-[11.5px] leading-relaxed text-white/70">
            //   {level.nextName ? (
            //   <>
            //   {level.toNext} more lesson{level.toNext === 1 ? "" : "s"} to{" "}
            //   <b className="font-semibold text-white">{level.nextName}</b>
            //   </>
            //   ) : (
            //   <>Top band — {mine.lessonsCompleted} lessons watched</>
            //   )}
            //   </p>
            //   <span className="mt-2 block h-[5px] w-[150px] max-w-full overflow-hidden rounded-full bg-white/20">
            //   <span
            //   className="block h-full rounded-full bg-[linear-gradient(90deg,var(--color-learn-gold),var(--color-magenta))]"
            //   style={{ width: `${Math.round(level.fraction * 100)}%` }}
            //   />
            //   </span>
            //   </div>
          */}
        </div>
        <span
          className="pointer-events-none absolute inset-x-0 bottom-[-1px] h-[70px] bg-[linear-gradient(to_bottom,transparent,var(--color-canvas))]"
          aria-hidden
        />
      </section>

      <div className="relative z-[3] -mt-[52px] px-5 pb-8 sm:px-8">
        {/*
            ⚠ `xl:`, NOT `min-[1100px]:` — MEASURED, NOT PREFERRED.

            This row was `sm:grid-cols-2 min-[1100px]:grid-cols-4` and rendered
            2×2 at 1440px, where both media queries match and SOURCE ORDER
            decides. Tailwind v4 does not guarantee an arbitrary `min-[…]`
            variant sorts after a named one, so `sm:grid-cols-2` won. Named
            breakpoints are ordered by definition, so they are what a class that
            has to BEAT another one uses. (The `min-[…]` variants elsewhere in
            this build are all on properties with no unprefixed competitor, which
            is why they work.)
          */}
        {/*
          ── ⚠⚠⚠ THE FOUR `0 of N` TILES ARE RETIRED (`P2-A4-E615`, ruling 5) ─

          ⚠⚠ SCOTT, 2026-09-24: **"Kill them. The four 0-of-N tiles come off
          /learn entirely."**

          ⚠⚠⚠ THEY ARE THE SHAPE `E611` ALREADY RETIRED ON THIS EXACT PAGE.
          `E611` Q2 took off the Achievements grid on Scott's words — *"a badge
          earned is a record; five padlocks reading '0 of 5' is a progress
          system."* ⚠ Four tiles reading `0 of 12`, `0 of 39`, `0 of 305` and
          `0 of 12 paths` then stayed at the top of the same page.
          ⚠⚠ **A RULE APPLIED TO ONE COMPONENT AND NOT TO THE COMPONENT BESIDE
          IT IS NOT A RULE YET.** That is the whole finding.

          ⚠ AND THE MOCKUP HAS NO TILE ROW ANYWHERE — they were never a build
          of it.

          ⚠⚠ `StatTile` IS NOT DELETED (`E164`) — the component stays on disk and
          other surfaces use it. Only this page stopped rendering these four.
          ⚠ The figures themselves are NOT lost: `mine.enrolledPaths`,
          `coursesFinished`, `lessonsCompleted` and `pathsCertified` still travel
          on the view model, and the path cards below now carry what a member
          actually needs from them.

          ⚠ SUPERSEDED, quoted not deleted (`E164`) — the row as it stood:
          //   <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          //     <StatTile … value={`${mine.enrolledPaths}`} sub={`of ${totals.paths}`}
          //       label="Learning Paths Enrolled In" />
          //     <StatTile … value={`${mine.coursesFinished}`} sub={`of ${totals.courses}`}
          //       label="Courses Registered For" />
          //     <StatTile … value={`${mine.lessonsCompleted}`} sub={`of ${totals.lessons}`}
          //       label="Lessons Watched" />
          //     <StatTile … value={`${mine.pathsCertified}`} sub={`of ${totals.paths} paths`}
          //       label="Certificates Awarded" />
          //   </div>
        */}

        {/*
          ── ⚠ TWO CATALOG DESTINATIONS, NOT THREE (`P1-J3-E362` WS-3) ──────────

          ⚠ SUPERSEDED, quoted, because a stale explanation is a trap for whoever
          reads it next: *"THE THREE CATALOG DESTINATIONS, KEPT REACHABLE.
          `LearnHome`'s pill row carried links to /learn/courses and
          /learn/my-courses… which would have left this page, the Learn front
          door, with no way to reach either."*

          ⚠ `/learn/my-courses` WAS DEAD — a `ComingSoon` while
          `/learn/paths?tab=mine` already worked. It now REDIRECTS there (not
          deleted; the URL may be linked) and this row points at the real tab.
          ⚠ `My learning` RATHER THAN `My courses`: the tab lists PATHS.

          ⚠⚠ `/learn/courses` STAYS, AND THAT IS A REPORTED DEPARTURE FROM `E362`.
          It asked for that route to redirect here too, as a duplicate. It cannot:
          `/learn/courses` is PUBLIC (`P1-J0-E316` — *"a gate there turns the
          public hero's second CTA into a login wall"*) while `/learn/paths`
          redirects signed-out visitors to `/login` (`P1-J3-E036` — *"THIS ROUTE
          STAYS GATED"*). The duplication is the residue of two opposite recorded
          decisions and reconciling them is Scott's call.
        */}
        <nav className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px]">
          <Link href="/learn/paths" className="font-semibold text-magenta hover:underline">
            All Learning Paths
          </Link>
          <Link href="/learn/courses" className="text-ink-2 hover:text-magenta">
            All Courses
          </Link>
          <Link href="/learn/paths?tab=mine" className="text-ink-2 hover:text-magenta">
            My Learning
          </Link>
          {/*
            ── ⚠⚠⚠ CERTIFICATES AND TEACHING (`P2-A4-E615`, ruling 7) ─────────

            ⚠⚠ SCOTT, 2026-09-24: **"Add both tabs."**

            ⚠⚠⚠ THEY ARE ANCHORS ON THIS PAGE, NOT NEW ROUTES, AND THAT IS
            DELIBERATE. A tab that navigates to a route which does not exist is
            a door onto a wall (`E579`); both panels live below, so the tab
            takes the member to the thing rather than to a 404.
            ⚠ THE ROUTE SET IS THEREFORE UNCHANGED — `check:learn-build` §1
            derives it on both sides and would fail if it moved.

            ⚠⚠ TEACHING RENDERS ONLY FOR SOMEONE WHO TEACHES (`CLAUDE.md` rule
            5: a card hides only when the CAPABILITY is absent, not when the
            count is zero). A member who teaches nothing has no Teaching tab;
            one who teaches sees it with an honest count.
          */}
          <a href="#certificates" className="text-ink-2 hover:text-magenta">
            Certificates
          </a>
          {teaching.length > 0 && (
            <a href="#teaching" className="text-ink-2 hover:text-magenta">
              Teaching
            </a>
          )}
        </nav>

        {continueCard ? (
          <>
            <SectionHead title="Pick Up Where You Left Off">
              <Link href="/learn/paths?tab=mine" className="ml-auto shrink-0 text-[12px] font-semibold text-magenta hover:underline">
                All my paths <span aria-hidden>→</span>
              </Link>
            </SectionHead>
            <ContinueBlock card={continueCard} />
          </>
        ) : (
          <>
            <SectionHead title="Start Somewhere" />
            {/*
              ── ⚠⚠ TWO HALVES (`P1-J3-E043`) ────────────────────────────────

              SCOTT: *"Split the 'Nothing on the go yet' into two halves. Put the
              suggested first course (based on skills or on Foundations if they
              have no skills or less than 2 years of experience)."*

              ⚠ THE LEFT HALF IS UNCHANGED — same heading, same sentence, same
              `Browse the Catalog` button, including the `E042` casing note it
              still carries. Only its container changed.

              ⚠ ONE COLUMN BELOW 900px. The right half's reason line is prose;
              at 390px inside a 50% column it renders a word per line, which is
              the failure `CoverageCard`'s closing strip already documents.

              ⚠ AND IT COLLAPSES TO ONE COLUMN WHEN THERE IS NO SUGGESTION.
              `suggestion` is null only when the catalog has nothing left to
              suggest; the left half then fills the row rather than sitting
              beside an empty box. That is the "do not render half a row" case.
            */}
            <div className={suggestion ? "grid gap-4 min-[900px]:grid-cols-2" : ""}>
            <div className="rounded-brand border border-line bg-white p-6">
              <p className="text-[15px] font-bold">Nothing on the go yet.</p>
              <p className="mt-1.5 max-w-lg text-[13.5px] leading-relaxed text-ink-2">
                {totals.paths} learning paths and {totals.lessons} lessons, all free. Enroll in one
                and it shows up here with your place kept.
              </p>
              <Link
                href="/learn/paths"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-magenta px-5 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-magenta-dark"
              >
                {/*
                  ⚠⚠ `Browse the Catalog` — SCOTT OVERRODE HIMSELF (`P1-J3-E042`, 2026-08-30).
                  ⚠ SUPERSEDED, quoted: `Browse the catalog`.
                
                  That lowercase form was SETTLED BY HIM on 2026-08-24 (`HeroTwoUp.tsx:38`
                  records it: *"The two buttons that you have there are great. keep
                  those...add the rest."*), which is why the `E272` title-case sweep
                  correctly left it alone — his verbatim rule outranks the casing rule. He
                  has now asked for it fixed, so the casing rule applies: `the` is an
                  article, `Catalog` is the last word.
                
                  ⚠ THIS ALIGNS THE TWO, IT DOES NOT SPLIT THEM. The marketing hero at
                  `LearnPublic.tsx:886` ALREADY renders `Browse the Catalog` with the
                  capital — checked before changing this, because the brief warned the two
                  could diverge. This was the ONLY live lowercase copy in the codebase.
                  ⚠ `e2e/marketing-home.spec.ts:1814` writes the name lowercase but asserts
                  the HERO, and Playwright's `getByRole` name match is case-insensitive —
                  so it was green against the capitalised hero before this change and is
                  unaffected by it.
                */}
                Browse the Catalog <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            {suggestion && <SuggestedFirstPath s={suggestion} />}
            </div>
          </>
        )}

        {/*
          ── ⚠⚠ THE COVERAGE RINGS ARE GONE (`P1-J3-E364` WS-2) ────────────────

          ⚠ SUPERSEDED, quoted: `<SectionHead title="Your Coverage of the
          Catalog">` over `<CoverageCard data={data} />`.

          ⚠⚠ ITS THREE COUNTERS WERE THE STAT ROW A SECOND TIME, THIRTY PIXELS
          LOWER. `Learning Paths certified`, `Courses finished` and
          `Lessons watched` are the same three numbers the four tiles above now
          carry — and its header line printed the catalog totals a THIRD time.
          Scott, looking at the live page: *"this page has just too much stuff on
          it"* and *"the lesson total appears three times on one screen."*

          ⚠ THE RINGS WENT, THE NUMBERS DID NOT. That was the instruction, and
          `CoverageCard.tsx` and `CoverageRow.tsx` both STAY ON DISK unimported
          (`E164` — a retired component is never deleted). `E045`'s scrollable
          tile row lives in `CoverageRow` and is still there if Scott wants it
          back somewhere.
        */}

        {inProgress.length > 0 && (
          <>
            {/* ⚠⚠ `My Paths`, THE MOCKUP'S WORD, AND NOW TRUE (`P2-A4-E615`).
                ⚠ *"Paths in Progress"* described a list capped at three that
                dropped a path the moment it was finished. Ruling 8 made the
                list every path the member is in, so the heading says that.
                ⚠ SUPERSEDED, quoted not deleted (`E164`):
                //   <SectionHead title="Paths in Progress"> */}
            <SectionHead title="My Paths">
              {/* ⚠ A COUNTED SUMMARY, the mockup's *"3 in progress · 1 complete"*.
                  ⚠⚠ Each half renders only above zero — *"0 complete"* is a
                  sentence about nothing. */}
              <span className="text-[12px] text-ink-2">
                {inProgress.filter((p) => !p.certified).length > 0 &&
                  `${inProgress.filter((p) => !p.certified).length} in progress`}
                {inProgress.filter((p) => !p.certified).length > 0 &&
                  inProgress.filter((p) => p.certified).length > 0 &&
                  " · "}
                {inProgress.filter((p) => p.certified).length > 0 &&
                  `${inProgress.filter((p) => p.certified).length} complete`}
              </span>
              <Link href="/learn/paths" className="ml-auto shrink-0 text-[12px] font-semibold text-magenta hover:underline">
                Browse all {paths.length} <span aria-hidden>→</span>
              </Link>
            </SectionHead>
            <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
              {inProgress.map((p, i) => (
                <PathProgressCard key={p.id} path={p} index={i} />
              ))}
            </div>
          </>
        )}

        {/*
          ── ⚠⚠⚠ CERTIFICATES (`P2-A4-E615`, ruling 6) ───────────────────────

          ⚠⚠ SCOTT, 2026-09-24: **"Build it. The Certificates panel goes on
          /learn per the mockup."** It was in the mockup, nobody ruled against
          it, and it was never built — a silent drop, now a decision.

          ⚠⚠⚠ IT RENDERS AT ZERO, AND THAT IS THE RULE NOT AN OVERSIGHT
          (`CLAUDE.md` rule 5): a card renders for anyone who COULD have the
          thing it measures, with honest zeros, and hides only when the
          capability is absent. Every member can earn one, so every member sees
          the panel. ⚠ **Removing it would remove the only place a member learns
          that passing a path test puts a credential on their profile.**

          ⚠ THE FIGURES HAVE WRITERS: `learn-assessment.ts` issues the
          credential on a pass and writes the attempt. ⚠⚠ THE TABLE HOLDS ZERO
          ROWS TODAY, so what shows is the empty state — which NAMES THE FIRST
          MOVE rather than reporting emptiness (rule 4).
          ⚠ NO PROMISE AND NO DATE. It says what earns one, not when.
        */}
        <SectionHead title="Certificates">
          <Link
            href="/profile"
            className="ml-auto shrink-0 text-[12px] font-semibold text-magenta hover:underline"
          >
            Show on your profile <span aria-hidden>→</span>
          </Link>
        </SectionHead>
        <div id="certificates" className="rounded-brand border border-line bg-white p-5">
          {certificates.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {certificates.map((c) => (
                <li key={c.slug || c.title} className="flex flex-wrap items-baseline gap-x-2.5">
                  <Award className="h-4 w-4 text-magenta" aria-hidden />
                  <b className="text-[14px]">{c.title}</b>
                  {/* ⚠ EACH HALF RENDERS ONLY WHERE IT IS REAL. A missing date
                      is a missing fact, not a dash — the same rule `E611` Q6
                      settled for a lesson length. */}
                  <span className="text-[12.5px] text-ink-2">
                    {c.earnedOn
                      ? `Passed ${new Date(c.earnedOn).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`
                      : ""}
                    {c.earnedOn && c.score !== null ? " · " : ""}
                    {c.score !== null ? `${c.score}%` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <>
              <p className="text-[14px] font-bold">No certificates yet.</p>
              <p className="mt-1.5 max-w-lg text-[13.5px] leading-relaxed text-ink-2">
                Pass a path test and the certificate lands on your profile, where
                buyers can see it.
              </p>
            </>
          )}
        </div>

        {/*
          ── ⚠⚠⚠ TEACHING (`P2-A4-E615`, ruling 7) ──────────────────────────

          ⚠⚠ SCOTT, 2026-09-24: *"the teaching is for the courses i added and
          allows me to request adding a course."*

          ⚠⚠⚠ THE FIRST HALF IS BUILT. THE SECOND HALF IS A STOP AND IS NOT
          BUILT. Measured 2026-09-24: **nothing anywhere writes a request to add
          a course** — no model, no route, no function; `createPath` and
          `course.create` are `canAdminister` only. Ruling 7 says in terms: *"if
          nothing writes such a request, STOP AND REPORT rather than inventing a
          mechanism."* ⚠ **So there is no Request a Course control here.** A
          button that records nothing is worse than no button.

          ⚠ THE PANEL HIDES WHEN THE CAPABILITY IS ABSENT, not when a count is
          zero — a member who teaches nothing has no Teaching panel and no
          Teaching tab, which is rule 5's other half.
        */}
        {teaching.length > 0 && (
          <>
            <SectionHead title="Teaching">
              <span className="text-[12px] text-ink-2">
                {teaching.length} path{teaching.length === 1 ? "" : "s"}
              </span>
            </SectionHead>
            <div id="teaching" className="rounded-brand border border-line bg-white p-5">
              <ul className="flex flex-col gap-2.5">
                {teaching.map((t) => (
                  <li key={t.slug} className="flex flex-wrap items-baseline gap-x-2.5">
                    <BookOpen className="h-4 w-4 text-magenta" aria-hidden />
                    <Link
                      href={`/learn/${t.slug}`}
                      className="text-[14px] font-semibold text-magenta hover:underline"
                    >
                      {t.title}
                    </Link>
                    {/* ⚠ A COUNTED FIGURE, SCOPED TO THIS PERSON. On a co-taught
                        path, claiming all of its lessons would be the
                        misrepresentation `getPathsTaughtBy` exists to avoid. */}
                    <span className="text-[12.5px] text-ink-2">
                      {t.taughtByThem} of {t.lessons} lesson
                      {t.lessons === 1 ? "" : "s"} yours
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/*
          ── ⚠⚠⚠ THE ACHIEVEMENTS GRID IS RETIRED (`P2-A4-E611`, Q2) ──────────

          ⚠⚠ SCOTT, 2026-09-23, OVERRULING HIS OWN EARLIER RULING: *"a badge
          earned is a record; five padlocks reading '0 of 5' is a progress
          system."*

          ⚠ `E606` retired XP, levels, bands and streaks. ⚠⚠ THIS SURVIVED THAT
          PASS AND IS THE SAME THING IN A NEW COSTUME — measured on the phone at
          390px, `/learn` rendered *"Achievements — 0 of 5 unlocked"* above five
          locked tiles, on a page where one figure can be non-zero.
          ⚠ EARNED CERTIFICATES LIVE IN THE CERTIFICATES PANEL, which is a
          record of something that happened rather than a ladder of things that
          have not.
          ⚠⚠ `AchievementGrid.tsx` AND ITS `ClientOnly` WRAPPER STAY ON DISK
          (`E164`) — nothing imports them. Do not delete the files.
          ⚠ SUPERSEDED, quoted not deleted (`E164`):
          //   ⚠ `completedAt` NO LONGER TRAVELS (`E606` R3) — the streak it fed is gone.
          //   <AchievementGrid achievements={data.achievements} />
          //   <AchievementGrid achievements={data.achievements} completedAt={data.completedAt} />
        */}
      </div>
    </div>
  );
}

/**
 * The hero's second line. Computed like the headline — a fixed sentence here
 * would be wrong for a new account in exactly the same way.
 */
function subhead(d: MyLearningData): string {
  if (d.continueCard) {
    const left = d.continueCard.pathLessons - d.continueCard.pathCompleted;
    return `You're in ${d.continueCard.courseTitle} — ${left} lesson${left === 1 ? "" : "s"} left in ${d.continueCard.pathTitle}.`;
  }
  if (d.mine.enrolledPaths > 0) {
    return `You're enrolled in ${d.mine.enrolledPaths} path${d.mine.enrolledPaths === 1 ? "" : "s"}. Everything in them is watched — the path tests are what's left.`;
  }
  /* ⚠⚠ THE SUBHEAD NAMES WHAT IT COUNTS (`E606` R4). *"12 learning paths"* and
     *"23 learning paths"* were both true of this catalogue and neither said
     which question it answered. `d.totals` is the STARTABLE set — paths with a
     playable lesson — so the sentence says so.
     ⚠ SUPERSEDED, quoted not deleted (`E164`):
     //   return `${d.totals.paths} learning paths, ${d.totals.lessons} lessons, taught by working consultants. Free, and it stays free.`; */
  /*
    ── ⚠⚠⚠ TWO FIGURES, NEVER ONE (`P2-A4-E613`, Scott 2026-09-24) ──────────

    ⚠⚠ SCOTT: *"Show it. '11 in production' appears as its own labelled figure…
    the two numbers are never summed into 23 anywhere a member can see."*

    ⚠⚠⚠ THEY SIT IN SEPARATE SENTENCES ON PURPOSE. Inside one clause —
    *"12 paths you can start today and 11 in production"* — a reader adds them,
    and 23 is the number this whole brief exists to stop anyone printing.
    ⚠ A FULL STOP IS THE MECHANISM: the second sentence names what it counts and
    what it is NOT, so the figure cannot be read as more of the first.
    ⚠ It renders ONLY above zero. *"0 in production"* is an anti-advertisement
    and, once every path is shot, a sentence about nothing.
    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   return `${d.totals.paths} paths you can start today, ${d.totals.lessons} lessons you can watch, taught by working consultants. Free, and it stays free.`;
  */
  const open = `${d.totals.paths} paths you can start today, ${d.totals.lessons} lessons you can watch, taught by working consultants. Free, and it stays free.`;
  if (d.totals.inProduction <= 0) return open;
  /* ⚠⚠⚠ NO CLAIM ABOUT WHICH STAGE, AND THAT IS A CORRECTION I MADE TO MY OWN
     FIRST DRAFT. It read *"written, not yet filmed"* — which WS-A had just made
     FALSE for `How to Implement`, whose 26 lessons Scott confirmed were filmed
     and are now `RAW_SHOT`. ⚠ The eleven are not all at one rung, so a sentence
     that names a rung is wrong about some of them. **"In production" is the
     only thing true of all eleven.** */
  return `${open} Another ${d.totals.inProduction} are in production.`;
}

function SectionHead({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mt-7 mb-3.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h3 className="font-display text-[17px] font-bold">{title}</h3>
      {children}
    </div>
  );
}

/**
 * ⚠ NO PLAY PROMISE WHEN THERE IS NO VIDEO.
 *
 * Measured on the live DB: 305 of 522 lessons are playable (a `vimeo_ref` AND a
 * production status past URL_ADDED — both halves, per `isPlayable`), and 217 are
 * not. The brief was written believing `vimeo_ref` was null on ALL 522; the video
 * URLs have since been loaded. So this is per-lesson, not global: a playable
 * lesson gets a play triangle and "Resume lesson", and an unplayable one gets
 * "Open lesson" with no triangle and a "video coming" chip. Neither state is a
 * dead play button.
 */
function ContinueBlock({ card }: { card: NonNullable<MyLearningData["continueCard"]> }) {
  const pct =
    card.pathLessons > 0 ? Math.round((card.pathCompleted / card.pathLessons) * 100) : 0;
  return (
    <div className="grid overflow-hidden rounded-brand border border-line bg-white shadow-[0_20px_44px_-28px_rgba(23,30,62,0.45)] min-[760px]:grid-cols-[290px_1fr]">
      <div className="relative grid min-h-[150px] place-items-center bg-[linear-gradient(135deg,var(--color-learn-plum),#5c1668)]">
        {card.lesson.thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.lesson.thumbnailUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-60"
          />
        )}
        {card.lesson.playable ? (
          <span className="relative grid h-[52px] w-[52px] place-items-center rounded-full bg-white/95">
            <Play className="ml-[3px] h-5 w-5 fill-magenta text-magenta" aria-hidden />
          </span>
        ) : (
          <span className="relative rounded-full bg-black/45 px-3 py-1.5 text-[11px] font-semibold text-white">
            Video coming
          </span>
        )}
        <span className="absolute bottom-2.5 left-3 rounded-md bg-black/50 px-2 py-[3px] text-[10.5px] text-white">
          {/* ⚠ run_time VERBATIM AS STORED, or nothing. Never parsed, never summed. */}
          {card.lesson.runTime ? `${card.lesson.runTime} · ` : ""}Lesson {card.position} of{" "}
          {card.pathLessons}
        </span>
        <span className="absolute inset-x-0 bottom-0 h-1 bg-white/25">
          <span className="block h-full bg-magenta" style={{ width: `${pct}%` }} />
        </span>
      </div>

      <div className="min-w-0 px-5 py-5">
        <p className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-2">
          <b className="font-semibold text-ink-2">{card.pathTitle}</b>
          <span aria-hidden>›</span>
          <b className="font-semibold text-ink-2">{card.courseTitle}</b>
          <span aria-hidden>›</span>
          <span>{card.sectionTitle}</span>
        </p>
        <h4 className="font-display text-[18px] font-bold leading-[1.25]">{card.lesson.title}</h4>
        {card.lesson.description && (
          <p className="mt-2 max-w-[560px] text-[12.5px] leading-relaxed text-ink-2">
            {card.lesson.description}
          </p>
        )}

        <div className="mt-3.5 flex flex-wrap items-center gap-3">
          {card.instructor && (
            <span className="flex items-center gap-2.5">
              <InstructorAvatar instructor={card.instructor} className="h-[34px] w-[34px]" />
              <span className="min-w-0">
                <b className="block text-[12.5px]">{card.instructor.name}</b>
                {/*
                  ⚠ AN INHERITED FACE SAYS SO. This lesson may name nobody — 56 in
                  the catalog don't — in which case the course's dominant
                  instructor is shown, and labelling that "instructor" would
                  assert they taught this lesson.
                */}
                <span className="block text-[11px] text-ink-2">
                  {card.instructorInherited ? "Course instructor" : "Instructor"}
                </span>
              </span>
            </span>
          )}
          <Link
            href={`/learn/${card.pathSlug}/${card.lesson.id}`}
            className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-[9px] bg-magenta px-4 py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-magenta-dark"
          >
            {card.lesson.playable ? (
              <>
                <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
                Resume lesson
              </>
            ) : (
              /* ⚠ NOT "Resume" — there is nothing to resume. */
              <>
                    {/*
                      ⚠ `Watch`, NOT `Open` (`P1-J3-E039`, Scott 2026-08-27).
                      THE THREE VERBS, ONE PER LEVEL:
                        Learning Path -> ENROLL · Course -> REGISTER · Lesson -> WATCH
                      ⚠ THIS IS THE ONLY LESSON-LEVEL CONTROL ON THE SURFACE, so it is
                      the only place `WATCH` had anywhere to land.
                      ⚠ SUPERSEDED: *`Open lesson`*.
                      ⚠ NO CONTROL WAS INVENTED FOR `REGISTER` — there is no
                      course-level control anywhere in `src/components/learn` or
                      `src/app/learn` today, and the brief forbids inventing one.
                      Reported instead.
                    */}
                    Watch lesson</>
            )}
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Deterministic cap gradients, so a card's colour doesn't shuffle per render. */
const CAPS = [
  "bg-[linear-gradient(150deg,var(--color-learn-plum),#5c1668)]",
  "bg-[linear-gradient(150deg,#0b3b52,#12766d)]",
  "bg-[linear-gradient(150deg,#4a2a08,#a1660b)]",
];

function PathProgressCard({ path, index }: { path: DashPath; index: number }) {
  return (
    <div className="overflow-hidden rounded-[15px] border border-line bg-white shadow-[0_16px_36px_-26px_rgba(23,30,62,0.42)]">
      <Link
        href={`/learn/${path.slug}`}
        className={`relative flex h-[76px] items-end px-3.5 py-3 ${CAPS[index % CAPS.length]}`}
      >
        {path.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={path.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        {/*
          ⚠ A DEEPER SCRIM THAN THE MOCKUP'S, BECAUSE THE MOCKUP HAS NO PHOTO.
          Its caps are flat gradients; these carry the path's real cover image,
          and the first pass (0.55 → transparent at 62%) put 14.5px bold white over
          exposed brickwork. Measured from the rendered pixels rather than
          eyeballed: 4.42:1 at the second attempt, which FAILS — 14.5px bold is
          not WCAG "large text", so the bar is 4.5:1 and not 3:1. This ramp holds
          alpha at 0.80+ across the whole glyph band.
        */}
        <span className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.86)_0%,rgba(0,0,0,0.80)_45%,rgba(0,0,0,0.30)_80%,rgba(0,0,0,0.10)_100%)]" aria-hidden />
        <b className="relative z-[2] font-display text-[14.5px] leading-[1.2] text-white">
          {path.title}
        </b>
      </Link>
      <div className="px-3.5 pt-3 pb-4">
        <p className="text-[11px] text-ink-2">
          {path.courses} course{path.courses === 1 ? "" : "s"} · {path.lessons} lesson
          {path.lessons === 1 ? "" : "s"}
        </p>
        {/*
          ── ⚠⚠ THE COURSE SPINE REPLACES THE FLAT METER (`P1-J3-E364` WS-4) ───

          ⚠ SUPERSEDED, quoted: a single `h-1.5` gradient bar at
          `width: {path.percent}%`.

          ⚠⚠ THAT BAR SAID ONE NUMBER THE LINE BELOW IT ALREADY SAID. The spine
          says something no number on the page can: the SHAPE of the path. Measured
          on Inventory Management — nine courses of 5·5·5·5·6·11·9·3·1, so a
          learner sees eight even chunks, one big middle course, and a stub at the
          end that isn't shot. Scott asked for exactly that: *"show me that in a
          minute."*

          ⚠ IT RENDERS NOTHING WHEN THE STRUCTURE COULD NOT BE RESOLVED — see
          `CourseSpineBar`. The line beneath stays either way, so a path with no
          spine still states its progress in words.
        */}
        {/*
          ── ⚠⚠ THE STATUS PILL (`P2-A4-E615`, the mockup's card) ────────────

          ⚠⚠⚠ IT SAYS ONLY WHAT IS TRUE, AND THE MOCKUP'S OWN PILLS ARE NOT.
          The mockup shows *"Test unlocks at 100%"* and *"Test ready"* — ⚠ BUT
          `E611` Q1 DELETED THE COMPLETION GATE ON SCOTT'S RULING: *"no
          completion gate on the path test."* **There is no unlock at 100%, so
          a pill claiming one would be a rule the product does not have.**
          ⚠ Every state below is read off the view model: `certified` has a
          writer (`learn-assessment.ts` issues the credential), and `completed`
          and `playableLessons` are counted over playable lessons.
        */}
        <p className="mt-1 inline-flex w-fit rounded-full bg-black/[0.05] px-2.5 py-[3px] text-[11px] font-bold text-ink-2">
          {path.certified
            ? "Complete"
            : path.completed === 0
              ? "Not started"
              : "In progress"}
        </p>
        <div className="my-2.5">
          <CourseSpineBar spine={path.spine} title={path.title} />
        </div>
        <p className="flex items-center gap-2 text-[11px] text-ink-2">
          {/* ⚠ `E364` WS-5 — OVER PLAYABLE LESSONS. `path.completed` and
              `path.percent` both come from `playableProgress` now, so "47 of 47"
              and "100%" agree instead of stopping at 94%. */}
          <b className="text-ink-2">
            {path.completed} of {path.playableLessons} lessons
          </b>
          <span className="ml-auto">{path.percent}%</span>
        </p>

        {path.instructors.length > 0 && (
          <span className="mt-2.5 flex items-center">
            {path.instructors.slice(0, 3).map((ins, i) => (
              <span key={ins.id} className={i > 0 ? "-ml-2" : ""}>
                <InstructorAvatar instructor={ins} className="h-[26px] w-[26px] ring-2 ring-white" />
              </span>
            ))}
            <span className="ml-2 text-[10.5px] text-ink-2">
              {path.instructors.length} instructor{path.instructors.length === 1 ? "" : "s"}
            </span>
          </span>
        )}

        {path.nextLesson && (
          <Link
            href={`/learn/${path.slug}/${path.nextLesson.id}`}
            className="mt-2.5 flex items-center gap-2 rounded-[9px] bg-bg-soft px-3 py-2.5 text-[11.5px] text-ink-2 hover:bg-line/60"
          >
            {path.nextLesson.playable ? (
              <Play className="h-3.5 w-3.5 shrink-0 fill-magenta text-magenta" aria-hidden />
            ) : (
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-magenta" aria-hidden />
            )}
            <span className="min-w-0 truncate">Next: {path.nextLesson.title}</span>
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * THE RIGHT HALF OF THE EMPTY STATE (`P1-J3-E043`) — ONE suggestion.
 *
 * ⚠ ONE. Not three, not a carousel. `pickSuggestion` returns a single row and
 * this renders it; there is no array here to grow later by accident.
 *
 * ⚠⚠ EVERY WORD OF `s.reason` COMES FROM `lib/learn-suggestion.ts` AND IS
 * CC-AUTHORED, flagged there and reported at `E043` for Scott to overrule. This
 * component invents no copy of its own beyond the eyebrow and the button label.
 *
 * ⚠ THE SELECTION IS NOT RE-DERIVED HERE. Title, slug, reason and the counts all
 * arrive decided from the server, so the page cannot disagree with the picker.
 *
 * ── ⚠⚠⚠ THE MOCKUP'S "RECOMMENDED FOR YOU" IS NOT BUILT, AND THAT IS A
 *        RULING, NOT AN OMISSION (`P2-A4-E611`, Q3) ────────────────────────
 *
 * ⚠ The 2026-09-21 mockup shows a *"Recommended for You"* section subtitled
 * **"From the gaps on your profile."**
 * ⚠⚠⚠ NOTHING COMPUTES THAT, AND THE CODE COMPUTES THE OPPOSITE.
 * `skillMatchesPath` matches a path to skills the member ALREADY HAS; a gap is
 * a skill they do not have. ⚠ `ProfileGapFlags` exists but records profile
 * COMPLETENESS — no bio, no education, no languages — and maps to no path.
 *
 * ⚠⚠ SCOTT, 2026-09-23: *"relabel, don't rebuild… use the code's own honest
 * reason string. A real gap→path computation is its own brief."*
 * ⚠ SO THIS CARD STAYS AS IT IS. `s.reason` already says *"Because Payables is
 * on your profile"* — which is true, and is the sentence the mockup's subtitle
 * would have contradicted. **Do not add the mockup's wording to it.**
 */
function SuggestedFirstPath({ s }: { s: Suggestion }) {
  return (
    <div className="flex flex-col rounded-brand border border-magenta/30 bg-[linear-gradient(160deg,rgba(215,44,214,0.07),rgba(215,44,214,0.01))] p-6">
      <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-magenta">
        <Compass className="h-3.5 w-3.5" aria-hidden />
        Suggested First Path
      </p>
      <p className="text-[15px] font-bold">{s.title}</p>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">{s.reason}</p>
      <p className="mt-1 text-[12px] text-ink-2">
        {s.courses} course{s.courses === 1 ? "" : "s"} · {s.lessons} lesson
        {s.lessons === 1 ? "" : "s"}
      </p>
      <Link
        href={`/learn/${s.slug}`}
        className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-magenta px-5 py-2.5 text-[13.5px] font-bold text-magenta transition-colors hover:bg-magenta hover:text-white"
      >
        Start This Path <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}
