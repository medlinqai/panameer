import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { memberOrPublicTwin } from "@/lib/public-twin";
import { viewerTeaches } from "@/lib/learn-home";
import { learnCatalogue } from "@/lib/learn-catalogue";
import { LearnTabs } from "@/components/learn/app/LearnTabs";
import { AccountHero, HERO_BTN, HERO_BTN_W } from "@/components/casing/AccountHero";
import { CertificateTiles } from "@/components/learn/CertificateTiles";
import { CredentialsBody } from "@/components/profile/CredentialsBody";

export const metadata = { title: "My Learning — Panameer", description: "Your learning record: in progress, completed, certificates and tests." };
export const dynamic = "force-dynamic";

const day = (d: Date | string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });

// Learn › My Learning (2026-10-08, mockup E): tiles hero, In Progress + Completed | Certificates + Tests.
export default async function MyLearningPage() {
  const viewer = await memberOrPublicTwin("/learn");
  const [paths, teaches, watched] = await Promise.all([
    learnCatalogue(viewer.userId),
    viewerTeaches(viewer),
    prisma.lessonProgress.findMany({ where: { user_id: viewer.userId }, select: { completed_at: true, lesson: { select: { section: { select: { course: { select: { learning_path_id: true } } } } } } } }),
  ]);
  const lastBy = new Map<string, Date>();
  for (const w of watched) {
    const k = w.lesson.section.course.learning_path_id;
    if (!lastBy.get(k) || lastBy.get(k)! < w.completed_at) lastBy.set(k, w.completed_at);
  }
  const certified = paths.filter((p) => p.certificate);
  const inProgress = paths.filter((p) => p.mine && !p.certificate && p.mine.done < p.mine.total).sort((a, b) => (lastBy.get(b.id)?.getTime() ?? 0) - (lastBy.get(a.id)?.getTime() ?? 0));
  const completed = paths.filter((p) => p.mine && p.mine.total > 0 && p.mine.done >= p.mine.total);
  const nextCert = [...inProgress].sort((a, b) => b.mine!.done / b.mine!.total - a.mine!.done / a.mine!.total)[0] ?? null;
  const focus = inProgress[0] ?? null;
  const lessonsDone = watched.length;
  const minutes = paths.reduce((n, p) => n + p.courses.reduce((m, c) => m + c.lessons.filter((l) => l.done).reduce((x, l) => x + (l.minutes ?? 0), 0), 0), 0);
  const hours = minutes ? `${Math.round((minutes / 60) * 10) / 10} h` : "0 h";
  const tests = paths.filter((p) => p.test.ready && (p.mine || p.test.used > 0 || p.certificate));
  const toNext = nextCert ? nextCert.mine!.total - nextCert.mine!.done : null;
  const tiles = [
    ...certified.map((p) => ({ title: p.title, state: "earned" as const })),
    ...(nextCert ? [{ title: nextCert.title, state: "next" as const }] : []),
    ...inProgress.filter((p) => p !== nextCert).map((p) => ({ title: p.title, state: "todo" as const })),
  ];
  const row = "flex flex-wrap items-center justify-between gap-2 border-b border-line py-2.5";
  const BTN = "inline-flex min-h-9 items-center border border-ink px-3.5 text-[13px] font-semibold hover:bg-black/[0.04]";
  const BTN_K = "inline-flex min-h-9 items-center bg-ink px-3.5 text-[13px] font-semibold text-surface hover:bg-ink-hover";

  return (
    <>
      <LearnTabs active="my-learning" teaches={teaches} onLearnHome />
      <div className="mx-auto w-full max-w-[1010px] px-4 py-6 sm:px-6" data-my-learning>
        <AccountHero
          testId="my-learning-hero"
          picture={<CertificateTiles tiles={tiles} />}
          eyebrow="My Learning"
          title="Your Learning Record"
          kpis={[
            { value: certified.length, label: "CERTIFICATES" },
            { value: inProgress.length, label: "IN PROGRESS" },
            { value: lessonsDone, label: "LESSONS DONE" },
            { value: hours, label: "WATCHED" },
          ]}
          paragraph={<>Your certificates show on your profile under Credentials and lift your Search Score.{toNext ? <> You&apos;re <b className="text-ink">{toNext} {toNext === 1 ? "lesson" : "lessons"}</b> from your next one.</> : null}</>}
          actions={
            <>
              {focus?.mine?.next ? <Link href={`/learn/${focus.slug}/${focus.mine.next.id}`} className={HERO_BTN}>Continue Lesson {focus.mine.next.index}</Link> : <Link href="/learn/paths" className={HERO_BTN}>Browse Learning Paths</Link>}
              <Link href="/profile#certifications" className={HERO_BTN_W}>View My Credentials</Link>
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
                    <span className="block text-[12px] text-ink-3">{p.mine!.done} of {p.mine!.total} lessons{lastBy.get(p.id) ? ` · last watched ${day(lastBy.get(p.id)!)}` : ""}</span>
                    <span aria-hidden className="mt-1 block h-[5px] w-full max-w-[260px] bg-[#C9CDDC]"><span className="block h-full bg-ink" style={{ width: `${Math.round((p.mine!.done / p.mine!.total) * 100)}%` }} /></span>
                  </span>
                  <Link href={p.mine!.next ? `/learn/${p.slug}/${p.mine!.next.id}` : `/learn/${p.slug}`} className={BTN_K}>Continue</Link>
                </li>
              ))}
            </ul>
            <h2 className="mt-6 text-[20px] font-bold">Completed <small className="ml-1 text-[12px] font-medium text-ink-3">{completed.length}</small></h2>
            {completed.length === 0 && <p className="mt-2 text-[13.5px] text-ink-2">Paths you finish show here.</p>}
            <ul>
              {completed.map((p) => (
                <li key={p.id} className={row}>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[14px]">{p.title}</b>
                    <span className="block text-[12px] text-ink-3">Completed {lastBy.get(p.id) ? day(lastBy.get(p.id)!) : ""}{p.test.best ? ` · test ${p.test.best}%` : ""}</span>
                  </span>
                  <Link href={`/learn/${p.slug}`} className={BTN}>Review</Link>
                </li>
              ))}
            </ul>
          </section>
          <section className="min-w-0 border-t border-line py-6 md:border-l md:border-t-0 md:pl-7">
            <h2 id="certificates" className="scroll-mt-24 text-[20px] font-bold">Certificates <small className="ml-1 text-[12px] font-medium text-ink-3">{certified.length}</small></h2>
            <div className="mt-2">
              <CredentialsBody
                credentials={[
                  ...certified.map((p) => ({ id: p.certificate!.id, name: p.title, issuer: "Panameer", issuedOn: p.certificate!.earnedOn.slice(0, 10), issuedFrom: "LEARN", kind: "CERTIFICATION", publicUrl: p.certificate!.verifyUrl, credentialId: p.certificate!.id })),
                ]}
                empty="No certificates yet."
              />
              <p className="mt-2 text-[12px] text-ink-3">Same chips as Credentials on your profile. Tap one to see the date, score and verification link.</p>
            </div>
            <h2 className="mt-6 text-[20px] font-bold">Tests <small className="ml-1 text-[12px] font-medium text-ink-3">attempts left</small></h2>
            {tests.length === 0 && <p className="mt-2 text-[13.5px] text-ink-2">Tests for your paths show here once they open.</p>}
            <ul>
              {tests.map((p) => (
                <li key={p.id} className={row}>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[14px]">{p.title}</b>
                    <span className="block text-[12px] text-ink-3">{p.test.passed ? `Passed ${p.test.best}%` : p.test.used ? `Best ${p.test.best}% · ${Math.max(0, p.test.maxAttempts - p.test.used)} attempts left` : `Not taken · ${p.test.maxAttempts} attempts`}</span>
                  </span>
                  {p.test.passed ? <span className="text-[13px] font-bold">✓</span> : p.test.used < p.test.maxAttempts ? <Link href={`/learn/${p.slug}/test`} className={BTN}>Take the Test</Link> : <span className="text-[12px] text-ink-3">No attempts left</span>}
                </li>
              ))}
            </ul>
          </section>
        </div>
        {teaches && <p id="teaching" className="mt-2 text-[13px] text-ink-2">You teach on Panameer — see <Link href="/learn" className="font-bold underline">Top Teachers</Link> on Learn Home.</p>}
      </div>
    </>
  );
}
