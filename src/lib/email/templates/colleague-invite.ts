import { capitalizeName } from "@/lib/display";
import {
  EMAIL_COLORS,
  emailShell,
  escapeHtml,
  footerText,
  primaryButton,
} from "@/lib/email/shell";

/**
 * "Come and look at this" — a colleague invitation (`P2-J3-E493`).
 *
 * ⚠⚠ THIS IS NOT `invite-provider.ts` AND IT IS NOT `recommendation-request.ts`,
 * and the names are close enough to reach for the wrong one:
 *
 *   `invite-provider`        a COORDINATOR asks a provider onto their ROSTER.
 *   `recommendation-request` asks somebody to VOUCH FOR the sender.
 *   ⚠ THIS ONE                asks somebody to JOIN PANAMEER. Nothing more.
 *
 * ⚠ A VOUCH REQUEST AND AN INVITATION ARE DIFFERENT ASKS AND READ DIFFERENTLY.
 * The brief is explicit: do not reuse the recommendation copy with words
 * swapped. A recommendation asks a favour of somebody who knows you; this offers
 * something to somebody who may not have heard of us, and the honest version of
 * that says what Panameer IS before it asks anything.
 *
 * ⚠⚠ IT PROMISES NOTHING ABOUT A REWARD. `/legal/referral-program-terms` is a
 * legal document, not a live programme, and copy that implied one would be a
 * commitment nobody has made.
 *
 * ⚠ THE INVITER'S OWN WORDS CARRY IT, quoted as a block and ESCAPED, never
 * rendered as HTML — it is user-supplied and it is going into an email body.
 */
export function colleagueInviteTemplate({
  inviterName,
  inviteeName,
  message,
  joinUrl,
}: {
  inviterName: string;
  inviteeName?: string | null;
  message?: string | null;
  joinUrl: string;
}): { subject: string; html: string; text: string } {
  const who = capitalizeName(inviterName);
  const greeting = inviteeName ? `Hi ${capitalizeName(inviteeName)},` : "Hi,";
  const subject = `${who} thinks you should see Panameer`;

  const body = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${EMAIL_COLORS.ink};">
      ${escapeHtml(greeting)}
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${EMAIL_COLORS.ink};">
      <b>${escapeHtml(who)}</b> uses Panameer and thought you would want to know about it.
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${EMAIL_COLORS.ink};">
      Panameer is a marketplace for Oracle and ERP services. Buyers describe the
      work they need; people who do that work for a living put their experience
      in front of them. It is free to join and free to look around.
    </p>
    ${
      message
        ? `<blockquote style="margin:0 0 16px;padding:12px 16px;border-left:3px solid ${EMAIL_COLORS.line};font-size:15px;line-height:1.55;color:${EMAIL_COLORS.ink};">${escapeHtml(
            message
          )}</blockquote>`
        : ""
    }
    ${primaryButton(joinUrl, "Take A Look")}
    <p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:${EMAIL_COLORS.muted};">
      ${/* ⚠ SAYS WHAT IT IS NOT. An invitation that does not disclaim a
            relationship reads as one. */ ""}
      This is an invitation, not an account. Nothing has been created for you and
      ${escapeHtml(who)} cannot see anything about you unless you join and choose
      to connect.
    </p>
  `;

  return {
    subject,
    html: emailShell({ bodyHtml: body }),
    text: [
      greeting,
      "",
      `${who} uses Panameer and thought you would want to know about it.`,
      "",
      "Panameer is a marketplace for Oracle and ERP services. Buyers describe the work they need; people who do that work for a living put their experience in front of them. It is free to join and free to look around.",
      ...(message ? ["", `"${message}"`] : []),
      "",
      `Take a look: ${joinUrl}`,
      "",
      `This is an invitation, not an account. Nothing has been created for you and ${who} cannot see anything about you unless you join and choose to connect.`,
      "",
      footerText(new Date().getFullYear()),
    ].join("\n"),
  };
}
