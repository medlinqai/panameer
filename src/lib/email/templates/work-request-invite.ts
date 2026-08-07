import { capitalizeName } from "@/lib/display";
import {
  EMAIL_COLORS,
  chips,
  emailShell,
  escapeHtml,
  footerText,
  ghostButton,
  greeting,
  paragraph,
  primaryButton,
  section,
  signOff,
} from "@/lib/email/shell";

/**
 * INVITE TO PROPOSE (WS-C).
 *
 * NOT `invite-provider.ts`. That one asks a stranger to JOIN Panameer; this
 * asks an existing provider to propose on one Work Request. The brief calls the
 * distinction out because the filenames are close enough to grab the wrong one.
 *
 * TWO ACTIONS, ONE FILL. "Submit a Proposal" is the magenta primary; "Decline"
 * is a ghost. Declining is a real and respectable answer — it should be easy to
 * find and obviously not the thing being urged.
 *
 * THE DESCRIPTION IS REQUESTER-AUTHORED AND IS ESCAPED. It is the only free
 * text in this suite that a third party wrote, and it lands in an HTML email;
 * `escapeHtml` is what stops a stray angle bracket becoming markup in someone
 * else's inbox.
 *
 * ⚠ NOT WIRED — there is no work-invitation model. The share page's Invite
 * button points at a titled placeholder, and that is the single call site this
 * template plugs into when the model lands.
 */
export function workRequestInviteTemplate({
  inviteeFirstName,
  requesterCompany,
  workRequestTitle,
  budgetLabel,
  description,
  skills,
  proposeUrl,
  declineUrl,
  personalNote,
  logoUrl,
}: {
  inviteeFirstName: string;
  requesterCompany: string;
  workRequestTitle: string;
  budgetLabel?: string | null;
  description?: string | null;
  skills?: string[];
  proposeUrl: string;
  declineUrl: string;
  /** The deck's optional "personal note from the requester" block. */
  personalNote?: string | null;
  logoUrl?: string;
}): { subject: string; html: string; text: string } {
  const name = capitalizeName(inviteeFirstName);
  const company = escapeHtml(requesterCompany);
  const title = escapeHtml(workRequestTitle);
  const year = new Date().getFullYear();
  const skillList = skills ?? [];

  const budgetBit = budgetLabel
    ? ` <span style="color:${EMAIL_COLORS.muted};">· ${escapeHtml(budgetLabel)}</span>`
    : "";

  const descriptionBlock = description
    ? section("Description", escapeHtml(description).replace(/\n/g, "<br>"))
    : "";
  const skillsBlock = skillList.length > 0 ? section("Skills Needed", chips(skillList)) : "";

  const noteBlock = personalNote
    ? `<div style="margin:20px 0 0;padding:14px 16px;background:${EMAIL_COLORS.card};border-left:3px solid ${EMAIL_COLORS.magenta};border-radius:8px;">
         <p style="margin:0;font-size:14px;color:${EMAIL_COLORS.body};font-style:italic;">${escapeHtml(
           personalNote
         )}</p>
       </div>`
    : "";

  /*
    NO "ABOUT THE REQUESTER" BLOCK. The deck marks it optional and shown ONLY
    when real data exists — rating, reviews, total spend, hires, hire rate.
    Nothing has been transacted through Panameer, so every one of those would
    be a zero presented as a fact about this company. Omitted rather than
    rendered empty.
  */
  return {
    subject: `You're invited to propose — ${workRequestTitle}`,
    html: emailShell({
      logoUrl,
      bodyHtml: `<h1 style="font-size:22px;margin:0 0 16px;color:${EMAIL_COLORS.ink};">You're invited to propose</h1>
${greeting(name)}
${paragraph(
  `Companies come to Panameer to work with experts like you. <b style="color:${EMAIL_COLORS.ink};">${company}</b> ` +
    `has invited you to submit a proposal for a Work Request:`
)}
<p style="font-size:17px;line-height:1.5;margin:0 0 4px;">
  <a href="${proposeUrl}" style="color:${EMAIL_COLORS.magentaDark};font-weight:700;text-decoration:none;">${title}</a>${budgetBit}
</p>
${descriptionBlock}
${skillsBlock}
${noteBlock}
<div style="margin:28px 0 0;">
  ${primaryButton(proposeUrl, "Submit a Proposal")}
  <span style="display:inline-block;width:10px;"></span>
  ${ghostButton(declineUrl, "Decline")}
</div>
<p style="font-size:13px;line-height:1.6;color:${EMAIL_COLORS.muted};margin:18px 0 0;">
  Providers usually reply within 24 hours.
</p>
${signOff("The Panameer Team")}`,
    }),
    text: `You're invited to propose

Hi ${name},

Companies come to Panameer to work with experts like you. ${requesterCompany} has invited you to submit a proposal for a Work Request:

${workRequestTitle}${budgetLabel ? ` · ${budgetLabel}` : ""}
${description ? `\nDescription\n${description}\n` : ""}${
      skillList.length > 0 ? `\nSkills needed: ${skillList.join(", ")}\n` : ""
    }${personalNote ? `\n"${personalNote}"\n` : ""}
Submit a Proposal: ${proposeUrl}
Decline: ${declineUrl}

Providers usually reply within 24 hours.

— The Panameer Team

${footerText(year)}`,
  };
}
