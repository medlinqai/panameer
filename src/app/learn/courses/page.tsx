import Link from "next/link";
import { getSessionViewer } from "@/lib/session";
import { viewerTeaches } from "@/lib/learn-home";
import { learnCatalogue, timeLabel } from "@/lib/learn-catalogue";
import { getSkillAreas } from "@/lib/skill-area-store";
import { LearnTabs } from "@/components/learn/app/LearnTabs";

export const metadata = {
  title: "Courses — Panameer Learn",
  description: "Every course in every Panameer learning path, searchable, with length and your progress.",
};
export const dynamic = "force-dynamic";

// Learn › Courses (2026-10-08, mockup D): one dense table for people who want one topic, not a whole path.
export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ q?: string; area?: string; video?: string; short?: string }> }) {
  const viewer = await getSessionViewer();
  const sp = await searchParams;
  const [paths, areas, teaches] = await Promise.all([learnCatalogue(viewer?.userId ?? null), getSkillAreas(), viewerTeaches(viewer)]);
  const q = sp.q?.trim().toLowerCase() ?? "";
  const rows = paths
    .flatMap((p) => p.courses.map((c) => ({ p, c })))
    .filter(({ p, c }) => {
      if (sp.area && p.area !== sp.area) return false;
      if (sp.video === "1" && !c.lessons.some((l) => l.playable)) return false;
      if (sp.short === "1" && !(c.minutes > 0 && c.minutes < 30)) return false;
      if (q && ![c.title, c.summary ?? "", c.teacher ?? "", p.title, ...c.lessons.map((l) => l.title)].some((x) => x.toLowerCase().includes(q))) return false;
      return true;
    });
  const href = (patch: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ q: sp.q, area: sp.area, video: sp.video, short: sp.short, ...patch })) if (v) u.set(k, v);
    const s = u.toString();
    return `/learn/courses${s ? `?${s}` : ""}`;
  };
  const chip = (on: boolean) => "shrink-0 whitespace-nowrap border px-3 py-1.5 text-[13px] font-semibold " + (on ? "border-ink bg-ink text-surface" : "border-line text-ink hover:border-ink");
  const usedAreas = new Set(paths.map((p) => p.area));
  const BTN_K = "inline-flex min-h-9 items-center bg-ink px-3.5 text-[13px] font-semibold text-surface hover:bg-ink-hover";
  const BTN = "inline-flex min-h-9 items-center border border-ink px-3.5 text-[13px] font-semibold hover:bg-black/[0.04]";

  return (
    <>
      {viewer && <LearnTabs active="courses" teaches={teaches} />}
      <div className="mx-auto w-full max-w-[1010px] px-4 py-6 sm:px-6" data-courses>
        <p className="text-[11px] font-semibold tracking-[0.12em] text-magenta">EVERY COURSE</p>
        <h1 className="mt-1.5 text-[30px] font-bold leading-tight">Courses</h1>
        <form method="get" action="/learn/courses" className="mt-4 flex flex-wrap gap-2">
          {sp.area && <input type="hidden" name="area" value={sp.area} />}
          {sp.video && <input type="hidden" name="video" value={sp.video} />}
          {sp.short && <input type="hidden" name="short" value={sp.short} />}
          <input name="q" defaultValue={sp.q ?? ""} placeholder="Search courses, lessons, teachers and paths…" aria-label="Search courses" className="h-10 min-w-[220px] flex-1 border border-line bg-surface px-3 text-[14px] focus:border-ink focus:outline-none" />
          <button type="submit" className="inline-flex min-h-[40px] items-center border border-ink bg-ink px-3.5 text-[13px] font-bold text-surface">Search</button>
        </form>
        <nav aria-label="Filters" className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <Link href={href({ area: undefined })} className={chip(!sp.area)}>All Areas</Link>
          {areas.filter((a) => !a.hidden && usedAreas.has(a.code)).map((a) => <Link key={a.code} href={href({ area: a.code })} className={chip(sp.area === a.code)}>{a.label}</Link>)}
          <Link href={href({ video: sp.video ? undefined : "1" })} className={chip(sp.video === "1")}>With Video</Link>
          <Link href={href({ short: sp.short ? undefined : "1" })} className={chip(sp.short === "1")}>Under 30 min</Link>
        </nav>
        <p className="mt-3 text-[13px] text-ink-2"><b className="text-ink">{rows.length}</b> {rows.length === 1 ? "course" : "courses"}</p>
        <div className="mt-2 overflow-x-auto border border-line">
          <table className="w-full min-w-[760px] text-[13.5px]">
            <thead>
              <tr className="border-b border-ink text-left text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">
                <th className="px-3 py-2">Course</th>
                <th className="px-3 py-2">Part Of</th>
                <th className="px-3 py-2 text-right">Lessons</th>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">You</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, c }) => {
                const total = c.lessons.length;
                const all = total > 0 && c.done === total;
                const firstOpen = c.lessons.find((l) => !l.done && l.playable) ?? c.lessons.find((l) => l.playable) ?? null;
                const go = viewer && firstOpen ? `/learn/${p.slug}/${firstOpen.id}` : `/learn/${p.slug}#course-${c.slug}`;
                return (
                  <tr key={c.id} data-course={c.slug} className="border-b border-line align-middle">
                    <td className="px-3 py-2.5"><Link href={`/learn/${p.slug}#course-${c.slug}`} className="font-semibold hover:underline">{c.title}</Link>{c.teacher && <span className="block text-[12px] text-ink-3">{c.teacher}</span>}</td>
                    <td className="px-3 py-2.5 text-ink-2"><Link href={`/learn/${p.slug}`} className="hover:underline">{p.title}</Link></td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{total}</td>
                    <td className="px-3 py-2.5 text-ink-2">{timeLabel(c.minutes) ?? "—"}</td>
                    <td className="w-[120px] px-3 py-2.5">
                      {all ? <span className="text-[12.5px] font-bold">✓ Done</span> : c.done > 0 ? <span aria-label={`${c.done} of ${total}`} className="block h-[6px] w-full bg-[#C9CDDC]"><span className="block h-full bg-ink" style={{ width: `${Math.round((c.done / total) * 100)}%` }} /></span> : <span className="text-ink-3">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {!c.lessons.some((l) => l.playable) ? <span className="text-[12px] font-semibold text-ink-3">Coming Soon</span> : <Link href={all ? `/learn/${p.slug}#course-${c.slug}` : go} className={c.done > 0 && !all ? BTN_K : BTN}>{all ? "Review" : c.done > 0 ? "Continue" : "Start"}</Link>}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-ink-2">No courses match.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
