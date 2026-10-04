export function shortTime(at: Date, now: number = Date.now()): string {
  const ms = now - at.getTime();

  if (ms < 60_000) return "now";

  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  /* ⚠⚠ `en-GB` day-month, matching the date the old page printed, so nothing a member
     already recognises changes shape. ⚠ The YEAR is dropped inside the current year —
     "12 Mar 2026" on a page where everything is 2026 is a column of noise. */
  const d = at;
  const sameYear = new Date(now).getFullYear() === d.getFullYear();
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}
