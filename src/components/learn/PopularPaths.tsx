import Link from "next/link";

// Learn Home: Most Popular Learning Paths, ranked by learners; area chips from the Areas table; 3-up cards.
type Card = {
  id: string; slug: string; title: string; area: string | null; group: string | null; teacher: string | null;
  lessons: number; length: string | null; learners: number; completed: number; finishRate: number | null;
  mine: { done: number; total: number } | null; testReady: boolean; certified: boolean; rank: number;
};
const BTN_K = "inline-flex min-h-10 items-center bg-ink px-4 text-[13.5px] font-semibold text-surface hover:bg-ink-hover";
const BTN = "inline-flex min-h-10 items-center border border-ink bg-surface px-4 text-[13.5px] font-semibold text-ink hover:bg-surface-hover";
const OFF = "inline-flex min-h-10 cursor-not-allowed items-center border border-line px-4 text-[13.5px] font-semibold text-ink-3";

export function PopularPaths({ cards, areas, area }: { cards: Card[]; areas: { code: string; label: string }[]; area: string }) {
  const label = new Map(areas.map((a) => [a.code, a.label]));
  label.set("START", "Start Here");
  const chip = (on: boolean) => "shrink-0 whitespace-nowrap border px-3 py-1.5 text-[13px] font-semibold " + (on ? "border-ink bg-ink text-surface" : "border-line text-ink hover:border-ink");
  return (
    <section data-popular-paths className="border-t border-line py-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[22px] font-bold">Most Popular Learning Paths</h2>
        <Link href="/learn/paths" className="text-[13.5px] font-bold text-magenta-dark underline underline-offset-4">See All Learning Paths</Link>
      </div>
      <nav aria-label="Areas" className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
        <Link href="/learn" className={chip(!area)}>All Areas</Link>
        {areas.map((a) => <Link key={a.code} href={`/learn?area=${a.code}#popular`} className={chip(area === a.code)}>{a.label}</Link>)}
      </nav>
      {cards.length === 0 ? (
        <p className="mt-6 text-center text-[14px] text-ink-2">No learning paths in this area yet.</p>
      ) : (
        <ul id="popular" className="mt-3 grid scroll-mt-24 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.slice(0, 9).map((c) => {
            const pct = c.mine && c.mine.total ? Math.round((c.mine.done / c.mine.total) * 100) : 0;
            return (
              <li key={c.id} data-path-card={c.slug} className="flex flex-col border border-line bg-white">
                <div className="flex h-[92px] flex-col justify-between bg-ink p-3 text-surface">
                  <span className="text-[22px] font-extrabold leading-none">#{c.rank}</span>
                  <span className="truncate text-[10.5px] font-bold tracking-[0.1em] text-[#C9CDDC]">
                    {[c.area ? label.get(c.area) ?? c.area : null, c.group].filter(Boolean).join(" · ").toUpperCase() || "LEARNING PATH"}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <Link href={`/learn/${c.slug}`} className="text-[15px] font-bold leading-snug hover:underline">{c.title}</Link>
                  <p className="mt-1 text-[12.5px] text-ink-2">{[c.teacher ? `by ${c.teacher}` : null, `${c.lessons} lesson${c.lessons === 1 ? "" : "s"}`, c.length].filter(Boolean).join(" · ")}</p>
                  {c.mine && (
                    <div className="mt-2.5">
                      <p className="text-[12px] font-semibold text-ink-2">You: {c.mine.done} of {c.mine.total} lessons</p>
                      <span aria-hidden className="mt-1 block h-[6px] w-full bg-[#C9CDDC]"><span className="block h-full bg-ink" style={{ width: `${pct}%` }} /></span>
                    </div>
                  )}
                  <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3">
                    {[["LEARNERS", c.learners], ["COMPLETED", c.completed], ["FINISH RATE", c.finishRate == null ? "—" : `${c.finishRate}%`]].map(([k, v]) => (
                      <div key={k as string}>
                        <dd className="text-[18px] font-medium tabular-nums">{v}</dd>
                        <dt className="text-[10px] font-semibold tracking-[0.08em] text-ink-3">{k}</dt>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-auto flex flex-wrap gap-2 pt-4">
                    <Link href={`/learn/${c.slug}`} className={BTN_K}>{c.mine ? "Continue" : "Start"}</Link>
                    {c.certified ? (
                      <span className={OFF}>Certified ✓</span>
                    ) : c.testReady ? (
                      <Link href={`/learn/${c.slug}/test`} className={BTN}>Take the Test</Link>
                    ) : (
                      <span className={OFF} aria-disabled>Test Opens Soon</span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
