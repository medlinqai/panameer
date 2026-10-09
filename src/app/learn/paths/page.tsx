import { ScrollRow } from "@/components/casing/ScrollRow";
import Link from "next/link";
import { getSessionViewer } from "@/lib/session";
import { viewerTeaches } from "@/lib/learn-home";
import { learnCatalog, START_AREA, START_AREA_LABEL } from "@/lib/learn-catalog";
import { getSkillAreas } from "@/lib/skill-area-store";
import { LearnTabs } from "@/components/learn/app/LearnTabs";
import { LearnPathCard } from "@/components/learn/LearnPathCard";
import { AccountHero, HERO_BTN, HERO_BTN_W } from "@/components/casing/AccountHero";
import { BubbleField } from "@/components/casing/BubbleField";
import { StartHere } from "@/components/learn/StartHere";
import { BEGINNER_PATH as START_SLUG } from "@/lib/learn-homepage";
import { NotifyMe } from "@/components/learn/NotifyMe";

export const metadata = {
  title: "Learning Paths — Panameer Learn",
  description: "Every Panameer learning path, searchable by path, course, lesson and teacher, grouped by area.",
};
export const dynamic = "force-dynamic";

// Learn › Learning Paths (2026-10-08, mockup A): one search, area chips + Has a Test + Under 2 h, open paths by area, Coming Soon in one quiet row.
export default async function LearningPathsPage({ searchParams }: { searchParams: Promise<{ q?: string; area?: string; short?: string; test?: string; tab?: string }> }) {
  const viewer = await getSessionViewer();
  const sp = await searchParams;
  const [all, areas, teaches] = await Promise.all([learnCatalog(viewer?.userId ?? null), getSkillAreas(), viewerTeaches(viewer)]);
  const label = new Map(areas.map((a) => [a.code, a.label]));
  label.set(START_AREA, START_AREA_LABEL);
  const q = sp.q?.trim().toLowerCase() ?? "";
  const mineOnly = sp.tab === "mine";
  const shown = all.filter((p) => {
    if (sp.area && (p.area ?? "OTHER") !== sp.area) return false;
    if (sp.short === "1" && !(p.minutes > 0 && p.minutes < 120)) return false;
    if (sp.test === "1" && !p.test.ready) return false;
    if (mineOnly && !p.mine) return false;
    // The Start Here feature replaces its own card in the area rows (unless you searched or picked an area).
    if (p.slug === START_SLUG && !q && !sp.area) return false;
    if (q && ![p.title, p.summary ?? "", p.teacher?.name ?? "", ...p.courses.flatMap((c) => [c.title, c.teacher ?? "", ...c.lessons.map((l) => l.title)])].some((x) => x.toLowerCase().includes(q))) return false;
    return true;
  });
  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q: sp.q, area: sp.area, short: sp.short, test: sp.test, tab: sp.tab, ...patch })) if (v) p.set(k, v);
    const s = p.toString();
    return `/learn/paths${s ? `?${s}` : ""}`;
  };
  const chip = (on: boolean) => "shrink-0 whitespace-nowrap border px-3 py-1.5 text-[13px] font-semibold " + (on ? "border-ink bg-ink text-surface" : "border-line text-ink hover:border-ink");
  const countByArea = new Map<string, number>();
  for (const p of all) countByArea.set(p.area ?? "OTHER", (countByArea.get(p.area ?? "OTHER") ?? 0) + 1);
  const groups = [START_AREA, ...areas.filter((a) => !a.hidden).map((a) => a.code), "OTHER"]
    .map((code) => ({ code, label: code === "OTHER" ? "Other" : label.get(code) ?? code, paths: shown.filter((p) => p.playable && (p.area ?? "OTHER") === code) }))
    .filter((g) => g.paths.length);
  const soon = shown.filter((p) => !p.playable);
  const start = all.find((p) => p.slug === START_SLUG) ?? null;
  const kpis = [
    [all.length, "LEARNING PATHS"],
    [all.reduce((n, p) => n + p.courses.length, 0), "COURSES"],
    [all.reduce((n, p) => n + p.lessons, 0), "LESSONS"],
    ["Free", "EVERY ONE"],
  ] as const;

  return (
    <>
      {viewer && <LearnTabs active="paths" teaches={teaches} />}
      <div className="mx-auto w-full max-w-[1010px] px-4 py-6 sm:px-6" data-learning-paths>
        <AccountHero
          wide
          testId="paths-hero"
          picture={
            <BubbleField
              bubbles={all.filter((p) => p.slug !== START_SLUG).map((p) => ({ key: p.id, href: `/learn/${p.slug}`, label: p.title, hover: `${p.title} · ${p.lessons} lessons${p.playable ? "" : " · coming soon"}`, size: p.lessons, fill: p.playable ? 1 : null }))}
              center={start ? { key: start.id, href: `/learn/${start.slug}`, label: start.title, hover: `${start.title} · ${start.lessons} lessons · start here`, size: start.lessons, fill: 1, badge: "START" } : undefined}
              me="YOU"
              caption="Bubble size = lessons · click one to open the path"
              legend={[
                { label: "start here", swatch: "ring" },
                { label: "open now", swatch: "ink" },
                { label: "coming soon", swatch: "quiet" },
              ]}
            />
          }
          eyebrow="The Catalog"
          title="Learn Oracle Cloud From the People Who Implement It"
          kpis={kpis.map(([v, k]) => ({ value: v, label: k }))}
          paragraph={<>Taught by working consultants. Finish a path, pass the test, and the certificate goes on your profile.{start ? <> New to Oracle Cloud? Start with <b className="text-ink">{start.title}</b>.</> : null}</>}
          actions={
            <>
              {start && <Link href={start.mine?.next ? `/learn/${start.slug}/${start.mine.next.id}` : `/learn/${start.slug}`} className={HERO_BTN}>Start {start.title}</Link>}
              <a href="#areas" className={HERO_BTN_W}>Browse by Area</a>
            </>
          }
        />
        {start && !q && !sp.area && <StartHere p={start} />}
        <form id="areas" method="get" action="/learn/paths" className="mt-7 flex scroll-mt-24 flex-wrap gap-2">
          {sp.area && <input type="hidden" name="area" value={sp.area} />}
          {sp.short && <input type="hidden" name="short" value={sp.short} />}
          {sp.test && <input type="hidden" name="test" value={sp.test} />}
          <input name="q" defaultValue={sp.q ?? ""} placeholder="What do you want to learn? Try “three-way match” or “approvals”" aria-label="Search learning paths" className="h-10 min-w-[220px] flex-1 border border-line bg-surface px-3 text-[14px] focus:border-ink focus:outline-none" />
          <button type="submit" className="inline-flex min-h-[40px] items-center border border-ink bg-ink px-3.5 text-[13px] font-bold text-surface">Search</button>
        </form>
        <div className="-mx-1 mt-3"><ScrollRow as="nav" label="Filters" className="gap-1.5 px-1 pb-1">
          <Link href={href({ area: undefined })} className={chip(!sp.area)}>All</Link>
          {countByArea.get(START_AREA) ? <Link href={href({ area: START_AREA })} className={chip(sp.area === START_AREA)}>{START_AREA_LABEL} <span className="opacity-70">{countByArea.get(START_AREA)}</span></Link> : null}
          {areas.filter((a) => !a.hidden && countByArea.get(a.code)).map((a) => (
            <Link key={a.code} href={href({ area: a.code })} className={chip(sp.area === a.code)}>{a.label} <span className="opacity-70">{countByArea.get(a.code)}</span></Link>
          ))}
          <Link href={href({ test: sp.test ? undefined : "1" })} className={chip(sp.test === "1")}>Has a Test</Link>
          <Link href={href({ short: sp.short ? undefined : "1" })} className={chip(sp.short === "1")}>Under 2 h</Link>
        </ScrollRow></div>
        {groups.length === 0 && soon.length === 0 && <p className="mt-8 text-center text-[14px] text-ink-2">No learning paths match.</p>}
        {groups.map((g) => (
          <section key={g.code} data-area-group={g.code} className="mt-7">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[20px] font-bold">{g.label} <small className="ml-1 text-[12px] font-medium text-ink-3">{g.paths.length} {g.paths.length === 1 ? "path" : "paths"}</small></h2>
              {!sp.area && g.paths.length > 3 && <Link href={href({ area: g.code })} className="text-[13px] font-bold text-magenta-dark underline underline-offset-4">See all {g.paths.length}</Link>}
            </div>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(sp.area ? g.paths : g.paths.slice(0, 3)).map((p) => <LearnPathCard key={p.id} p={p} areaLabel={p.area ? label.get(p.area) ?? null : null} notify={<NotifyMe pathId={p.id} initial={p.watching} signedIn={!!viewer} />} />)}
            </ul>
          </section>
        ))}
        {soon.length > 0 && (
          <section data-coming-soon className="mt-9 border-t border-line pt-5">
            <h2 className="text-[16px] font-bold text-ink-2">Coming Soon <small className="ml-1 text-[12px] font-medium text-ink-3">{soon.length}</small></h2>
            <p className="mt-0.5 text-[13px] text-ink-3">Being filmed now. Tap one to be told when it opens.</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {soon.map((p) => (
                <li key={p.id} className="flex items-center gap-2 border border-dashed border-line px-3 py-1.5 text-[13px] text-ink-2">
                  <Link href={`/learn/${p.slug}`} className="font-semibold text-ink hover:underline">{p.title}</Link>
                  {p.area && <span className="text-ink-3">· {label.get(p.area) ?? p.area}</span>}
                  <NotifyMe pathId={p.id} initial={p.watching} signedIn={!!viewer} className="ml-1 text-[12.5px] font-bold text-magenta-dark underline underline-offset-4" />
                </li>
              ))}
            </ul>
          </section>
        )}
        {!viewer && (
          <p className="mt-8 text-[13.5px] text-ink-2"><Link href="/login?callbackUrl=%2Flearn%2Fpaths" className="font-bold text-magenta-dark underline">Sign in</Link> to track your progress and take the tests.</p>
        )}
      </div>
    </>
  );
}
