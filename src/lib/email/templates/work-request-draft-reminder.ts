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

/**
 * DRAFT REMINDER — "one step from live" (WS-E).
 *
 * The deck's subject, which puts the name at the end rather than the front:
 * "Almost there — finish your Work Request, Scott". It reads as a nudge from a
 * person instead of a mail-merge, and the brief's alternative phrasings were
 * offered as options rather than as the copy.
 *
 * ⚠ NOT WIRED — see the TODO at the call site note in `work-request.ts`. This
 * needs a scheduler (a cron sweep over DRAFTs older than N hours) and there is
 * none in the repo; nothing here fires on its own.
 */
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
         <a href="${helpUrl}" style="color:${EMAIL_COLORS.magentaDark};">How to write a Work Request that gets strong proposals</a>
       </p>`
    : "";

  return {
    subject: `Almost there — finish your Work Request, ${name}`,
    html: emailShell({
      logoUrl,
      bodyHtml: `<h1 style="font-size:22px;margin:0 0 16px;color:${EMAIL_COLORS.ink};">One step from live</h1>
${greeting(name)}
${paragraph(
  `Your Work Request, <b style="color:${EMAIL_COLORS.ink};">${title}</b>, is one step from live. ` +
    `Add the last few details and post it — you're one step from the right expert.`
)}
${primaryButton(resumeUrl, "Finish & Post")}
${help}
${signOff("The Panameer Team")}`,
    }),
    text: `One step from live

Hi ${name},

Your Work Request, ${workRequestTitle}, is one step from live. Add the last few details and post it — you're one step from the right expert.

Finish & Post: ${resumeUrl}
${helpUrl ? `\nHow to write a Work Request that gets strong proposals: ${helpUrl}\n` : ""}
— The Panameer Team

${footerText(year)}`,
  };
}
