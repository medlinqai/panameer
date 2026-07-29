import { capitalizeName } from "@/lib/display";

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
export function verifyEmailTemplate({
  firstName,
  verifyUrl,
  logoUrl,
}: {
  firstName: string;
  verifyUrl: string;
  /**
   * Absolute URL of the logo. Email clients cannot resolve relative paths, so
   * the caller passes `${appBaseUrl()}/brand/panameer-logo-transparent.png`.
   * Falls back to the wordmark when absent so the email is never broken.
   */
  logoUrl?: string;
}): { subject: string; html: string; text: string } {
  const subject = "Verify your email to continue on Panameer";
  const name = capitalizeName(firstName);

  const logoBlock = logoUrl
    ? `<img src="${logoUrl}" alt="Panameer" width="180" height="25"
           style="display:block;border:0;outline:none;text-decoration:none;height:auto;width:180px;max-width:180px;">`
    : `<div style="font-size:22px;font-weight:800;letter-spacing:-.5px;color:#171E3E;">Panameer</div>`;

  const html = `<!doctype html>
<html>
  <head>
    <!-- E062 — declare the charset. Without it an em-dash or a curly quote
         renders as mojibake wherever the client falls back to Latin-1. This
         template is all-ASCII today; the meta tag is what keeps the next copy
         edit from silently breaking it. -->
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
  </head>
  <body style="margin:0;padding:0;background:#faf8fc;font-family:Arial,Helvetica,sans-serif;color:#171E3E;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf8fc;padding:32px 0;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;border:1px solid #ece9f1;overflow:hidden;">
          <tr><td style="padding:32px 40px 8px;">
            ${logoBlock}
          </td></tr>
          <tr><td style="padding:8px 40px 0;">
            <h1 style="font-size:22px;margin:0 0 12px;color:#171E3E;">Confirm your email${
              name ? `, ${escapeHtml(name)}` : ""
            }</h1>
            <p style="font-size:15px;line-height:1.6;color:#4a4658;margin:0 0 24px;">
              You're almost there. Click the button below to verify your email and
              start building your provider profile.
            </p>
            <a href="${verifyUrl}"
               style="display:inline-block;background:#D72CD6;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:999px;">
              Verify My Email
            </a>
            <p style="font-size:13px;line-height:1.6;color:#8a8199;margin:24px 0 0;">
              This link expires in 24 hours. If the button doesn't work, paste this
              URL into your browser:<br>
              <a href="${verifyUrl}" style="color:#B324B2;word-break:break-all;">${verifyUrl}</a>
            </p>
          </td></tr>
          <tr><td style="padding:28px 40px 32px;">
            <hr style="border:0;border-top:1px solid #ece9f1;margin:0 0 16px;">
            <p style="font-size:12px;color:#8a8199;margin:0;">
              If you didn't create a Panameer account, you can safely ignore this email.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = `Confirm your email${name ? `, ${name}` : ""}

Verify your email to start building your Panameer provider profile:
${verifyUrl}

This link expires in 24 hours. If you didn't create a Panameer account, ignore this email.`;

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
