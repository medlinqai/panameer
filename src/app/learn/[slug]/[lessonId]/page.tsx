import Link from "next/link";
import { notFound } from "next/navigation";
import { getLesson, isPlayable, vimeoEmbedUrl } from "@/lib/learn";

/**
 * Lesson player (brief_learn_v1 WS2).
 *
 * Routed by lesson ID, not a slug: `Lesson` has no slug column, and titles
 * legitimately repeat across sections ("Course Overview" appears in most
 * courses), so a title-derived slug would collide. Noted as a deviation from the
 * brief's `/learn/[lp]/[lesson]`; adding a slug column is a schema change WS2
 * doesn't need.
 *
 * An unplayable lesson still RENDERS — its title, its place in the path, and the
 * navigation around it. It just shows "coming soon" where the video would be.
 * Gating playback is not the same as hiding the lesson, and with no URLs loaded
 * yet, hiding would mean a 404 on every lesson in the catalog.
 */
export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}) {
  const { slug, lessonId } = await params;
  const data = await getLesson(slug, lessonId);
  if (!data) notFound();

  const { lesson, path, prev, next, position, total } = data;
  const embed = isPlayable(lesson) ? vimeoEmbedUrl(lesson.vimeo_ref) : null;
  const expert = lesson.expert
    ? `${lesson.expert.first_name ?? ""} ${lesson.expert.last_name ?? ""}`.trim()
    : null;

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <nav className="text-[13.5px] text-ink-2">
        <Link href="/learn" className="font-semibold hover:text-magenta">
          Learn
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/learn/${slug}`} className="font-semibold hover:text-magenta">
          {path?.title ?? lesson.section.course.learningPath.title}
        </Link>
      </nav>

      <h1 className="mt-4 text-[27px] font-extrabold tracking-[-0.5px] sm:text-[31px]">
        {lesson.title}
      </h1>
      <p className="mt-2 text-[14px] text-ink-2">
        {lesson.section.course.title} · {lesson.section.title}
        {total > 0 && ` · Lesson ${position} of ${total}`}
        {lesson.run_time ? ` · ${lesson.run_time}` : ""}
        {expert ? ` · ${expert}` : ""}
      </p>

      <div className="mt-6 overflow-hidden rounded-brand border border-line bg-black">
        {embed ? (
          <div className="relative w-full pt-[56.25%]">
            <iframe
              src={embed}
              title={lesson.title}
              className="absolute inset-0 h-full w-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="grid aspect-video place-items-center bg-bg-soft px-6 text-center">
            <div>
              <p className="text-[17px] font-bold text-ink">This video is coming soon</p>
              <p className="mx-auto mt-2 max-w-md text-[14.5px] text-ink-2">
                The lesson is part of the path and its video is still in
                production. Everything else in this path is listed on the{" "}
                <Link href={`/learn/${slug}`} className="font-bold text-magenta">
                  path outline
                </Link>
                .
              </p>
            </div>
          </div>
        )}
      </div>

      {lesson.description && (
        <p className="mt-6 whitespace-pre-line text-[15.5px] leading-relaxed text-ink-2">
          {lesson.description}
        </p>
      )}

      <div className="mt-10 flex items-center justify-between gap-4 border-t border-line pt-6">
        {prev ? (
          <Link
            href={`/learn/${slug}/${prev.id}`}
            className="max-w-[45%] rounded-full border-[1.5px] border-line px-5 py-2.5 text-[14px] font-bold text-ink transition-colors hover:border-magenta hover:text-magenta"
          >
            ← <span className="line-clamp-1 inline align-middle">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={`/learn/${slug}/${next.id}`}
            className="ml-auto max-w-[45%] rounded-full bg-magenta px-5 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-magenta-dark"
          >
            <span className="line-clamp-1 inline align-middle">{next.title}</span> →
          </Link>
        )}
      </div>
    </div>
  );
}
