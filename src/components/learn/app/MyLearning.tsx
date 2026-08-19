import Link from "next/link";
import { Play, ShieldCheck, LayoutGrid, GraduationCap, ArrowRight } from "lucide-react";
import { InstructorAvatar } from "@/components/learn/InstructorBadge";
import { ProgressRing } from "@/components/learn/app/ProgressRing";
import { StatTile } from "@/components/learn/app/StatTile";
import { CoverageCard } from "@/components/learn/app/CoverageCard";
/*
  ⚠ THESE TWO ARE CLIENT-ONLY, NOT MERELY CLIENT COMPONENTS. Both compute a
  streak, which needs the browser's timezone; server-rendering a placeholder and
  patching it on hydration threw a real mismatch. See ClientOnly.tsx.
*/
import { AchievementGrid, StreakTile } from "@/components/learn/app/ClientOnly";
import type { DashPath, MyLearning as MyLearningData } from "@/lib/learn-dashboard";

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
  const { level, totals, mine, continueCard, inProgress, paths } = data;

  return (
    <div className="-mx-5 -mt-6 sm:-mx-8">
      {/*
        FULL-BLEED INSIDE AppShell's PADDED `main`. The negative margins exactly
        cancel `px-5 py-6 sm:px-8`, so the hero meets the rail the way the mockup
        shows. `overflow-hidden` is load-bearing: the radial wash is wider than
        the box on purpose.
      */}
      <section className="relative overflow-hidden bg-[radial-gradient(900px_340px_at_84%_-10%,rgba(215,44,214,0.42),transparent_62%),linear-gradient(118deg,var(--color-learn-night)_0%,var(--color-learn-plum)_44%,#3d1560_72%,#5c1668_100%)] px-5 pt-7 pb-[78px] text-white sm:px-8">
        <div className="relative z-[2] grid items-center gap-8 min-[900px]:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
              My Learning
            </p>
            <h1 className="max-w-[560px] font-display text-[26px] font-bold leading-[1.16] tracking-[-0.4px] sm:text-[31px]">
              {data.headline}
            </h1>
            <p className="mt-3 max-w-[520px] text-[14.5px] leading-relaxed text-white/80">
              {subhead(data)}
            </p>
          </div>

          {/*
            THE LEVEL BADGE. ⚠ NOT A CURRENCY. "Level 3 · Practitioner" is a
            BANDING of lessons completed and nothing else — no XP column, no
            Community Credits (those still return a hard zero with pending:true
            and stay future tense). The ring shows progress through the band, and
            the line under it counts LESSONS to the next one, which is the thing
            it is actually a band of.
          */}
          <div className="flex items-center gap-4 rounded-[16px] border border-white/20 bg-white/10 px-5 py-4 backdrop-blur-[6px]">
            <ProgressRing
              value={Math.round(level.fraction * 100)}
              max={100}
              size={74}
              stroke={7}
              gradient={{ id: "lvl", from: "var(--color-learn-gold)", to: "var(--color-magenta)" }}
              label={String(level.level)}
              labelClassName="text-[23px] text-white"
            />
            <div className="min-w-0">
              <h4 className="font-display text-[15px] font-bold">{level.name}</h4>
              <p className="mt-1 text-[11.5px] leading-relaxed text-white/70">
                {level.nextName ? (
                  <>
                    {level.toNext} more lesson{level.toNext === 1 ? "" : "s"} to{" "}
                    <b className="font-semibold text-white">{level.nextName}</b>
                  </>
                ) : (
                  <>Top band — {mine.lessonsCompleted} lessons watched</>
                )}
              </p>
              <span className="mt-2 block h-[5px] w-[150px] max-w-full overflow-hidden rounded-full bg-white/20">
                <span
                  className="block h-full rounded-full bg-[linear-gradient(90deg,var(--color-learn-gold),var(--color-magenta))]"
                  style={{ width: `${Math.round(level.fraction * 100)}%` }}
                />
              </span>
            </div>
          </div>
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
          <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          <StreakTile completedAt={data.completedAt} />
          {/*
            ⚠ THIS TILE IS THE ONE THE BRIEF SWAPS. It was `41.5 hrs invested`.
          */}
          <StatTile
            icon={<GraduationCap className="h-[19px] w-[19px]" aria-hidden />}
            tone="blue"
            value={`${mine.coursesFinished}`}
            sub={`/ ${totals.courses}`}
            label="Courses finished"
          />
          <StatTile
            icon={<ShieldCheck className="h-[19px] w-[19px]" aria-hidden />}
            tone="magenta"
            value={`${mine.pathsCertified}`}
            label={`Certificate${mine.pathsCertified === 1 ? "" : "s"} earned`}
          />
          <StatTile
            icon={<LayoutGrid className="h-[19px] w-[19px]" aria-hidden />}
            tone="green"
            value={`${mine.lessonsCompleted}`}
            sub={`/ ${totals.lessons}`}
            label="Lessons completed"
          />
        </div>

        {/*
          ⚠ THE THREE CATALOG DESTINATIONS, KEPT REACHABLE. `LearnHome`'s pill row
          carried links to /learn/courses and /learn/my-courses, and that row moved
          to /learn/paths with it — which would have left this page, the Learn front
          door, with no way to reach either. One quiet row rather than a second tab
          strip above the hero.
        */}
        <nav className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px]">
          <Link href="/learn/paths" className="font-semibold text-magenta hover:underline">
            All learning paths
          </Link>
          <Link href="/learn/courses" className="text-ink-2 hover:text-magenta">
            All courses
          </Link>
          <Link href="/learn/my-courses" className="text-ink-2 hover:text-magenta">
            My courses
          </Link>
        </nav>

        {continueCard ? (
          <>
            <SectionHead title="Pick up where you left off">
              <Link href="/learn/paths?tab=mine" className="ml-auto shrink-0 text-[12px] font-semibold text-magenta hover:underline">
                All my paths <span aria-hidden>→</span>
              </Link>
            </SectionHead>
            <ContinueBlock card={continueCard} />
          </>
        ) : (
          <>
            <SectionHead title="Start somewhere" />
            <div className="rounded-brand border border-line bg-white p-6">
              <p className="text-[15px] font-bold">Nothing on the go yet.</p>
              <p className="mt-1.5 max-w-lg text-[13.5px] leading-relaxed text-ink-2">
                {totals.paths} learning paths and {totals.lessons} lessons, all free. Enrol in one
                and it shows up here with your place kept.
              </p>
              <Link
                href="/learn/paths"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-magenta px-5 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-magenta-dark"
              >
                Browse the catalog <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </>
        )}

        <SectionHead title="Your coverage of the catalog">
          <p className="text-[12px] text-ink-2">
            {totals.paths} learning paths · {totals.courses} courses · {totals.lessons} lessons
          </p>
        </SectionHead>
        <CoverageCard data={data} />

        {inProgress.length > 0 && (
          <>
            <SectionHead title="Paths in progress">
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

        <AchievementGrid achievements={data.achievements} completedAt={data.completedAt} />
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
  return `${d.totals.paths} learning paths, ${d.totals.lessons} lessons, taught by working consultants. Free, and it stays free.`;
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
              <>Open lesson</>
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
        <span className="my-2.5 block h-1.5 overflow-hidden rounded-full bg-bg-soft">
          <span
            className="block h-full rounded-full bg-[linear-gradient(90deg,var(--color-magenta),#8b1fa8)]"
            style={{ width: `${path.percent}%` }}
          />
        </span>
        <p className="flex items-center gap-2 text-[11px] text-ink-2">
          <b className="text-ink-2">
            {path.completed} of {path.lessons} lessons
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
