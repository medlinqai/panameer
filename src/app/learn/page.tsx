import Link from "next/link";
import { canAdminister } from "@/lib/access";
import { memberOrPublicTwin } from "@/lib/public-twin";
import { learnHomeData, topLearners, topTeachers } from "@/lib/learn-homepage";
import { LearnBoards } from "@/components/learn/LearnBoards";
import { recommendNext } from "@/lib/learn-next";
import { LearnPathCard } from "@/components/learn/LearnPathCard";
import { learnCatalog } from "@/lib/learn-catalog";
import { getSkillAreas } from "@/lib/skill-area-store";
import { viewerTeaches } from "@/lib/learn-home";
import { LearnTabs } from "@/components/learn/app/LearnTabs";
import { AccountHero, HERO_BTN, HERO_BTN_W } from "@/components/casing/AccountHero";
import { ProgressRing } from "@/components/learn/ProgressRing";
import { CertRing } from "@/components/learn/CertRing";
import { shortCode } from "@/components/learn/LearnPathCard";
import { timeLabel } from "@/lib/learn-time";

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
            picture={<CertRing certified={d.badges.length} total={d.kpis.paths} badges={d.badges} />}
            eyebrow="Learn"
            title={d.badges.length > 0 ? `${countWord(d.badges.length)} ${d.badges.length === 1 ? "Certificate" : "Certificates"} and Counting` : "Start Your Next Path"}
            kpis={[
              { value: d.kpis.certificates, label: "CERTIFICATES", delta: d.month.certificates ? `+${d.month.certificates} this month` : null },
              { value: d.kpis.lessonsDone, label: "LESSONS DONE", delta: d.month.lessonsDone ? `+${d.month.lessonsDone} this month` : null },
              { value: d.kpis.inProgress, label: "IN PROGRESS" },
            ]}
            paragraph={
              <>
                {f?.readyToTest && <span className="mb-3 block">You&apos;ve watched every lesson that&apos;s out in <b className="text-ink">{f.title}</b> — <b className="text-ink">Ready to Test</b>.</span>}
                <Link href={`/learn/${top.path.slug}`} data-up-next className="flex items-center gap-3 border border-line bg-white p-2.5 transition hover:border-ink-3">
                  <span
                    className="relative grid h-14 w-[84px] shrink-0 place-items-center overflow-hidden text-[18px] font-extrabold text-white/80"
                    style={top.path.cover ? undefined : { background: "linear-gradient(135deg, #272334, #6b2f6a)" }}
                  >
                    {top.path.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={top.path.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      shortCode(top.path.title)
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10.5px] font-bold uppercase tracking-[0.14em] text-magenta-dark">Up Next · {top.reason}</span>
                    <span className="block truncate text-[16px] font-bold text-ink">{top.path.title}</span>
                    <span className="block truncate text-[12px] text-ink-2">
                      {[top.path.teacher?.name, top.path.courses.length ? `${top.path.courses.length} course${top.path.courses.length === 1 ? "" : "s"}` : null, timeLabel(top.path.minutes)].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </Link>
              </>
            }
            actions={
              <>
                <Link href={top.path.mine?.next ? `/learn/${top.path.slug}/${top.path.mine.next.id}` : `/learn/${top.path.slug}`} data-start-next className={HERO_BTN}>Start {top.path.title}</Link>
                {f?.readyToTest && f.test?.ready && !f.test.passed && <Link href={`/learn/${f.slug}/test`} className={HERO_BTN_W}>Take the {f.title} Test</Link>}
                <Link href="/learn/my#whats-next" className={HERO_BTN_W}>What&apos;s Next?</Link>
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
        {/* What's Next moved to My Learning (2026-10-10) so Top Learners sits right under the hero. */}
        {(inProgress || d.firstVisit) && rec.picks.length > 0 && (
          <section data-recommended className="mt-8 border-t border-line pt-6">
            <h2 className="text-[22px] font-bold">Recommended for You</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rec.picks.map((x) => <LearnPathCard key={x.path.id} p={x.path} areaLabel={labelOf(x.path.area)} reason={x.reason} />)}
            </ul>
          </section>
        )}
        <LearnBoards learners={learners} teachers={teachers} lb={lb} tb={tb} meUserId={viewer.userId} createHref={canAdminister(viewer) ? "/admin/setup/learn-authoring" : null} teaches={teaches} />
        {/* L-E053: one place to browse — the area chips and the full grid live on All Learning Paths. */}
        <p className="border-t border-line py-6 text-center"><Link href="/learn/paths" data-browse-all className="text-[15px] font-bold text-magenta-dark underline underline-offset-4">Browse All Learning Paths →</Link></p>
      </div>
    </>
  );
}

/** "Six Certificates and Counting" — words up to twelve, digits after. */
function countWord(n: number) {
  const w = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
  return w[n] ?? String(n);
}
