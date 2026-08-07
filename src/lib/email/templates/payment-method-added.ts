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
 * PAYMENT METHOD ADDED — a security notice (WS-F).
 *
 * ⚠⚠ TEMPLATE ONLY, AND IT MUST STAY THAT WAY FOR NOW. This rides on the
 * payments / Financial Account feature, which is regulated, counsel-led and not
 * near-term: money transmission and KYC per the banked strategy. There is no
 * Financial Account model, no card-on-file, and no send path — deliberately. Do
 * not build one to make this fire.
 *
 * TODO(payments): call this from wherever a payment method is first attached to
 * a Financial Account, once that feature exists and counsel has cleared it.
 *
 * WHY IT HAS A BUTTON WHEN THE BRIEF SAID IT NEED NOT. The brief called for a
 * support LINK only; the copy deck draws "[ Contact Support ]" as a button, and
 * the deck is the approved copy. It is also the better call for this email: the
 * one scenario that matters is somebody reading "a card was added" who did NOT
 * add it, and in that moment the route to a human should be the most obvious
 * thing on the page.
 */
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
