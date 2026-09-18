import { EMAIL_FROM, mailCaptureEnabled, sendingEnvironment } from "@/lib/resend";

/**
 * ── ⚠⚠ WHAT THIS ENVIRONMENT ACTUALLY DOES WITH MAIL (`P2-J3-E522`) ────────
 *
 * ⚠⚠ THE TRIPWIRE HAS TO BE A RUNTIME SURFACE, AND THIS IS WHY. A static gate
 * cannot see an environment it does not run in: `check:email` greps the SOURCE
 * of `resend.ts` for the sandbox fallback, so it stayed green while localhost
 * sent real mail for six days and Vercel sent real mail for TWO MONTHS.
 * ⚠ Scott, 2026-09-17: *"Tonight cost hours because the only way to know was
 * inference."*
 *
 * ⚠⚠⚠ DOMAIN ONLY, NEVER THE LOCAL PART, NEVER THE WHOLE VALUE. Scott: *"It is
 * a screen people screenshot."* ⚠ `EMAIL_FROM` is a Vercel SECRET and commonly
 * carries a display name (`Panameer <no-reply@…>`); this returns the domain and
 * nothing else, so the card can be photographed and pasted safely.
 */
export type SendingState = {
  /** `localhost` · `production` · `preview` · `unknown`. */
  environment: string;
  /** ⚠ DOMAIN ONLY. Null if it cannot be parsed. */
  domain: string | null;
  /** True when mail is written to disk instead of sent. */
  captured: boolean;
  /** ⚠ Real mail leaves this environment for real addresses. */
  live: boolean;
  /**
   * ⚠⚠ THE COMBINATION NOBODY INTENDS: live sending from a PREVIEW.
   * ⚠ Previews share the ONE database with production, so a preview branch can
   * mail real members from code that was never reviewed.
   */
  alarming: boolean;
  /** Still on Resend's shared sandbox, which only delivers to the account owner. */
  sandbox: boolean;
};

export function sendingState(): SendingState {
  const at = EMAIL_FROM.lastIndexOf("@");
  const domain =
    at === -1
      ? null
      : EMAIL_FROM.slice(at + 1)
          .replace(/[>\s"']/g, "")
          .toLowerCase() || null;

  const captured = mailCaptureEnabled();
  const environment = sendingEnvironment();
  const sandbox = domain === "resend.dev";
  /* ⚠ LIVE means "reaches a real address": not captured, and not the sandbox
     sender that physically refuses everyone but the account owner. */
  const live = !captured && !sandbox;

  return {
    environment,
    domain,
    captured,
    live,
    sandbox,
    alarming: live && environment === "preview",
  };
}

/**
 * ⚠ ONE LINE FOR THE BUILD OUTPUT. Scott wanted it *"in the build output where I
 * see it without signing in"* — the card answers the question for whoever opens
 * it; this answers it for whoever reads a deploy log, which is cheaper still.
 */
export function sendingStateLine(s: SendingState = sendingState()): string {
  if (s.captured) return `[mail] CAPTURED — no mail leaves ${s.environment}`;
  if (s.sandbox) return `[mail] SANDBOX — ${s.environment}, only the Resend account owner can receive`;
  const warn = s.alarming ? "  ⚠⚠ LIVE FROM A PREVIEW — previews share the production database" : "";
  return `[mail] REAL SENDING: LIVE from ${s.environment}, as ${s.domain ?? "unknown domain"}${warn}`;
}
