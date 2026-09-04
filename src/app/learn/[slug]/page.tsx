import Link from "next/link";
import { notFound } from "next/navigation";
import { getLearnPath } from "@/lib/learn-home";
import { getAppPath } from "@/lib/learn-path-app";
import { AppPath } from "@/components/learn/app/AppPath";
import { getSessionViewer } from "@/lib/session";
/* ⚠ `P1-J3-E383` — a count, never content. */
import { getPathForumTeaser } from "@/lib/forums";
import { AUDIENCE_LABEL, STYLE_LABEL } from "@/lib/learn";
import { InstructorBadge } from "@/components/learn/InstructorBadge";
import { EnrollButton } from "@/components/learn/EnrollButton";
import { ProgressBar } from "@/components/learn/ProgressBar";
import { LessonTable } from "@/components/learn/LessonTable";
import { learnGaps } from "@/lib/gate-reads";

/**
 * Learning-path landing (brief_learn_experience WS2).
 *
 * The full outline is public — every course, section and lesson title, whether
 * or not the video exists yet. brief_learn_v1 was explicit that PLAYBACK is
 * gated and the CURRICULUM is not: someone deciding whether a path is worth
 * their time needs to see what it covers, and a page showing only finished
 * lessons would today show almost nothing.
 */
export default async function LearningPathPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const viewer = await getSessionViewer();

  /*
    ── ⚠ SIGNED IN, THIS IS THE LEVEL-1 PATH SCREEN (brief_learn_app_shell WS3) ──

    The same branch `/learn` itself uses, and for the same reason: a learner is
    inside the product and a visitor is being sold it. Two concrete reasons this
    is a branch rather than one page with flags:

      1. The dashboard chrome is AppShell's — `AppPath` FULL-BLEEDS by cancelling
         `main`'s `px-5 py-6 sm:px-8`. Signed out, `learn/layout.tsx` renders the
         marketing shell whose `<main>` has NO padding, so the same negative
         margins would push the hero off the left edge.
      2. Everything the spine adds — per-lesson faces, the real test rules, the
         leaderboard floor — is per-learner. A visitor has none of it.

    ⚠ THE PUBLIC BODY BELOW IS UNCHANGED. `getLearnPath(slug, null)` is what it
    already resolved to for a visitor, so a shared curriculum URL still shows the
    full outline to whoever it was shared with.
  */
  if (viewer) {
    const app = await getAppPath(slug, viewer.userId);
    if (!app) notFound();
    /* ⚠ `P1-ALL-E034` — the `LEARN` gate shown BEFORE the block. Only the
       signed-in branch computes it; the public body below is a read and stays
       completely open. */
    return <AppPath path={app} signedIn learnGaps={await learnGaps(viewer.userId)} />;
  }

  const path = await getLearnPath(slug, null);
  if (!path) notFound();

  /* ⚠ `P1-J3-E383` — a COUNT, and whether THIS viewer may open the room. Never a
     thread title, a snippet or an author name: `getPathForumTeaser` cannot even
     select them, and `check:forums` fails the build if one is added. Read AFTER
     `path` because it needs the id. */
  const forum = await getPathForumTeaser(viewer, path.id);

  const firstPlayable = path.courses
    .flatMap((c) => c.sections.flatMap((s) => s.lessons))
    .find((l) => l.playable && !l.completed);
  const singleCourse = path.courses.length === 1;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8 sm:py-10">
      <nav className="text-[13.5px] text-ink-2">
        <Link href="/learn" className="font-semibold hover:text-magenta">
          Learn
        </Link>
        <span className="mx-2">/</span>
        <span>{AUDIENCE_LABEL[path.audience] ?? path.audience}</span>
        {path.group && (
          <>
            <span className="mx-2">/</span>
            <span>{path.group}</span>
          </>
        )}
      </nav>

      <div className="mt-4 flex flex-wrap items-start gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[30px] font-bold leading-tight tracking-[-0.6px] sm:text-[36px]">
            {path.title}
          </h1>
          {path.summary && (
            <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-ink-2">
              {path.summary}
            </p>
          )}

          {path.instructors.length > 0 && (
            <div className="mt-5">
              {/*
                Lesson counts are shown here because on a multi-teacher path
                "who taught most of this" is exactly what a learner deciding to
                enroll, and a buyer deciding to hire, want to know.
              */}
              <InstructorBadge instructors={path.instructors} showLessonCounts />
            </div>
          )}

          <p className="mt-4 text-[14px] text-ink-2">
            {path.courses.length} course{path.courses.length === 1 ? "" : "s"} ·{" "}
            {path.lessons} lesson{path.lessons === 1 ? "" : "s"} · Free
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <EnrollButton
              pathId={path.id}
              slug={path.slug}
              enrolled={path.enrolled}
              signedIn={false}
            />
            {firstPlayable && (
              <Link
                href={`/learn/${path.slug}/${firstPlayable.id}`}
                className="rounded-full border-[1.5px] border-line px-6 py-2.5 text-[14.5px] font-bold text-ink transition-colors hover:border-magenta hover:text-magenta"
              >
                {path.completed > 0 ? "Continue" : "Start"} Watching
              </Link>
            )}
          </div>

          {path.enrolled && path.lessons > 0 && (
            <div className="mt-5 max-w-md">
              <ProgressBar
                percent={path.progress}
                label={`${path.completed} of ${path.lessons} lessons complete`}
              />
            </div>
          )}

          {/*
            ── ⚠⚠ THE PATH'S FORUM (`P1-J3-E383`) ────────────────────────────

            SCOTT, 2026-09-04: *"every learning path should have a forum."* and
            *"everyone can see them, but only members enrolled in the LP can
            access them...marketing."*

            ⚠ IT SITS IN THE HERO, UNDER THE ENROL CONTROLS, ON PURPOSE. This
            page is PUBLIC — its own docblock says *"The full outline is public —
            every course, section and lesson title"* — so a signed-out visitor is
            exactly who this is aimed at, and a forum mentioned below a 39-lesson
            outline is a forum nobody deciding whether to enrol will ever read.

            ⚠⚠ VISIBILITY AND ACCESS ARE TWO RULES AND ONLY ACCESS IS CLOSED.
            Everyone sees THAT the room exists; only a member or one of its
            instructors can open it. `canOpen` comes from `canAccessPathForum`
            in the lib — this page decides nothing.

            ⚠⚠ ACTIVITY IS THE PITCH, ABOVE ZERO ONLY. But a forum advertising
            `0 threads` is an ANTI-advertisement — the identical rule to the
            unread badge, to `declinedCount` rendering nowhere, and to `$0` never
            standing in for a rate. Scott, on the LEARN home: *"coming in to a
            bunch of what look like incomplete tiles is not a good look."*
            ⚠ AT ZERO: say the room exists. Show NO number.

            ⚠⚠ AND THE TEASER LEAKS NO CONTENT. A COUNT IS A FACT ABOUT THE ROOM;
            A TITLE IS A THING SOMEBODY WROTE.
          */}
          <div className="mt-5 rounded-brand border border-line bg-white p-4">
            <p className="text-[14.5px] font-bold">Path forum</p>
            {forum.threads > 0 ? (
              <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">
                {forum.threads} question{forum.threads === 1 ? "" : "s"} asked by
                the people taking this path, answered by the people who teach it.
              </p>
            ) : (
              <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">
                A private forum for the people taking this path — ask the people
                who teach it.
              </p>
            )}
            {forum.canOpen ? (
              <Link
                href={`/community/forums/path-${path.slug}`}
                className="mt-2 inline-block text-[13.5px] font-bold text-magenta hover:underline"
              >
                Open the forum &rarr;
              </Link>
            ) : (
              /* ⚠ THE DOOR IS NAMED, NOT HIDDEN. Somebody who cannot open it
                 should know why, and what to do about it — which is enrol. */
              <p className="mt-2 text-[13px] text-ink-2">
                Enroll to read and ask questions.
              </p>
            )}
          </div>

          {/*
            The payoff, surfaced the moment it is earned (WS5). A certificate
            nobody is told about is not a reward — this is the one screen where
            a learner has just finished and is looking for what comes next.
          */}
          {path.lessons > 0 && path.completed >= path.lessons && (
            <div className="mt-5 max-w-md rounded-brand border-2 border-emerald-500/40 bg-emerald-500/[0.06] p-5">
              <p className="text-[15.5px] font-bold">
                You&apos;ve finished every lesson in this path.
              </p>
              <p className="mt-1 text-[14px] text-ink-2">
                Pass the test and we&apos;ll issue you a certificate with a public
                link you can put on LinkedIn.
              </p>
              <Link
                href={`/learn/${path.slug}/test`}
                className="mt-3 inline-block rounded-full bg-magenta px-6 py-2.5 text-[14.5px] font-bold text-white transition-colors hover:bg-magenta-dark"
              >
                Take the Test
              </Link>
            </div>
          )}
        </div>

        {path.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={path.coverImage}
            alt=""
            className="h-40 w-56 shrink-0 rounded-brand border border-line object-cover"
          />
        )}
      </div>

      <div className="mt-10 space-y-8">
        {path.courses.length === 0 && (
          <p className="rounded-brand border border-line p-6 text-[14.5px] text-ink-2">
            This path is still being built.
          </p>
        )}

        {path.courses.map((course, i) => (
          <section key={course.id} className="rounded-brand border border-line">
            <header className="flex flex-wrap items-start gap-4 border-b border-line p-5">
              <div className="min-w-0 flex-1">
                {/*
                  A single-course path — 17 of the 23 — doesn't get a "Course 1 of
                  1" label. Numbering one thing draws attention to a structure the
                  learner has no decision to make about.
                */}
                {!singleCourse && (
                  <p className="text-[12.5px] font-bold uppercase tracking-wide text-magenta">
                    Course {i + 1} of {path.courses.length}
                  </p>
                )}
                <h2 className="mt-0.5 font-display text-[21px] font-bold">
                  <Link
                    href={`/learn/${path.slug}/course/${course.slug}`}
                    className="hover:text-magenta"
                  >
                    {course.title}
                  </Link>
                </h2>
                {course.summary && (
                  <p className="mt-1.5 max-w-2xl text-[14.5px] text-ink-2">
                    {course.summary}
                  </p>
                )}
                <p className="mt-2 text-[13px] text-ink-2">
                  {course.lessons} lesson{course.lessons === 1 ? "" : "s"}
                  {course.style && ` · ${STYLE_LABEL[course.style] ?? course.style}`}
                  {course.completed > 0 && (
                    <span className="font-semibold text-emerald-700">
                      {" "}
                      · {course.completed} done
                    </span>
                  )}
                </p>
              </div>
              <Link
                href={`/learn/${path.slug}/course/${course.slug}`}
                className="shrink-0 rounded-full border-[1.5px] border-line px-4 py-2 text-[13.5px] font-bold transition-colors hover:border-magenta hover:text-magenta"
              >
                Open Course
              </Link>
            </header>

            <LessonTable pathSlug={path.slug} sections={course.sections} />
          </section>
        ))}
      </div>
    </div>
  );
}
