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
    subject: `Service Requisition Posted: ${workRequestTitle}`,
    html: emailShell({
      logoUrl,
      bodyHtml: `<h1 style="font-size:22px;margin:0 0 16px;color:${EMAIL_COLORS.ink};">Your Service Requisition is live</h1>
${greeting(name)}
${paragraph(
  `Your Service Requisition — <b style="color:${EMAIL_COLORS.ink};">${title}</b> — is live for ${company}. ` +
    `Providers who match your skills can find it now, and we'll let you know the moment providers say they want it.`
)}
${primaryButton(viewUrl, "View Service Requisition")}
${signOff("The Panameer Team")}`,
    }),
    text: `Your Service Requisition is live

Hi ${name},

Your Service Requisition — ${workRequestTitle} — is live for ${requesterCompany}. Providers who match your skills can find it now, and we'll let you know the moment proposals start coming in.

View Service Requisition: ${viewUrl}

— The Panameer Team

${footerText(year)}`,
  };
}
