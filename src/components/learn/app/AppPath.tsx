import Link from "next/link";
import { Check, GraduationCap, Lock, Play, ShieldCheck, Layers } from "lucide-react";
import { AUDIENCE_LABEL } from "@/lib/learn";
import { InstructorAvatar } from "@/components/learn/InstructorBadge";
import { EnrolButton } from "@/components/learn/EnrolButton";
import { ProgressRing } from "@/components/learn/app/ProgressRing";
import { PathSpine } from "@/components/learn/app/PathSpine";
import { initialsOf } from "@/lib/learn-instructor-format";
import type { AppPathView } from "@/lib/learn-path-app";

/**
 * THE LEARNING PATH, LEVEL 1 (brief_learn_app_shell WS3).
 *
 * Header → spine → test node → certificate node, with a right rail that stacks
 * under the spine below 1100px. The rail is `sticky` above that breakpoint and
 * the stickiness RELEASES when it stacks — a sticky element in a single-column
 * flow pins a card over the content below it.
 */
export function AppPath({ path, signedIn }: { path: AppPathView; signedIn: boolean }) {
  const allDone = path.lessons > 0 && path.completed === path.lessons;
  const remaining = path.lessons - path.completed;

  return (
    <div className="-mx-5 -mt-6 sm:-mx-8">
      <section className="relative overflow-hidden bg-[radial-gradient(760px_300px_at_88%_-20%,rgba(215,44,214,0.44),transparent_62%),linear-gradient(118deg,var(--color-learn-night)_0%,var(--color-learn-plum)_46%,var(--color-learn-wine)_74%,var(--color-learn-orchid)_100%)] px-5 py-7 text-white sm:px-8">
        <p className="mb-3.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-white/55">
          <Link href="/learn" className="hover:text-white">
            Learn
          </Link>
          {path.group && (
            <>
              <span aria-hidden>›</span>
              <span>{path.group}</span>
            </>
          )}
          <span aria-hidden>›</span>
          <b className="font-semibold text-white/85">{path.title}</b>
        </p>

        <div className="grid items-center gap-8 min-[1000px]:grid-cols-[1fr_300px]">
          <div className="min-w-0">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em]">
              <Layers className="h-3 w-3" aria-hidden />
              Learning Path
              <span aria-hidden>·</span>
              {AUDIENCE_LABEL[path.audience] ?? path.audience}
              {path.group && (
                <>
                  <span aria-hidden>·</span>
                  {path.group}
                </>
              )}
            </span>
            <h1 className="font-display text-[27px] font-bold leading-[1.12] tracking-[-0.5px] sm:text-[33px]">
              {path.title}
            </h1>
            {path.summary && (
              <p className="mt-3 max-w-[560px] text-[14px] leading-relaxed text-white/75">
                {path.summary}
              </p>
            )}

            {/*
              ⚠ COUNTS, NOT HOURS. The mockup's `24h RUN TIME` is struck: `run_time`
              is spreadsheet display copy that cannot be summed (290 of 522 rows
              null; the rest include "Intro", "NA" and "3:22:00" for three
              minutes). Courses, lessons and one certificate are exact.

              ⚠ AND `1,240 ENROLLED` IS OMITTED UNLESS IT IS REAL. It renders only
              above the same floor the leaderboard uses — measured on the live DB
              there are 2 enrolment rows in the whole catalog, so it renders
              nowhere today. A header reading "1 ENROLLED" is worse than a header
              with one fewer figure.
            */}
            <div className="mt-5 flex flex-wrap gap-x-7 gap-y-3">
              <Stat n={path.courses.length} label={path.courses.length === 1 ? "COURSE" : "COURSES"} />
              <Stat n={path.lessons} label={path.lessons === 1 ? "LESSON" : "LESSONS"} />
              {path.enrolledCount !== null && <Stat n={path.enrolledCount} label="ENROLLED" />}
              <Stat n={1} label="CERTIFICATE" />
            </div>

            {path.instructors.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <span className="flex shrink-0 items-center">
                  {path.instructors.slice(0, 4).map((ins, i) => (
                    <span key={ins.id} className={i > 0 ? "-ml-2.5" : ""}>
                      <InstructorAvatar
                        instructor={ins}
                        className="h-[34px] w-[34px] ring-[2.5px] ring-learn-plum"
                      />
                    </span>
                  ))}
                </span>
                <p className="min-w-0 text-[12px] text-white/75">
                  Taught by{" "}
                  {path.instructors.map((ins, i) => (
                    <span key={ins.id}>
                      {i > 0 && (i === path.instructors.length - 1 ? " and " : ", ")}
                      <b className="font-semibold text-white">{ins.name}</b>
                    </span>
                  ))}
                </p>
              </div>
            )}
          </div>

          {/* The arc + the one CTA that is true for this learner's state. */}
          <div className="rounded-[18px] border border-white/20 bg-white/10 p-5 text-center backdrop-blur-[6px]">
            <ProgressRing
              value={path.completed}
              max={path.lessons}
              size={132}
              stroke={11}
              gradient={{ id: "parc", from: "var(--color-learn-gold)", to: "var(--color-magenta)" }}
              label={`${path.percent}%`}
              sublabel={`${path.completed} of ${path.lessons}`}
              labelClassName="text-[30px] text-white"
              sublabelClassName="text-[10px] text-white/60"
              className="mx-auto mb-3"
            />

            {!signedIn ? (
              <EnrolButton pathId={path.id} slug={path.slug} enrolled={false} signedIn={false} />
            ) : !path.enrolled ? (
              <>
                <EnrolButton
                  pathId={path.id}
                  slug={path.slug}
                  enrolled={false}
                  signedIn
                />
                <p className="mt-2.5 text-[10.5px] leading-relaxed text-white/60">
                  Enrolling is free and only keeps your place.
                </p>
              </>
            ) : allDone ? (
              <>
                <Link
                  href={`/learn/${path.slug}/test`}
                  className="flex w-full items-center justify-center gap-2 rounded-[11px] bg-magenta px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-magenta-dark"
                >
                  <GraduationCap className="h-4 w-4" aria-hidden />
                  Take the path test
                </Link>
                <p className="mt-2.5 text-[10.5px] leading-relaxed text-white/60">
                  Every lesson watched. The test is the last thing between you and the certificate.
                </p>
              </>
            ) : path.nextLesson ? (
              <>
                <Link
                  href={`/learn/${path.slug}/${path.nextLesson.id}`}
                  className="flex w-full items-center justify-center gap-2 rounded-[11px] bg-magenta px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-magenta-dark"
                >
                  {/* ⚠ NO PLAY GLYPH ON AN UNPLAYABLE LESSON, and not "Resume". */}
                  {path.nextLesson.playable ? (
                    <>
                      <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
                      Resume — lesson {path.nextLesson.position}
                    </>
                  ) : (
                    <>Open lesson {path.nextLesson.position}</>
                  )}
                </Link>
                <p className="mt-2.5 text-[10.5px] leading-relaxed text-white/60">
                  {remaining} lesson{remaining === 1 ? "" : "s"} and the path test stand between you
                  and the certificate.
                </p>
              </>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid items-start gap-6 px-5 pt-6 pb-8 sm:px-8 min-[1100px]:grid-cols-[1fr_296px]">
        <div className="min-w-0">
          <PathSpine path={path} />

          {/* ── the path test node ─────────────────────────────────────────── */}
          <div className="relative mt-5 pl-[46px] sm:pl-[52px]">
            <span
              className="absolute top-4 left-0 z-[2] grid h-10 w-10 place-items-center rounded-[13px] border-2 border-dashed border-line bg-white"
              aria-hidden
            >
              {allDone ? (
                <GraduationCap className="h-[17px] w-[17px] text-magenta" />
              ) : (
                <Lock className="h-[17px] w-[17px] text-ink-2/50" />
              )}
            </span>
            {/* ⚠ STACKS BELOW 640px — same defect as the coverage strip: a
                `flex-1` prose block beside a fixed right column collapsed to one
                word per line at 390px rather than wrapping. */}
            <div className="flex flex-col gap-4 rounded-[15px] bg-[linear-gradient(115deg,#1a1030,var(--color-learn-wine)_60%,var(--color-learn-orchid))] px-5 py-5 text-white shadow-[0_20px_44px_-26px_rgba(61,21,96,0.7)] sm:flex-row sm:flex-wrap sm:items-center sm:gap-5">
              <div className="min-w-0 sm:flex-1">
                <h4 className="font-display text-[16.5px] font-bold">
                  The {path.title} path test
                </h4>
                <p className="mt-1.5 max-w-[430px] text-[12px] leading-relaxed text-white/70">
                  One test for the whole path — every learner sits the same question set, so passing
                  means the same thing every time.
                </p>
                {/*
                  ⚠ THE UNLOCK RULE IS A DECISION, NOT A MEASUREMENT, AND IT IS NOT
                  SETTLED. Nothing in the schema enforces a prerequisite — the test
                  route does not check completion today. The copy ships AS MOCKED
                  ("all N lessons") and whether the bar is 100%, 80% or none is
                  Scott's call. Flagged in the report; it belongs in its own brief.
                */}
                <span className="mt-2.5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-2.5 py-1.5 text-[10.5px]">
                  {allDone ? (
                    <>
                      <Check className="h-3 w-3" aria-hidden />
                      {/*
                        ⚠ "the test is open" IS ONLY TRUE IF IT IS. Finishing the
                        lessons clears the PREREQUISITE; whether the question set
                        has been reviewed is a separate gate, and this chip sat
                        next to a column saying the set was still being checked.
                        Two true sentences that read as a contradiction.
                      */}
                      {path.test.ready
                        ? "Every lesson complete — the test is open"
                        : "Every lesson complete — waiting on the question set"}
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3" aria-hidden />
                      Unlocks when {path.lessons === 1 ? "the lesson is" : `all ${path.lessons} lessons are`}{" "}
                      complete — {remaining} to go
                    </>
                  )}
                </span>
              </div>
              {/*
                ⚠ READ FROM `LearnAssessment`, NOT PRINTED AS 70 / 3. Measured on
                the live DB: exactly ONE of the 23 paths has an assessment row
                (70% / 3). The other 22 have none, so this block says so rather
                than quoting the column defaults as though they were this path's
                rules.
              */}
              <div className="flex gap-8 sm:block sm:shrink-0 sm:text-right">
                {/*
                  ⚠ `ready`, NOT `exists` (WS4). A generated set lands as DRAFT
                  until a human reads it; quoting its pass mark and attempt limit
                  beside a test nobody can sit would be the page stating the rules
                  of a closed door.
                */}
                {path.test.ready ? (
                  <>
                    <div className="mb-2">
                      <b className="block font-display text-[15px] font-bold">
                        {path.test.passThreshold}%
                      </b>
                      <span className="text-[10.5px] text-white/60">TO PASS</span>
                    </div>
                    <div>
                      <b className="block font-display text-[15px] font-bold">
                        {path.test.maxAttempts}
                      </b>
                      <span className="text-[10.5px] text-white/60">ATTEMPTS</span>
                    </div>
                  </>
                ) : (
                  <p className="max-w-[210px] text-[10.5px] leading-relaxed text-white/60">
                    {path.test.exists
                      ? "The question set for this path is written and being reviewed. Its pass mark opens with it."
                      : "The question set for this path hasn't been written yet, so its pass mark and attempt limit aren't set."}
                  </p>
                )}
              </div>
            </div>

            {/* ── the certificate node ─────────────────────────────────────── */}
            <div className="mt-3 flex flex-col items-start gap-3 rounded-[15px] border-2 border-magenta bg-[linear-gradient(135deg,#fff,#fbeafb)] px-5 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full bg-[linear-gradient(140deg,var(--color-magenta),#8b1fa8)]">
                <ShieldCheck className="h-[22px] w-[22px] text-white" aria-hidden />
              </span>
              <div className="min-w-0 sm:flex-1">
                <b className="block font-display text-[14px] font-bold">
                  {path.title} — {path.certificate.earned ? "Certified" : "Certificate"}
                </b>
                <p className="mt-1 text-[11.5px] leading-relaxed text-ink-2">
                  Lands on your profile with a public verify link. Free, like everything here.
                </p>
              </div>
              {/*
                ⚠ THE REAL ROUTE. `/verify/[credentialId]` exists and
                `Certification.public_credential_url` holds the path — so an earned
                certificate LINKS to its own page, and an unearned one shows the
                SHAPE of the URL rather than a fabricated id.
              */}
              {path.certificate.earned && path.certificate.verifyUrl ? (
                <Link
                  href={path.certificate.verifyUrl}
                  className="shrink-0 text-[11px] font-semibold text-magenta hover:underline"
                >
                  View your credential
                </Link>
              ) : (
                <span className="shrink-0 text-[11px] text-ink-2">panameer.com/verify/…</span>
              )}
            </div>
          </div>
        </div>

        {/*
          ⚠ STICKY ONLY WHERE THERE ARE TWO COLUMNS. `min-[1100px]:sticky` — below
          that the rail is stacked under the spine, and a sticky card in a single
          column pins itself over whatever follows.
        */}
        <aside className="flex flex-col gap-3.5 min-[1100px]:sticky min-[1100px]:top-3.5">
          {path.instructors.length > 0 && (
            <Card title="Your instructors">
              {path.instructors.map((ins, i) => (
                <div
                  key={ins.id}
                  className={
                    "flex items-start gap-3 py-2.5 " + (i > 0 ? "border-t border-line" : "pt-0")
                  }
                >
                  <InstructorAvatar instructor={ins} className="h-10 w-10" />
                  <div className="min-w-0">
                    <b className="block text-[12.5px]">{ins.name}</b>
                    <span className="mt-0.5 block text-[10.5px] leading-snug text-ink-2">
                      {ins.lessons > 0
                        ? `${ins.lessons} lesson${ins.lessons === 1 ? "" : "s"} in this path`
                        : "Path lead"}
                    </span>
                    {/*
                      ⚠ `Message` IS NOT BUILT. There is no instructor-messaging
                      model in the schema, and the standing rule (decisions-01,
                      2026-08-19) is that a link ships only when its destination
                      exists. `View profile` is the one real action, and it only
                      renders when the marketplace would actually show that
                      profile — the visibility check is already done in the query.
                    */}
                    {ins.profileSlug && (
                      <Link
                        href={`/providers/${ins.profileSlug}`}
                        className="mt-1.5 inline-flex items-center gap-1.5 rounded-[7px] border border-line px-2 py-1 text-[10.5px] font-semibold text-ink-2 hover:border-magenta hover:text-magenta"
                      >
                        View profile
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </Card>
          )}

          {path.claims.length > 0 && (
            <Card title="What this certificate says you can do">
              {path.claims.map((c) => (
                <p key={c} className="flex items-start gap-2.5 py-1.5 text-[11.5px] text-ink-2">
                  <Check className="mt-[2px] h-3.5 w-3.5 shrink-0 text-learn-green" strokeWidth={3} aria-hidden />
                  {c}
                </p>
              ))}
            </Card>
          )}

          {/*
            ⚠ THE LEADERBOARD IS OMITTED, NOT EMPTIED, BELOW THE FLOOR. A ranking
            of three named learners published to a fourth is a different act from a
            ranking of a thousand. `getAppPath` returns [] below 10 enrolled, and
            measured on the live DB nothing clears that today.
          */}
          {path.leaderboard.length > 0 && (
            <Card title="This path, this month">
              {path.leaderboard.map((r, i) => (
                <div
                  key={`${r.label}-${i}`}
                  className={
                    "flex items-center gap-2.5 py-2 " +
                    (r.isViewer ? "rounded-[9px] bg-magenta/10 px-2.5" : i > 0 ? "border-t border-line" : "")
                  }
                >
                  <span className="w-[22px] shrink-0 text-center font-display text-[12px] text-ink-2">
                    {i + 1}
                  </span>
                  <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full border border-line bg-bg-soft text-[9px] font-bold text-ink-2">
                    {initialsOf(r.label)}
                  </span>
                  <b className="min-w-0 flex-1 truncate text-[11.5px]">{r.label}</b>
                  <span className="shrink-0 text-[11px] text-ink-2 tabular-nums">
                    {r.lessons} this month
                  </span>
                </div>
              ))}
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <b className="block font-display text-[19px] font-bold">{n.toLocaleString()}</b>
      <span className="text-[10.5px] tracking-[0.03em] text-white/60">{label}</span>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[15px] border border-line bg-white px-4 py-4 shadow-[0_14px_32px_-26px_rgba(23,30,62,0.4)]">
      <h5 className="mb-3 font-display text-[12.5px] font-bold tracking-[0.02em]">{title}</h5>
      {children}
    </div>
  );
}
