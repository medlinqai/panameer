import { capitalizeName } from "@/lib/display";

/**
 * "Your project was validated" — the ONE event this brief notifies the provider
 * about (brief_project_validation §6).
 *
 * Only fires on a CONFIRM. A decline is a conversation to have with the client
 * directly, not something to push at the provider the moment it happens.
 */
export function projectValidatedTemplate({
  firstName,
  projectName,
  clientName,
  profileUrl,
  logoUrl,
}: {
  firstName: string;
  projectName: string;
  clientName: string;
  profileUrl: string;
  logoUrl?: string;
}): { subject: string; html: string; text: string } {
  const name = capitalizeName(firstName);
  const subject = `${projectName} is now validated ✓`;

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
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;border:1px solid #ece9f1;overflow:hidden;">
          <tr><td style="padding:32px 40px 8px;">${logoBlock}</td></tr>
          <tr><td style="padding:8px 40px 0;">
            <h1 style="font-size:22px;margin:0 0 12px;color:#272334;">
              Good news${name ? `, ${escapeHtml(name)}` : ""} &mdash; that&rsquo;s confirmed
            </h1>
            <p style="font-size:15px;line-height:1.65;color:#4a4658;margin:0 0 20px;">
              Your contact at <b style="color:#272334;">${escapeHtml(clientName)}</b>
              confirmed you worked on
              <b style="color:#272334;">${escapeHtml(projectName)}</b>. It now carries
              the Validated &#10003; badge on your profile.
            </p>
            <a href="${profileUrl}"
               style="display:inline-block;background:#D72CD6;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:999px;">
              View My Profile
            </a>
          </td></tr>
          <tr><td style="padding:28px 40px 32px;">
            <hr style="border:0;border-top:1px solid #ece9f1;margin:0 0 16px;">
            <p style="font-size:12px;color:#8a8199;margin:0;">
              Validated projects stand out to buyers. Adding a contact to your other
              projects is the fastest way to earn more badges.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = `Good news${name ? `, ${name}` : ""} — that's confirmed.

Your contact at ${clientName} confirmed you worked on ${projectName}.
It now carries the Validated badge on your profile.

${profileUrl}`;

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
