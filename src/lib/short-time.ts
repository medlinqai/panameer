/**
 * ── ⚠⚠ THE COMPACT RELATIVE TIME (`P2-A1.1-E736`) ───────────────────────────────────────
 *
 * ⚠ **SCOTT: *"the relative time ('5m', '2h', '3d', then a date')."***
 *
 * ⚠⚠ **IT STOPS BEING RELATIVE AT SEVEN DAYS, AND THAT IS THE POINT OF THE RULE.** *"43d"*
 * is arithmetic the reader has to do; a date is a fact they can place. ⚠ Scott's own list
 * ends at `3d` and then says *"a date"*, so seven days is where the two meet.
 *
 * ⚠⚠⚠ **IT TAKES `now` AS AN ARGUMENT RATHER THAN CALLING `Date.now()` INSIDE.** A server
 * component and the browser that hydrates it run at different instants, and a string that
 * differs between the two is a hydration mismatch — React replaces the markup and the
 * reader sees the page flicker. ⚠ The caller passes one clock for the whole list.
 *
 * ⚠ **THERE IS NO SECOND COPY OF THIS.** `ColleagueCards.tsx:188` formats a LONG relative
 * time (*"3 months ago"*) for a different surface; this is the compact one. They are two
 * formats, not two implementations of one — which is why this file does not try to serve
 * both.
 */
export function shortTime(at: Date, now: number = Date.now()): string {
  const ms = now - at.getTime();

  /* ⚠ A row written a moment ago, or a clock skew that puts it just ahead. `now` is the
     honest answer for both — never a negative figure. */
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
