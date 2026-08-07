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
 * WORK REQUEST POSTED — the confirmation (WS-B).
 *
 * Copy is the deck's, verbatim. It makes one promise and it is one we can keep:
 * "we'll let you know the moment proposals start coming in". No count, no
 * timing, no "you'll hear within 24 hours" — nothing has been posted through
 * Panameer yet, so any number would be invented.
 */
export function workRequestPostedTemplate({
  firstName,
  workRequestTitle,
  requesterCompany,
  viewUrl,
  logoUrl,
}: {
  firstName: string;
  workRequestTitle: string;
  requesterCompany: string;
  viewUrl: string;
  logoUrl?: string;
}): { subject: string; html: string; text: string } {
  const name = capitalizeName(firstName);
  const title = escapeHtml(workRequestTitle);
  const company = escapeHtml(requesterCompany);
  const year = new Date().getFullYear();

  return {
    subject: `Work Request Posted: ${workRequestTitle}`,
    html: emailShell({
      logoUrl,
      bodyHtml: `<h1 style="font-size:22px;margin:0 0 16px;color:${EMAIL_COLORS.ink};">Your Work Request is live</h1>
${greeting(name)}
${paragraph(
  `Your Work Request — <b style="color:${EMAIL_COLORS.ink};">${title}</b> — is live for ${company}. ` +
    `Providers who match your skills can find it now, and we'll let you know the moment proposals start coming in.`
)}
${primaryButton(viewUrl, "View Work Request")}
${signOff("The Panameer Team")}`,
    }),
    text: `Your Work Request is live

Hi ${name},

Your Work Request — ${workRequestTitle} — is live for ${requesterCompany}. Providers who match your skills can find it now, and we'll let you know the moment proposals start coming in.

View Work Request: ${viewUrl}

— The Panameer Team

${footerText(year)}`,
  };
}
