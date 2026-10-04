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

export function paymentMethodAddedTemplate({
  firstName,
  cardBrand,
  last4,
  financialAccountName,
  supportUrl,
  logoUrl,
}: {
  firstName: string;
  cardBrand: string;
  last4: string;
  financialAccountName: string;
  supportUrl: string;
  logoUrl?: string;
}): { subject: string; html: string; text: string } {
  const name = capitalizeName(firstName);
  const brand = escapeHtml(cardBrand);
  const four = escapeHtml(last4);
  const account = escapeHtml(financialAccountName);
  const year = new Date().getFullYear();

  return {
    subject: `${cardBrand} was added to ${financialAccountName}`,
    html: emailShell({
      logoUrl,
      bodyHtml: `<h1 style="font-size:22px;margin:0 0 16px;color:${EMAIL_COLORS.ink};">A payment method was added</h1>
${greeting(name)}
${paragraph(
  `A <b style="color:${EMAIL_COLORS.ink};">${brand} ending in ${four}</b> was added to Financial Account ` +
    `<b style="color:${EMAIL_COLORS.ink};">${account}</b>. If you didn't authorize this, contact Panameer Support right away.`
)}
${primaryButton(supportUrl, "Contact Support")}
${signOff("Panameer")}`,
    }),
    text: `A payment method was added

Hi ${name},

A ${cardBrand} ending in ${last4} was added to Financial Account ${financialAccountName}. If you didn't authorize this, contact Panameer Support right away.

Contact Support: ${supportUrl}

— Panameer

${footerText(year)}`,
  };
}
