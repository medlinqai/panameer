import { FREE_AS_OF_LINE } from "@/lib/free-as-of";
import Link from "next/link";
import { Check, GraduationCap, Play, ShieldCheck, Layers } from "lucide-react";
import { AUDIENCE_LABEL, AUDIENCE_PREFIX } from "@/lib/learn";
import { InstructorAvatar } from "@/components/learn/InstructorBadge";
import { EnrollButton } from "@/components/learn/EnrollButton";
import { WantThisButton } from "@/components/learn/WantThisButton";
import { ProgressRing } from "@/components/learn/app/ProgressRing";
import { PathSpine } from "@/components/learn/app/PathSpine";
import { PathStages } from "@/components/learn/app/PathStages";
import type { PathForumTeaser } from "@/lib/forums";
import { initialsOf } from "@/lib/learn-instructor-format";
import type { AppPathView } from "@/lib/learn-path-app";

export function AppPath({
  path,
  signedIn,
  learnGaps = [],
}: {
  path: AppPathView;
  signedIn: boolean;
  learnGaps?: { key: string; field: string; reason: string; href: string }[];
}) {
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
              {}
              {`${AUDIENCE_PREFIX} ${AUDIENCE_LABEL[path.audience] ?? path.audience}`}
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

            {/* COUNTS, NOT HOURS. The mockup's `24h RUN TIME` is struck: `run_time` */}
            {/* MEASURED 2026-09-25, AND IT WAS FALSE ON MOST OF THE */}
            <div className="mt-5 flex flex-wrap gap-x-7 gap-y-3">
              <Stat n={path.courses.length} label={path.courses.length === 1 ? "COURSE" : "COURSES"} />
              <Stat n={path.lessons} label={path.lessons === 1 ? "LESSON" : "LESSONS"} />
              {path.enrolledCount !== null && <Stat n={path.enrolledCount} label="ENROLLED" />}
              {path.test.exists && <Stat n={1} label="CERTIFICATE" />}
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
            {path.ready && (
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
            )}

            {!path.ready ? (
              <EnrollButton
                pathId={path.id}
                slug={path.slug}
                enrolled={false}
                signedIn={signedIn}
                notReady
              />
            ) : !signedIn ? (
              <EnrollButton pathId={path.id} slug={path.slug} enrolled={false} signedIn={false} />
            ) : !path.enrolled ? (
              <>
                <EnrollButton
                  pathId={path.id}
                  slug={path.slug}
                  enrolled={false}
                  signedIn
                  learnGaps={learnGaps}
                />
                <p className="mt-2.5 text-[10.5px] leading-relaxed text-white/60">
                  Enrolling is free and only keeps your place.
                </p>
              </>
            ) : allDone ? (
              <>
                <Link
                  href={`/learn/${path.slug}/test`}
                  className="flex w-full items-center justify-center gap-2 bg-magenta px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-magenta-dark"
                >
                  <GraduationCap className="h-4 w-4" aria-hidden />
                  Take the path test
                </Link>
                {/* THE CERTIFICATE IS NAMED ONLY WHERE ONE CAN BE EARNED. */}
                <p className="mt-2.5 text-[10.5px] leading-relaxed text-white/60">
                  {path.test.exists
                    ? "Every lesson watched. The test is the last thing between you and the certificate."
                    : "Every lesson watched."}
                </p>
              </>
            ) : path.nextLesson ? (
              <>
                <Link
                  href={`/learn/${path.slug}/${path.nextLesson.id}`}
                  className="flex w-full items-center justify-center gap-2 bg-magenta px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-magenta-dark"
                >
                  {/* NO PLAY GLYPH ON AN UNPLAYABLE LESSON, and not "Resume". */}
                  {path.nextLesson.playable ? (
                    <>
                      <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
                      Resume — lesson {path.nextLesson.position}
                    </>
                  ) : (
                    <>Open lesson {path.nextLesson.position}</>
                  )}
                </Link>
                {/* THE TEST IS REACHABLE AT 0% (ruling 26a). Before this, the */}
                {path.test.ready && (
                  <Link
                    href={`/learn/${path.slug}/test`}
                    className="mt-2.5 inline-block text-[11px] font-semibold text-white/80 underline underline-offset-2 hover:text-white"
                  >
                    Or sit the path test now
                  </Link>
                )}
                {/* SAME RULE, SECOND SITE — and finding it twice is why the */}
                <p className="mt-2.5 text-[10.5px] leading-relaxed text-white/60">
                  {path.test.exists ? (
                    <>
                      {remaining} lesson{remaining === 1 ? "" : "s"} and the path test stand between
                      you and the certificate.
                    </>
                  ) : (
                    <>
                      {remaining} lesson{remaining === 1 ? "" : "s"} left on this path.
                    </>
                  )}
                </p>
              </>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid items-start gap-6 px-5 pt-6 pb-8 sm:px-8 min-[1100px]:grid-cols-[1fr_296px]">
        <div className="min-w-0">
          {/* THE STAGE RAIL DOES NOT RENDER ON AN UNREADY PATH (Q4) */}
          {/* THE STAGE RAIL, WS-C ITEM 1 */}
          {path.ready && signedIn && <PathStages path={path} />}
          {/* THE `Courses` STAGE'S DESTINATION. `scroll-mt` so the app band */}
          <div id="path-courses" className="scroll-mt-24">
            <PathSpine path={path} />
          </div>

          {path.ready && (
          <>
          {/* ── the path test node ─────────────────────────────────────────── */}
          <div className="relative mt-5 pl-[46px] sm:pl-[52px]">
            <span
              className="absolute top-4 left-0 z-[2] grid h-10 w-10 place-items-center rounded-[13px] border-2 border-dashed border-line bg-white"
              aria-hidden
            >
              {/* NO PADLOCK, EVER (ruling 26a). Scott ruled there is no */}
              <GraduationCap className="h-[17px] w-[17px] text-magenta" />
            </span>
            {/* STACKS BELOW 640px — same defect as the coverage strip: a */}
            <div className="flex flex-col gap-4 rounded-[15px] bg-[linear-gradient(115deg,#1a1030,var(--color-learn-wine)_60%,var(--color-learn-orchid))] px-5 py-5 text-white shadow-[0_20px_44px_-26px_rgba(61,21,96,0.7)] sm:flex-row sm:flex-wrap sm:items-center sm:gap-5">
              <div className="min-w-0 sm:flex-1">
                <h4 className="font-display text-[16.5px] font-bold">
                  The {path.title} path test
                </h4>
                <p className="mt-1.5 max-w-[430px] text-[12px] leading-relaxed text-white/70">
                  One test for the whole path — every learner sits the same question set, so passing
                  means the same thing every time.
                </p>
                {/* THE UNLOCK RULE IS A DECISION, NOT A MEASUREMENT, AND IT IS NOT */}
                <span className="mt-2.5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-2.5 py-1.5 text-[10.5px]">
                  {allDone ? (
                    <>
                      <Check className="h-3 w-3" aria-hidden />
                      {/* lessons clears the PREREQUISITE; whether the question set */}
                      {path.test.ready
                        ? "Every lesson complete — the test is open"
                        : "Every lesson complete — waiting on the question set"}
                    </>
                  ) : (
                    <>
                      {/* THE GATE IS GONE AND SO IS THE SENTENCE THAT NAMED IT */}
                      {path.test.ready
                        ? `Open now — ${remaining} lesson${remaining === 1 ? "" : "s"} still to watch`
                        : "Waiting on the question set"}
                    </>
                  )}
                </span>
              </div>
              {/* READ FROM `LearnAssessment`, NOT PRINTED AS 70 / 3. Measured on */}
              <div className="flex gap-8 sm:block sm:shrink-0 sm:text-right">
                {/* until a human reads it; quoting its pass mark and attempt limit */}
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

            {/* THE CERTIFICATE NODE RENDERS ONLY WHERE ONE CAN BE EARNED */}
            {path.test.exists && (
            <div className="mt-3 flex flex-col items-start gap-3 rounded-[15px] border-2 border-magenta bg-[linear-gradient(135deg,#fff,#fbeafb)] px-5 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full bg-[linear-gradient(140deg,var(--color-magenta),#8b1fa8)]">
                <ShieldCheck className="h-[22px] w-[22px] text-white" aria-hidden />
              </span>
              <div className="min-w-0 sm:flex-1">
                <b className="block font-display text-[14px] font-bold">
                  {path.title} — {path.certificate.earned ? "Certified" : "Certificate"}
                </b>
                <p className="mt-1 text-[11.5px] leading-relaxed text-ink-2">
                  {/* THE WHOLE PRODUCT, AND IT IS ALREADY FALSE : `lib/plans.ts` */}
                  Lands on your profile with a public verify link. {FREE_AS_OF_LINE}
                </p>
              </div>
              {/* THE REAL ROUTE. `/verify/[credentialId]` exists and */}
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
            )}
          </div>
          </>
          )}

          {/* THE PATH FORUM PANEL , Q8) */}
          {/* THE DEMAND SIGNAL WS-C) */}
          <div className="mt-6 rounded-brand border border-line bg-white p-5">
            <h3 className="font-display text-[16px] font-bold">
              {path.ready ? "Want More Like This?" : "Want This One Made?"}
            </h3>
            <p className="mt-1.5 mb-3 text-[13px] leading-relaxed text-ink-2">
              {path.ready
                ? "Telling us helps decide what gets recorded next."
                : "The outline is written. Telling us helps decide what gets recorded next."}
            </p>
            <WantThisButton
              pathId={path.id}
              initialWanted={path.interest.mine}
              initialCount={path.interest.count}
              signedIn={signedIn}
            />
          </div>

          {path.forum && <PathForumPanel forum={path.forum} pathSlug={path.slug} />}
        </div>

        {/* STICKY ONLY WHERE THERE ARE TWO COLUMNS. `min-[1100px]:sticky` — below */}
        {/* IT CLEARS THE PINNED BAND WS-B). */}
        <aside
          className="flex flex-col gap-3.5 min-[1100px]:sticky"
          style={{ top: "calc(var(--pm-band-h) + 0.875rem)" }}
        >
          {path.instructors.length > 0 && (
            <Card title="Your Instructors">
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
                    {/* model in the schema, and the standing rule (decisions-01 */}
                    {ins.profileSlug && (
                      <Link
                        href={`/providers/${ins.profileSlug}`}
                        className="mt-1.5 inline-flex items-center gap-1.5 border border-line px-2 py-1 text-[10.5px] font-semibold text-ink-2 hover:border-magenta hover:text-magenta"
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
            <Card title="What This Certificate Says You Can Do">
              {path.claims.map((c) => (
                <p key={c} className="flex items-start gap-2.5 py-1.5 text-[11.5px] text-ink-2">
                  <Check className="mt-[2px] h-3.5 w-3.5 shrink-0 text-learn-green" strokeWidth={3} aria-hidden />
                  {c}
                </p>
              ))}
            </Card>
          )}

          {/* THE LEADERBOARD IS OMITTED, NOT EMPTIED, BELOW THE FLOOR. A ranking */}
          {path.leaderboard.length > 0 && (
            <Card title="This Path, This Month">
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

/** THE PATH FORUM PANEL , Q8) */
function PathForumPanel({
  forum,
  pathSlug,
}: {
  forum: PathForumTeaser;
  pathSlug: string;
}) {
  return (
    <div className="mt-6 rounded-brand border border-line bg-white p-5">
      <h3 className="font-display text-[16px] font-bold">Path Group</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
        {/* A COUNTED FIGURE, SCOPED TO THIS PATH — enrolments in it. */}
        {forum.members} {forum.members === 1 ? "learner" : "learners"}
        {forum.threads > 0 ? ` · ${forum.threads} ` : ""}
        {forum.threads > 0 ? (forum.threads === 1 ? "thread" : "threads") : ""}
      </p>
      {forum.threads === 0 && (
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">
          Nobody has posted here yet. The first question is the useful one.
        </p>
      )}
      {forum.canOpen ? (
        <Link
          href={`/connect/groups/path-${pathSlug}`}
          className="mt-3.5 inline-flex w-fit items-center gap-2 border border-magenta px-4 py-2 text-[13px] font-bold text-magenta transition-colors hover:bg-magenta hover:text-white"
        >
          Open the Group
        </Link>
      ) : (
        /* IT NAMES WHAT OPENS THE DOOR, never what the member lacks. */
        <p className="mt-3 text-[12.5px] leading-relaxed text-ink-2">
          The group is for people taking this path. Enrolling opens it.
        </p>
      )}
    </div>
  );
}
