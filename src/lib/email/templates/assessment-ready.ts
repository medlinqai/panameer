import {
  EMAIL_COLORS,
  emailShell,
  escapeHtml,
  footerText,
  primaryButton,
} from "@/lib/email/shell";

/**
 * "Your report is ready" — the magic-link email (WS-B, step 4 of the copy
 * prototype).
 *
 * ── THE NUMBER IS NOT IN THE EMAIL ───────────────────────────────────────────
 *
 * It teases "self-funding" and stops. That is the prototype's design and it is
 * the reason the email works: the figure lives behind the one-click account, so
 * opening the report is worth doing. Putting the funding range in the subject
 * line would spend the only currency this email has — and would also put an
 * unlabelled tax claim into an inbox, outside the surface where Scott controls
 * how it is presented.
 *
 * Warm, names the company, and says plainly that an account gets created, so
 * the click is not a surprise.
 */
export function assessmentReadyTemplate({
  companyName,
  processName,
  reportUrl,
  logoUrl,
}: {
  companyName: string;
  processName: string;
  reportUrl: string;
  logoUrl?: string;
}): { subject: string; html: string; text: string } {
  const subject = `Your ${processName} AI opportunity — report's ready`;
  const co = escapeHtml(companyName);
  const proc = escapeHtml(processName);

  const bodyHtml = `
            <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hi there,</p>
            <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">
              Our AI worked through your ${proc} answers for
              <strong>${co}</strong> and built your report. Short version: there&rsquo;s a
              meaningful opportunity here, and a good chunk of it looks
              <strong>self-funding</strong> through the tax treatment.
            </p>
            <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">
              Open it to see your estimated Year-1 numbers, the highest-impact moves,
              and the fastest ones to start with.
            </p>
            ${primaryButton(reportUrl, "Open My Report")}
            <p style="margin:24px 0 8px;font-size:14px;line-height:1.6;color:${EMAIL_COLORS.muted};">
              You&rsquo;ll set up a quick account (one click from this link) so your report is
              saved and you can come back to it.
            </p>
            <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:${EMAIL_COLORS.muted};">
              A real expert reviews the shortlist before your call — AI does the analysis,
              a person owns the conversation.
            </p>`;

  const text = [
    `Your ${processName} AI opportunity — report's ready`,
    "",
    `Our AI worked through your ${processName} answers for ${companyName} and built your report.`,
    "There's a meaningful opportunity here, and a good chunk of it looks self-funding through the tax treatment.",
    "",
    `Open my report: ${reportUrl}`,
    "",
    "You'll set up a quick account (one click from this link) so your report is saved.",
    "",
    footerText(new Date().getFullYear()),
  ].join("\n");

  return { subject, html: emailShell({ logoUrl, bodyHtml }), text };
}

/**
 * The colleague invite (WS-E) — "Dana thought you should see this".
 *
 * FROM THE COLLEAGUE, NOT FROM US. The subject names the sender and the body
 * leads with them, because that is the entire mechanism: an invite from someone
 * you work with gets answered and a cold email from a vendor does not. The
 * honesty rail is that it never pretends to BE from them — it is sent by
 * Panameer, on their behalf, and says so.
 */
export function assessmentInviteTemplate({
  fromName,
  companyName,
  processName,
  assessUrl,
  logoUrl,
}: {
  fromName: string;
  companyName: string;
  processName: string;
  assessUrl: string;
  logoUrl?: string;
}): { subject: string; html: string; text: string } {
  const subject = `${fromName} asked me to send you this — ${processName} at ${companyName}`;
  const bodyHtml = `
            <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">
              <strong>${escapeHtml(fromName)}</strong> just finished a free AI opportunity
              assessment for ${escapeHtml(companyName)} and thought you should do the one for
              <strong>${escapeHtml(processName)}</strong> — the area you are most familiar with.
            </p>
            <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">
              It&rsquo;s about eight minutes, and it gets you your own report: what the
              opportunity is worth in your numbers, and which moves come first.
            </p>
            ${primaryButton(assessUrl, "Start My Assessment")}
            <p style="margin:24px 0 8px;font-size:14px;line-height:1.6;color:${EMAIL_COLORS.muted};">
              Sent by Panameer at ${escapeHtml(fromName)}&rsquo;s request.
            </p>`;
  const text = [
    subject,
    "",
    `${fromName} just finished a free AI opportunity assessment for ${companyName} and thought you should do the one for ${processName}.`,
    "",
    `Start: ${assessUrl}`,
    "",
    `Sent by Panameer at ${fromName}'s request.`,
    "",
    footerText(new Date().getFullYear()),
  ].join("\n");
  return { subject, html: emailShell({ logoUrl, bodyHtml }), text };
}
