import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";
import { viewerTeaches } from "@/lib/learn-home";
import { learnCatalog, nextPathSuggestion, timeLabel } from "@/lib/learn-catalog";
import { getSkillAreas } from "@/lib/skill-area-store";
import { LearnTabs } from "@/components/learn/app/LearnTabs";
import { AccountHero, HERO_BTN, HERO_BTN_W } from "@/components/casing/AccountHero";
import { ProgressRing } from "@/components/learn/ProgressRing";
import { WhatsInside } from "@/components/learn/WhatsInside";
import { CourseTile } from "@/components/learn/CourseTile";
import { pathState } from "@/lib/learn-state";
import { lessonCount } from "@/lib/learn-time";
import { Avatar } from "@/components/Avatar";
import { NotifyMe } from "@/components/learn/NotifyMe";

export const dynamic = "force-dynamic";

// Learn › a learning path (2026-10-08, mockup B): hero, then What's Inside | Certification Test · Taught By · Path Group.
export default async function LearningPathPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const viewer = await getSessionViewer();
  const [[p], areas, teaches] = await Promise.all([learnCatalog(viewer?.userId ?? null, { slug }), getSkillAreas(), viewerTeaches(viewer)]);
  if (!p) notFound();
  const areaLabel = p.area === "START" ? "Start Here" : p.area ? areas.find((a) => a.code === p.area)?.label ?? p.area : null;
  const board = await prisma.forumBoard.findFirst({ where: { learning_path_id: p.id }, select: { id: true, slug: true } });
  const latest = board ? await prisma.forumThread.findFirst({ where: { board_id: board.id }, orderBy: { created_at: "desc" }, select: { id: true, title: true, reply_count: true, last_post_at: true } }) : null;
  const first = p.courses.flatMap((c) => c.lessons).find((l) => l.playable) ?? null;
  const next = p.mine?.next ?? null;
  const allWatched = !!p.mine && p.mine.total > 0 && p.mine.done >= p.mine.total;
  const state = pathState(p);
  const pickNext = await nextPathSuggestion(viewer?.userId ?? null);
  const signIn = `/login?callbackUrl=${encodeURIComponent(`/learn/${p.slug}`)}`;
  const draftForAdmin = viewer && (viewer.isAdmin || viewer.isSystemAdmin) ? (await prisma.certificationTest.findUnique({ where: { learning_path_id: p.id }, select: { status: true } }))?.status ?? null : null;
  const startHref = !viewer ? signIn : next ? `/learn/${p.slug}/${next.id}` : first ? `/learn/${p.slug}/${first.id}` : null;
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const ago = (d: Date) => {
    const days = Math.floor((now - d.getTime()) / 86_400_000);
    return days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
  };
  const picture = p.mine ? (
    <ProgressRing done={p.mine.done} total={p.mine.total} title={p.mine.soon ? `${p.mine.soon} more lessons coming soon` : null} />
  ) : p.cover ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={p.cover} alt="" className="mx-auto aspect-[4/3] w-full max-w-[320px] object-cover" />
  ) : (
    <div className="mx-auto grid aspect-[4/3] w-full max-w-[320px] place-items-center bg-ink p-6 text-center text-[20px] font-bold text-surface">{p.title}</div>
  );

  return (
    <>
      {viewer && <LearnTabs active="paths" teaches={teaches} />}
      <div className="mx-auto w-full max-w-[1010px] px-4 py-6 sm:px-6" data-learning-path={p.slug}>
        <Link href={p.area ? `/learn/paths?area=${p.area}` : "/learn/paths"} className="text-[13px] font-bold text-ink-2 hover:text-magenta">‹ Learning Paths{areaLabel ? ` · ${areaLabel}` : ""}</Link>
        <div className="mt-4">
          <AccountHero
            testId="path-hero"
            picture={picture}
            eyebrow={[areaLabel, p.group, pathState(p) === "READY_TO_TEST" ? "Ready to Test" : null].filter(Boolean).join(" · ") || "Learning Path"}
            title={p.title}
            kpis={[
              { value: p.courses.length, label: "COURSES" },
              { value: p.lessons, label: "LESSONS" },
              { value: timeLabel(p.minutes) ?? "—", label: "TO WATCH" },
              { value: p.learners, label: "LEARNERS" },
            ]}
            paragraph={
              <>
                {p.summary}
                {allWatched ? <> <b className="text-ink">Congratulations — you&apos;ve watched every lesson that&apos;s out.</b>{p.mine?.soon ? ` ${p.mine.soon} more are coming soon; they'll show up here.` : ""}{p.test.ready && !p.test.passed ? " Next step: the certification test." : ""}</> : null}
                {next ? <> Next up: <b className="text-ink">Lesson {next.index} · {next.title}</b>{next.minutes ? ` (${next.minutes} min)` : ""}.</> : null}
                {!p.playable && <> <b className="text-ink">Coming soon</b> — the lessons below are planned; none has a video yet.</>}
              </>
            }
            actions={
              <>
                {/* L-E040/L-E044/L-E045: the main step follows where you are; Test Out sits beside it. */}
                {state === "READY_TO_TEST" ? (
                  <>
                    {p.test.ready ? <Link href={`/learn/${p.slug}/test`} className={HERO_BTN}>Take the Test</Link> : <NotifyMe pathId={p.id} initial={p.watchingTest} signedIn={!!viewer} test label="Test Opens Soon · Notify Me" className={HERO_BTN_W} />}
                    <Link href={pickNext} className={HERO_BTN_W}>Pick Your Next Path</Link>
                  </>
                ) : state === "CERTIFIED" ? (
                  <>
                    {p.certificate?.verifyUrl && <Link href={p.certificate.verifyUrl} className={HERO_BTN}>View Certificate</Link>}
                    <Link href={pickNext} className={HERO_BTN_W}>Pick Your Next Path</Link>
                  </>
                ) : p.playable && startHref ? (
                  <Link href={startHref} className={HERO_BTN}>{next && p.mine && p.mine.done > 0 ? `Continue Lesson ${next.index}` : "Start"}</Link>
                ) : null}
                {(state === "NEW" || state === "IN_PROGRESS") && (
                  <>
                    {p.test.ready ? (
                      <Link href={viewer ? `/learn/${p.slug}/test` : signIn} data-test-out className={HERO_BTN_W}>Test Out</Link>
                    ) : (
                      <NotifyMe pathId={p.id} initial={p.watchingTest} signedIn={!!viewer} test label="Test Out · Opens Soon" className={HERO_BTN_W} />
                    )}
                    <p className="w-full text-[12.5px] text-ink-3">Already know this? Pass the test and skip the lessons.</p>
                  </>
                )}
                {!p.playable && <NotifyMe pathId={p.id} initial={p.watching} signedIn={!!viewer} className={HERO_BTN_W} />}
              </>
            }
          />
        </div>

        <div className="grid md:grid-cols-[1.35fr_1fr]">
          <section className="min-w-0 py-6 md:pr-7">
            <h2 className="text-[20px] font-bold">What&apos;s Inside <small className="ml-1 text-[12px] font-medium text-ink-3">{p.courses.length} courses · {p.lessons} lessons</small></h2>
            <div data-course-tiles className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {p.courses.map((c, i) => (
                <CourseTile key={c.id} n={i + 1} title={c.title} lessons={lessonCount(c.lessons).out} done={lessonCount(c.lessons).done} soon={lessonCount(c.lessons).soon} href={`/learn/${p.slug}/course/${c.slug}`} />
              ))}
            </div>
            <WhatsInside slug={p.slug} courses={p.courses} nextLessonId={next?.id ?? null} canPlay={!!viewer} />
          </section>
          <aside className="min-w-0 border-t border-line py-6 md:border-l md:border-t-0 md:pl-7">
            <section id="test" data-path-test>
              <h2 className="text-[18px] font-bold">Certification Test</h2>
              {draftForAdmin && (
                <Link href={`/learn/${p.slug}/test?preview=1`} data-test-preview-link className="mt-2 inline-flex min-h-10 items-center border border-magenta px-3 text-[13px] font-bold text-magenta-dark">Test · {draftForAdmin === "DRAFT" ? "Draft" : "Published"} — Take as Preview</Link>
              )}
              {/* L-E041: three clear states — passed, open, opens soon. */}
              {p.test.passed ? (
                <div data-test-state="passed">
                  <p className="mt-2 text-[15px] font-bold">Passed{p.certificate ? ` · ${new Date(p.certificate.earnedOn).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}{p.test.best ? ` · ${p.test.best}%` : ""}</p>
                  {p.certificate?.verifyUrl ? <Link href={p.certificate.verifyUrl} className="mt-3 inline-flex min-h-10 items-center bg-ink px-4 text-[13.5px] font-semibold text-surface hover:bg-ink-hover">View Certificate</Link> : <Link href="/learn/certificates" className="mt-3 inline-flex min-h-10 items-center bg-ink px-4 text-[13.5px] font-semibold text-surface hover:bg-ink-hover">View Certificate</Link>}
                </div>
              ) : p.test.ready ? (
                <div data-test-state="open">
                  <p className="mt-2 text-[15px] font-bold">Ready when you are</p>
                  <dl className="mt-2 grid grid-cols-3 gap-2">
                    {[["Questions", p.test.questions], ["To pass", `${p.test.threshold}%`], ["Attempts", p.test.maxAttempts]].map(([k, v]) => (
                      <div key={k as string}><dd className="text-[20px] font-medium tabular-nums">{v}</dd><dt className="text-[11px] font-semibold tracking-[0.06em] text-ink-3">{(k as string).toUpperCase()}</dt></div>
                    ))}
                  </dl>
                  <p className="mt-2 text-[13px] text-ink-2">Take it whenever you like — the lessons aren&apos;t required. Pass it and the certificate goes on your profile under <b className="text-ink">Credentials</b>, verified by Panameer.</p>
                  <Link href={viewer ? `/learn/${p.slug}/test` : signIn} data-take-test className="mt-3 inline-flex min-h-10 items-center bg-ink px-4 text-[13.5px] font-semibold text-surface hover:bg-ink-hover">Take the Test</Link>
                  {viewer && p.test.used > 0 && <p className="mt-1.5 text-[12px] text-ink-3">{Math.max(0, p.test.maxAttempts - p.test.used)} of {p.test.maxAttempts} attempts left</p>}
                </div>
              ) : (
                <div data-test-state="soon">
                  <p className="mt-2 text-[13.5px] text-ink-2">The test isn&apos;t open yet. We&apos;ll let you know when it opens.</p>
                  <div className="mt-3"><NotifyMe pathId={p.id} initial={p.watchingTest} signedIn={!!viewer} test /></div>
                </div>
              )}
            </section>
            {p.teacher && (
              <section className="mt-6 border-t border-line pt-5" data-taught-by>
                <h2 className="text-[18px] font-bold">Taught By</h2>
                <div className="mt-2 flex items-center gap-3">
                  <Avatar firstName={p.teacher.name.split(" ")[0] ?? ""} lastName={p.teacher.name.split(" ").slice(1).join(" ")} photoUrl={p.teacher.photoUrl} size={44} />
                  <span className="min-w-0">
                    <b className="block text-[14.5px]">{p.teacher.name}</b>
                    {p.teacher.title && <span className="block truncate text-[12.5px] text-ink-2">{p.teacher.title}</span>}
                  </span>
                </div>
                {p.teacher.profileId && <Link href={`/providers/${p.teacher.profileId}`} className="mt-3 inline-flex min-h-10 items-center border border-ink px-4 text-[13.5px] font-semibold hover:bg-black/[0.04]">View Profile</Link>}
              </section>
            )}
            <section className="mt-6 border-t border-line pt-5" data-path-group>
              <h2 className="text-[18px] font-bold">Path Group <small className="ml-1 text-[12px] font-medium text-ink-3">{p.learners} {p.learners === 1 ? "member" : "members"}</small></h2>
              {latest ? (
                <Link href={`/connect/groups/thread/${latest.id}`} className="mt-2 block hover:underline">
                  <b className="block text-[13.5px]">{latest.title}</b>
                  <span className="text-[12px] text-ink-3">{latest.reply_count} {latest.reply_count === 1 ? "reply" : "replies"} · {ago(latest.last_post_at ?? new Date())}</span>
                </Link>
              ) : (
                <p className="mt-2 text-[13px] text-ink-2">No questions yet. Ask the first one.</p>
              )}
              <Link href={board ? `/connect/groups/${board.slug}` : `/connect/groups/path-${p.slug}`} className="mt-3 inline-flex min-h-10 items-center border border-ink px-4 text-[13.5px] font-semibold hover:bg-black/[0.04]">Ask the Group</Link>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}
