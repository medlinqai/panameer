import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getLearnLesson, viewerTeaches } from "@/lib/learn-home";
import { guardPage } from "@/lib/guard";
import { vimeoEmbedUrl } from "@/lib/learn";
import { learnCatalogue } from "@/lib/learn-catalogue";
import { ensurePathBoard } from "@/lib/forums";
import { LessonPlayer } from "@/components/learn/LessonPlayer";
import { LearnTabs } from "@/components/learn/app/LearnTabs";
import { StatusMark } from "@/components/learn/StatusMark";
import { LessonStep } from "@/components/learn/LessonStep";
import { LessonAsk } from "@/components/learn/LessonAsk";

export const dynamic = "force-dynamic";

// Learn › a lesson (2026-10-08, mockup C): video + outline, step buttons, About This Lesson | Questions on This Lesson.
export default async function LessonPage({ params }: { params: Promise<{ slug: string; lessonId: string }> }) {
  const viewer = await guardPage("authenticated");
  const { slug, lessonId } = await params;
  const [view, [p], teaches] = await Promise.all([getLearnLesson(slug, lessonId, viewer.userId), learnCatalogue(viewer.userId, { slug }), viewerTeaches(viewer)]);
  if (!view || !p) notFound();
  const { lesson, instructor } = view;
  const embed = lesson.playable ? vimeoEmbedUrl(lesson.vimeoRef) : null;

  const flat = p.courses.flatMap((c, ci) => c.lessons.map((l) => ({ ...l, ci, course: c })));
  const i = flat.findIndex((l) => l.id === lessonId);
  if (i < 0) notFound();
  const here = flat[i];
  const prev = flat.slice(0, i).reverse().find((l) => l.playable) ?? null;
  const next = flat.slice(i + 1).find((l) => l.playable) ?? null;
  const nextHref = next ? `/learn/${p.slug}/${next.id}` : p.test.ready && !p.test.passed ? `/learn/${p.slug}/test` : `/learn/${p.slug}`;
  const lastLabel = next ? null : p.test.ready && !p.test.passed ? "Mark Complete & Take the Test" : "Mark Complete & Finish";
  const done = flat.filter((l) => l.done).length;
  const pct = flat.length ? Math.round((done / flat.length) * 100) : 0;

  // The path's group board; created only if this path never had one (no write on an ordinary view).
  const board =
    (await prisma.forumBoard.findFirst({ where: { learning_path_id: p.id }, select: { id: true, slug: true } })) ??
    (await ensurePathBoard(prisma, { id: p.id, title: p.title, slug: p.slug, summary: p.summary }).catch(() => null));
  const questions = await prisma.forumThread.findMany({
    where: { lesson_id: lessonId },
    orderBy: { created_at: "desc" },
    take: 10,
    select: { id: true, title: true, reply_count: true, posts: { where: { marked_helpful_at: { not: null } }, take: 1, select: { author: { select: { first_name: true, last_name: true } } } } },
  });

  const outline = (
    <aside data-lesson-outline className="border border-line lg:sticky lg:self-start" style={{ top: "calc(var(--pm-band-h) + 1.5rem)" }}>
      <div className="border-b border-line p-4">
        <p className="text-[13.5px] font-bold">{p.title}</p>
        <p className="mt-0.5 text-[12px] text-ink-3">{done} of {flat.length} lessons</p>
        <span aria-hidden className="mt-2 block h-[6px] w-full bg-[#C9CDDC]"><span className="block h-full bg-ink" style={{ width: `${pct}%` }} /></span>
      </div>
      <ol className="max-h-[520px] overflow-y-auto p-3">
        {p.courses.map((c, ci) => (
          <li key={c.id} className="mb-2">
            <p className="text-[11px] font-bold tracking-[0.08em] text-ink-3">{ci + 1} · {c.title.toUpperCase()}</p>
            <ul className="mt-1">
              {c.lessons.map((l) => {
                const st = l.id === lessonId ? "now" : l.done ? "done" : "todo";
                const row = (
                  <>
                    <StatusMark state={st} size={14} />
                    <span className={"min-w-0 flex-1 truncate " + (st === "now" ? "font-bold text-magenta-dark" : l.playable ? "" : "text-ink-3")}>{l.title}</span>
                  </>
                );
                return (
                  <li key={l.id}>
                    {l.playable ? (
                      <Link href={`/learn/${p.slug}/${l.id}`} aria-current={st === "now" ? "page" : undefined} className="flex items-center gap-2 py-1 text-[13px] hover:underline">{row}</Link>
                    ) : (
                      <span className="flex items-center gap-2 py-1 text-[13px]">{row}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
    </aside>
  );

  return (
    <>
      <LearnTabs active="paths" teaches={teaches} />
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6" data-lesson={lessonId}>
        <Link href={`/learn/${p.slug}#course-${here.course.slug}`} className="text-[13px] font-bold text-ink-2 hover:text-magenta">‹ {p.title} · Course {here.ci + 1} · {here.course.title}</Link>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="min-w-0">
            <LessonPlayer embedUrl={embed} title={lesson.title} instructor={instructor ? { name: instructor.name, photoUrl: instructor.photoUrl } : null} thumbnailUrl={lesson.thumbnailUrl} stateLabel={lesson.stateLabel} />
            <p className="mt-5 text-[11px] font-semibold tracking-[0.12em] text-magenta">LESSON {i + 1} OF {flat.length}{here.minutes ? ` · ${here.minutes} MIN` : ""}</p>
            <h1 className="mb-4 mt-1 text-[26px] font-bold leading-tight sm:text-[30px]">{lesson.title}</h1>
            <LessonStep lessonId={lessonId} prevHref={prev ? `/learn/${p.slug}/${prev.id}` : null} nextHref={nextHref} lastLabel={lastLabel} />
          </div>
          {outline}
        </div>
        <div className="mt-6 grid border-t border-line md:grid-cols-2">
          <section className="min-w-0 py-6 md:pr-7">
            <h2 className="text-[18px] font-bold">About This Lesson</h2>
            <p className="mt-2 whitespace-pre-line text-[14.5px] leading-relaxed text-ink-2">{lesson.description || "No notes for this lesson yet."}</p>
          </section>
          <section className="min-w-0 border-t border-line py-6 md:border-l md:border-t-0 md:pl-7" data-lesson-questions>
            <h2 className="text-[18px] font-bold">Questions on This Lesson <small className="ml-1 text-[12px] font-medium text-ink-3">{questions.length}</small></h2>
            {questions.length === 0 ? (
              <p className="mt-2 text-[13.5px] text-ink-2">No questions yet. Ask the first one — it goes to the path group too.</p>
            ) : (
              <ul className="mt-1">
                {questions.map((q) => {
                  const helpful = q.posts[0]?.author;
                  return (
                    <li key={q.id} className="border-b border-line py-2.5">
                      <Link href={`/connect/groups/thread/${q.id}`} className="block hover:underline">
                        <b className="block text-[13.5px]">{q.title}</b>
                        <span className="text-[12px] text-ink-3">{helpful ? `Answered by ${helpful.first_name} ${helpful.last_name} · marked helpful` : `${q.reply_count} ${q.reply_count === 1 ? "reply" : "replies"}`}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            {board && <LessonAsk boardSlug={board.slug} lessonId={lessonId} />}
          </section>
        </div>
      </div>
    </>
  );
}
