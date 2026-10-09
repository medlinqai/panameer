import { ScrollRow } from "@/components/casing/ScrollRow";
import Link from "next/link";
import type { CatPath } from "@/lib/learn-catalog";
import { LearnPathCard } from "@/components/learn/LearnPathCard";

// Learn Home: Most Popular Learning Paths, ranked by learners; area chips from the Areas table; 3-up cards.
type Card = {
  id: string; slug: string; title: string; area: string | null; group: string | null; teacher: string | null;
  lessons: number; length: string | null; learners: number; completed: number; finishRate: number | null;
  mine: { done: number; total: number } | null; testReady: boolean; certified: boolean; rank: number;
};

export function PopularPaths({ cards, areas, area, catalog }: { cards: Card[]; areas: { code: string; label: string }[]; area: string; catalog: Map<string, CatPath> }) {
  const label = new Map(areas.map((a) => [a.code, a.label]));
  label.set("START", "Start Here");
  const chip = (on: boolean) => "shrink-0 whitespace-nowrap border px-3 py-1.5 text-[13px] font-semibold " + (on ? "border-ink bg-ink text-surface" : "border-line text-ink hover:border-ink");
  return (
    <section data-popular-paths className="border-t border-line py-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[22px] font-bold">Most Popular Learning Paths</h2>
        <Link href="/learn/paths" className="text-[13.5px] font-bold text-magenta-dark underline underline-offset-4">See All Learning Paths</Link>
      </div>
      <div className="-mx-1 mt-3"><ScrollRow as="nav" label="Areas" className="gap-1.5 px-1 pb-1">
        <Link href="/learn" className={chip(!area)}>All Areas</Link>
        {areas.map((a) => <Link key={a.code} href={`/learn?area=${a.code}#popular`} className={chip(area === a.code)}>{a.label}</Link>)}
      </ScrollRow></div>
      {cards.length === 0 ? (
        <p className="mt-6 text-center text-[14px] text-ink-2">No learning paths in this area yet.</p>
      ) : (
        <ul id="popular" className="mt-3 grid scroll-mt-24 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.slice(0, 9).map((c) => {
            const p = catalog.get(c.id);
            return p ? <LearnPathCard key={c.id} p={p} areaLabel={c.area ? label.get(c.area) ?? c.area : null} tag={`#${c.rank}`} /> : null;
          })}
        </ul>
      )}
    </section>
  );
}
