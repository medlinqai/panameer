
export type Span = {
  start: Date | string | null | undefined;
  end: Date | string | null | undefined;
  /** Still ongoing — the span runs to `now`. */
  isCurrent?: boolean;
};

type Interval = { start: number; end: number };

function toInterval(s: Span, now: number): Interval | null {
  if (!s.start) return null; // no start date → nothing measurable
  const start = new Date(s.start).getTime();
  if (Number.isNaN(start)) return null;

  let end: number;
  if (s.end) {
    end = new Date(s.end).getTime();
    if (Number.isNaN(end)) return null; // unreadable end: no span, never "now"
  } else if (s.isCurrent) {
    end = now;
  } else {
    return null; // no end and not current: we do not know when it ended
  }

  // Ignore inverted or future-only spans rather than letting them subtract.
  if (end <= start) return null;
  if (start > now) return null;
  return { start, end: Math.min(end, now) };
}

/** Merge overlapping or adjacent intervals. */
export function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const out: Interval[] = [sorted[0]];
  for (const cur of sorted.slice(1)) {
    const last = out[out.length - 1];
    if (cur.start <= last.end) {
      // Overlapping or touching — extend rather than append.
      last.end = Math.max(last.end, cur.end);
    } else {
      out.push({ ...cur });
    }
  }
  return out;
}

function calendarMonths(startMs: number, endMs: number): number {
  const a = new Date(startMs);
  const b = new Date(endMs);
  let months =
    (b.getUTCFullYear() - a.getUTCFullYear()) * 12 +
    (b.getUTCMonth() - a.getUTCMonth());
  // Not a full final month yet.
  if (b.getUTCDate() < a.getUTCDate()) months -= 1;
  return Math.max(0, months);
}

/** Total months across the UNION of all spans — the one primitive. */
export function experienceMonths(spans: Span[], now: number = Date.now()): number {
  const intervals = spans
    .map((s) => toInterval(s, now))
    .filter((i): i is Interval => i !== null);
  return mergeIntervals(intervals).reduce(
    (n, i) => n + calendarMonths(i.start, i.end),
    0
  );
}

/** Whole years, floored — never round a career up. */
export function experienceYears(spans: Span[], now: number = Date.now()): number {
  return Math.floor(experienceMonths(spans, now) / 12);
}

export function experienceLabel(
  spans: Span[],
  now: number = Date.now()
): string | null {
  const months = experienceMonths(spans, now);
  if (months < 6) return null;
  const years = experienceYears(spans, now);
  if (years < 1) return "Less than a year";
  return `${years} ${years === 1 ? "year" : "years"}`;
}
