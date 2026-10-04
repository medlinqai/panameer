import { capitalizeName } from "@/lib/display";
import {
  EMAIL_COLORS,
  emailShell,
  escapeHtml,
  footerText,
  primaryButton,
} from "@/lib/email/shell";

export type FinishLaterAudience = "seller" | "buyer";

export function finishLaterTemplate({
  firstName,
  resumeUrl,
  audience = "buyer",
  logoUrl,
}: {
  firstName: string;
  resumeUrl: string;
  audience?: FinishLaterAudience;
  logoUrl?: string;
}): { subject: string; html: string; text: string } {
  const buyer = audience === "buyer";
  const subject = buyer
    ? "New Service Buyer — Continue Your Registration on Panameer"
    : "New Service Provider — Continue Your Registration on Panameer";

  const name = capitalizeName(firstName);
  const heading = `Continue your registration${name ? `, ${escapeHtml(name)}` : ""}`;
  const year = new Date().getFullYear();

  const html = emailShell({
    logoUrl,
    bodyHtml: `<h1 style="font-size:22px;margin:0 0 12px;color:${EMAIL_COLORS.ink};">${heading}</h1>
<p style="font-size:15px;line-height:1.6;color:${EMAIL_COLORS.body};margin:0 0 24px;">
  You saved your registration for later — click here to continue the registration you started.
  Nothing was lost: every step you finished is already saved.
</p>
${primaryButton(resumeUrl, "Continue My Registration")}
<p style="font-size:13px;line-height:1.6;color:${EMAIL_COLORS.muted};margin:24px 0 0;">
  If the button doesn't work, paste this URL into your browser:<br>
  <a href="${resumeUrl}" style="color:${EMAIL_COLORS.magentaDark};word-break:break-all;">${resumeUrl}</a>
</p>`,
  });

  const text = `Continue your registration${name ? `, ${name}` : ""}

You saved your registration for later — click here to continue the registration you started. Nothing was lost: every step you finished is already saved.

Continue My Registration: ${resumeUrl}

${footerText(year)}`;

  return { subject, html, text };
}
