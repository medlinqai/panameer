/**
 * ── ⚠⚠ DOMAINS WE REFUSE TO SEND TO (`P2-J3-E522`) ─────────────────────────
 *
 * ⚠ SCOTT, 2026-09-17: *"BUILD THE SEND-TIME DOMAIN REFUSAL. In the transport,
 * so it cannot be forgotten on a machine… AND MAKE IT A LIST, NOT A REGEX
 * BURIED IN A FUNCTION. Adding a domain should be a one-line diff somebody can
 * see in review."*
 *
 * ── ⚠ WHY THIS EXISTS ──────────────────────────────────────────────────────
 *
 * ⚠⚠ THE OLD SAFETY RAIL IS GONE. `EMAIL_FROM` has pointed at a verified
 * `mail.panameer.com` sender since 2026-09-11 and `MAIL_CAPTURE` is off, so a
 * send from a developer machine reaches ANY REAL ADDRESS. Nothing announced it.
 * ⚠ MEASURED 2026-09-17: of 207 `User` addresses, **~89 sit on reserved or fake
 * domains** — 64 `example.com`, 25 `example.seed`, plus `*.test`. ⚠⚠ EVERY ONE
 * OF THOSE IS A HARD BOUNCE, and ~89 hard bounces in one run would badly damage
 * a sending domain that is days old. ⚠ `E526` (bulk invite) sends one mail per
 * row of an uploaded file, which is exactly that run.
 *
 * ⚠⚠ THIS IS NOT A VALIDITY CHECK AND MUST NOT GROW INTO ONE. It is a list of
 * domains that CANNOT RECEIVE MAIL BY DEFINITION — four are reserved by RFC 2606
 * and RFC 6761 precisely so they never resolve, and `example.seed` is ours.
 * ⚠ DO NOT add a real domain here to stop mail to one person; that is what
 * `EmailSuppression` is for.
 */

/**
 * ⚠ ONE DOMAIN PER LINE, ON PURPOSE — adding one is a one-line diff in review.
 * ⚠ A leading `.` means "and every subdomain". A bare name matches exactly.
 */
export const UNDELIVERABLE_DOMAINS: readonly string[] = [
  "example.com", // RFC 2606 — reserved, never resolves. 64 rows hold one.
  "example.net", // RFC 2606 — same family, listed so it cannot be the next gap.
  "example.org", // RFC 2606 — same.
  "example.seed", // OURS — the seed fixtures. 25 rows.
  ".test", // RFC 6761 — reserved for testing. `*.test`.
  ".invalid", // RFC 6761 — reserved, guaranteed invalid. `*.invalid`.
  ".example", // RFC 6761 — reserved for documentation. `*.example`.
];

/**
 * The rule this address matched, or null if it is deliverable.
 *
 * ⚠ RETURNS THE RULE, NOT A BOOLEAN, so the caller can say WHICH line refused
 * it — in a log a person has to act on, "matched `.test`" is the difference
 * between a fix and an investigation.
 * ⚠⚠ CASE-INSENSITIVE, and it reads the LAST `@`: `"a@b"@example.com` is a legal
 * address whose domain is `example.com`, and splitting on the first `@` would
 * read it as `b"@example.com` and let it through.
 */
export function undeliverableRule(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at === -1) return null;
  const domain = email.slice(at + 1).toLowerCase().trim();
  if (!domain) return null;
  for (const rule of UNDELIVERABLE_DOMAINS) {
    if (rule.startsWith(".")) {
      /* ⚠ `.test` matches `foo.test` AND bare `test`, but NOT `latest` — the
         dot is a label boundary, not a substring. */
      if (domain.endsWith(rule) || domain === rule.slice(1)) return rule;
    } else if (domain === rule) {
      return rule;
    }
  }
  return null;
}
