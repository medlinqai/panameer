/**
 * Coordinator → provider invite email (brief_I). Inline styles only, Panameer
 * brand colors from brief_F (magenta #D72CD6, navy ink #171E3E). Pure function,
 * mirrors verify-email.ts.
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
  const greeting = inviteeFirstName ? `Hi ${escapeHtml(inviteeFirstName)},` : "Hi,";

  const messageBlock = message
    ? `<div style="margin:20px 0;padding:14px 16px;background:#faf8fc;border-left:3px solid #D72CD6;border-radius:8px;">
         <p style="margin:0;font-size:14px;color:#4a4658;font-style:italic;">${escapeHtml(message)}</p>
       </div>`
    : "";

  const html = `<!doctype html>
<html>
  <head>
    <!-- E062 — declare the charset. Without it an em-dash or a curly quote
         renders as mojibake wherever the client falls back to Latin-1. This
         template is all-ASCII today; the meta tag is what keeps the next copy
         edit from silently breaking it. -->
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
  </head>
  <body style="margin:0;padding:0;background:#faf8fc;font-family:Arial,Helvetica,sans-serif;color:#171E3E;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf8fc;padding:32px 0;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;border:1px solid #ece9f1;overflow:hidden;">
          <tr><td style="padding:32px 40px 8px;">
            <div style="font-size:22px;font-weight:800;letter-spacing:-.5px;color:#171E3E;">Panameer</div>
          </td></tr>
          <tr><td style="padding:8px 40px 0;">
            <h1 style="font-size:21px;margin:0 0 12px;color:#171E3E;">
              ${escapeHtml(coordinatorName)} invited you to join Panameer
            </h1>
            <p style="font-size:15px;line-height:1.6;color:#4a4658;margin:0 0 8px;">${greeting}</p>
            <p style="font-size:15px;line-height:1.6;color:#4a4658;margin:0 0 4px;">
              <b>${escapeHtml(coordinatorName)}</b> has invited you to join Panameer as a
              service provider and build your profile. Accept the invitation to get started.
            </p>
            ${messageBlock}
            <a href="${acceptUrl}"
               style="display:inline-block;margin-top:16px;background:#D72CD6;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:999px;">
              Accept invitation
            </a>
            <p style="font-size:13px;line-height:1.6;color:#8a8199;margin:24px 0 0;">
              This invitation expires in 7 days. If the button doesn't work, paste this
              URL into your browser:<br>
              <a href="${acceptUrl}" style="color:#B324B2;word-break:break-all;">${acceptUrl}</a>
            </p>
          </td></tr>
          <tr><td style="padding:28px 40px 32px;">
            <hr style="border:0;border-top:1px solid #ece9f1;margin:0 0 16px;">
            <p style="font-size:12px;color:#8a8199;margin:0;">
              If you weren't expecting this invitation, you can safely ignore this email.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = `${greeting}

${coordinatorName} has invited you to join Panameer as a service provider.
${message ? `\n"${message}"\n` : ""}
Accept the invitation:
${acceptUrl}

This invitation expires in 7 days. If you weren't expecting it, ignore this email.`;

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
