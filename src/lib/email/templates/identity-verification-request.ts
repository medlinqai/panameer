import { capitalizeName } from "@/lib/display";
import {
  EMAIL_COLORS,
  emailShell,
  footerText,
  greeting,
  paragraph,
  primaryButton,
  signOff,
} from "@/lib/email/shell";

/**
 * IDENTITY VERIFICATION REQUEST (WS-H).
 *
 * The ask, where WS-G is the confirmation. The deck's framing does the work
 * here: it opens with WHY ("we keep Panameer a place people can trust by
 * confirming who's who") before it asks for anything, and it is specific about
 * cost — a quick upload plus a visual check, under five minutes, confirmed
 * within 48 hours. A vague "verify your identity" reads as a phishing email;
 * naming the steps and the clock is what makes it read as ours.
 *
 * IT STATES THE CONSEQUENCE WITHOUT THREATENING. "Please start within seven
 * days; until then a few account features are limited." True, specific, and not
 * dressed up as a deadline with a penalty.
 *
 * ⚠ NOT WIRED — no Trust & Safety review flow exists to raise the flag.
 * TODO(identity): send when a T&S identity review is opened on an account.
 */
export function identityVerificationRequestTemplate({
  firstName,
  startUrl,
  learnMoreUrl,
  logoUrl,
}: {
  firstName: string;
  startUrl: string;
  learnMoreUrl?: string;
  logoUrl?: string;
}): { subject: string; html: string; text: string } {
  const name = capitalizeName(firstName);
  const year = new Date().getFullYear();

  const learnMore = learnMoreUrl
    ? `<p style="font-size:13px;line-height:1.6;color:${EMAIL_COLORS.muted};margin:20px 0 0;">
         <a href="${learnMoreUrl}" style="color:${EMAIL_COLORS.magentaDark};">Learn more about identity verification</a>
       </p>`
    : "";

  return {
    subject: "Verify your identity to keep working on Panameer",
    html: emailShell({
      logoUrl,
      bodyHtml: `<h1 style="font-size:22px;margin:0 0 16px;color:${EMAIL_COLORS.ink};">Verify your identity</h1>
${greeting(name)}
${paragraph(
  `We keep Panameer a place people can trust by confirming who's who. Please take a few minutes to verify ` +
    `your identity — a quick upload plus a visual check, usually under five minutes, confirmed within 48 hours.`
)}
${paragraph(`Please start within seven days; until then a few account features are limited.`)}
${primaryButton(startUrl, "Get Started")}
${learnMore}
<p style="font-size:15px;line-height:1.6;color:${EMAIL_COLORS.body};margin:24px 0 0;">
  Thanks for helping us keep Panameer a trusted place.
</p>
${signOff("Panameer Trust & Safety")}`,
    }),
    text: `Verify your identity

Hi ${name},

We keep Panameer a place people can trust by confirming who's who. Please take a few minutes to verify your identity — a quick upload plus a visual check, usually under five minutes, confirmed within 48 hours.

Please start within seven days; until then a few account features are limited.

Get Started: ${startUrl}
${learnMoreUrl ? `\nLearn more about identity verification: ${learnMoreUrl}\n` : ""}
Thanks for helping us keep Panameer a trusted place.

— Panameer Trust & Safety

${footerText(year)}`,
  };
}
