import Link from "next/link";
import type { CatPath } from "@/lib/learn-catalog";
import { timeLabel } from "@/lib/learn-time";
import { Avatar } from "@/components/Avatar";

// The one learning-path card (Learning Paths rows + Learn Home): 16:9 cover, title, outcome, teacher, meta, one button + "Test out →".
// Zero counts are hidden.
const TONE: Record<string, [string, string]> = {
  PRC: ["#272334", "#4b3e6e"], FIN: ["#1d2a3a", "#36506e"], HCM: ["#272334", "#6b2f6a"], SCM: ["#1f2b28", "#3e5f55"],
  O2C: ["#2b2219", "#6a4a2f"], PPM: ["#23261a", "#4f5a2f"], ANALYTICS: ["#1a2a30", "#2f5a6b"], TECH: ["#14111d", "#3a3350"],
};
const LEVEL: Record<string, string> = { BEGINNER: "BEGINNER", INTERMEDIATE: "INTERMEDIATE", ADVANCED: "ADVANCED" };
const SMALL = new Set(["and", "of", "the", "to", "for", "in", "a", "an", "on", "&", "-", "–"]);

/** A short code from the title for the cover (P2P-style): known terms first, else initials. */
export function shortCode(title: string) {
  const t = title.toLowerCase();
  if (/procure.?to.?pay|p2p/.test(t)) return "P2P";
  if (/contract/.test(t)) return "CLM";
  if (/advanced/.test(t)) return "ADV";
  if (/payable/.test(t)) return "AP";
  if (/receivable/.test(t)) return "AR";
  if (/oracle cloud/.test(t)) return "OCF";
  const w = title.split(/\s+/).filter((x) => x && !SMALL.has(x.toLowerCase()));
  return (w.length > 1 ? w.map((x) => x[0]).join("") : (w[0] ?? "").slice(0, 3)).toUpperCase().slice(0, 3);
}

export function LearnPathCard({ p, areaLabel, tag, outcome, level, notify }: { p: CatPath; areaLabel: string | null; tag?: string; outcome?: string | null; level?: string | null; notify?: React.ReactNode }) {
  const [from, to] = TONE[p.area ?? ""] ?? ["#272334", "#4a4658"];
  const line = outcome || p.outcome || p.summary?.split(/(?<=[.!?])\s/)[0] || null;
  const now = Math.max(0, p.learners - p.completed);
  const go = p.mine?.next ? `/learn/${p.slug}/${p.mine.next.id}` : `/learn/${p.slug}`;
  const lv = level ?? p.level;
  const label = tag ?? (lv ? LEVEL[lv] : null);
  const pct = p.mine && p.mine.total ? Math.round((p.mine.done / p.mine.total) * 100) : 0;
  return (
    <li data-path-card={p.slug} className="group flex flex-col border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-12px_rgba(39,35,52,0.35)]">
      <Link href={`/learn/${p.slug}`} className="relative flex aspect-video items-end overflow-hidden px-3.5 py-3 text-white" style={p.cover ? undefined : { background: `linear-gradient(135deg, ${from}, ${to})` }}>
        {p.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span aria-hidden className="absolute -right-2 -top-4 text-[88px] font-extrabold leading-none tracking-[-4px] opacity-[0.13]">{shortCode(p.title)}</span>
        )}
        {label && <span className="absolute left-3 top-2.5 bg-white px-2 py-0.5 text-[10.5px] font-extrabold tracking-[0.08em] text-ink">{label}</span>}
        <span className="relative text-[11px] font-bold tracking-[0.1em] opacity-85 [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]">{[areaLabel, p.group].filter(Boolean).join(" · ").toUpperCase()}</span>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link href={`/learn/${p.slug}`} className="text-[15.5px] font-bold leading-snug hover:underline">{p.title}</Link>
        {line && <p className="mt-1 line-clamp-2 text-[13px] text-ink-2">{line}</p>}
        {p.teacher && (
          <p className="mt-2.5 flex items-center gap-2 text-[12.5px] text-ink-2">
            <Avatar firstName={p.teacher.name.split(" ")[0] ?? ""} lastName={p.teacher.name.split(" ").slice(1).join(" ")} photoUrl={p.teacher.photoUrl} size={22} />
            <span className="truncate">{p.teacher.name}{p.teacher.years ? ` · ${p.teacher.years} yrs` : ""}</span>
          </p>
        )}
        <p className="mt-2 text-[12px] text-ink-3">
          {[p.courses.length ? `${p.courses.length} course${p.courses.length === 1 ? "" : "s"}` : null, p.lessons ? `${p.lessons} lessons` : null, timeLabel(p.minutes), now > 0 ? `${now} learning now` : null].filter(Boolean).join(" · ")}
        </p>
        {p.mine && !p.certificate && (
          <span aria-label={`${p.mine.done} of ${p.mine.total} lessons`} className="mt-2 block h-[5px] w-full bg-[#C9CDDC]"><span className="block h-full bg-ink" style={{ width: `${pct}%` }} /></span>
        )}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
          {!p.playable ? (
            notify ?? <Link href={`/learn/${p.slug}#notify`} className="inline-flex min-h-10 items-center border border-ink px-4 text-[13.5px] font-semibold">Notify Me</Link>
          ) : (
            <Link href={p.certificate ? `/learn/${p.slug}` : go} className="inline-flex min-h-10 items-center bg-ink px-4 text-[13.5px] font-semibold text-surface hover:bg-ink-hover">{p.certificate ? "Review" : p.mine ? "Continue" : "Start"}</Link>
          )}
          {p.certificate ? (
            <span className="text-[12.5px] font-bold">Certified ✓</span>
          ) : p.test.ready ? (
            <Link href={`/learn/${p.slug}/test`} className="text-[12.5px] font-bold text-magenta-dark hover:underline">Test out →</Link>
          ) : p.playable ? (
            <span className="text-[12px] text-ink-3">Test opens soon</span>
          ) : null}
        </div>
      </div>
    </li>
  );
}
