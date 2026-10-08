import Link from "next/link";
import { memberOrPublicTwin } from "@/lib/public-twin";
import { learnHomeData } from "@/lib/learn-homepage";
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
export default async function LearnHomePage({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  const viewer = await memberOrPublicTwin("/learn");
  const { area } = await searchParams;
  const [d, teaches] = await Promise.all([learnHomeData(viewer.userId, area), viewerTeaches(viewer)]);
  const f = d.focus;
  return (
    <>
      <LearnTabs active="home" teaches={teaches} />
      <div className="mx-auto w-full max-w-[1010px] px-4 py-6 sm:px-6">
        {f ? (
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
                {f.next ? <>Next up in <b className="text-ink">{f.title}</b>: Lesson {f.next.index}, {f.next.title}{f.next.minutes ? ` · ${f.next.minutes} min` : ""}.</> : <>You&apos;ve watched every lesson in <b className="text-ink">{f.title}</b>.</>}
                {f.test?.ready && !f.test.passed && (
                  <span className="mt-2 block text-[12.5px] text-ink-3">
                    Already know it? Take the test now — {f.test.questions} questions · {f.test.passPct}% to pass · {f.test.attemptsLeft} {f.test.attemptsLeft === 1 ? "attempt" : "attempts"}.
                  </span>
                )}
              </>
            }
            actions={
              <>
                {f.next && <Link href={`/learn/${f.slug}/${f.next.id}`} className={HERO_BTN}>Continue Lesson {f.next.index}</Link>}
                {f.test?.ready && !f.test.passed && <Link href={`/learn/${f.slug}/test`} className={HERO_BTN_W}>Take the Certification Test</Link>}
                <Link href="/learn/paths" className={HERO_BTN_W}>Browse Learning Paths</Link>
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
            paragraph={<>Start with the most popular path in your area. Every certificate you earn shows on your profile and lifts your Search Score.</>}
            actions={
              <>
                {d.topPath && <Link href={`/learn/${d.topPath.slug}`} className={HERO_BTN}>Start {d.topPath.title}</Link>}
                <Link href="/learn/paths" className={HERO_BTN_W}>Browse Learning Paths</Link>
              </>
            }
          />
        )}
      </div>
    </>
  );
}
