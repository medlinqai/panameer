"use client";

import { useEffect, useState } from "react";

/** Scott 10-22: deadline colours — green with more than one business day (8 working hours, Mon–Fri 9–5 ET) left,
 *  amber under 8 working hours (so "first thing tomorrow" is amber tonight), red under 1 hour (live mm:ss), Passed after. */
export type DeadlineTone = "accepted" | "pending" | "declined" | "passed";
const ET = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "numeric", hourCycle: "h23" });
const STEP = 15 * 60_000;
/** Working time between now and the deadline, in 15-minute steps (stops counting once it passes 8 h). */
export function workingMsLeft(now: number, at: number): number {
  let ms = 0;
  for (let t = now; t < at && ms < 8 * 3_600_000; t += STEP) {
    const parts = ET.formatToParts(new Date(t));
    const wd = parts.find((x) => x.type === "weekday")?.value ?? "";
    const hr = Number(parts.find((x) => x.type === "hour")?.value ?? 0);
    if (wd !== "Sat" && wd !== "Sun" && hr >= 9 && hr < 17) ms += Math.min(STEP, at - t);
  }
  return ms;
}
export function deadlineTone(ms: number, at?: number): DeadlineTone {
  if (ms <= 0) return "passed";
  if (ms < 3_600_000) return "declined";
  const working = at != null ? workingMsLeft(at - ms, at) : ms;
  return working < 8 * 3_600_000 ? "pending" : "accepted";
}
export const TONE_TEXT: Record<DeadlineTone, string> = { accepted: "text-state-accepted", pending: "text-state-pending", declined: "text-state-declined", passed: "text-state-declined" };
export const TONE_PILL: Record<DeadlineTone, string> = {
  accepted: "border-state-accepted bg-state-accepted-bg text-state-accepted",
  pending: "border-state-pending bg-state-pending-bg text-state-pending",
  declined: "border-state-declined bg-state-declined-bg text-state-declined",
  passed: "border-state-declined bg-state-declined-bg text-state-declined",
};

/** Ticks every 30 s, every second in the last hour. */
export function useMsLeft(at: string): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const n = Date.now();
      setNow(n);
      const left = new Date(at).getTime() - n;
      t = setTimeout(tick, left > 0 && left < 3_600_000 ? 1_000 : 30_000);
    };
    tick();
    return () => clearTimeout(t);
  }, [at]);
  return now == null ? null : new Date(at).getTime() - now;
}

export function countdownText(ms: number): string {
  if (ms <= 0) return "Passed";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  return h >= 24 ? `${Math.floor(h / 24)} d ${h % 24} h left` : h > 0 ? `${h} h ${m} min left` : `${m}:${String(s).padStart(2, "0")} left`;
}

/** Time left ("1 d 4 h left" · "6 h 12 min left" · "42:17 left" · "Passed"), coloured by how close the deadline is. */
export function Countdown({ at, className = "", plain = false }: { at: string; className?: string; plain?: boolean }) {
  const ms = useMsLeft(at);
  if (ms == null) return <span className={className}>&nbsp;</span>;
  const tone = deadlineTone(ms, new Date(at).getTime());
  return <span className={`${plain ? "" : `font-bold ${TONE_TEXT[tone]} `}${className}`} data-countdown={tone}>{countdownText(ms)}</span>;
}

/** The Open badge on a Sourcing / Estimate Event: green → amber → red as the deadline nears; Deadline Passed after. */
export function DeadlineBadge({ at }: { at: string }) {
  const ms = useMsLeft(at);
  if (ms == null) return <span className="rounded-full border border-ink px-3 py-0.5 text-[12.5px] font-bold">Open</span>;
  const tone = deadlineTone(ms, new Date(at).getTime());
  return <span className={`rounded-full border px-3 py-0.5 text-[12.5px] font-bold ${TONE_PILL[tone]}`} data-event-status={tone}>{tone === "passed" ? "Deadline Passed" : "Open"}</span>;
}

/** A tag ("Reply in …") whose background follows the same tone. */
export function DeadlineTag({ at, prefix }: { at: string; prefix: string }) {
  const ms = useMsLeft(at);
  if (ms == null) return null;
  const tone = deadlineTone(ms, new Date(at).getTime());
  return <span className={`rounded-full px-2.5 py-1 ${TONE_PILL[tone]}`} data-deadline-tag={tone}>{tone === "passed" ? "Deadline Passed" : `${prefix} ${countdownText(ms)}`}</span>;
}
