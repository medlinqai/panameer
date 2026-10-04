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
