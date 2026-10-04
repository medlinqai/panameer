
export const MIN_AGE = 18;
export const MAX_AGE = 120;

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
