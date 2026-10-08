import Link from "next/link";
import { getSessionViewer } from "@/lib/session";
import { viewerTeaches } from "@/lib/learn-home";
import { learnCatalogue } from "@/lib/learn-catalogue";
import { getSkillAreas } from "@/lib/skill-area-store";
import { LearnTabs } from "@/components/learn/app/LearnTabs";
import { CataloguePathCard } from "@/components/learn/CataloguePathCard";

export const metadata = {
  title: "Learning Paths — Panameer Learn",
  description: "Every Panameer learning path, searchable by path, course, lesson and teacher, grouped by area.",
};
export const dynamic = "force-dynamic";

// Learn › Learning Paths (2026-10-08, mockup A): one search, area chips + Open Now + Has a Test, cards grouped by area.
export default async function LearningPathsPage({ searchParams }: { searchParams: Promise<{ q?: string; area?: string; open?: string; test?: string; tab?: string }> }) {
  const viewer = await getSessionViewer();
  const sp = await searchParams;
  const [all, areas, teaches] = await Promise.all([learnCatalogue(viewer?.userId ?? null), getSkillAreas(), viewerTeaches(viewer)]);
  const label = new Map(areas.map((a) => [a.code, a.label]));
  const q = sp.q?.trim().toLowerCase() ?? "";
  const mineOnly = sp.tab === "mine";
  const shown = all.filter((p) => {
    if (sp.area && (p.area ?? "OTHER") !== sp.area) return false;
    if (sp.open === "1" && !p.playable) return false;
    if (sp.test === "1" && !p.test.ready) return false;
    if (mineOnly && !p.mine) return false;
    if (q && ![p.title, p.summary ?? "", p.teacher?.name ?? "", ...p.courses.flatMap((c) => [c.title, c.teacher ?? "", ...c.lessons.map((l) => l.title)])].some((x) => x.toLowerCase().includes(q))) return false;
    return true;
  });
  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q: sp.q, area: sp.area, open: sp.open, test: sp.test, tab: sp.tab, ...patch })) if (v) p.set(k, v);
    const s = p.toString();
    return `/learn/paths${s ? `?${s}` : ""}`;
  };
  const chip = (on: boolean) => "shrink-0 whitespace-nowrap border px-3 py-1.5 text-[13px] font-semibold " + (on ? "border-ink bg-ink text-surface" : "border-line text-ink hover:border-ink");
  const countByArea = new Map<string, number>();
  for (const p of all) countByArea.set(p.area ?? "OTHER", (countByArea.get(p.area ?? "OTHER") ?? 0) + 1);
  const groups = [...areas.filter((a) => !a.hidden).map((a) => a.code), "OTHER"]
    .map((code) => ({ code, label: code === "OTHER" ? "Other" : label.get(code) ?? code, paths: shown.filter((p) => (p.area ?? "OTHER") === code) }))
    .filter((g) => g.paths.length);
  const teachers = new Set(all.map((p) => p.teacher?.personId).filter(Boolean)).size;
  const kpis = [
    [all.length, "LEARNING PATHS"],
    [all.reduce((n, p) => n + p.courses.length, 0), "COURSES"],
    [all.reduce((n, p) => n + p.lessons, 0), "LESSONS"],
    [teachers, "TEACHERS"],
  ] as const;

  return (
    <>
      {viewer && <LearnTabs active="paths" teaches={teaches} />}
      <div className="mx-auto w-full max-w-[1010px] px-4 py-6 sm:px-6" data-learning-paths>
        <header className="border-b border-line pb-6">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-magenta">THE CATALOGUE</p>
          <h1 className="mt-1.5 text-[30px] font-bold leading-tight">{mineOnly ? "My Learning Paths" : "Learning Paths"}</h1>
          <div className="mt-4 flex flex-wrap gap-x-11 gap-y-3">
            {kpis.map(([v, k]) => (
              <div key={k}><b className="block text-[26px] font-medium tabular-nums">{v}</b><span className="text-[11px] font-semibold tracking-[0.08em] text-ink-2">{k}</span></div>
            ))}
          </div>
        </header>
        <form method="get" action="/learn/paths" className="mt-5 flex flex-wrap gap-2">
          {sp.area && <input type="hidden" name="area" value={sp.area} />}
          {sp.open && <input type="hidden" name="open" value={sp.open} />}
          {sp.test && <input type="hidden" name="test" value={sp.test} />}
          <input name="q" defaultValue={sp.q ?? ""} placeholder="Search paths, courses, lessons and teachers…" aria-label="Search learning paths" className="h-10 min-w-[220px] flex-1 border border-line bg-surface px-3 text-[14px] focus:border-ink focus:outline-none" />
          <button type="submit" className="inline-flex min-h-[40px] items-center border border-ink bg-ink px-3.5 text-[13px] font-bold text-surface">Search</button>
        </form>
        <nav aria-label="Filters" className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <Link href={href({ area: undefined })} className={chip(!sp.area)}>All Areas</Link>
          {areas.filter((a) => !a.hidden && countByArea.get(a.code)).map((a) => (
            <Link key={a.code} href={href({ area: a.code })} className={chip(sp.area === a.code)}>{a.label} <span className="opacity-70">{countByArea.get(a.code)}</span></Link>
          ))}
          <Link href={href({ open: sp.open ? undefined : "1" })} className={chip(sp.open === "1")}>Open Now</Link>
          <Link href={href({ test: sp.test ? undefined : "1" })} className={chip(sp.test === "1")}>Has a Test</Link>
        </nav>
        {groups.length === 0 && <p className="mt-8 text-center text-[14px] text-ink-2">No learning paths match.</p>}
        {groups.map((g) => (
          <section key={g.code} data-area-group={g.code} className="mt-7">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[20px] font-bold">{g.label} <small className="ml-1 text-[12px] font-medium text-ink-3">{g.paths.length} {g.paths.length === 1 ? "path" : "paths"}</small></h2>
              {!sp.area && g.paths.length > 3 && <Link href={href({ area: g.code })} className="text-[13px] font-bold text-magenta-dark underline underline-offset-4">See all {g.paths.length}</Link>}
            </div>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(sp.area ? g.paths : g.paths.slice(0, 3)).map((p) => <CataloguePathCard key={p.id} p={p} areaLabel={p.area ? label.get(p.area) ?? null : null} />)}
            </ul>
          </section>
        ))}
        {!viewer && (
          <p className="mt-8 text-[13.5px] text-ink-2"><Link href="/login?callbackUrl=%2Flearn%2Fpaths" className="font-bold text-magenta-dark underline">Sign in</Link> to track your progress and take the tests.</p>
        )}
      </div>
    </>
  );
}
