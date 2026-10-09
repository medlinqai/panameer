import Link from "next/link";
import { memberOrPublicTwin } from "@/lib/public-twin";
import { learnHomeData, topLearners, topTeachers } from "@/lib/learn-homepage";
import { LearnBoards } from "@/components/learn/LearnBoards";
import { recommendNext, testOutPicks } from "@/lib/learn-next";
import { WhatsNext } from "@/components/learn/WhatsNext";
import { LearnPathCard } from "@/components/learn/LearnPathCard";
import { learnCatalog } from "@/lib/learn-catalog";
import { getSkillAreas } from "@/lib/skill-area-store";
import { viewerTeaches } from "@/lib/learn-home";
import { LearnTabs } from "@/components/learn/app/LearnTabs";
import { AccountHero, HERO_BTN, HERO_BTN_W } from "@/components/casing/AccountHero";
import { ProgressRing } from "@/components/learn/ProgressRing";

export const metadata = {
  title: "Learn — Panameer",
  description: "Pick up where you left off, see who's learning and teaching, and the most popular learning paths.",
};
export const dynamic = "force-dynamic";

// Learn › Home (2026-10-08): hero for the path you're furthest into, then the boards and the most popular paths.
export default async function LearnHomePage({ searchParams }: { searchParams: Promise<{ area?: string; lb?: string; tb?: string }> }) {
  const viewer = await memberOrPublicTwin("/learn");
  const { area, lb: lbRaw, tb: tbRaw } = await searchParams;
  const lb = lbRaw === "all" ? "all" : "month";
  const tb = tbRaw === "all" ? "all" : "month";
  const [d, teaches, learners, teachers, areas, catalog] = await Promise.all([learnHomeData(viewer.userId, area), viewerTeaches(viewer), topLearners(lb), topTeachers(tb), getSkillAreas(), learnCatalog(viewer.userId)]);
  const f = d.focus;
  // L-E048: nothing in progress → ask what's next; in progress → Continue, with Recommended for You below.
  const inProgress = !!f && !f.readyToTest;
  const rec = await recommendNext(viewer.userId, { paths: catalog });
  const testPicks = inProgress ? [] : await testOutPicks(viewer.userId, { paths: catalog });
  const top = rec.picks[0] ?? null;
  const labelOf = (code: string | null) => (code === "START" ? "Start Here" : code ? areas.find((a) => a.code === code)?.label ?? code : null);
  return (
    <>
      <LearnTabs active="home" teaches={teaches} />
      <div className="mx-auto w-full max-w-[1010px] px-4 py-6 sm:px-6">
        {inProgress && f ? (
          <AccountHero
            testId="learn-hero"
            picture={<ProgressRing done={f.done} total={f.total} title={f.title} />}
            eyebrow="Learn"
            title="Pick Up Where You Left Off"
            kpis={[
              { value: d.kpis.inProgress, label: "IN PROGRESS" },
              { value: d.kpis.certificates, label: "CERTIFICATES" },
              { value: d.kpis.lessonsDone, label: "LESSONS DONE" },
            ]}
            paragraph={
              <>
                {f.next && !f.readyToTest ? <>Next up in <b className="text-ink">{f.title}</b>: Lesson {f.next.index}, {f.next.title}{f.next.minutes ? ` · ${f.next.minutes} min` : ""}.</> : <><b className="text-ink">Ready to Test</b> — you&apos;ve watched every lesson that&apos;s out in <b className="text-ink">{f.title}</b> ({f.done} of {f.total}).{f.soon ? ` ${f.soon} more ${f.soon === 1 ? "is" : "are"} coming soon.` : ""}</>}
                {f.test?.ready && !f.test.passed && (
                  <span className="mt-2 block text-[12.5px] text-ink-3">
                    Already know it? Take the test now — {f.test.questions} questions · {f.test.passPct}% to pass · {f.test.attemptsLeft} {f.test.attemptsLeft === 1 ? "attempt" : "attempts"}.
                  </span>
                )}
              </>
            }
            actions={
              <>
                {f.next && !f.readyToTest && <Link href={`/learn/${f.slug}/${f.next.id}`} className={HERO_BTN}>Continue Lesson {f.next.index}</Link>}
                {f.test?.ready && !f.test.passed && <Link href={`/learn/${f.slug}/test`} className={HERO_BTN_W}>Take the Certification Test</Link>}
                <Link href="/learn/paths" className={HERO_BTN_W}>Browse Learning Paths</Link>
              </>
            }
          />
        ) : !d.firstVisit && top ? (
          <AccountHero
            testId="learn-hero-next"
            picture={<ProgressRing done={f?.done ?? 0} total={f?.total ?? 0} caption={f ? undefined : String(d.kpis.certificates)} title={f ? `${f.title} · Ready to Test` : `${d.kpis.certificates} certificates`} />}
            eyebrow="Learn"
            title="Start Your Next Path"
            kpis={[
              { value: d.kpis.inProgress, label: "IN PROGRESS" },
              { value: d.kpis.certificates, label: "CERTIFICATES" },
              { value: d.kpis.lessonsDone, label: "LESSONS DONE" },
            ]}
            paragraph={
              <>
                {f?.readyToTest && <>You&apos;ve watched every lesson that&apos;s out in <b className="text-ink">{f.title}</b> — <b className="text-ink">Ready to Test</b>. </>}
                Up next: <b className="text-ink">{top.path.title}</b> — {top.reason.charAt(0).toLowerCase() + top.reason.slice(1)}.
              </>
            }
            actions={
              <>
                <Link href={top.path.mine?.next ? `/learn/${top.path.slug}/${top.path.mine.next.id}` : `/learn/${top.path.slug}`} data-start-next className={HERO_BTN}>Start {top.path.title}</Link>
                {f?.readyToTest && f.test?.ready && !f.test.passed && <Link href={`/learn/${f.slug}/test`} className={HERO_BTN_W}>Take the {f.title} Test</Link>}
                <a href="#whats-next" className={HERO_BTN_W}>What&apos;s Next?</a>
              </>
            }
          />
        ) : (
          <AccountHero
            testId="learn-hero-first"
            picture={<ProgressRing done={0} total={0} caption="0" title={`${d.kpis.certificates} certificates yet`} />}
            eyebrow="Learn"
            title="Learn From Practitioners, Free"
            kpis={[
              { value: d.kpis.paths, label: "LEARNING PATHS" },
              { value: d.kpis.teachers, label: "TEACHERS" },
              { value: d.kpis.certificates, label: "YOUR CERTIFICATES" },
            ]}
            paragraph={
              d.beginner && d.topPath ? (
                <>New to Oracle Cloud? Start with <b className="text-ink">{d.topPath.title}</b> — it covers the basics before any module path. Every certificate you earn shows on your profile and lifts your Search Score.</>
              ) : (
                <>Start with the most popular path in your area. Every certificate you earn shows on your profile and lifts your Search Score.</>
              )
            }
            actions={
              <>
                {d.topPath && <Link href={`/learn/${d.topPath.slug}`} className={HERO_BTN}>Start {d.topPath.title}</Link>}
                <Link href="/learn/paths" className={HERO_BTN_W}>Browse Learning Paths</Link>
              </>
            }
          />
        )}
        {!inProgress && !d.firstVisit && <WhatsNext picks={rec.picks} testPicks={testPicks} skillMatched={rec.skillMatched} areaLabel={labelOf} />}
        {(inProgress || d.firstVisit) && rec.picks.length > 0 && (
          <section data-recommended className="mt-8 border-t border-line pt-6">
            <h2 className="text-[22px] font-bold">Recommended for You</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rec.picks.map((x) => <LearnPathCard key={x.path.id} p={x.path} areaLabel={labelOf(x.path.area)} reason={x.reason} />)}
            </ul>
          </section>
        )}
        <LearnBoards learners={learners} teachers={teachers} lb={lb} tb={tb} meUserId={viewer.userId} createHref={viewer.isSystemAdmin ? "/admin/setup/learn-authoring" : "/support/help"} />
        {/* L-E053: one place to browse — the area chips and the full grid live on All Learning Paths. */}
        <p className="border-t border-line py-6 text-center"><Link href="/learn/paths" data-browse-all className="text-[15px] font-bold text-magenta-dark underline underline-offset-4">Browse All Learning Paths →</Link></p>
      </div>
    </>
  );
}
