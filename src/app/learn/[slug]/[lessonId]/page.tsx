import Link from "next/link";
import { lessonCount } from "@/lib/learn-time";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getLearnLesson, viewerTeaches } from "@/lib/learn-home";
import { guardPage } from "@/lib/guard";
import { vimeoEmbedUrl } from "@/lib/learn";
import { learnCatalog } from "@/lib/learn-catalog";
import { ensurePathBoard } from "@/lib/forums";
import { LessonPlayer } from "@/components/learn/LessonPlayer";
import { LearnTabs } from "@/components/learn/app/LearnTabs";
import { StatusMark } from "@/components/learn/StatusMark";
import { LessonStep } from "@/components/learn/LessonStep";
import { LessonAsk } from "@/components/learn/LessonAsk";
import { ConnectControls, type Relation } from "@/components/community/ConnectControls";
import { canMessage } from "@/lib/messages";

export const dynamic = "force-dynamic";

// Learn › a lesson (2026-10-08, mockup C): video + outline, step buttons, About This Lesson | Questions on This Lesson.
export default async function LessonPage({ params }: { params: Promise<{ slug: string; lessonId: string }> }) {
  const viewer = await guardPage("authenticated");
  const { slug, lessonId } = await params;
  const [view, [p], teaches] = await Promise.all([getLearnLesson(slug, lessonId, viewer.userId), learnCatalog(viewer.userId, { slug }), viewerTeaches(viewer)]);
  if (!view && p) {
    // L-E043: a retired lesson's URL forwards to the next lesson in its course (else the path page).
    const r = await prisma.lesson.findFirst({ where: { id: lessonId, retired_at: { not: null } }, select: { section: { select: { course_id: true } } } });
    if (r) {
      const flat = p.courses.flatMap((c) => c.lessons.map((l) => ({ ...l, courseId: c.id })));
      const next = flat.find((l) => l.courseId === r.section.course_id && l.playable) ?? flat.find((l) => l.playable);
      redirect(next ? `/learn/${slug}/${next.id}` : `/learn/${slug}`);
    }
  }
  if (!view || !p) notFound();
  const { lesson, instructor } = view;
  const embed = lesson.playable ? vimeoEmbedUrl(lesson.vimeoRef) : null;

  // Connect with the instructor right under the video (Scott 2026-10-08).
  const tutorUserId = instructor ? (await prisma.person.findUnique({ where: { id: instructor.id }, select: { user_id: true } }))?.user_id ?? null : null;
  const tutorConn = tutorUserId && tutorUserId !== viewer.userId
    ? await prisma.connection.findFirst({
        where: { kind: "COLLEAGUE", status: { in: ["PENDING", "ACCEPTED"] }, OR: [{ from_user_id: viewer.userId, to_user_id: tutorUserId }, { from_user_id: tutorUserId, to_user_id: viewer.userId }] },
        select: { id: true, status: true, from_user_id: true },
      })
    : null;
  const tutorRelation: Relation = tutorConn ? (tutorConn.status as Relation) : null;
  const tutorIncoming = tutorConn?.status === "PENDING" && tutorConn.from_user_id === tutorUserId ? tutorConn.id : null;
  // L-E038: an enrolled learner can message the path's instructor without connecting first.
  const canMsgTutor = !!tutorUserId && tutorUserId !== viewer.userId && tutorRelation !== "ACCEPTED" && !!p?.mine?.enrolled && (await canMessage(viewer, tutorUserId)).ok;

  const flat = p.courses.flatMap((c, ci) => c.lessons.map((l) => ({ ...l, ci, course: c })));
  const i = flat.findIndex((l) => l.id === lessonId);
  if (i < 0) notFound();
  const here = flat[i];
  const prev = flat.slice(0, i).reverse().find((l) => l.playable) ?? null;
  const next = flat.slice(i + 1).find((l) => l.playable) ?? null;
  // L-E045: once this is the last unwatched lesson that's out, Mark Complete lands on "You're Ready to Test".
  const lastOne = !flat.some((l) => l.playable && !l.done && l.id !== lessonId);
  const nextHref = lastOne ? `/learn/${p.slug}/ready` : next ? `/learn/${p.slug}/${next.id}` : `/learn/${p.slug}`;
  const lastLabel = lastOne ? "Mark Complete & Finish" : null;
  const count = lessonCount(flat);
  const pct = count.out ? Math.round((count.done / count.out) * 100) : 0;

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
        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-ink-3">{count.label}{count.finished && <span data-ready-tag className="border border-magenta px-1.5 text-[10.5px] font-bold tracking-[0.06em] text-magenta-dark">READY TO TEST</span>}</p>
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
                    {!l.playable && <span className="shrink-0 border border-line px-1 text-[9.5px] font-bold tracking-[0.06em] text-ink-3">COMING SOON</span>}
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
            {lesson.playable ? (
              <LessonStep lessonId={lessonId} prevHref={prev ? `/learn/${p.slug}/${prev.id}` : null} nextHref={nextHref} lastLabel={lastLabel} />
            ) : (
              // No video yet: nothing to complete, just move on (Scott 2026-10-08).
              <div className="flex flex-wrap items-center gap-3">
                {prev && <Link href={`/learn/${p.slug}/${prev.id}`} className="inline-flex min-h-11 items-center border border-ink px-5 text-[14px] font-semibold hover:bg-black/[0.04]">‹ Previous</Link>}
                <Link href={nextHref} className="inline-flex min-h-11 items-center bg-ink px-5 text-[14px] font-semibold text-surface hover:bg-ink-hover">{next ? "Skip to Next Lesson ›" : "Back to the Path"}</Link>
                <span className="text-[13px] text-ink-3">Coming soon — no video yet, so there's nothing to mark complete.</span>
              </div>
            )}
            {instructor && (
              <div data-lesson-instructor className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
                {instructor.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={instructor.photoUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : null}
                <div className="min-w-0 flex-1 text-[13.5px]">
                  <span className="text-ink-2">Taught by </span>
                  {instructor.profileSlug ? (
                    <Link href={`/providers/${instructor.profileSlug}`} className="font-bold text-ink underline-offset-4 hover:underline">{instructor.name}</Link>
                  ) : (
                    <b>{instructor.name}</b>
                  )}
                </div>
                {canMsgTutor && (
                  <Link href={`/messages?with=${tutorUserId}`} data-message-instructor className="inline-flex min-h-10 items-center border border-ink px-4 text-[14px] font-semibold text-ink hover:bg-surface-hover">Message</Link>
                )}
                {tutorUserId && tutorUserId !== viewer.userId && (
                  <ConnectControls toUserId={tutorUserId} relation={tutorRelation} incomingConnectionId={tutorIncoming} tone="outline" part="colleague" />
                )}
              </div>
            )}
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
