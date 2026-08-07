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
 * navy ink #171E3E. Kept as a pure function so it's testable and reusable.
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
  const subject = buyer
    ? "New Service Buyer — verify your email to continue on Panameer"
    : "New Service Provider — verify your email to continue on Panameer";
  const nextLine = buyer
    ? "start finding the talent you need."
    : "start building your provider profile.";
  const name = capitalizeName(firstName);

  const heading = `Confirm your email${name ? `, ${escapeHtml(name)}` : ""}`;
  const html = emailShell({
    logoUrl,
    bodyHtml: `<h1 style="font-size:22px;margin:0 0 12px;color:${EMAIL_COLORS.ink};">${heading}</h1>
<p style="font-size:15px;line-height:1.6;color:${EMAIL_COLORS.body};margin:0 0 24px;">
  You're almost there. Click the button below to verify your email and ${nextLine}
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

Verify your email to ${buyer ? "start finding the talent you need" : "start building your Panameer provider profile"}:
${verifyUrl}

This link expires in 24 hours. If you didn't create a Panameer account, ignore this email.

${footerText(new Date().getFullYear())}`;

  return { subject, html, text };
}
