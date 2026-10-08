import { capitalizeName } from "@/lib/display";
import { EMAIL_COLORS, emailShell, escapeHtml, footerText, primaryButton } from "@/lib/email/shell";

// Invitation to JOIN Panameer (Scott 2026-10-08): "invitation" = bring a non-member onto Panameer.
// Never connection wording here — that is the connection-request email (connect-invite.ts).
const P = (size: number, color: string = EMAIL_COLORS.ink, margin = "0 0 16px") =>
  `margin:${margin};font-size:${size}px;line-height:1.55;color:${color};`;

export function colleagueInviteTemplate({
  inviterName,
  inviterFirstName,
  inviterTitle,
  inviterCompany,
  companyUrl,
  inviteeName,
  message,
  profileUrl,
  joinUrl,
}: {
  inviterName: string;
  inviterFirstName?: string | null;
  inviterTitle?: string | null;
  inviterCompany?: string | null;
  companyUrl?: string | null;
  inviteeName?: string | null;
  message?: string | null;
  /** The inviter's public profile, when there is one. */
  profileUrl?: string | null;
  joinUrl: string;
}): { subject: string; html: string; text: string } {
  const who = capitalizeName(inviterName);
  const first = capitalizeName(inviterFirstName?.trim() || who.split(" ")[0] || who);
  const greeting = inviteeName ? `Hi ${capitalizeName(inviteeName)},` : "Hi,";
  const companyHtml = inviterCompany
    ? companyUrl
      ? `<a href="${companyUrl}" style="color:${EMAIL_COLORS.magentaDark};text-decoration:underline;">${escapeHtml(inviterCompany)}</a>`
      : escapeHtml(inviterCompany)
    : "";
  const meta = [inviterTitle ? escapeHtml(inviterTitle) : "", companyHtml].filter(Boolean).join(" · ");
  const metaText = [inviterTitle, inviterCompany].filter(Boolean).join(" · ");
  const subject = `${who} invited you to Panameer`;
  const pitch =
    "Panameer is where people who buy and deliver Oracle and ERP work find each other, learn from each other and get paid for what they know. It’s free to join.";
  const body = `
    <p style="${P(15)}">${escapeHtml(greeting)}</p>
    <p style="${P(16, EMAIL_COLORS.ink, "0 0 4px")}"><b>${escapeHtml(who)} invited you to join Panameer.</b></p>
    ${meta ? `<p style="${P(14, EMAIL_COLORS.muted)}">${meta}</p>` : ""}
    ${
      message
        ? `<blockquote style="margin:0 0 16px;padding:12px 16px;border-left:3px solid ${EMAIL_COLORS.line};font-size:15px;line-height:1.55;color:${EMAIL_COLORS.ink};">${escapeHtml(message)}</blockquote>`
        : ""
    }
    <p style="${P(15)}">${escapeHtml(pitch)}</p>
    ${primaryButton(joinUrl, "Join Panameer")}
    ${
      profileUrl
        ? `<p style="${P(13, EMAIL_COLORS.muted, "16px 0 0")}">Not ready yet? <a href="${profileUrl}" style="color:${EMAIL_COLORS.magentaDark};text-decoration:underline;">See ${escapeHtml(first)}&rsquo;s profile</a> first. You don&rsquo;t need an account to look.</p>`
        : ""
    }
  `;
  return {
    subject,
    html: emailShell({ bodyHtml: body }),
    text: [
      greeting,
      "",
      `${who} invited you to join Panameer.`,
      ...(metaText ? [metaText] : []),
      ...(message ? ["", `"${message}"`] : []),
      "",
      pitch,
      "",
      `Join Panameer: ${joinUrl}`,
      ...(profileUrl ? ["", `Not ready yet? See ${first}'s profile first. You don't need an account to look: ${profileUrl}`] : []),
      "",
      footerText(new Date().getFullYear()),
    ].join("\n"),
  };
}
