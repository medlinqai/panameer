import { MATURITY_STAGES, type ProcessArea } from "@/lib/assessment-data";

/**
 * THE AI MATURITY DASHBOARD — score gauge, KPI tiles, maturity stages.
 *
 * EXTRACTED, NOT REBUILT (brief_public_pages_ia WS-1). It lived inline inside
 * `Assessment`'s panel, which was fine while the assessment section was the
 * only thing that showed it. The home hero shows it now too, and the choice was
 * between one component with two callers or two copies drifting apart — a
 * second hand-built gauge whose bar rounds differently is exactly the sort of
 * thing nobody notices until the numbers disagree.
 *
 * ⚠ NOTHING HERE MEASURES ANYTHING, and the component carries that honesty
 * itself rather than relying on each caller to remember. `area.sample` drives
 * both the "Sample Read" chip and the caption underneath, so a page cannot show
 * invented figures without the label that says they are invented. When real
 * scoring arrives, `sample` goes false on the data and both disappear on their
 * own.
 */
export function MaturityDashboard({
  area,
  compact = false,
}: {
  area: ProcessArea;
  /**
   * The hero variant: fewer tiles and tighter type, because the hero shows this
   * beside a headline rather than as the subject of its own section. Same
   * component, same numbers — only how much of it is on screen changes.
   */
  compact?: boolean;
}) {
  const tiles = compact ? area.tiles.slice(0, 2) : area.tiles;

  return (
    <div
      className={
        "rounded-[18px] bg-ink text-white shadow-[0_22px_50px_rgba(23,30,62,0.28)] " +
        (compact ? "p-5" : "p-6")
      }
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a7a3c6]">
            AI Maturity Dashboard
          </p>
          <p className="mt-0.5 font-display text-[18px] font-semibold">
            {area.name}
          </p>
        </div>
        {area.sample && (
          <span className="self-center whitespace-nowrap rounded-full border border-white/25 px-2.5 py-[3px] text-[11px] text-[#cdc9e6]">
            Sample Read
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="rounded-[12px] border border-white/[0.08] bg-white/5 p-4"
          >
            <p className="font-display text-[26px] font-bold">{tile.value}</p>
            <p className="mt-0.5 text-[12px] text-[#a7a3c6]">{tile.label}</p>
            <p className="mt-2 text-[11px] text-[#7CF5C0]">{tile.delta}</p>
          </div>
        ))}
      </div>

      <div className="mt-3.5 rounded-[12px] border border-white/[0.08] bg-white/5 px-[18px] py-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-display text-[14px] font-semibold">
            AI Maturity Score
          </span>
          <span className="font-display text-[20px] font-bold text-magenta">
            {area.score} / 100
          </span>
        </div>
        {/*
          A meter, not a bar: `role="progressbar"` with the value on it, so a
          screen reader gets the number rather than a decorative div.
        */}
        <div
          role="progressbar"
          aria-valuenow={area.score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${area.name} AI maturity score`}
          className="mb-2 h-2 overflow-hidden rounded-[5px] bg-white/[0.12]"
        >
          <span
            className="block h-full rounded-[5px] bg-magenta"
            style={{ width: `${area.score}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-[#8f8caa]">
          {MATURITY_STAGES.map((stage, i) => (
            <span
              key={stage}
              className={i === area.stage ? "font-display text-magenta" : ""}
            >
              {stage}
              {i === area.stage && <span aria-hidden> ▲</span>}
            </span>
          ))}
        </div>
      </div>

      {area.sample && (
        <p className="mt-3 text-[11.5px] leading-relaxed text-[#8f8caa]">
          Illustrative figures — they show the read a completed assessment
          produces, not your organisation&apos;s data.
        </p>
      )}
    </div>
  );
}
