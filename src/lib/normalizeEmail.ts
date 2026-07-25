/**
 * THE single email normalizer (brief_O).
 *
 * Postgres string comparison is case-sensitive, so `where: { email }` with a
 * free-typed address silently resolves to NO ROW when the casing differs from
 * what was stored — which read as "invalid credentials" at login and climbed
 * the 5-attempt lockout counter. Every email create / lookup / compare in the
 * app routes through this one function so stored and queried forms can never
 * diverge; a `lower(email)` unique index backs it at the DB level.
 *
 * Rule: no raw / free-typed email may reach a `where: { email }` un-normalized.
 */
export function normalizeEmail(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase();
}

/** True when two addresses are the same account, ignoring case/whitespace. */
export function sameEmail(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const na = normalizeEmail(a);
  return na !== "" && na === normalizeEmail(b);
}
