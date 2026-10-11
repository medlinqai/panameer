import Link from "next/link";
import { shortCode } from "@/components/learn/LearnPathCard";
import { timeLabel } from "@/lib/learn-time";
import type { CatPath } from "@/lib/learn-catalog";

// LT-E002/E003: the Up Next card in the personal heroes — path cover, reason, instructor · courses · length.
export function UpNextCard({ path, label }: { path: CatPath; label: string }) {
  return (
    <Link href={`/learn/${path.slug}`} data-up-next className="flex items-center gap-3 border border-line bg-white p-2.5 transition hover:border-ink-3">
      <span className="relative grid h-14 w-[84px] shrink-0 place-items-center overflow-hidden text-[18px] font-extrabold text-white/80" style={path.cover ? undefined : { background: "linear-gradient(135deg, #272334, #6b2f6a)" }}>
        {path.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={path.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          shortCode(path.title)
        )}
      </span>
      <span className="min-w-0">
        <span className="block text-[10.5px] font-bold uppercase tracking-[0.14em] text-magenta-dark">{label}</span>
        <span className="block truncate text-[16px] font-bold text-ink">{path.title}</span>
        <span className="block truncate text-[12px] text-ink-2">
          {[path.teacher?.name, path.courses.length ? `${path.courses.length} course${path.courses.length === 1 ? "" : "s"}` : null, timeLabel(path.minutes)].filter(Boolean).join(" · ")}
        </span>
      </span>
    </Link>
  );
}
