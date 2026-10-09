import Link from "next/link";
import type { Pick } from "@/lib/learn-next";
import { LearnPathCard } from "@/components/learn/LearnPathCard";
import { NotifyMe } from "@/components/learn/NotifyMe";

const BTN_K = "inline-flex min-h-10 items-center bg-ink px-4 text-[13.5px] font-semibold text-surface hover:bg-ink-hover";

// L-E047/L-E048 (Scott 2026-10-09: "it should ASK"): What's Next? — learn a path, get certified without the courses, or browse everything.
export function WhatsNext({ picks, testPicks, skillMatched, areaLabel, title = "What's Next?", id = "whats-next" }: { picks: Pick[]; testPicks: Pick[]; skillMatched: boolean; areaLabel: (code: string | null) => string | null; title?: string; id?: string }) {
  const none = picks.length === 0 && testPicks.length === 0;
  return (
    <section id={id} data-whats-next className="mt-8 scroll-mt-24 border-t border-line pt-6">
      <h2 className="text-[22px] font-bold">{title}</h2>
      {!none && (
        <>
          {picks.length > 0 && (
            <div data-option="learn" className="mt-4">
              <h3 className="text-[16px] font-bold">1 · {skillMatched ? "Learn a Path in Your Skills" : "Learn Your Next Path"}</h3>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {picks.map((x) => <LearnPathCard key={x.path.id} p={x.path} areaLabel={areaLabel(x.path.area)} reason={x.reason} />)}
              </ul>
            </div>
          )}
          {testPicks.length > 0 && (
            <div data-option="certify" className="mt-6">
              <h3 className="text-[16px] font-bold">2 · Already Know It? Get Certified</h3>
              <p className="mt-0.5 text-[13.5px] text-ink-2">Take the free test and earn the certificate without the courses.</p>
              <ul className="mt-2">
                {testPicks.map((x) => (
                  <li key={x.path.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2.5">
                    <span className="min-w-0 flex-1">
                      <Link href={`/learn/${x.path.slug}`} className="block truncate text-[14.5px] font-bold hover:underline">{x.path.title}</Link>
                      <span className="block text-[12px] text-ink-3">{x.reason}{x.path.test.ready ? ` · ${x.path.test.questions} questions · ${x.path.test.threshold}% to pass` : ""}</span>
                    </span>
                    {x.path.test.ready ? (
                      <Link href={`/learn/${x.path.slug}/test`} data-take-free-test className={BTN_K}>Take the Free Test</Link>
                    ) : (
                      <NotifyMe pathId={x.path.id} initial={x.path.watchingTest} signedIn test label="Test Opens Soon · Notify Me" className="inline-flex min-h-10 items-center border border-ink bg-surface px-4 text-[13px] font-semibold text-ink hover:bg-surface-hover" />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      <div data-option="browse" className={none ? "mt-4" : "mt-6"}>
        <h3 className="text-[16px] font-bold">{none ? "Browse All Learning Paths" : "3 · Or Browse All Learning Paths"}</h3>
        <Link href="/learn/paths?focus=1#areas" className={`${BTN_K} mt-2`}>Browse All Learning Paths →</Link>
      </div>
    </section>
  );
}
