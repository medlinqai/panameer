export const NON_PRODUCTION_ALLOWLIST: readonly string[] = [
];

/** Resend's own test sink (delivered@resend.dev, with +labels): real sends that reach no person. */
export const RESEND_TEST_SINK = /^delivered(\+[a-z0-9._-]+)?@resend\.dev$/;

export function allowedOutsideProduction(email: string): boolean {
  const e = email.trim().toLowerCase();
  return NON_PRODUCTION_ALLOWLIST.includes(e) || RESEND_TEST_SINK.test(e);
}
