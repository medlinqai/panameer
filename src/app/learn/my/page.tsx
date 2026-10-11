import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { memberOrPublicTwin } from "@/lib/public-twin";
import { viewerTeaches } from "@/lib/learn-home";
import { learnCatalog } from "@/lib/learn-catalog";
import { recommendNext, testOutPicks } from "@/lib/learn-next";
import { WhatsNext } from "@/components/learn/WhatsNext";
import { getSkillAreas } from "@/lib/skill-area-store";
import { LearnTabs } from "@/components/learn/app/LearnTabs";
import { AccountHero, HERO_BTN, HERO_BTN_W } from "@/components/casing/AccountHero";
import { BubbleField } from "@/components/casing/BubbleField";
import { UpNextCard } from "@/components/learn/UpNextCard";
import { countWord, youTotalAverage } from "@/components/learn/YouTotalAverage";
import { memberLessonAverage } from "@/lib/learn-averages";
import { timeLabel } from "@/lib/learn-time";

export const metadata = { title: "My Learning — Panameer", description: "Your learning record: in progress, completed, certificates and tests." };
export const dynamic = "force-dynamic";

const day = (d: Date | string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });

// Learn › My Learning (2026-10-08, mockup E): tiles hero, In Progress + Completed | Certificates + Tests.
export default async function MyLearningPage() {
  const viewer = await memberOrPublicTwin("/learn");
  const [paths, teaches, watched] = await Promise.all([
    learnCatalog(viewer.userId),
    viewerTeaches(viewer),
    prisma.lessonProgress.findMany({ where: { user_id: viewer.userId }, select: { completed_at: true, lesson: { select: { section: { select: { course: { select: { learning_path_id: true } } } } } } } }),
  ]);
  const lastBy = new Map<string, Date>();
  for (const w of watched) {
    const k = w.lesson.section.course.learning_path_id;
    if (!lastBy.get(k) || lastBy.get(k)! < w.completed_at) lastBy.set(k, w.completed_at);
  }
  const [next, testPicks, areas, average] = await Promise.all([recommendNext(viewer.userId, { paths }), testOutPicks(viewer.userId, { paths }), getSkillAreas(), memberLessonAverage()]);
  const labelOf = (code: string | null) => (code === "START" ? "Start Here" : code ? areas.find((a) => a.code === code)?.label ?? code : null);
  const inProgress = paths.filter((p) => p.mine && !p.certificate && p.mine.done < p.mine.total).sort((a, b) => (lastBy.get(b.id)?.getTime() ?? 0) - (lastBy.get(a.id)?.getTime() ?? 0));
  const completed = paths.filter((p) => p.mine && p.mine.total > 0 && p.mine.done >= p.mine.total);
  const nextCert = [...inProgress].sort((a, b) => b.mine!.done / b.mine!.total - a.mine!.done / a.mine!.total)[0] ?? null;
  const lessonsDone = watched.length;
  // LT-E002: You · Total · Average — lessons done, all lessons out now (with a video), the member average.
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const lessonsThisMonth = watched.filter((w) => w.completed_at >= monthStart).length;
  const allLessons = paths.reduce((n, p) => n + p.courses.reduce((m, c) => m + c.lessons.filter((l) => l.playable).length, 0), 0);
  const minutesLearned = paths.reduce((n, p) => n + p.courses.reduce((m, c) => m + c.lessons.filter((l) => l.done).reduce((k, l) => k + (l.minutes ?? 0), 0), 0), 0);
  const up = next.picks[0] ?? null;
  const toNext = nextCert ? nextCert.mine!.total - nextCert.mine!.done : null;
  // One bubble per enrolled path: size = lessons, ink rises with progress, certified = solid ✓, furthest-into = magenta ring.
  const enrolled = paths.filter((p) => p.mine?.enrolled || p.certificate);
  const bubbles = enrolled.map((p) => {
    const done = p.mine?.done ?? 0;
    const total = p.mine?.total ?? p.lessons;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return {
      key: p.id,
      href: `/learn/${p.slug}`,
      label: p.title,
      hover: `${p.title} · ${done} of ${total} lessons · ${p.certificate ? "certified" : `${pct}%`}`,
      size: p.lessons,
      fill: p.certificate ? 1 : done > 0 ? done / Math.max(total, 1) : null,
      check: !!p.certificate,
      ring: p.id === nextCert?.id,
    };
  });
  const row = "flex flex-wrap items-center justify-between gap-2 border-b border-line py-2.5";
  const BTN = "inline-flex min-h-9 items-center border border-ink px-3.5 text-[13px] font-semibold hover:bg-black/[0.04]";
  const BTN_K = "inline-flex min-h-9 items-center bg-ink px-3.5 text-[13px] font-semibold text-surface hover:bg-ink-hover";

  return (
    <>
      <LearnTabs active="my-learning" teaches={teaches} />
      <div className="mx-auto w-full max-w-[1010px] px-4 py-6 sm:px-6" data-my-learning>
        <AccountHero
          testId="my-learning-hero"
          wide
          picture={
            <BubbleField
              bubbles={bubbles}
              me="YOU"
              caption={bubbles.length ? "Bubble size = lessons in the path" : "Enroll in a learning path and it appears here"}
              legend={[
                { label: "certified ✓", swatch: "check" },
                { label: "in progress", swatch: "half" },
                { label: "where you are", swatch: "ring" },
                { label: "not started", swatch: "quiet" },
              ]}
            />
          }
          eyebrow="My Learning"
          title={lessonsDone ? `${countWord(lessonsDone)} ${lessonsDone === 1 ? "Lesson" : "Lessons"} and Counting` : "Start Your First Lesson"}
          kpis={[
            ...youTotalAverage({ you: lessonsDone, youLabel: "LESSONS DONE", month: lessonsThisMonth, total: allLessons, totalLabel: "OF ALL LESSONS", average }),
            { value: inProgress.length, label: "PATHS IN PROGRESS" },
            { value: minutesLearned ? timeLabel(minutesLearned) : "0", label: "TIME LEARNING" },
          ]}
          paragraph={
            <>
              {nextCert ? <span className="mb-3 block">You&apos;re furthest into <b className="text-ink">{nextCert.title}</b> — {toNext} {toNext === 1 ? "lesson" : "lessons"} from its certificate.</span> : null}
              {up && <UpNextCard path={up.path} label={`Up Next · ${up.reason}`} />}
            </>
          }
          actions={
            <>
              {up ? (
                <Link href={up.path.mine?.next ? `/learn/${up.path.slug}/${up.path.mine.next.id}` : `/learn/${up.path.slug}`} data-start-next className={HERO_BTN}>
                  {`${up.path.mine && up.path.mine.done > 0 ? "Continue" : "Start"} ${up.path.title}`}
                </Link>
              ) : (
                <Link href="/learn/paths" className={HERO_BTN}>Browse Learning Paths</Link>
              )}
              <Link href="#whats-next" className={HERO_BTN_W}>What&apos;s Next?</Link>
            </>
          }
        />
        <div className="grid md:grid-cols-2">
          <section className="min-w-0 py-6 md:pr-7">
            <h2 id="in-progress" className="text-[20px] font-bold">In Progress <small className="ml-1 text-[12px] font-medium text-ink-3">{inProgress.length}</small></h2>
            {inProgress.length === 0 && <p className="mt-2 text-[13.5px] text-ink-2">Nothing in progress. <Link href="/learn/paths" className="font-bold underline">Find a learning path</Link>.</p>}
            <ul>
              {inProgress.map((p) => (
                <li key={p.id} className={row}>
                  <span className="min-w-0 flex-1">
                    <Link href={`/learn/${p.slug}`} className="block truncate text-[14px] font-bold hover:underline">{p.title}</Link>
                    <span className="block text-[12px] text-ink-3">{p.mine!.done} of {p.mine!.total} lessons{p.mine!.soon ? ` · ${p.mine!.soon} coming soon` : ""}{lastBy.get(p.id) ? ` · last watched ${day(lastBy.get(p.id)!)}` : ""}</span>
                    <span aria-hidden className="mt-1 block h-[5px] w-full max-w-[260px] bg-[#C9CDDC]"><span className="block h-full bg-ink" style={{ width: `${Math.round((p.mine!.done / p.mine!.total) * 100)}%` }} /></span>
                  </span>
                  <Link href={p.mine!.next ? `/learn/${p.slug}/${p.mine!.next.id}` : `/learn/${p.slug}`} className={BTN_K}>Continue</Link>
                </li>
              ))}
            </ul>
          </section>
          <section className="min-w-0 border-t border-line py-6 md:border-l md:border-t-0 md:pl-7">
            <h2 className="text-[20px] font-bold">Completed <small className="ml-1 text-[12px] font-medium text-ink-3">{completed.length}</small></h2>
            {completed.length === 0 && <p className="mt-2 text-[13.5px] text-ink-2">Paths you finish show here.</p>}
            <ul>
              {completed.map((p) => (
                <li key={p.id} className={row}>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[14px]">{p.title}{!p.certificate && <span data-ready-tag className="ml-2 border border-magenta px-1.5 align-[1px] text-[10.5px] font-bold tracking-[0.06em] text-magenta-dark">READY TO TEST</span>}</b>
                    <span className="block text-[12px] text-ink-3">Completed {lastBy.get(p.id) ? day(lastBy.get(p.id)!) : ""}{p.mine?.soon ? ` · ${p.mine.soon} coming soon` : ""}{p.test.best ? ` · test ${p.test.best}%` : ""}</span>
                  </span>
                  {!p.certificate && p.test.ready ? <Link href={`/learn/${p.slug}/test`} className={BTN_K}>Take the Test</Link> : <Link href={`/learn/${p.slug}`} className={BTN}>Review</Link>}
                </li>
              ))}
            </ul>
          </section>
        </div>
        {/* What's Next lives here (moved from Learn Home 2026-10-10). */}
        <WhatsNext picks={next.picks} testPicks={testPicks} skillMatched={next.skillMatched} areaLabel={labelOf} />
      </div>
    </>
  );
}
