import { capitalizeName } from "@/lib/display";
import {
  EMAIL_COLORS,
  emailShell,
  escapeHtml,
  footerText,
  greeting,
  paragraph,
  section,
  signOff,
} from "@/lib/email/shell";

/**
 * WORK REQUEST REMOVED — Trust & Safety (WS-D).
 *
 * NO CTA BUTTON, deliberately, and it is the one email in the suite without
 * one. There is nothing to click that helps: the request is already gone, the
 * account is fine, and a magenta button under bad news reads as an upsell. The
 * only route offered is the reply address, which is where an appeal belongs.
 *
 * THE TONE IS THE DECK'S AND IT MATTERS. "Give the details another pass and
 * you're welcome to repost. If you think this was a mistake, reply and a person
 * will look." A removal notice that sounds automated and final is how a
 * good-faith requester leaves for good.
 *
 * ⚠ NOT WIRED — there is no moderation flow. Nothing in the admin console
 * removes a Work Request today, so there is no action to hang this on.
 */
export function workRequestRemovedTemplate({
  firstName,
  workRequestTitle,
  reasons,
  termsUrl = "https://panameer.com/terms",
  logoUrl,
}: {
  firstName: string;
  workRequestTitle: string;
  /** The specific failings, when the reviewer recorded any. */
  reasons?: string[];
  termsUrl?: string;
  logoUrl?: string;
}): { subject: string; html: string; text: string } {
  const name = capitalizeName(firstName);
  const title = escapeHtml(workRequestTitle);
  const year = new Date().getFullYear();
  const list = reasons ?? [];

  const reasonsBlock =
    list.length > 0
      ? section(
          "What we saw",
          `<ul style="margin:0;padding-left:20px;">${list
            .map(
              (r) =>
                `<li style="margin:0 0 6px;font-size:15px;line-height:1.6;color:${EMAIL_COLORS.body};">${escapeHtml(
                  r
                )}</li>`
            )
            .join("")}</ul>`
        )
      : "";

  return {
    subject: "Your Work Request was removed",
    html: emailShell({
      logoUrl,
      bodyHtml: `<h1 style="font-size:22px;margin:0 0 16px;color:${EMAIL_COLORS.ink};">Your Work Request was removed</h1>
${greeting(name)}
${paragraph(
  `We've removed your Work Request, <b style="color:${EMAIL_COLORS.ink};">"${title},"</b> because it looked ` +
    `incomplete, unclear, or unrelated to work to be completed on Panameer — which is against our ` +
    `<a href="${termsUrl}" style="color:${EMAIL_COLORS.magentaDark};">Terms of Use</a>.`
)}
${reasonsBlock}
${section(
  "What's next",
  `Your account is active and no action is required. Give the details another pass and you're welcome to repost. ` +
    `If you think this was a mistake, reply and a person will look.`
)}
${signOff("Panameer Trust & Safety")}`,
    }),
    text: `Your Work Request was removed

Hi ${name},

We've removed your Work Request, "${workRequestTitle}," because it looked incomplete, unclear, or unrelated to work to be completed on Panameer — which is against our Terms of Use (${termsUrl}).
${list.length > 0 ? `\nWhat we saw:\n${list.map((r) => `- ${r}`).join("\n")}\n` : ""}
What's next: your account is active and no action is required. Give the details another pass and you're welcome to repost. If you think this was a mistake, reply and a person will look.

— Panameer Trust & Safety

${footerText(year)}`,
  };
}
