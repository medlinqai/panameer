import { capitalizeName } from "@/lib/display";
import { EMAIL_COLORS, emailShell, escapeHtml, footerText, primaryButton } from "@/lib/email/shell";

// "<Name> wants to connect with you on Panameer" (Scott 2026-10-05): who, their note, one line on Panameer,
// View <First>'s Profile, and that you don't have to join to look. No pitch, no absolutes.
export type ConnectInviteInput = {
  fromName: string;
  fromFirstName?: string | null;
  fromTitle?: string | null;
  fromCompany?: string | null;
  companyUrl?: string | null;
  note?: string | null;
  recipientFirstName?: string | null;
  profileUrl: string;
  /** For people without an account: where to accept. Omitted for members (they answer in-app). */
  acceptUrl?: string | null;
};

const P = (size: number, color: string = EMAIL_COLORS.ink, margin = "0 0 16px") =>
  `margin:${margin};font-size:${size}px;line-height:1.55;color:${color};`;

export function connectInviteTemplate(i: ConnectInviteInput): { subject: string; html: string; text: string } {
  const who = capitalizeName(i.fromName);
  const first = capitalizeName(i.fromFirstName?.trim() || who.split(" ")[0] || who);
  const greeting = i.recipientFirstName ? `Hi ${capitalizeName(i.recipientFirstName)},` : "Hi,";
  const companyHtml = i.fromCompany
    ? i.companyUrl
      ? `<a href="${i.companyUrl}" style="color:${EMAIL_COLORS.magentaDark};text-decoration:underline;">${escapeHtml(i.fromCompany)}</a>`
      : escapeHtml(i.fromCompany)
    : "";
  const meta = [i.fromTitle ? escapeHtml(i.fromTitle) : "", companyHtml].filter(Boolean).join(" · ");
  const metaText = [i.fromTitle, i.fromCompany].filter(Boolean).join(" · ");
  // A member gets a connection request; "invitation" is only for someone not on Panameer yet (2026-10-08).
  const ask = i.acceptUrl ? `${who} wants to connect with you on Panameer` : `${who} sent you a connection request on Panameer`;
  const subject = ask;
  const body = `
    <p style="${P(15)}">${escapeHtml(greeting)}</p>
    <p style="${P(16, EMAIL_COLORS.ink, "0 0 4px")}"><b>${escapeHtml(ask)}.</b></p>
    ${meta ? `<p style="${P(14, EMAIL_COLORS.muted)}">${meta}</p>` : ""}
    ${
      i.note
        ? `<blockquote style="margin:0 0 16px;padding:12px 16px;border-left:3px solid ${EMAIL_COLORS.line};font-size:15px;line-height:1.55;color:${EMAIL_COLORS.ink};">${escapeHtml(i.note)}</blockquote>`
        : ""
    }
    <p style="${P(15)}">Panameer is where people who buy and deliver Oracle and ERP work find each other and keep in touch.</p>
    ${primaryButton(i.profileUrl, `View ${first}'s Profile`)}
    <p style="${P(13, EMAIL_COLORS.muted, "16px 0 0")}">
      ${
        i.acceptUrl
          ? `You don&rsquo;t have to join to look. To connect, <a href="${i.acceptUrl}" style="color:${EMAIL_COLORS.magentaDark};text-decoration:underline;">accept the invitation</a>.`
          : "Accept or decline from Connect on Panameer."
      }
    </p>
  `;
  return {
    subject,
    html: emailShell({ bodyHtml: body }),
    text: [
      greeting,
      "",
      `${ask}.`,
      ...(metaText ? [metaText] : []),
      ...(i.note ? ["", `"${i.note}"`] : []),
      "",
      "Panameer is where people who buy and deliver Oracle and ERP work find each other and keep in touch.",
      "",
      `View ${first}'s profile: ${i.profileUrl}`,
      "",
      i.acceptUrl ? `You don't have to join to look. To connect, accept the invitation: ${i.acceptUrl}` : "Accept or decline from Connect on Panameer.",
      "",
      footerText(new Date().getFullYear()),
    ].join("\n"),
  };
}
