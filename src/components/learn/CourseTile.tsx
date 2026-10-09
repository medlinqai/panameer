import Link from "next/link";

// T-E003: one course as a colored tile — own gradient (plum, indigo, magenta, blue; no green), faded code, COURSE n, title, lessons · done, thin bar.
const TONES: [string, string][] = [["#3A2F5C", "#7A2C83"], ["#2B3566", "#4B4FA8"], ["#3B2A4A", "#A3367F"], ["#253552", "#3F6A9A"]];
const SMALL = new Set(["and", "of", "the", "to", "for", "in", "a", "an", "on", "&", "-", "–", "how"]);

export const tidyCourse = (t: string) => t.replace(/^\s*\d+(\.\d+)*[.)]?\s*[-–]?\s*/, "");

/** BKG-style code: one word → first three letters; several → initials of the main words (max 3). */
export function courseCode(title: string): string {
  const t = tidyCourse(title);
  if (/log.?in|get started/i.test(t)) return "GO";
  const words = t.split(/\s+/).filter((w) => w && !SMALL.has(w.toLowerCase()));
  if (words.length <= 1) return (words[0] ?? t).replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "—";
  return words.slice(0, 3).map((w) => w[0]).join("").toUpperCase();
}

export function CourseTile({ n, title, lessons, done, soon = 0, href }: { n: number; title: string; lessons: number; done: number; soon?: number; href: string }) {
  const [a, b] = TONES[(n - 1) % TONES.length];
  const pct = lessons ? Math.min(100, Math.round((done / lessons) * 100)) : 0;
  return (
    <Link href={href} data-course-tile className="relative flex aspect-square min-w-0 flex-col justify-between overflow-hidden p-3 text-white hover:brightness-110" style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}>
      <span className="text-[11px] font-bold tracking-[0.14em] opacity-80">COURSE {n}</span>
      <span aria-hidden className="absolute -bottom-3.5 -right-1.5 text-[64px] font-extrabold leading-none tracking-[-2px] text-white/[0.12]">{courseCode(title)}</span>
      <span className="relative block">
        <b className="line-clamp-3 block text-[15px] font-bold leading-tight">{tidyCourse(title)}</b>
        <span className="mt-1 block text-[11px] opacity-80">{lessons} {lessons === 1 ? "lesson" : "lessons"}{done >= lessons && lessons > 0 ? " · done" : done > 0 ? ` · ${done} done` : ""}{soon ? ` · ${soon} coming soon` : ""}</span>
        <span aria-hidden className="mt-2 block h-[3px] bg-white/25"><span className="block h-full bg-white" style={{ width: `${pct}%` }} /></span>
      </span>
    </Link>
  );
}
