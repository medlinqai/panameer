import type { PhaseCard } from "@/lib/plan/status-card";
import { phaseDaysLabel, shortDate } from "@/lib/plan/status-card";
import type { Readiness } from "@/lib/plan/model";

const FIG = "font-body font-extrabold leading-[0.85] tabular-nums text-[64px] sm:text-[84px]";

// Hero card (mockup status_phase_card_mockup_2026-10-05): current phase % and days to the next release.
export function StatusPhaseCard({
  card,
  releaseLabel,
  releaseCode,
  releasePercent,
  planPercent,
  counts,
  updated,
}: {
  card: PhaseCard;
  releaseLabel: string | null;
  releaseCode: string | null;
  releasePercent: number | null;
  planPercent: number | null;
  counts: Readiness;
  updated: string;
}) {
  const { phase, release } = card;
  const pct = phase?.percent ?? null;
  const releaseDay = release?.days === 0;
  return (
    <div data-testid="phase-card" aria-label="Current phase" className="border border-white/28 p-[18px] sm:px-6 sm:py-[22px]">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">{phase ? "Current phase" : "Between phases"}</p>
      {phase && (
        <p className="mt-1 text-[20px] font-bold">
          {phase.number} {phase.title}
          {phase.releaseTitle && <span className="font-semibold text-white/60"> · {phase.releaseTitle}</span>}
        </p>
      )}

      <div className={"mt-4 grid " + (phase && release ? "grid-cols-2" : "grid-cols-1")}>
        {phase && (
          <div className="min-w-0">
            {pct === null ? (
              <p className={FIG} data-hero-figure>—</p>
            ) : (
              <p className={FIG}>
                <span data-hero-figure>{pct}</span>
                <small className="ml-0.5 align-top text-[0.42em] text-magenta">%</small>
              </p>
            )}
            <p className="mt-2 text-[13px] font-semibold text-white/85">
              {pct === null ? "not yet counted" : <><span className="sm:hidden">of this phase</span><span className="hidden sm:inline">of this phase complete</span></>}
            </p>
            <p className="mt-0.5 text-[12px] text-white/60">
              <span className="hidden sm:inline">{shortDate(phase.start)} → {shortDate(phase.end)}{phase.daysLeft !== null && " · "}</span>
              {phase.daysLeft !== null && phaseDaysLabel(phase.daysLeft)}
            </p>
          </div>
        )}
        {release && (
          <div className={"min-w-0 " + (phase ? "border-l border-white/22 pl-5" : "")}>
            <p className={FIG} data-days-to-release>{release.days}</p>
            <p className="mt-2 text-[13px] font-semibold text-white/85">
              {releaseDay ? (
                "Release day"
              ) : (
                <>
                  <span className="sm:hidden">{release.days === 1 ? "day" : "days"} to {releaseCode ?? "release"}</span>
                  <span className="hidden sm:inline">{release.days === 1 ? "day" : "days"} to next release</span>
                </>
              )}
            </p>
            <p className="mt-0.5 text-[12px] text-white/60">
              <span className="hidden sm:inline">{releaseLabel ?? release.title} · </span>
              {shortDate(release.date)}
            </p>
          </div>
        )}
      </div>

      {phase && pct !== null && (
        <div className="relative mt-[18px] h-1 bg-white/18" aria-hidden>
          <i className="absolute inset-y-0 left-0 bg-magenta" style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
      )}

      <p className="mt-3.5 border-t border-white/22 pt-3 text-[12px] leading-[1.7] text-white/70">
        {releasePercent !== null && <b className="font-semibold text-white">{releaseCode ?? "Release"} overall {releasePercent}%</b>}
        {releasePercent !== null && planPercent !== null && " · "}
        {planPercent !== null && (
          <>
            <span className="sm:hidden">plan</span>
            <span className="hidden sm:inline">whole plan</span> {planPercent}%
          </>
        )}{" "}
        · updated {updated}
        <span className="block text-white/50">
          {counts.done} done · {counts.moving} moving · {counts.total} rows
        </span>
      </p>
    </div>
  );
}
