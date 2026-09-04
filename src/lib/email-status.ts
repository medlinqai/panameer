/**
 * ⚠⚠ CAN THIS BUILD SEND AN EMAIL — THE ONE FACT, IN ONE PLACE
 * (`P1-ALL-E382`).
 *
 * ── WHY THIS FILE EXISTS ───────────────────────────────────────────────────
 *
 * `notify()` already decided this, inline, at `notifications.ts`: it stamps
 * `suppressed_reason: "email_not_configured"` when `wantsEmail` is true and
 * `RESEND_API_KEY` is absent. The NOTIFICATION SETTINGS SCREEN needed the same
 * answer, and there were two wrong ways to get it:
 *
 *   1. A SECOND SWITCH — a flag, a config entry, an `EMAIL_ENABLED` boolean.
 *      ⚠ That is two sources for one fact, and the day they disagree the UI says
 *      "Email ON" while the delivery layer records "not configured". `E382`
 *      forbids it explicitly.
 *   2. FLIPPING THE CATEGORY DEFAULTS to `email: false`. ⚠ That silently
 *      REWRITES WHAT EVERY USER IS OPTED INTO and destroys the record of their
 *      intent, to fix a RENDERING problem. Also forbidden.
 *
 * ⚠ SO BOTH READERS NOW CALL THIS, AND IT READS THE SAME ENV VAR `notify()` READ.
 * There is nothing new to keep in sync — the key is the fact.
 *
 * ── ⚠⚠ IT UN-DISABLES ITSELF WHEN `E371` LANDS ────────────────────────────
 *
 * The day `RESEND_API_KEY` is set, this returns `true`, the Email column becomes
 * live, and the honest line disappears. ⚠ NOT ONE LINE OF `E382` NEEDS DELETING
 * — which is the whole point of deriving the state rather than hard-coding a
 * "coming soon". A `TODO: remove when email works` is a line somebody has to
 * remember; this is not.
 *
 * ⚠ PURE AND PRISMA-FREE, so a server component can read it and hand the answer
 * to a client component as a prop. ⚠ IT MUST NOT BE IMPORTED BY A CLIENT
 * COMPONENT DIRECTLY — `process.env` is not populated in the browser and the
 * answer would silently become `false` for everyone.
 */
export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * ⚠ CC-AUTHORED. One honest line, shown beside the Email column while the pipe
 * is down. Scott can overrule it in one place.
 */
export const EMAIL_UNAVAILABLE_NOTE =
  "Email delivery isn't switched on yet, so these stay in the app. Your choices are saved and will apply as soon as it is.";
