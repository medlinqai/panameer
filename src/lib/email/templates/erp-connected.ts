import { emailShell, escapeHtml, primaryButton } from "@/lib/email/shell";

// EO-E004: to the first requester of a self-connected ERP — what happened, Confirm Your Company & Set a Password, setup notes.
export function erpConnectedTemplate({ firstName, companyName, identity, confirmUrl, connectUrl, logoUrl }: { firstName: string; companyName: string; identity: string; confirmUrl: string; connectUrl: string; logoUrl?: string }): { subject: string; html: string; text: string } {
  const subject = "Panameer Is Connected to Your Oracle Cloud";
  const hi = firstName ? `Hi ${escapeHtml(firstName)},` : "Hi,";
  const html = emailShell({
    logoUrl,
    bodyHtml: `
      <h1 style="margin:0 0 14px;font-size:24px;line-height:1.2;">Panameer is connected to your Oracle Cloud</h1>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.55;">${hi} your first punch-in from <b>${escapeHtml(identity)}</b> just set up <b>${escapeHtml(companyName)}</b> on Panameer, with you as its company admin. You can shop from Oracle right away.</p>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.55;">Confirm your company and set a password so you can also sign in on the web, add colleagues and appoint another admin.</p>
      <p style="margin:0 0 22px;">${primaryButton(confirmUrl, "Confirm Your Company & Set a Password")}</p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.55;"><b>Your setup:</b> Punchout URL https://app.panameer.com/api/cxml/punchout · Direct cXML · Domain NetworkID · Supplier ID PANAMEER · your own Identity (${escapeHtml(identity)}) and Password.</p>
      <p style="margin:0;font-size:14px;line-height:1.55;">Step-by-step notes and the two short setup videos: <a href="${escapeHtml(connectUrl)}">${escapeHtml(connectUrl)}</a>. This link is good for 7 days and works once.</p>`,
  });
  const text = `Panameer is connected to your Oracle Cloud

${firstName ? `Hi ${firstName},` : "Hi,"} your first punch-in from ${identity} set up ${companyName} on Panameer, with you as its company admin. You can shop from Oracle right away.

Confirm Your Company & Set a Password: ${confirmUrl}

Setup: Punchout URL https://app.panameer.com/api/cxml/punchout · Direct cXML · Domain NetworkID · Supplier ID PANAMEER · your own Identity (${identity}) and Password.
Notes and videos: ${connectUrl}
`;
  return { subject, html, text };
}

/** ES-E005: after Set Up Panameer — the replacement Identity and Password, a set-password link (requester only), the guide and videos. */
export function erpSetupTemplate({ firstName, companyName, values, passwordUrl, connectUrl, logoUrl }: { firstName: string; companyName: string; values: { identity: string; secret: string; punchoutUrl: string; supplierId: string; domain: string }; passwordUrl: string | null; connectUrl: string; logoUrl?: string }): { subject: string; html: string; text: string } {
  const subject = `${companyName} Is Set Up on Panameer — Your Punchout Values`;
  const rows: [string, string][] = [["Identity", values.identity], ["Password", values.secret], ["Punchout URL", values.punchoutUrl], ["Supplier ID", values.supplierId], ["Domain", values.domain]];
  const table = rows.map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;font-weight:700;">${k}</td><td style="padding:6px 0;font-family:monospace;">${escapeHtml(v)}</td></tr>`).join("");
  const html = emailShell({
    logoUrl,
    bodyHtml: `
      <h1 style="margin:0 0 14px;font-size:24px;line-height:1.2;">${escapeHtml(companyName)} is set up on Panameer</h1>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.55;">${firstName ? `Hi ${escapeHtml(firstName)}, r` : "R"}eplace the setup credential in your Panameer punchout catalog in Oracle (Manage Punchout Catalogs) with these values, Save, then Test Connection:</p>
      <table style="margin:0 0 18px;font-size:14px;border-collapse:collapse;">${table}</table>
      <p style="margin:0 0 14px;font-size:14px;line-height:1.55;">Keep the password safe — it's how Panameer knows your ERP. Your Panameer admin can rotate it.</p>
      ${passwordUrl ? `<p style="margin:0 0 22px;">${primaryButton(passwordUrl, "Set Your Panameer Password")}</p>` : ""}
      <p style="margin:0;font-size:14px;line-height:1.55;">The setup guide and short videos (catalog setup · show it on the shopping pages · add it to a Content Zone): <a href="${escapeHtml(connectUrl)}">${escapeHtml(connectUrl)}</a>.</p>`,
  });
  const text = `${companyName} is set up on Panameer

Replace the setup credential in your Panameer punchout catalog in Oracle (Manage Punchout Catalogs), Save, then Test Connection:
${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}
${passwordUrl ? `\nSet your Panameer password: ${passwordUrl}\n` : ""}
Setup guide and videos: ${connectUrl}
`;
  return { subject, html, text };
}
