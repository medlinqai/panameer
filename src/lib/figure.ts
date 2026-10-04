
export type Figure = number | { uncounted: string };

export const isCounted = (f: Figure): f is number => typeof f === "number";

export type TrendPeriod = "90d" | "ytd";

type Bucket = { lo: Date; hi: Date };

export function trendBuckets(period: TrendPeriod, now: Date = new Date()): Bucket[] {
  if (period === "ytd") {
    const y = now.getFullYear();
    return Array.from({ length: now.getMonth() + 1 }, (_, i) => ({
      lo: new Date(y, i, 1),
      hi: new Date(y, i + 1, 1),
    }));
  }
  const weekMs = 7 * 86_400_000;
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const start = new Date(endOfToday.getTime() - 13 * weekMs);
  return Array.from({ length: 13 }, (_, i) => ({
    lo: new Date(start.getTime() + i * weekMs),
    hi: new Date(start.getTime() + (i + 1) * weekMs),
  }));
}

export function countInBuckets(dates: Date[], buckets: Bucket[]): number[] {
  return buckets.map((b) => dates.filter((d) => d >= b.lo && d < b.hi).length);
}
