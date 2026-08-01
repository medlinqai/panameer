import Link from "next/link";
import { notFound } from "next/navigation";
import { getLearningPath, isPlayable, AUDIENCE_LABEL, STYLE_LABEL } from "@/lib/learn";
import { getSessionViewer } from "@/lib/session";
import { canAdminister } from "@/lib/access";

/**
 * Learning-path landing page (brief_learn_v1 WS2).
 *
 * The full outline is public — every course, section and lesson title, whether
 * or not the video exists yet. The brief is explicit that playback is gated and
 * the curriculum is not: someone deciding whether a path is worth their time
 * needs to see what it covers, and a path that showed only its finished lessons
 * would today show almost nothing.
 */
export default async function LearningPathPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { slug } = await params;

  /*
    PREVIEW AS PUBLIC (brief_learn_admin_authoring WS4).

    ?preview=1 is a REQUEST, never a grant: the draft row is only read after the
    session resolves to an admin, so an anonymous visitor appending the param
    gets exactly the 404 they would have got without it. Previewing reuses this
    page rather than rendering a copy inside the console, because the point of a
    preview is to see the real thing — a second implementation would drift and
    then reassure an admin about a page that doesn't exist.
  */
  const wantsPreview = (await searchParams).preview === "1";
  const viewer = wantsPreview ? await getSessionViewer() : null;
  const isPreview = Boolean(viewer && canAdminister(viewer));

  const path = await getLearningPath(slug, isPreview);
  if (!path) notFound();
  const isDraft = path.status !== "PUBLISHED";

  const lessons = path.courses.flatMap((c) => c.sections.flatMap((s) => s.lessons));
  const playable = lessons.filter(isPlayable);
  const firstPlayable = playable[0] ?? null;
  const expert = path.expert
    ? `${path.expert.first_name ?? ""} ${path.expert.last_name ?? ""}`.trim()
    : null;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10 sm:py-14">
      {isPreview && isDraft && (
        <div className="mb-6 rounded-brand border-2 border-amber-400/60 bg-amber-50/60 px-5 py-3">
          <p className="text-[14px] font-bold">
            Preview — this path is a draft and isn&apos;t visible to anyone else.
          </p>
          <Link
            href="/admin/learn"
            className="text-[13.5px] font-bold text-magenta hover:underline"
          >
            ← Back to the Learn console
          </Link>
        </div>
      )}
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

      <header className="mt-5 border-b border-line pb-8">
        <h1 className="text-[32px] font-extrabold tracking-[-0.7px] sm:text-[38px]">
          {path.title}
        </h1>
        {path.summary && (
          <p className="mt-4 max-w-3xl text-[17px] leading-relaxed text-ink-2">
            {path.summary}
          </p>
        )}
        {/* Plain spans, not a <dl>: a definition list needs each <dt> paired
            with a <dd>, and "3 courses" is one phrase rather than a term and its
            definition. The invalid nesting made React re-render the tree on the
            client with a hydration mismatch. */}
        <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-2 text-[14.5px] text-ink-2">
          <span>
            <b className="text-ink">{path.courses.length}</b>{" "}
            course{path.courses.length === 1 ? "" : "s"}
          </span>
          <span>
            <b className="text-ink">{lessons.length}</b> lessons
          </span>
          <span>
            <b className="text-ink">{playable.length}</b> ready to watch
          </span>
          {expert && (
            <span>
              Taught by <b className="text-ink">{expert}</b>
            </span>
          )}
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-4">
          {firstPlayable ? (
            <Link
              href={`/learn/${path.slug}/${firstPlayable.id}`}
              className="rounded-full bg-magenta px-7 py-3 font-bold text-white transition-colors hover:bg-magenta-dark"
            >
              Start Watching
            </Link>
          ) : (
            <span className="rounded-full border-[1.5px] border-line px-7 py-3 font-bold text-ink-2">
              Videos Coming Soon
            </span>
          )}
          {/* Enrolment is WS4. Shown as the account trigger it will be, disabled
              rather than absent so the page doesn't change shape when it lands. */}
          <span
            className="text-[14px] text-ink-2"
            title="Enrolment and progress tracking arrive in the next workstream"
          >
            Enrol to track your progress — coming soon
          </span>
        </div>
      </header>

      <div className="mt-10 space-y-10">
        {path.courses.map((course, ci) => (
          <section key={course.id}>
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 className="text-[21px] font-bold">
                {path.courses.length > 1 && (
                  <span className="text-ink-2">{ci + 1}. </span>
                )}
                {course.title}
              </h2>
              {course.style && (
                <span className="rounded-full border border-line px-3 py-0.5 text-[12.5px] font-semibold text-ink-2">
                  {STYLE_LABEL[course.style] ?? course.style}
                </span>
              )}
            </div>
            {course.summary && (
              <p className="mt-2 text-[14.5px] text-ink-2">{course.summary}</p>
            )}

            <div className="mt-5 space-y-6">
              {course.sections.map((section) => (
                <div key={section.id}>
                  <h3 className="text-[13px] font-bold uppercase tracking-wide text-ink-2">
                    {section.title}
                  </h3>
                  <ul className="mt-2.5 divide-y divide-line/70 rounded-brand border border-line">
                    {section.lessons.map((lesson) => {
                      const playableNow = isPlayable(lesson);
                      const inner = (
                        <>
                          <span className="min-w-0 flex-1">
                            <span className={playableNow ? "font-semibold" : ""}>
                              {lesson.title}
                            </span>
                          </span>
                          {lesson.run_time && (
                            <span className="shrink-0 text-[13px] text-ink-2">
                              {lesson.run_time}
                            </span>
                          )}
                          <span
                            className={
                              "shrink-0 text-[12.5px] font-bold " +
                              (playableNow ? "text-magenta" : "text-ink-2/70")
                            }
                          >
                            {playableNow ? "Watch →" : "Coming soon"}
                          </span>
                        </>
                      );
                      return (
                        <li key={lesson.id}>
                          {playableNow ? (
                            <Link
                              href={`/learn/${path.slug}/${lesson.id}`}
                              className="flex items-center gap-4 px-4 py-3 text-[15px] transition-colors hover:bg-bg-soft/60"
                            >
                              {inner}
                            </Link>
                          ) : (
                            <div className="flex items-center gap-4 px-4 py-3 text-[15px] text-ink-2">
                              {inner}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
