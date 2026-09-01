import { capitalizeName } from "@/lib/display";

/**
 * The project-validation request — sent to a CLIENT CONTACT, not to a user.
 *
 * This is the one email in the product that lands in an Oracle/ERP buyer's
 * inbox, so it is treated as a marketing asset rather than a system
 * notification (brief_project_validation §3): brand logo, one clear question,
 * two Title-Case buttons (E006), and a soft "What Is Panameer?" footer that
 * invites rather than sells.
 *
 * Deliberately contains NO commercial detail — no rate, no fee, no project
 * value. The recipient is being asked to confirm a fact, and anything that
 * reads as a pitch for their supplier's pricing would poison both the answer
 * and the brand impression.
 */
export function projectValidationTemplate({
  providerName,
  projectName,
  clientName,
  confirmUrl,
  logoUrl,
  marketingUrl = "https://panameer.com",
}: {
  providerName: string;
  projectName: string;
  clientName: string;
  confirmUrl: string;
  logoUrl?: string;
  marketingUrl?: string;
}): { subject: string; html: string; text: string } {
  const provider = capitalizeName(providerName);
  const subject = `Can you confirm ${provider} worked on ${projectName}?`;

  const declineUrl = `${confirmUrl}?decline=1`;

  const logoBlock = logoUrl
    ? `<img src="${logoUrl}" alt="Panameer" width="180" height="25"
           style="display:block;border:0;outline:none;text-decoration:none;height:auto;width:180px;max-width:180px;">`
    : `<div style="font-size:22px;font-weight:800;letter-spacing:-.5px;color:#272334;">Panameer</div>`;

  const html = `<!doctype html>
<html>
  <head>
    <!-- Non-ASCII punctuation (em-dashes, curly quotes) renders as mojibake
         wherever the client guesses Latin-1. Declare it and stop guessing. -->
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
  </head>
  <body style="margin:0;padding:0;background:#F0F7F8;font-family:Arial,Helvetica,sans-serif;color:#272334;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0F7F8;padding:32px 0;">
      <tr><td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;border:1px solid #ece9f1;overflow:hidden;">
          <tr><td style="padding:32px 40px 8px;">
            ${logoBlock}
          </td></tr>

          <tr><td style="padding:8px 40px 0;">
            <h1 style="font-size:22px;line-height:1.35;margin:0 0 16px;color:#272334;">
              Did ${escapeHtml(provider)} work on this project?
            </h1>

            <p style="font-size:15px;line-height:1.65;color:#4a4658;margin:0 0 20px;">
              <b style="color:#272334;">${escapeHtml(provider)}</b> listed a project
              they worked on with your team at
              <b style="color:#272334;">${escapeHtml(clientName)}</b>:
            </p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                   style="background:#F0F7F8;border:1px solid #ece9f1;border-radius:10px;margin:0 0 24px;">
              <tr><td style="padding:16px 18px;">
                <div style="font-size:16px;font-weight:700;color:#272334;">${escapeHtml(projectName)}</div>
                <div style="font-size:13px;color:#8a8199;margin-top:4px;">${escapeHtml(clientName)}</div>
              </td></tr>
            </table>

            <p style="font-size:15px;line-height:1.65;color:#4a4658;margin:0 0 24px;">
              One click is all we need — it takes a few seconds and no account.
            </p>

            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:10px;">
                  <a href="${confirmUrl}"
                     style="display:inline-block;background:#D72CD6;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:999px;">
                    Yes, They Worked On It
                  </a>
                </td>
                <td>
                  <a href="${declineUrl}"
                     style="display:inline-block;background:#ffffff;color:#4a4658;text-decoration:none;font-weight:700;font-size:15px;padding:12px 24px;border-radius:999px;border:1.5px solid #ece9f1;">
                    This Isn&rsquo;t Right
                  </a>
                </td>
              </tr>
            </table>

            <p style="font-size:13px;line-height:1.6;color:#8a8199;margin:24px 0 0;">
              This link expires in 30 days and can only be used once. If the buttons
              don&rsquo;t work, paste this into your browser:<br>
              <a href="${confirmUrl}" style="color:#B324B2;word-break:break-all;">${confirmUrl}</a>
            </p>
          </td></tr>

          <tr><td style="padding:28px 40px 32px;">
            <hr style="border:0;border-top:1px solid #ece9f1;margin:0 0 18px;">
            <div style="font-size:14px;font-weight:700;color:#272334;margin:0 0 6px;">
              What Is Panameer?
            </div>
            <p style="font-size:13px;line-height:1.65;color:#8a8199;margin:0 0 12px;">
              Panameer is where organizations find and buy expert services —
              including straight from the ERP they already work in. Confirmations
              like yours are what keep it trustworthy.
            </p>
            <a href="${marketingUrl}" style="font-size:13px;font-weight:700;color:#B324B2;text-decoration:none;">
              Take A Look &rarr;
            </a>
            <p style="font-size:12px;color:#b4aec2;margin:18px 0 0;">
              You received this because ${escapeHtml(provider)} named you as the
              contact for this project. If that&rsquo;s a mistake, you can ignore
              this email and nothing will be published.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = `Did ${provider} work on this project?

${provider} listed a project they worked on with your team at ${clientName}:

  ${projectName} — ${clientName}

Confirm they worked on it:
${confirmUrl}

That isn't right:
${declineUrl}

This link expires in 30 days and can only be used once.

What is Panameer?
Panameer is where organizations find and buy expert services — including
straight from the ERP they already work in. ${marketingUrl}

You received this because ${provider} named you as the contact for this
project. If that's a mistake, ignore this email and nothing will be published.`;

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
