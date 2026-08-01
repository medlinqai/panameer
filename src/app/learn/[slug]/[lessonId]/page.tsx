import Link from "next/link";
import { notFound } from "next/navigation";
import { getLearnLesson } from "@/lib/learn-home";
import { getSessionViewer } from "@/lib/session";
import { vimeoEmbedUrl } from "@/lib/learn";
import { LessonPlayer } from "@/components/learn/LessonPlayer";
import { LessonActions } from "@/components/learn/LessonActions";
import { InstructorBadge } from "@/components/learn/InstructorBadge";
import { ProgressBar } from "@/components/learn/ProgressBar";

/**
 * Lesson page (brief_learn_experience WS3; design ref Learn-lesson-page-design.png).
 *
 * The design is the player, the title, and three buttons. What it doesn't show
 * — because a static mock has nowhere to put it — is WHERE YOU ARE: this is a
 * 522-lesson catalog and the largest path is 105 lessons, so "Lesson 4 of 105"
 * and the in-course list are the difference between a course and a pile of
 * videos. Both are added alongside the design rather than in place of it.
 */
export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}) {
  const { slug, lessonId } = await params;
  const viewer = await getSessionViewer();
  const view = await getLearnLesson(slug, lessonId, viewer?.userId ?? null);
  if (!view) notFound();

  const { lesson, path, course, section, instructor } = view;
  const embed = lesson.playable ? vimeoEmbedUrl(lesson.vimeoRef) : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <nav className="text-[13.5px] text-ink-2">
        <Link href="/learn" className="font-semibold hover:text-magenta">
          Learn
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/learn/${path.slug}`} className="font-semibold hover:text-magenta">
          {path.title}
        </Link>
        {/*
          A single-course path usually names its course after itself, so the
          crumb would read "1. Background / 1. Background" and look like a bug.
          Skip the repeat rather than render it.
        */}
        {course.title !== path.title && (
          <>
            <span className="mx-2">/</span>
            <Link
              href={`/learn/${path.slug}/course/${course.slug}`}
              className="font-semibold hover:text-magenta"
            >
              {course.title}
            </Link>
          </>
        )}
      </nav>

      <h1 className="mt-3 font-display text-[24px] font-bold leading-tight tracking-[-0.5px] sm:text-[30px]">
        {lesson.title}
      </h1>
      <p className="mt-1 text-[13.5px] text-ink-2">
        {section.title} · Lesson {view.position} of {view.total}
        {lesson.runTime && ` · ${lesson.runTime}`}
      </p>

      <div className="mt-6 grid gap-7 lg:grid-cols-[1fr_290px]">
        <div className="min-w-0">
          <LessonPlayer
            embedUrl={embed}
            title={lesson.title}
            instructor={
              instructor ? { name: instructor.name, photoUrl: instructor.photoUrl } : null
            }
            thumbnailUrl={lesson.thumbnailUrl}
          />

          {lesson.description && (
            <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-ink-2">
              {lesson.description}
            </p>
          )}

          {instructor && (
            <div className="mt-5">
              <InstructorBadge instructors={[instructor]} size="sm" />
            </div>
          )}

          <LessonActions
            lessonId={lesson.id}
            pathSlug={path.slug}
            courseSlug={course.slug}
            completed={lesson.completed}
            next={view.next}
            instructorName={instructor?.name ?? null}
          />
        </div>

        {/* In-course nav — where you are, and what's on either side. */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-brand border border-line">
            <div className="border-b border-line p-4">
              <p className="text-[12.5px] font-bold uppercase tracking-wide text-ink-2">
                {course.title}
              </p>
              <div className="mt-3">
                <ProgressBar
                  percent={view.pathProgress}
                  label={`${view.pathCompleted} of ${view.total} in this path`}
                />
              </div>
            </div>

            <ol className="max-h-[420px] overflow-y-auto p-2">
              {view.courseLessons.map((l, i) => (
                <li key={l.id}>
                  <Link
                    href={`/learn/${path.slug}/${l.id}`}
                    aria-current={l.current ? "page" : undefined}
                    className={
                      "flex items-start gap-2 rounded-[10px] px-3 py-2 text-[13.5px] transition-colors " +
                      (l.current
                        ? "bg-magenta/[0.08] font-bold text-magenta"
                        : "text-ink-2 hover:bg-black/[0.03] hover:text-ink")
                    }
                  >
                    <span className="w-5 shrink-0 tabular-nums">
                      {l.completed ? (
                        <span className="text-emerald-600">✓</span>
                      ) : (
                        <span className="text-ink-2/60">{i + 1}</span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block">{l.title}</span>
                      {!l.playable && (
                        <span className="text-[12px] text-ink-2">Coming soon</span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
