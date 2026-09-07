import { capitalizeName } from "@/lib/display";
import {
  EMAIL_COLORS,
  emailShell,
  escapeHtml,
  footerText,
  primaryButton,
} from "@/lib/email/shell";

/**
 * Verification email template. Inline styles only (email clients ignore
 * external CSS) using the Panameer brand colors from brief_F — magenta #D72CD6,
 * navy ink #272334. Kept as a pure function so it's testable and reusable.
 *
 * brief_P / E006 fixes three things the walk caught:
 *   1. the Panameer LOGO upper-left, not the plain word "Panameer";
 *   2. the recipient's first name CAPITALIZED ("…, Scott", not "…, scott");
 *   3. every button label in Title Case ("Verify My Email").
 */
/**
 * WHO the email is for. It changes one sentence and the subject line, and it
 * matters: a Requester who is told to "start building your provider profile"
 * has been told they signed up for the wrong thing at the first email we send
 * them (brief_requester_onboarding WS3).
 */
export type VerifyAudience = "seller" | "buyer";

export function verifyEmailTemplate({
  firstName,
  verifyUrl,
  logoUrl,
  audience = "seller",
}: {
  firstName: string;
  verifyUrl: string;
  audience?: VerifyAudience;
  /**
   * Absolute URL of the logo. Email clients cannot resolve relative paths, so
   * the caller passes `${appBaseUrl()}/brand/panameer-new-on-light.png`.
   * Falls back to the wordmark when absent so the email is never broken.
   */
  logoUrl?: string;
}): { subject: string; html: string; text: string } {
  const buyer = audience === "buyer";
  /*
    ⚠ TITLE CASE, BOTH VARIANTS (`P2-J1.1-E015`). ⚠ SUPERSEDED, quoted:
      "New Service Buyer — verify your email to continue on Panameer"
      "New Service Provider — verify your email to continue on Panameer"
    Scott screenshotted only the BUYER one; changing only that half would have
    left the provider subject lowercase and the two out of step. This brings
    subjects under the convention locked in `brief_N_title_case` — *"as a UI
    convention (ends the sentence-case papercut)"* — which email was never
    swept into. ⚠ ONLY THESE TWO. The other 12 templates are REPORTED, not
    changed; Scott rules on those.
  */
  const subject = buyer
    ? "New Service Buyer — Verify Your Email to Continue on Panameer"
    : "New Service Provider — Verify Your Email to Continue on Panameer";
  /*
    ⚠⚠ THE BUYER CLAUSE STOPPED PROMISING THE FINISH LINE (`P2-J1.1-E018`).
    ⚠ SUPERSEDED, quoted: `"start finding the talent you need."`

    SCOTT, 2026-09-06: *"These should be two separate emails. One is start your
    registration...the other is finish the registration you started."* This email
    was carrying BOTH jobs — proving the address AND being the only thing that
    ever brings a person back — so it over-promised. Verifying an email does not
    find anyone talent; there is a whole wizard in between.

    ⚠ THE PROVIDER VARIANT IS UNCHANGED. *"start building your provider
    profile."* is already honest — only the buyer half lied.
    ⚠ THE HEADING IS UNCHANGED TOO: `Confirm your email{, Name}` is this email's
    job. `Continue your registration` belongs to the OTHER email now.
  */
  /*
    ⚠⚠ THE WHOLE CLAUSE IS THE VARIANT, NOT JUST ITS TAIL — AND THAT IS A
    CORRECTION TO THE BRIEF, REPORTED RATHER THAN MADE QUIETLY.

    The brief replaced the tail after a FIXED lead-in of *"Click the button below
    to verify your email and "*. Scott's approved sentence begins *"verify your
    email, …"*, so slotting it there rendered:

      "Click the button below to verify your email and verify your email, then
       log in and complete your registration."

    Verified by rendering it, not by reading it. Scott's words are kept EXACTLY;
    what moved is the lead-in, which now stops at "to" for the buyer.
    ⚠ THE PROVIDER SENTENCE IS BYTE-IDENTICAL to what it was — it keeps the
    "verify your email and" lead-in, because its tail was written to continue one.
  */
  const nextLine = buyer
    ? "verify your email, then log in and complete your registration."
    : "verify your email and start building your provider profile.";
  const name = capitalizeName(firstName);

  const heading = `Confirm your email${name ? `, ${escapeHtml(name)}` : ""}`;
  const html = emailShell({
    logoUrl,
    bodyHtml: `<h1 style="font-size:22px;margin:0 0 12px;color:${EMAIL_COLORS.ink};">${heading}</h1>
<p style="font-size:15px;line-height:1.6;color:${EMAIL_COLORS.body};margin:0 0 24px;">
  You're almost there. Click the button below to ${nextLine}
</p>
${primaryButton(verifyUrl, "Verify My Email")}
<p style="font-size:13px;line-height:1.6;color:${EMAIL_COLORS.muted};margin:24px 0 0;">
  This link expires in 24 hours. If the button doesn't work, paste this URL into your browser:<br>
  <a href="${verifyUrl}" style="color:${EMAIL_COLORS.magentaDark};word-break:break-all;">${verifyUrl}</a>
</p>
<p style="font-size:12px;color:${EMAIL_COLORS.muted};margin:20px 0 0;">
  If you didn't create a Panameer account, you can safely ignore this email.
</p>`,
  });

  const text = `Confirm your email${name ? `, ${name}` : ""}

${buyer ? "Verify your email, then log in and complete your registration" : "Verify your email to start building your Panameer provider profile"}:
${verifyUrl}

This link expires in 24 hours. If you didn't create a Panameer account, ignore this email.

${footerText(new Date().getFullYear())}`;

  return { subject, html, text };
}
