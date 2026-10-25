// MD-E004: the My Progress periods (client-safe).
export type PeriodKey = "quarter" | "90d" | "year";
export const PERIODS: [PeriodKey, string][] = [["quarter", "This Quarter"], ["90d", "Last 90 Days"], ["year", "This Year"]];
export function periodRange(k: PeriodKey, now = new Date()) {
  const from = k === "90d" ? new Date(now.getTime() - 90 * 86_400_000) : k === "year" ? new Date(Date.UTC(now.getUTCFullYear(), 0, 1)) : new Date(Date.UTC(now.getUTCFullYear(), Math.floor(now.getUTCMonth() / 3) * 3, 1));
  return { from, to: now };
}
