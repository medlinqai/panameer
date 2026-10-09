import Link from "next/link";
import { LearnTabs } from "@/components/learn/app/LearnTabs";
import { FreeLine } from "@/components/marketing/FreeLine";
import { PatternHeader } from "@/components/casing/PatternHeader";
import StreakTile from "@/components/learn/app/StreakTile";
import { StatTile } from "@/components/learn/app/StatTile";
import { GraduationCap } from "lucide-react";
// ruling 5) — they were its icons and nothing else used them.
import { Play, ArrowRight, Compass, Award, BookOpen } from "lucide-react";
import { InstructorAvatar } from "@/components/learn/InstructorBadge";
// COMPONENT STAYS ON DISK and other surfaces use it; only this page
import { CourseSpineBar } from "@/components/learn/app/CourseSpineBar";
// THESE TWO ARE CLIENT-ONLY, NOT MERELY CLIENT COMPONENTS. Both compute a
// stat row because `0 days` was the first thing a new learner saw. THE
import type { DashPath, MyLearning as MyLearningData, StarterCard } from "@/lib/learn-dashboard";

/** MY LEARNING — the signed-in `/learn` (brief_learn_app_shell WS2). */
export function MyLearning({ data }: { data: MyLearningData }) {
  // const { level, totals, mine, continueCard, inProgress, paths, suggestion } = data
  // it fed the four `0 of N` figures and nothing else on this page reads it.
  // travels on the view model; this page stopped reading it.
  const { totals, mine, completedAt, continueCard, inProgress, paths, starter, certificates, teaching } = data;

  // LESSONS DONE THIS MONTH (WS-D item 1, ruling 36a)
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const lessonsThisMonth = completedAt.filter((t) => new Date(t) >= monthStart).length;

  return (
    // THE FRAME, REBUILT TO THE MOCKUP
    <div className="-mx-5 -mt-6 bg-canvas sm:-mx-8">
      {/* THE TAB ROW (item 4) */}
      {/* EXTRACTED TO `LearnTabs` (brief 9 WS-A). This row was hand-rolled */}
      <LearnTabs active="my-learning" teaches={teaching.length > 0} />

      {/* ITEM 6 — THE MOCKUP'S `.wrap`: `max-width:1120px; margin:0 auto */}
      <div className="mx-auto w-full max-w-[1120px] px-5 pt-[22px] pb-[60px] sm:px-5">
        {/* ITEM 5 — CERTIFICATES IS A RAIL, NOT A BAND */}
        {/* RULING 36d — THE PATTERN HEADER, AND WHAT IT DOES NOT UNDO */}
        <PatternHeader
          eyebrow="MY LEARNING"
          headline="Where You're Up To"
          figures={[
            { label: "Lessons Done", value: mine.lessonsCompleted },
            { label: "Paths Enrolled", value: mine.enrolledPaths },
            { label: "Certificates", value: mine.pathsCertified },
          ]}
          picture={
            <div className="flex flex-col gap-3">
              {/* to check first). It is an orphan on disk taking exactly */}
              <StreakTile completedAt={completedAt} />
              <StatTile
                icon={<GraduationCap className="h-[19px] w-[19px]" aria-hidden />}
                tone="magenta"
                value={`${lessonsThisMonth}`}
                label="Lessons Done This Month"
              />
            </div>
          }
          move={
            <>
              {/* Derived, never canned — and at a genuine zero it names the */}
              {mine.lessonsCompleted === 0
                ? "Nothing watched yet. Starting a path is the first move."
                : `${lessonsThisMonth} this month.`}
            </>
          }
          primary={{ label: "Browse Learning Paths", href: "/learn/paths" }}
        />

        {/* THE LEARN LEAD LINE . MEASURED AS TRUE: no price field exists on */}
        <FreeLine
          claim="Every course, free."
          compare="Other networks bundle learning into a monthly subscription."
        />

        <div className="grid items-start gap-5 min-[900px]:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">


        {/* THE STARTER PATH, ABOVE EVERYTHING AND GATED ON NOTHING */}
        {starter && (
          <div className="mb-6">
            <StarterPathCard s={starter} />
          </div>
        )}

        {continueCard ? (
          <>
            <SectionHead title="Pick Up Where You Left Off">
              <Link href="/learn/my" className="ml-auto shrink-0 text-[12px] font-semibold text-magenta hover:underline">
                All my paths <span aria-hidden>→</span>
              </Link>
            </SectionHead>
            <ContinueBlock card={continueCard} />
          </>
        ) : (
          <>
            <SectionHead title="Start Somewhere" />
            {/* SCOTT: *"Split the 'Nothing on the go yet' into two halves. Put the */}
            <div>
            <div className="rounded-brand border border-line bg-white p-6">
              <p className="text-[15px] font-bold">Nothing on the go yet.</p>
              <p className="mt-1.5 max-w-lg text-[13.5px] leading-relaxed text-ink-2">
                {totals.paths} learning paths and {totals.lessons} lessons, all free. Enroll in one
                and it shows up here with your place kept.
              </p>
              <Link
                href="/learn/paths"
                className="mt-4 inline-flex items-center gap-2 bg-magenta px-5 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-magenta-dark"
              >
                {/* That lowercase form was SETTLED BY HIM on 2026-08-24 (`HeroTwoUp.tsx:38` */}
                Browse the Catalog <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            {/* THE SUGGESTED-FIRST-PATH CARD NO LONGER RENDERS ( WS-C) */}
            </div>
          </>
        )}

        {/* THE COVERAGE RINGS ARE GONE WS-2) */}

        {inProgress.length > 0 && (
          <>
            {/* dropped a path the moment it was finished. Ruling 8 made the */}
            <SectionHead title="My Paths">
              {/* A COUNTED SUMMARY, the mockup's *"3 in progress · 1 complete"*. */}
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
          </div>

          {/* THE RAIL. One column under 900px — the grid does it. */}
          <aside className="min-w-0">
        {/* CERTIFICATES , ruling 6) */}
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
                  {/* EACH HALF RENDERS ONLY WHERE IT IS REAL. A missing date */}
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
          </aside>
        </div>

        {/* TEACHING , ruling 7) */}
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
                    {/* A COUNTED FIGURE, SCOPED TO THIS PERSON. On a co-taught */}
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

        {/* THE ACHIEVEMENTS GRID IS RETIRED , Q2) */}
      </div>
    </div>
  );
}

/** The hero's second line. Computed like the headline — a fixed sentence here */
// THE MOCKUP'S MY LEARNING HAS NO PAGE SUBHEAD. The page opens on the
// function subhead(d: MyLearningData): string {


function SectionHead({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mt-7 mb-3.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h3 className="font-display text-[17px] font-bold">{title}</h3>
      {children}
    </div>
  );
}

/** NO PLAY PROMISE WHEN THERE IS NO VIDEO. */
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
          {/* run_time VERBATIM AS STORED, or nothing. Never parsed, never summed. */}
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
                {/* AN INHERITED FACE SAYS SO. This lesson may name nobody — 56 in */}
                <span className="block text-[11px] text-ink-2">
                  {card.instructorInherited ? "Course instructor" : "Instructor"}
                </span>
              </span>
            </span>
          )}
          <Link
            href={`/learn/${card.pathSlug}/${card.lesson.id}`}
            className="ml-auto inline-flex shrink-0 items-center gap-2 bg-magenta px-4 py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-magenta-dark"
          >
            {card.lesson.playable ? (
              <>
                <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
                Resume lesson
              </>
            ) : (
              /* NOT "Resume" — there is nothing to resume. */
              <>
                    {/* THE THREE VERBS, ONE PER LEVEL */}
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
        {/* A DEEPER SCRIM THAN THE MOCKUP'S, BECAUSE THE MOCKUP HAS NO PHOTO. */}
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
        {/* THE COURSE SPINE REPLACES THE FLAT METER WS-4) */}
        {/* THE STATUS PILL , the mockup's card) */}
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
          {/* WS-5 — OVER PLAYABLE LESSONS. `path.completed` and */}
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
            className="mt-2.5 flex items-center gap-2 bg-bg-soft px-3 py-2.5 text-[11.5px] text-ink-2 hover:bg-line/60"
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

/** THE RIGHT HALF OF THE EMPTY STATE — ONE suggestion. */
/** THE STARTER PATH CARD WS-C) */
function StarterPathCard({ s }: { s: StarterCard }) {
  const started = s.completedLessons > 0;
  return (
    <div className="flex flex-col rounded-brand border border-magenta/30 bg-[linear-gradient(160deg,rgba(215,44,214,0.07),rgba(215,44,214,0.01))] p-6">
      <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-magenta">
        <Compass className="h-3.5 w-3.5" aria-hidden />
        Start Here
      </p>
      <p className="text-[15px] font-bold">{s.title}</p>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">
        The foundations everyone starts with.
      </p>
      {/* THE COUNT, IN INK. It reads "0 of 25 lessons" on a fresh account */}
      <p className="mt-1 text-[12px] text-ink-2">
        {s.completedLessons} of {s.playable} lesson{s.playable === 1 ? "" : "s"}
        {started ? " done" : ""}
      </p>
      <Link
        href={`/learn/${s.slug}`}
        className="mt-4 inline-flex w-fit items-center gap-2 border border-magenta px-5 py-2.5 text-[13.5px] font-bold text-magenta transition-colors hover:bg-magenta hover:text-white"
      >
        {/* Title Case (rule 11) — and the label names what the button IS, so */}
        {started ? "Keep Going" : s.enrolled ? "Continue This Path" : "Start Here"}{" "}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}

// RETIRED BY WS-C AND QUOTED, NEVER DELETED . It rendered
