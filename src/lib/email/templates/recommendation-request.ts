import { capitalizeName } from "@/lib/display";

/**
 * "Would you recommend me?" — sent to a CONTACT, not to a user (J2.4 WS-F).
 *
 * Modelled on the project-validation email, which is the other message in this
 * product that lands in a stranger's inbox: brand mark, one clear ask, Title-Case
 * buttons, and no commercial detail. Nobody is being sold anything here; a
 * person is being asked a favour on someone else's behalf, and an email that
 * reads as marketing gets that favour refused.
 *
 * THE PROVIDER'S OWN WORDS CARRY IT. `message` is quoted as a block rather than
 * paraphrased — the recipient knows this person and the covering note is the
 * reason they will answer. Rendered as escaped text, never as HTML: it is
 * user-supplied and it is going into an email body.
 *
 * The `invite` footer only appears for a contact with no Panameer account. An
 * existing member being recruited reads as a product that doesn't know its own
 * users.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function recommendationRequestTemplate({
  providerName,
  contactName,
  message,
  respondUrl,
  invite,
  logoUrl,
  marketingUrl = "https://panameer.com",
}: {
  providerName: string;
  contactName: string;
  message: string;
  respondUrl: string;
  invite: boolean;
  logoUrl?: string;
  marketingUrl?: string;
}): { subject: string; html: string; text: string } {
  const provider = capitalizeName(providerName);
  const contact = capitalizeName(contactName);
  const declineUrl = `${respondUrl}?decline=1`;
  const subject = `${provider} asked you for a recommendation`;

  const logoBlock = logoUrl
    ? `<img src="${logoUrl}" alt="Panameer" width="180" height="25" style="display:block;border:0;height:auto;width:180px;max-width:180px;">`
    : `<div style="font-size:22px;font-weight:800;letter-spacing:-.5px;color:#272334;">Panameer</div>`;

  const quoted = escapeHtml(message)
    .split("\n")
    .map((line) => (line.trim() ? `<p style="margin:0 0 10px;">${line}</p>` : ""))
    .join("");

  const inviteBlock = invite
    ? `<tr><td style="padding:24px 32px 32px;border-top:1px solid #ECE9F1;">
         <div style="font-size:15px;font-weight:700;color:#272334;">What Is Panameer?</div>
         <p style="margin:8px 0 14px;font-size:14px;line-height:1.6;color:#4A4658;">
           A marketplace for Oracle Cloud and enterprise-application talent, training and services.
           If you deliver this kind of work too, you can put up your own profile in a few minutes.
         </p>
         <a href="${marketingUrl}/join" style="display:inline-block;padding:10px 20px;border-radius:999px;border:1.5px solid #D72CD6;color:#D72CD6;font-weight:700;font-size:14px;text-decoration:none;">
           Create Your Own Profile
         </a>
       </td></tr>`
    : "";

  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#F7F7F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;">
    <tr><td style="padding:28px 32px 0;">${logoBlock}</td></tr>
    <tr><td style="padding:20px 32px 0;">
      <h1 style="margin:0;font-size:21px;line-height:1.3;color:#272334;">Hi ${escapeHtml(contact)}, would you recommend ${escapeHtml(provider)}?</h1>
      <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#4A4658;">
        ${escapeHtml(provider)} is building a profile on Panameer and asked whether you'd write a few sentences about working together. It takes a couple of minutes and appears on their public profile.
      </p>
    </td></tr>
    <tr><td style="padding:18px 32px 0;">
      <div style="border-left:3px solid #D72CD6;padding:2px 0 2px 14px;font-size:14.5px;line-height:1.6;color:#4A4658;">
        ${quoted}
      </div>
    </td></tr>
    <tr><td style="padding:24px 32px 28px;">
      <a href="${respondUrl}" style="display:inline-block;padding:12px 26px;border-radius:999px;background:#D72CD6;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;">Write A Recommendation</a>
      <a href="${declineUrl}" style="display:inline-block;margin-left:14px;padding:12px 8px;color:#4A4658;font-weight:600;font-size:14px;text-decoration:none;">No Thanks</a>
    </td></tr>
    ${inviteBlock}
  </table>
</body></html>`;

  const text = [
    `Hi ${contact},`,
    ``,
    `${provider} is building a profile on Panameer and asked whether you'd write a few sentences about working together.`,
    ``,
    message,
    ``,
    `Write a recommendation: ${respondUrl}`,
    `No thanks: ${declineUrl}`,
    ...(invite
      ? ["", `Panameer is a marketplace for Oracle Cloud and enterprise-application talent, training and services. ${marketingUrl}/join`]
      : []),
  ].join("\n");

  return { subject, html, text };
}
