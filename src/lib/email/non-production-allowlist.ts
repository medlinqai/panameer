export const NON_PRODUCTION_ALLOWLIST: readonly string[] = [
];

export function allowedOutsideProduction(email: string): boolean {
  return NON_PRODUCTION_ALLOWLIST.includes(email.trim().toLowerCase());
}
