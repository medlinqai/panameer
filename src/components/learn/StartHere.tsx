import Link from "next/link";
import type { CatPath } from "@/lib/learn-catalog";
import { lessonCount, timeLabel } from "@/lib/learn-time";
import { CourseTile } from "@/components/learn/CourseTile";

// Learning Paths › Start Here: the one path for people new to Oracle Cloud — course tiles, what you'll learn, one button.
const tidy = (t: string) => t.replace(/^\s*\d+[.)]\s*/, "");

export function StartHere({ p }: { p: CatPath }) {
  const ticks = p.courses.slice(0, 4).map((c) => tidy(c.title));
  const go = p.mine?.next ? `/learn/${p.slug}/${p.mine.next.id}` : `/learn/${p.slug}`;
  return (
    <section data-start-here className="mt-7 grid bg-ink text-surface md:grid-cols-[1.15fr_1fr]">
      {/* T-E003: each course as its own colored tile, 2×2 on a phone. */}
      <div data-start-tiles className="grid grid-cols-2 content-start gap-2.5 p-5 sm:p-6">
        {p.courses.map((c, i) => {
          const k = lessonCount(c.lessons);
          return <CourseTile key={c.id} n={i + 1} title={c.title} lessons={k.out} done={k.done} soon={k.soon} href={`/learn/${p.slug}/course/${c.slug}`} />;
        })}
      </div>
      <div className="p-6 sm:p-8">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-[#ef8cee]">START HERE · NEW TO ORACLE CLOUD?</p>
        <h2 className="mt-1.5 text-[26px] font-bold leading-tight">{p.title}</h2>
        {p.summary && <p className="mt-2 text-[14px] leading-relaxed text-white/75">{p.summary}</p>}
        {ticks.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {ticks.map((t) => (
              <li key={t} className="flex gap-2 text-[13.5px]"><span aria-hidden className="font-bold text-[#ef8cee]">✓</span>{t}</li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-[12.5px] font-semibold text-white/70">
          {[`${p.courses.length} courses`, `${p.lessons} lessons`, timeLabel(p.minutes), p.test.ready ? "Certificate" : null].filter(Boolean).join(" · ")}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href={go} className="inline-flex min-h-11 items-center bg-surface px-5 text-[14px] font-semibold text-ink hover:bg-white/90">{p.mine ? "Continue Learning" : "Start Learning"}</Link>
          <Link href={`/learn/${p.slug}`} className="inline-flex min-h-11 items-center border border-white/60 px-5 text-[14px] font-semibold text-surface hover:bg-white/10">See What&apos;s Inside</Link>
        </div>
      </div>
    </section>
  );
}
