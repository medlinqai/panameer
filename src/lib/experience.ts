/**
 * Derived years of experience (PJv2 WS6 / E068).
 *
 * Replaces the self-reported "Beginner / Mid-Career / Expert" pick, which asked
 * a provider to grade themselves and then showed that grade to buyers as if it
 * were a fact. The work history already contains the answer.
 *
 * THE UNION, NOT THE SUM. Someone who ran two engagements across the same two
 * years has two years of experience, not four — and consultants overlap
 * constantly, so a naive sum of spans systematically inflates exactly the people
 * most likely to have several at once. Overlapping and touching intervals are
 * merged before anything is counted.
 *
 * Pure and dependency-free so it can be used from a server read, from the seed,
 * and from a test.
 */

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

  // A current role has no end date by design; anything else without one is
  // treated as ongoing too, which is the reading most CVs intend.
  const rawEnd = s.isCurrent || !s.end ? now : new Date(s.end).getTime();
  const end = Number.isNaN(rawEnd) ? now : rawEnd;

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

/**
 * CALENDAR months between two instants.
 *
 * Not elapsed-time ÷ average-month, which is subtly and visibly wrong: two
 * consecutive two-year stints total 1460 days, and 1460 / 365.25 floors to
 * THREE — so a provider with four years of work would read as three. People
 * count experience in calendar years, so this counts the same way.
 */
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

/**
 * The label for the profile hero. Null when there is nothing to claim, so the
 * hero omits the line rather than asserting "0 years".
 */
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
