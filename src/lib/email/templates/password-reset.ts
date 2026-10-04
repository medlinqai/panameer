import { capitalizeName } from "@/lib/display";
import { emailShell, escapeHtml, footerText, primaryButton } from "@/lib/email/shell";

export function passwordResetTemplate({
  firstName,
  resetUrl,
  logoUrl,
  expiresInHours = 1,
}: {
  firstName: string;
  resetUrl: string;
  logoUrl?: string;
  expiresInHours?: number;
}): { subject: string; html: string; text: string } {
  const subject = "Reset Your Panameer Password";
  const name = capitalizeName(firstName);
  const heading = `Reset your password${name ? `, ${escapeHtml(name)}` : ""}`;
  const window = expiresInHours === 1 ? "1 hour" : `${expiresInHours} hours`;

  const html = emailShell({
    logoUrl,
    bodyHtml: `
      <h1 style="margin:0 0 14px;font-size:24px;line-height:1.2;">${heading}</h1>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.55;">
        Click the button below to choose a new password for your Panameer account.
      </p>
      <p style="margin:0 0 22px;">${primaryButton(resetUrl, "Choose a New Password")}</p>
      <p style="margin:0 0 10px;font-size:14px;line-height:1.55;">
        This link expires in ${escapeHtml(window)} and can be used once.
      </p>
      <p style="margin:0;font-size:14px;line-height:1.55;">
        If you didn't ask to reset your password, you can ignore this email —
        your password has not changed.
      </p>`,
  });

  const text = `${heading}

Choose a new password for your Panameer account:
${resetUrl}

This link expires in ${window} and can be used once.

If you didn't ask to reset your password, you can ignore this email — your password has not changed.

${footerText(new Date().getFullYear())}`;

  return { subject, html, text };
}
