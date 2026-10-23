import { capitalizeName } from "@/lib/display";
import {
  EMAIL_COLORS,
  emailShell,
  escapeHtml,
  footerText,
  greeting,
  paragraph,
  primaryButton,
  signOff,
} from "@/lib/email/shell";

export function workRequestDraftReminderTemplate({
  firstName,
  workRequestTitle,
  resumeUrl,
  helpUrl,
  logoUrl,
}: {
  firstName: string;
  workRequestTitle: string;
  resumeUrl: string;
  /** Optional "how to write a strong Work Request" link. */
  helpUrl?: string;
  logoUrl?: string;
}): { subject: string; html: string; text: string } {
  const name = capitalizeName(firstName);
  const title = escapeHtml(workRequestTitle);
  const year = new Date().getFullYear();

  const help = helpUrl
    ? `<p style="font-size:13px;line-height:1.6;color:${EMAIL_COLORS.muted};margin:20px 0 0;">
         <a href="${helpUrl}" style="color:${EMAIL_COLORS.magentaDark};">How to write a Request that gets strong responses</a>
       </p>`
    : "";

  return {
    subject: `Almost there — finish your Request, ${name}`,
    html: emailShell({
      logoUrl,
      bodyHtml: `<h1 style="font-size:22px;margin:0 0 16px;color:${EMAIL_COLORS.ink};">One step from live</h1>
${greeting(name)}
${paragraph(
  `Your Request, <b style="color:${EMAIL_COLORS.ink};">${title}</b>, is one step from live. ` +
    `Add the last few details and post it — you're one step from the right expert.`
)}
${primaryButton(resumeUrl, "Finish & Post")}
${help}
${signOff("The Panameer Team")}`,
    }),
    text: `One step from live

Hi ${name},

Your Request, ${workRequestTitle}, is one step from live. Add the last few details and post it — you're one step from the right expert.

Finish & Post: ${resumeUrl}
${helpUrl ? `\nHow to write a Request that gets strong responses: ${helpUrl}\n` : ""}
— The Panameer Team

${footerText(year)}`,
  };
}
