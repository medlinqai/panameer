import { capitalizeName } from "@/lib/display";
import {
  EMAIL_COLORS,
  emailShell,
  escapeHtml,
  footerText,
  primaryButton,
} from "@/lib/email/shell";

/**
 * FINISH LATER — "continue the registration you started" (`P2-J1.1-E034`).
 *
 * ── ⚠⚠ WHY THIS IS A SECOND EMAIL AND NOT A LINE IN THE FIRST ────────────────
 *
 * SCOTT, 2026-09-06: *"These should be two separate emails. One is start your
 * registration...the other is finish the registration you started (or saved for
 * later)."*
 *
 * The verification email was carrying BOTH jobs — proving the address AND being
 * the only thing that ever brings a person back — which is exactly why it
 * over-promised (`E018`). Split the jobs and each email can tell the truth.
 *
 * ⚠ THE COPY IS SCOTT'S, VERBATIM, AND IS NOT PARAPHRASED: the heading
 * *"Continue your registration, {FirstName}"*, the body *"click here to continue
 * the registration you started"*, and the button *"Continue My Registration"*.
 *
 * ── ⚠⚠ THE SHAPE IS `work-request-draft-reminder.ts`'s. ITS FATE IS NOT ──────
 *
 * That template's docblock reads *"NOT WIRED — this needs a scheduler (a cron
 * sweep over DRAFTs older than N hours) and there is none in the repo; nothing
 * here fires on its own."* THIS ONE NEEDS NO SCHEDULER: `Finish later` is a user
 * action inside a request, so the send is SYNCHRONOUS on the click.
 * ⚠ A later "you still haven't finished" nudge WOULD need a sweep. That is a
 * different row and is deliberately not built here.
 *
 * ── ⚠⚠ TWO SUBJECTS, AND SHIPPING ONE WOULD HAVE BEEN THE `E015` MISTAKE ─────
 *
 * The PROVIDER subject is Scott's own words. The BUYER subject mirrors his
 * `New Service {Buyer|Provider} — …` pattern exactly — the same pattern
 * `verify-email.ts` already uses for its pair.
 * ⚠ THE ROW CAME FROM A BUYER (Layne, a requester), and `Finish later` today
 * exists ONLY on the requester wizard — the provider wizard's secondary is
 * `Skip for Now`, which skips a STEP rather than leaving the wizard. So the
 * buyer variant is the one currently wired; the provider variant is built,
 * asserted and ready for the surface that does not exist yet. Shipping only the
 * wired half is how `E015` left a lowercase provider subject behind.
 */
export type FinishLaterAudience = "seller" | "buyer";

export function finishLaterTemplate({
  firstName,
  resumeUrl,
  audience = "buyer",
  logoUrl,
}: {
  firstName: string;
  /**
   * ⚠⚠ THE WIZARD, NOT `/dashboard`. `E245`'s comment is the spec: *"Nothing is
   * cancelled by leaving: the account exists, the ToS is accepted, the email is
   * verified, every step already saved itself, and `onboarding_step` brings them
   * back to this exact screen."* A link to the dashboard would make this email a
   * WORSE VERSION OF THE BUTTON THAT SENT IT.
   * ⚠ No step is encoded in the URL on purpose — the wizard reads `resumeStep`
   * from the server itself, so the link cannot go stale if they resume elsewhere
   * first.
   */
  resumeUrl: string;
  audience?: FinishLaterAudience;
  /** Absolute — email clients cannot resolve app-relative paths (`E006`). */
  logoUrl?: string;
}): { subject: string; html: string; text: string } {
  const buyer = audience === "buyer";
  const subject = buyer
    ? "New Service Buyer — Continue Your Registration on Panameer"
    : "New Service Provider — Continue Your Registration on Panameer";

  const name = capitalizeName(firstName);
  const heading = `Continue your registration${name ? `, ${escapeHtml(name)}` : ""}`;
  const year = new Date().getFullYear();

  const html = emailShell({
    logoUrl,
    bodyHtml: `<h1 style="font-size:22px;margin:0 0 12px;color:${EMAIL_COLORS.ink};">${heading}</h1>
<p style="font-size:15px;line-height:1.6;color:${EMAIL_COLORS.body};margin:0 0 24px;">
  You saved your registration for later — click here to continue the registration you started.
  Nothing was lost: every step you finished is already saved.
</p>
${primaryButton(resumeUrl, "Continue My Registration")}
<p style="font-size:13px;line-height:1.6;color:${EMAIL_COLORS.muted};margin:24px 0 0;">
  If the button doesn't work, paste this URL into your browser:<br>
  <a href="${resumeUrl}" style="color:${EMAIL_COLORS.magentaDark};word-break:break-all;">${resumeUrl}</a>
</p>`,
  });

  const text = `Continue your registration${name ? `, ${name}` : ""}

You saved your registration for later — click here to continue the registration you started. Nothing was lost: every step you finished is already saved.

Continue My Registration: ${resumeUrl}

${footerText(year)}`;

  return { subject, html, text };
}
