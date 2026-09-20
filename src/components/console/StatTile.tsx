import type { ReactNode } from "react";

/**
 * Console tiles (J2.4 WS-D / E010).
 *
 * TWO STATES, AND THE EMPTY ONE IS THE POINT. Half of what My Stats is meant to
 * show — earnings, job success, proposals, client relationships — has no data
 * behind it yet, because contracts and payments are Phase 2. The tempting move
 * is a tile reading "$0" or "0 proposals", and it is the wrong one: zero is a
 * measurement, and we have not measured anything. A provider seeing "Job
 * Success 0%" would reasonably conclude they had failed at something.
 *
 * So `NotTrackedYet` says plainly that nothing is being counted and what will
 * start it counting. It reads as honest rather than broken, and it cannot be
 * mistaken for a result.
 */
export function StatTile({
  label,
  children,
  hint,
  span,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  /**
   * ⚠ Column span inside the parent grid (`P2-J2-E563` WS-A). `2` is the only
   * value any caller needs today — the merged `Profile` tile carries what two
   * tiles used to carry, so it earns two columns.
   *
   * ⚠⚠ THE CLASSES ARE WHOLE TOKENS AND MUST STAY THAT WAY. Tailwind v4 scans
   * source TEXT and never evaluates JavaScript, so a class built by
   * concatenation or interpolation emits no CSS and fails SILENTLY — the
   * `HERO_SCRIM` defect (`E338`), which shipped dead on seven public pages for
   * two days behind a warm cache. ⚠ Hence a literal per branch, never
   * `` `sm:col-span-${span}` ``.
   */
  span?: 2;
}) {
  return (
    <section
      className={
        "rounded-brand border border-line bg-white p-5" +
        (span === 2 ? " sm:col-span-2" : "")
      }
    >
      <h2 className="font-display text-[15px] font-bold">{label}</h2>
      <div className="mt-3">{children}</div>
      {hint && <p className="mt-3 text-[12.5px] leading-relaxed text-ink-2">{hint}</p>}
    </section>
  );
}

/** A real, measured number. */
export function StatValue({
  value,
  caption,
}: {
  value: string;
  caption?: string;
}) {
  return (
    <>
      <p className="font-display text-[30px] font-bold leading-none text-magenta">
        {value}
      </p>
      {caption && <p className="mt-1.5 text-[13px] text-ink-2">{caption}</p>}
    </>
  );
}

/**
 * The honest empty state. `unlocks` names the thing that will populate it, so
 * the tile explains itself instead of just being blank.
 */
export function NotTrackedYet({ unlocks }: { unlocks: string }) {
  return (
    <>
      <p className="font-display text-[30px] font-bold leading-none text-ink-2/25">
        —
      </p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
        Nothing to show yet. This starts counting once {unlocks}.
      </p>
    </>
  );
}

/** A labelled row inside a tile that carries several small facts. */
export function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-1.5 last:border-0">
      <span className="text-[13.5px] text-ink-2">{label}</span>
      <span className="text-[14px] font-bold">{value}</span>
    </div>
  );
}
