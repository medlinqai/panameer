import Link from "next/link";
import type { CatPath } from "@/lib/learn-catalog";
import { timeLabel } from "@/lib/learn-time";
import { vimeoEmbedUrl } from "@/lib/learn";

// Learning Paths › Start Here: the one path for people new to Oracle Cloud, big — intro video or cover, what you'll learn, one button.
const tidy = (t: string) => t.replace(/^\s*\d+[.)]\s*/, "");

export function StartHere({ p }: { p: CatPath }) {
  const embed = vimeoEmbedUrl(p.introVideo);
  const ticks = p.courses.slice(0, 4).map((c) => tidy(c.title));
  const go = p.mine?.next ? `/learn/${p.slug}/${p.mine.next.id}` : `/learn/${p.slug}`;
  return (
    <section data-start-here className="mt-7 grid bg-ink text-surface md:grid-cols-[1.15fr_1fr]">
      <div className="relative min-h-[220px] overflow-hidden">
        {embed ? (
          <iframe src={embed} title={`${p.title} — intro`} allow="autoplay; fullscreen; picture-in-picture" className="absolute inset-0 h-full w-full" />
        ) : p.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 grid grid-cols-2 gap-2 bg-[linear-gradient(135deg,#3a3350,#14111d)] p-6">
            {ticks.map((t) => (
              <span key={t} className="flex items-end border border-white/15 p-3 text-[13px] font-bold text-white/80">{t}</span>
            ))}
          </div>
        )}
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
