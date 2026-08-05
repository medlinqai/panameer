/**
 * "3 days ago" from an ISO timestamp (WS2-C).
 *
 * SERVER-SIDE AND COARSE, on purpose. Formatting a date in the browser from
 * server-rendered markup is the hydration mismatch this codebase has been
 * bitten by twice (the header greeting, the date chip). Day granularity is
 * stable across the two for everything except a post made in the last minute,
 * and "today" is the right answer for that anyway.
 */
export function relativeDay(iso: string): string {
  const then = new Date(iso).getTime();
  const days = Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ${months === 1 ? "month" : "months"} ago`;
  const years = Math.floor(days / 365);
  return `${years} ${years === 1 ? "year" : "years"} ago`;
}
