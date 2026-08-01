import Link from "next/link";
import { notFound } from "next/navigation";
import { getLearnPath } from "@/lib/learn-home";
import { getSessionViewer } from "@/lib/session";
import { STYLE_LABEL } from "@/lib/learn";
import { InstructorBadge } from "@/components/learn/InstructorBadge";
import { LessonTable } from "@/components/learn/LessonTable";
import { ProgressBar } from "@/components/learn/ProgressBar";

/**
 * Course page (brief_learn_experience WS2; design ref Learn-course-page-design.png).
 *
 * The design's layout, built from real data: the purple instructor tile on the
 * left, "Instructor: <name>" as a magenta profile link, the course overview,
 * then the lessons table, with Back and Main Menu at the foot.
 *
 * The instructor is the path's — one person owns a whole Learning Path (WS6),
 * so a course inherits them rather than carrying its own. That is a data
 * decision as much as a design one: `expert_person_id` lives on LearningPath
 * and Lesson but not on Course, and the model is right, because a course is a
 * unit of curriculum and a path is a unit of teaching.
 */
export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string; courseSlug: string }>;
}) {
  const { slug, courseSlug } = await params;
  const viewer = await getSessionViewer();
  const path = await getLearnPath(slug, viewer?.userId ?? null);
  if (!path) notFound();

  const course = path.courses.find((c) => c.slug === courseSlug);
  if (!course) notFound();

  const index = path.courses.findIndex((c) => c.id === course.id);
  const next = path.courses[index + 1] ?? null;
  const percent =
    course.lessons > 0 ? Math.round((course.completed / course.lessons) * 100) : 0;
  const firstUp = course.sections
    .flatMap((s) => s.lessons)
    .find((l) => l.playable && !l.completed);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8 sm:py-10">
      <nav className="text-[13.5px] text-ink-2">
        <Link href="/learn" className="font-semibold hover:text-magenta">
          Learn
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/learn/${path.slug}`} className="font-semibold hover:text-magenta">
          {path.title}
        </Link>
      </nav>

      <h1 className="mt-3 font-display text-[28px] font-bold leading-tight tracking-[-0.6px] sm:text-[34px]">
        {course.title}
      </h1>

      <div className="mt-6 flex flex-wrap gap-7">
        {/* The design's purple tile — the instructor's face over the course name. */}
        <div className="w-full max-w-[240px] shrink-0 overflow-hidden rounded-brand bg-[#2b1147] text-white">
          <div className="aspect-square w-full overflow-hidden">
            {course.thumbnailUrl || path.instructor?.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={course.thumbnailUrl ?? path.instructor!.photoUrl!}
                alt=""
                className="h-full w-full object-cover object-top"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <span className="font-display text-[34px] font-bold text-white/35">
                  {course.title.slice(0, 1)}
                </span>
              </div>
            )}
          </div>
          <p className="px-4 py-4 text-center font-display text-[18px] font-bold leading-snug">
            {course.title}
          </p>
        </div>

        <div className="min-w-0 flex-1">
          {path.instructor && <InstructorBadge instructor={path.instructor} />}

          <h2 className="mt-6 font-display text-[22px] font-bold">Course Overview</h2>
          <p className="mt-2 max-w-2xl text-[15.5px] leading-relaxed text-ink-2">
            {course.summary ??
              path.summary ??
              "This course is part of the " + path.title + " learning path."}
          </p>

          <p className="mt-4 text-[14px] text-ink-2">
            {course.lessons} lesson{course.lessons === 1 ? "" : "s"}
            {course.style && ` · ${STYLE_LABEL[course.style] ?? course.style}`}
          </p>

          {path.enrolled && course.lessons > 0 && (
            <div className="mt-4 max-w-sm">
              <ProgressBar
                percent={percent}
                label={`${course.completed} of ${course.lessons} lessons complete`}
              />
            </div>
          )}

          {firstUp && (
            <Link
              href={`/learn/${path.slug}/${firstUp.id}`}
              className="mt-5 inline-block rounded-full bg-magenta px-6 py-2.5 text-[14.5px] font-bold text-white transition-colors hover:bg-magenta-dark"
            >
              {course.completed > 0 ? "Continue Course" : "Start Course"}
            </Link>
          )}
        </div>
      </div>

      {/*
        One table for the whole course, sections as sub-headers inside it. A
        section header is only worth a row when there is more than one — many
        courses are a single unnamed run of lessons, and "1. Course Overview"
        above the only section is noise.
      */}
      <div className="mt-9 overflow-hidden rounded-brand border border-line">
        <LessonTable pathSlug={path.slug} sections={course.sections} />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
        <Link
          href={`/learn/${path.slug}`}
          className="rounded-full border-[1.5px] border-line px-7 py-2.5 text-[14.5px] font-bold transition-colors hover:border-magenta hover:text-magenta"
        >
          Back
        </Link>
        <div className="flex flex-wrap gap-3">
          {next && (
            <Link
              href={`/learn/${path.slug}/course/${next.slug}`}
              className="rounded-full border-[1.5px] border-line px-7 py-2.5 text-[14.5px] font-bold transition-colors hover:border-magenta hover:text-magenta"
            >
              Next Course
            </Link>
          )}
          <Link
            href="/learn"
            className="rounded-full bg-magenta px-7 py-2.5 text-[14.5px] font-bold text-white transition-colors hover:bg-magenta-dark"
          >
            Main Menu
          </Link>
        </div>
      </div>
    </div>
  );
}
