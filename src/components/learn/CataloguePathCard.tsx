import Link from "next/link";
import type { CatPath } from "@/lib/learn-catalogue";
import { timeLabel } from "@/lib/learn-catalogue";

// One learning-path card (Learn status language): tag · area · title · teacher/courses/lessons/time · your bar · stats · buttons.
const BTN_K = "inline-flex min-h-10 items-center bg-ink px-4 text-[13.5px] font-semibold text-surface hover:bg-ink-hover";
const BTN = "inline-flex min-h-10 items-center border border-ink bg-surface px-4 text-[13.5px] font-semibold text-ink hover:bg-surface-hover";
const OFF = "inline-flex min-h-10 cursor-not-allowed items-center border border-line px-4 text-[13.5px] font-semibold text-ink-3";
const TAG: Record<string, string> = { IN_PROGRESS: "IN PROGRESS", CERTIFIED: "CERTIFIED ✓", COMING_SOON: "COMING SOON" };
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });

export function CataloguePathCard({ p, areaLabel, notify }: { p: CatPath; areaLabel: string | null; notify?: React.ReactNode }) {
  const pct = p.mine && p.mine.total ? Math.round((p.mine.done / p.mine.total) * 100) : 0;
  const meta = [p.teacher?.name, `${p.courses.length} course${p.courses.length === 1 ? "" : "s"}`, `${p.lessons} lesson${p.lessons === 1 ? "" : "s"}`, timeLabel(p.minutes)].filter(Boolean).join(" · ");
  return (
    <li data-path-card={p.slug} data-tag={p.tag ?? "none"} className="flex flex-col border border-line bg-white p-4">
      <p className="flex flex-wrap items-center gap-2 text-[10.5px] font-bold tracking-[0.08em]">
        {p.tag && <span className={"px-1.5 py-0.5 " + (p.tag === "CERTIFIED" ? "bg-ink text-surface" : p.tag === "IN_PROGRESS" ? "border border-magenta text-magenta-dark" : "border border-[#C9CDDC] text-ink-3")}>{TAG[p.tag]}</span>}
        <span className="text-ink-3">{[areaLabel, p.group].filter(Boolean).join(" · ").toUpperCase()}</span>
      </p>
      <Link href={`/learn/${p.slug}`} className="mt-2 text-[15.5px] font-bold leading-snug hover:underline">{p.title}</Link>
      <p className="mt-1 text-[12.5px] text-ink-2">{meta}</p>
      {p.tag === "CERTIFIED" && p.certificate ? (
        <p className="mt-2.5 text-[12.5px] font-semibold text-ink-2">Completed {day(p.certificate.earnedOn)}{p.certificate.score != null ? ` · scored ${p.certificate.score}%` : ""}</p>
      ) : p.mine ? (
        <div className="mt-2.5">
          <p className="text-[12px] font-semibold text-ink-2">You: {p.mine.done} of {p.mine.total} lessons</p>
          <span aria-hidden className="mt-1 block h-[6px] w-full bg-[#C9CDDC]"><span className="block h-full bg-ink" style={{ width: `${pct}%` }} /></span>
        </div>
      ) : null}
      <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3">
        <div><dd className="text-[18px] font-medium tabular-nums">{p.tag === "COMING_SOON" ? "—" : p.learners}</dd><dt className="text-[10px] font-semibold tracking-[0.08em] text-ink-3">LEARNERS</dt></div>
        <div><dd className="text-[18px] font-medium tabular-nums">{p.tag === "COMING_SOON" ? "Soon" : p.completed}</dd><dt className="text-[10px] font-semibold tracking-[0.08em] text-ink-3">{p.tag === "COMING_SOON" ? "OPENS" : "COMPLETED"}</dt></div>
      </dl>
      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        {p.tag === "CERTIFIED" ? (
          <>
            <Link href={`/learn/${p.slug}`} className={BTN_K}>Review</Link>
            {p.certificate?.verifyUrl && <Link href={p.certificate.verifyUrl} className={BTN}>View Certificate</Link>}
          </>
        ) : p.tag === "COMING_SOON" ? (
          notify ?? <Link href={`/learn/${p.slug}#notify`} className={BTN}>Notify Me</Link>
        ) : (
          <>
            <Link href={p.mine?.next ? `/learn/${p.slug}/${p.mine.next.id}` : `/learn/${p.slug}`} className={BTN_K}>{p.mine ? "Continue" : "Start"}</Link>
            {p.test.ready ? <Link href={`/learn/${p.slug}/test`} className={BTN}>Take the Test</Link> : <span className={OFF} aria-disabled>Test Opens Soon</span>}
          </>
        )}
      </div>
    </li>
  );
}
