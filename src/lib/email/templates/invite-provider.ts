import { capitalizeName } from "@/lib/display";
import {
  EMAIL_COLORS,
  emailShell,
  escapeHtml,
  footerText,
  primaryButton,
} from "@/lib/email/shell";

/**
 * Coordinator → provider invite email (brief_I). On the shared shell since
 * WS-A, so it carries the same header and the same footer as the rest of the
 * suite — it had its own copy of both, plus its own logo-less wordmark.
 *
 * NOT the Work-Request invite. This one asks somebody to JOIN Panameer as a
 * provider; `work-request-invite.ts` asks an existing provider to propose on a
 * specific Work Request. The brief calls that out because the names are close
 * enough to reach for the wrong one.
 */
export function inviteProviderTemplate({
  coordinatorName,
  inviteeFirstName,
  acceptUrl,
  message,
}: {
  coordinatorName: string;
  inviteeFirstName?: string | null;
  acceptUrl: string;
  message?: string | null;
}): { subject: string; html: string; text: string } {
  const subject = `${coordinatorName} invited you to join Panameer as a service provider`;
  /*
    E006 — CAPITALISED. This template greeted "Hi scott," for anyone who typed
    their name in lower case at signup, which is the exact defect E006 fixed in
    verify-email and never reached here. Caught by `check:email`, which asserts
    the rule across every template rather than the one it was written for.
  */
  const inviteeName = inviteeFirstName ? capitalizeName(inviteeFirstName) : "";
  const greeting = inviteeName ? `Hi ${escapeHtml(inviteeName)},` : "Hi,";

  const messageBlock = message
    ? `<div style="margin:20px 0;padding:14px 16px;background:#faf8fc;border-left:3px solid #D72CD6;border-radius:8px;">
         <p style="margin:0;font-size:14px;color:#4a4658;font-style:italic;">${escapeHtml(message)}</p>
       </div>`
    : "";

  const html = emailShell({
    bodyHtml: `<h1 style="font-size:21px;margin:0 0 12px;color:${EMAIL_COLORS.ink};">
  ${escapeHtml(coordinatorName)} invited you to join Panameer
</h1>
<p style="font-size:15px;line-height:1.6;color:${EMAIL_COLORS.body};margin:0 0 8px;">${greeting}</p>
<p style="font-size:15px;line-height:1.6;color:${EMAIL_COLORS.body};margin:0 0 4px;">
  <b>${escapeHtml(coordinatorName)}</b> has invited you to join Panameer as a
  service provider and build your profile. Accept the invitation to get started.
</p>
${messageBlock}
<div style="margin-top:16px;">${primaryButton(acceptUrl, "Accept Invitation")}</div>
<p style="font-size:13px;line-height:1.6;color:${EMAIL_COLORS.muted};margin:24px 0 0;">
  This invitation expires in 7 days. If the button doesn't work, paste this URL into your browser:<br>
  <a href="${acceptUrl}" style="color:${EMAIL_COLORS.magentaDark};word-break:break-all;">${acceptUrl}</a>
</p>
<p style="font-size:12px;color:${EMAIL_COLORS.muted};margin:20px 0 0;">
  If you weren't expecting this invitation, you can safely ignore this email.
</p>`,
  });

  const text = `${greeting}

${coordinatorName} has invited you to join Panameer as a service provider.
${message ? `\n"${message}"\n` : ""}
Accept the invitation:
${acceptUrl}

This invitation expires in 7 days. If you weren't expecting it, ignore this email.

${footerText(new Date().getFullYear())}`;

  return { subject, html, text };
}
