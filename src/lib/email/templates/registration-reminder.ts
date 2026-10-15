import { capitalizeName } from "@/lib/display";
import { EMAIL_COLORS, emailShell, escapeHtml, footerText, paragraph, primaryButton } from "@/lib/email/shell";

// SO-E007: Day 1 "Pick up where you left off" and Day 7 "Your Panameer account is still waiting". Same for buyers and sellers.
export function registrationReminderTemplate({ firstName, step, resumeUrl, day, logoUrl }: { firstName: string; step: string; resumeUrl: string; day: 1 | 7; logoUrl?: string }) {
  const name = capitalizeName(firstName);
  const verify = step === "Verify Your Email";
  const subject = day === 1 ? "Pick up where you left off on Panameer" : "Your Panameer account is still waiting";
  const line = verify
    ? "You're one click from finishing: confirm your email and carry on."
    : day === 1
      ? `You stopped at ${escapeHtml(step)}. Everything you entered is saved — carry on from there.`
      : `Still there? You stopped at ${escapeHtml(step)}.`;
  const cta = verify ? "Verify My Email" : "Pick Up Where I Left Off";
  const html = emailShell({
    logoUrl,
    bodyHtml: `<h1 style="font-size:22px;margin:0 0 12px;color:${EMAIL_COLORS.ink};">${day === 1 ? "Pick up where you left off" : "Your account is still waiting"}${name ? `, ${escapeHtml(name)}` : ""}</h1>
${paragraph(line)}
${primaryButton(resumeUrl, cta)}
<p style="font-size:13px;line-height:1.6;color:${EMAIL_COLORS.muted};margin:24px 0 0;">If the button doesn't work, paste this into your browser:<br><a href="${resumeUrl}" style="color:${EMAIL_COLORS.magentaDark};word-break:break-all;">${resumeUrl}</a></p>`,
  });
  const text = `${subject}

${line.replace(/<[^>]+>/g, "")}

${cta}: ${resumeUrl}

${footerText(new Date().getFullYear())}`;
  return { subject, html, text };
}

/** SO-E009: an admin's personal note, plain and short. */
export function personalFollowupTemplate({ body, adminName, logoUrl }: { body: string; adminName: string; logoUrl?: string }) {
  const html = emailShell({
    logoUrl,
    bodyHtml: `${body.split(/\n{2,}/).map((p) => paragraph(escapeHtml(p).replace(/\n/g, "<br>"))).join("\n")}
${paragraph(`— ${escapeHtml(adminName)}, Panameer`)}`,
  });
  return { html, text: `${body}\n\n— ${adminName}, Panameer\n\n${footerText(new Date().getFullYear())}` };
}
