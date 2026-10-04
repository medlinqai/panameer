import { capitalizeName } from "@/lib/display";
import {
  EMAIL_COLORS,
  emailShell,
  escapeHtml,
  footerText,
  primaryButton,
} from "@/lib/email/shell";

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
  logoUrl?: string;
}): { subject: string; html: string; text: string } {
  const buyer = audience === "buyer";
  const subject = buyer
    ? "New Service Buyer — Verify Your Email to Continue on Panameer"
    : "New Service Provider — Verify Your Email to Continue on Panameer";
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
