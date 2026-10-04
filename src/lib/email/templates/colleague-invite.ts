import { capitalizeName } from "@/lib/display";
import {
  EMAIL_COLORS,
  emailShell,
  escapeHtml,
  footerText,
  primaryButton,
} from "@/lib/email/shell";

export function colleagueInviteTemplate({
  inviterName,
  inviteeName,
  message,
  joinUrl,
}: {
  inviterName: string;
  inviteeName?: string | null;
  message?: string | null;
  joinUrl: string;
}): { subject: string; html: string; text: string } {
  const who = capitalizeName(inviterName);
  const greeting = inviteeName ? `Hi ${capitalizeName(inviteeName)},` : "Hi,";
  /*
    ── ⚠⚠ `P2-J3-E523` — THE REPLACEMENT. SCOTT'S STRUCTURE, APPROVED 2026-09-15 ──

    ⚠ SUPERSEDED, quoted not deleted (`E164`):
        subject: `${who} thinks you should see Panameer`
        "<b>{who}</b> uses Panameer and thought you would want to know about it."
        "Panameer is a marketplace for Oracle and ERP services. Buyers describe
         the work they need; people who do that work for a living put their
         experience in front of them. It is free to join and free to look around."
        "This is an invitation, not an account. Nothing has been created for you
         and {who} cannot see anything about you unless you join and choose to
         connect."

    ⚠⚠ WHAT WAS WRONG WITH IT, MEASURED — Scott, 2026-09-15: *"the verbiage is
    not exciting and does not want to make me press the button. I MIGHT make me
    call phil and ask why he sent it."*
      1. *"thought you would want to know about it"* IS HEARSAY, NOT AN ASK. The
         sender is not vouching, requesting or offering; there is nothing to
         respond to.
      2. It described the PRODUCT, not the reader's situation — a category
         definition.
      3. ⚠⚠ A THIRD OF THE MESSAGE WAS REASSURANCE. Objections answered before
         any desire was created; defensive copy reads as a thing you need
         protecting from.

    ⚠⚠ THE CONCESSION IS DOING THE WORK. Leading with "we're different" makes a
    reader brace; conceding the ordinary FIRST makes the claim land as fact
    rather than pitch — and it makes the feature list cheap, one sentence instead
    of three bullets.
    ⚠ THE DISCLAIMER SURVIVES, at the bottom, in small type. It was a third of the
    message and is now one line. DO NOT DELETE IT.
    ⚠ NO SUPERLATIVES (Scott's standing rule) — no "never", no "always", and
    nothing unprovable.

    ⚠⚠ "A PAST ENGAGEMENT", NOT "A PAST PROJECT" — SCOTT, 2026-09-17, AND THE
    REASON IS NOT THE GATE. The approved draft said "a past project", which the
    email vocabulary rule bans. Three ways out were put to him and he took the
    one that changes the copy:
      *"ENGAGEMENT IS THE BETTER WORD — it is what a senior Oracle consultant
      actually says, and 'project' was my word, not my market's. The copy yields
      because the copy was weaker."*
    ⚠ HE REFUSED TO EXEMPT THE INVITATION: *"one sentence is not worth weakening
    a rule that covers 15 templates."*
    ⚠⚠ AND UNLOCKING "project" GENERALLY IS AN OPEN QUESTION, DELIBERATELY NOT
    DECIDED HERE — `Project` is a live model that renders on the profile, so the
    APP says a word the EMAILS ban. ⚠ Recorded against the vocabulary rule; do
    not settle it to unblock one sentence.
    ⚠ Seeded names carry `(32)` / `(11)` and they WILL appear in the subject.
    That is test data, NOT a defect.
  */
  const subject = `${who} invited you to Panameer`;

  const body = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${EMAIL_COLORS.ink};">
      ${escapeHtml(greeting)}
    </p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:${EMAIL_COLORS.ink};">
      <b>${escapeHtml(who)} uses Panameer and thinks you should too.</b>
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${EMAIL_COLORS.ink};">
      Panameer is where buyers and sellers of Oracle and ERP work find each other.
      Most of it is what you&rsquo;d expect: your r&eacute;sum&eacute; becomes a profile buyers
      can search by skill, work gets posted, and the learning paths for Oracle
      Cloud and AI cost nothing.
    </p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:${EMAIL_COLORS.ink};">
      <b>Then there&rsquo;s the part nobody else does.</b>
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${EMAIL_COLORS.ink};">
      On Panameer, work that has already been done gets sold again. A consultant
      who has built the same DocuSign integration a dozen times lists it once
      &mdash; fixed scope, fixed price, fixed timeline. A configuration workbook or a
      report built on a past engagement gets bought and imported on the next one.
    </p>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.55;color:${EMAIL_COLORS.ink};">
      <b>If you sell it:</b> income from work you already finished.
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${EMAIL_COLORS.ink};">
      <b>If you buy it:</b> a known price and a known date, instead of a discovery phase.
    </p>
    ${
      message
        ? `<blockquote style="margin:0 0 16px;padding:12px 16px;border-left:3px solid ${EMAIL_COLORS.line};font-size:15px;line-height:1.55;color:${EMAIL_COLORS.ink};">${escapeHtml(
            message
          )}</blockquote>`
        : ""
    }
    ${primaryButton(joinUrl, `See What ${who} Sees`)}
    <p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:${EMAIL_COLORS.muted};">
      ${ ""}
      No account has been created for you, and ${escapeHtml(who)} can&rsquo;t see
      anything about you unless you join and connect.
    </p>
  `;

  return {
    subject,
    html: emailShell({ bodyHtml: body }),
    text: [
      greeting,
      "",
      `${who} uses Panameer and thinks you should too.`,
      "",
      "Panameer is where buyers and sellers of Oracle and ERP work find each other. Most of it is what you'd expect: your résumé becomes a profile buyers can search by skill, work gets posted, and the learning paths for Oracle Cloud and AI cost nothing.",
      "",
      "Then there's the part nobody else does.",
      "",
      "On Panameer, work that has already been done gets sold again. A consultant who has built the same DocuSign integration a dozen times lists it once — fixed scope, fixed price, fixed timeline. A configuration workbook or a report built on a past engagement gets bought and imported on the next one.",
      "",
      "If you sell it: income from work you already finished.",
      "If you buy it: a known price and a known date, instead of a discovery phase.",
      ...(message ? ["", `"${message}"`] : []),
      "",
      `See what ${who} sees: ${joinUrl}`,
      "",
      `No account has been created for you, and ${who} can't see anything about you unless you join and connect.`,
      "",
      footerText(new Date().getFullYear()),
    ].join("\n"),
  };
}
