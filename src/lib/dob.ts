/**
 * Date-of-birth validity — ONE implementation, shared by the client field and
 * the server step handler (E090 / WS10).
 *
 * The bug this closes: the finish step's 18+ check threw before writing
 * anything, so one bad DOB silently took the phone and address writes down with
 * it, and the user was told "add your date of birth" by a later call — a message
 * about a different problem entirely.
 *
 * The fix needs the SAME rule in two places: on the field, so an impossible date
 * is caught before submit, and on the server, which stays authoritative. Two
 * copies of an age calculation drift — one uses local time, the other UTC, and
 * they disagree for anyone whose birthday is today. So there is one copy, here,
 * and both sides import it.
 *
 * Pure and dependency-free, so the server, the client and a test all get the
 * same answer.
 */

/** The rule (brief_E / E019): adults only, and nobody is older than 120. */
export const MIN_AGE = 18;
export const MAX_AGE = 120;

/**
 * Parse a `YYYY-MM-DD` value (what `<input type="date">` produces, and what the
 * API receives) into UTC parts.
 *
 * Deliberately NOT `new Date(value)` + local getters: that parses the string as
 * UTC midnight and then reads it back in local time, so west of Greenwich every
 * date lands on the previous day. Harmless for display, wrong at the exactly-18
 * boundary — and wrong DIFFERENTLY in a browser than on the server, which is the
 * drift this module exists to prevent.
 */
function parseUTC(value: string | Date): { y: number; m: number; d: number } | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return {
      y: value.getUTCFullYear(),
      m: value.getUTCMonth() + 1,
      d: value.getUTCDate(),
    };
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  // Reject the dates that only LOOK real — 2025-02-30 rolls forward to March
  // otherwise, and a rolled date would quietly pass the age check.
  const probe = new Date(Date.UTC(y, mo - 1, d));
  if (
    probe.getUTCFullYear() !== y ||
    probe.getUTCMonth() !== mo - 1 ||
    probe.getUTCDate() !== d
  ) {
    return null;
  }
  return { y, m: mo, d };
}

/** Whole years between a date of birth and `now`, floored. */
export function ageFrom(value: string | Date, now: Date = new Date()): number | null {
  const b = parseUTC(value);
  if (!b) return null;
  let age = now.getUTCFullYear() - b.y;
  const monthDiff = now.getUTCMonth() + 1 - b.m;
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < b.d)) age--;
  return age;
}

/**
 * The single validity verdict. Returns the message to show, or null when the
 * value is acceptable.
 *
 * An EMPTY value is not an error here: the finish step is allowed to save
 * partially, and "you still need a date of birth" is the publish gate's job to
 * say, not this field's. Only a value that is present and wrong fails.
 */
export function dobError(
  value: string | Date | null | undefined,
  now: Date = new Date()
): string | null {
  if (value == null || (typeof value === "string" && value.trim() === "")) {
    return null;
  }
  const age = ageFrom(value, now);
  if (age == null) return "That date of birth isn't valid";
  if (age < 0) return "That date of birth is in the future";
  if (age < MIN_AGE) {
    return `You must be at least ${MIN_AGE} to provide services on Panameer.`;
  }
  if (age > MAX_AGE) return "That date of birth isn't valid";
  return null;
}
