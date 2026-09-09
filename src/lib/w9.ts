/**
 * THE SUBSTITUTE FORM W-9 (`P1-ALL-E404` WS-3).
 *
 * ── ⚠ THE IRS PERMITS THIS, AND NAMES FOUR CONDITIONS ─────────────────────
 *
 * A *substitute* Form W-9 and *electronic* submission are both allowed. The
 * conditions, and where each is met:
 *
 *   1. *"Make reasonably certain that the person accessing the system and
 *      submitting the form is the person identified"* — ⚠ ALREADY SATISFIED by
 *      the authenticated session. This is the one most homebrew forms fail, and
 *      it is satisfied here because the same login requests, orders and is paid.
 *   2. *"Ensure the information received is the information sent, and document
 *      all occasions of user access"* — `TaxFormAccess`, which logs a VIEW as
 *      well as a SUBMIT. ⚠ Opening the form is an occasion of access.
 *   3. Supply hard copies on IRS request — `/settings/withdrawals/w9` renders
 *      the captured record as a paper-equivalent form.
 *   4. An electronic signature under penalties of perjury, in the paper form's
 *      language — `W9_CERTIFICATION` below, stored verbatim on the record.
 *
 * ⚠⚠ THIS FILE QUOTES A GOVERNMENT FORM. IT DOES NOT DRAFT LAW. Every string
 * below is IRS Form W-9's own wording; none of it is Panameer's invention, and
 * none of it may be paraphrased to read more nicely.
 */

/**
 * ⚠⚠ VERSIONED, AND THE VERSION IS NOT THE RECORD.
 *
 * The stored `certification_text` is the whole text, copied onto the row. This
 * version string only groups records that share wording — if it is ever used
 * INSTEAD of the text, an old signature starts claiming to have agreed to
 * today's words, which is the failure the record exists to prevent.
 */
export const W9_CERTIFICATION_VERSION = "irs-w9-rev-2024-03";

/** IRS Form W-9, Part II. Verbatim. */
export const W9_CERTIFICATION_PREAMBLE = "Under penalties of perjury, I certify that:";

/**
 * The four certifications, verbatim.
 *
 * ⚠ ALL FOUR ARE SHOWN. Item 4 (FATCA) *may* be omitted if the payee is told it
 * does not apply — but telling them that is a statement about their tax status
 * that Panameer is not in a position to make for them, so the safer answer is to
 * show the item the form shows.
 */
export const W9_CERTIFICATIONS: readonly string[] = [
  "1. The number shown on this form is my correct taxpayer identification number (or I am waiting for a number to be issued to me); and",
  "2. I am not subject to backup withholding because: (a) I am exempt from backup withholding, or (b) I have not been notified by the Internal Revenue Service (IRS) that I am subject to backup withholding as a result of a failure to report all interest or dividends, or (c) the IRS has notified me that I am no longer subject to backup withholding; and",
  "3. I am a U.S. citizen or other U.S. person (defined below); and",
  "4. The FATCA code(s) entered on this form (if any) indicating that I am exempt from FATCA reporting is correct.",
];

/**
 * ⚠⚠ REQUIRED VERBATIM, DIRECTLY ABOVE THE SIGNATURE. Not a paraphrase, not a
 * tooltip, not a link. The IRS specifies this sentence for a substitute form
 * whose signature line covers anything besides the certifications.
 */
export const W9_CONSENT_NOTICE =
  "The IRS does not require your consent to any provision of this document other than the certifications required to avoid backup withholding.";

/**
 * The exact text a signer is shown, assembled once so the SCREEN and the STORED
 * RECORD cannot disagree.
 *
 * ⚠ THE SCREEN RENDERS THIS STRING'S PARTS, and the record stores this string.
 * Two independent copies of the wording is how a record ends up proving
 * something the signer never saw.
 */
export function w9CertificationText(): string {
  return [W9_CERTIFICATION_PREAMBLE, ...W9_CERTIFICATIONS, W9_CONSENT_NOTICE].join("\n\n");
}

/** What gets written when somebody signs. */
export type W9Signature = {
  signedName: string;
  certificationText: string;
  certificationVersion: string;
  certifiedAt: Date;
};

/**
 * ⚠ THE SIGNATURE IS THE TYPED NAME PLUS WHAT IT WAS TYPED UNDER. Building it
 * here rather than at the call site means a caller cannot store a name without
 * the text, which is the shape that turns a certification back into a checkbox.
 */
export function w9Signature(signedName: string, now = new Date()): W9Signature {
  return {
    signedName: signedName.trim(),
    certificationText: w9CertificationText(),
    certificationVersion: W9_CERTIFICATION_VERSION,
    certifiedAt: now,
  };
}

/**
 * ⚠⚠ NON-US STOPS HERE, AND THAT IS THE POINT. A W-8BEN / W-8BEN-E is a
 * different form with different certifications, and `E404` forbids building them
 * in this pass: **a wrong tax form is worse than no tax form.** The US question
 * is answered from the payout country (`lib/tax.ts` — jurisdiction decides, not
 * the user), and a non-US payee is told which form is needed and stopped.
 */
export const W8_STUB_NOTICE =
  "Panameer cannot collect this form online yet. A non-US payee files Form W-8BEN (individual) or Form W-8BEN-E (entity), and we will contact you to complete it before any payment is made.";
