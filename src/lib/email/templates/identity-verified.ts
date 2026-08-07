import { capitalizeName } from "@/lib/display";
import {
  EMAIL_COLORS,
  emailShell,
  footerText,
  greeting,
  paragraph,
  signOff,
} from "@/lib/email/shell";

/**
 * IDENTITY VERIFIED (WS-G).
 *
 * NOT the email-verification template. `verify-email.ts` confirms an address at
 * signup; this confirms a PERSON, after a document check. Two different things
 * at two different points in the relationship, which is why the brief insists
 * they stay separate templates.
 *
 * NO CTA. Nothing is being asked for — it is good news, delivered and done, and
 * a button here would be looking for something to sell.
 *
 * ⚠ NOT WIRED — there is an `IdentityVerification` model but no flow that
 * completes one. TODO(identity): send from wherever a verification is marked
 * approved, once that review exists.
 */
export function identityVerifiedTemplate({
  firstName,
  logoUrl,
}: {
  firstName: string;
  logoUrl?: string;
}): { subject: string; html: string; text: string } {
  const name = capitalizeName(firstName);
  const year = new Date().getFullYear();

  return {
    // The deck's subject, emoji and all — it is the one celebratory email in
    // the suite and the character is the whole tone.
    subject: "You're verified 🎉",
    html: emailShell({
      logoUrl,
      bodyHtml: `<h1 style="font-size:22px;margin:0 0 16px;color:${EMAIL_COLORS.ink};">You're verified 🎉</h1>
${greeting(name)}
${paragraph(
  `Your identity is verified on Panameer. That's what builds trust between you and the companies you ` +
    `work with — and it unlocks the full platform.`
)}
${signOff("The Panameer Team")}`,
    }),
    text: `You're verified

Hi ${name},

Your identity is verified on Panameer. That's what builds trust between you and the companies you work with — and it unlocks the full platform.

— The Panameer Team

${footerText(year)}`,
  };
}
