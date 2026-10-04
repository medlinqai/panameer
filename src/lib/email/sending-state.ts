import { NON_PRODUCTION_ALLOWLIST } from "@/lib/email/non-production-allowlist";
import { EMAIL_FROM, mailCaptureEnabled, sendingEnvironment } from "@/lib/resend";

export type SendingState = {
  /** `localhost` · `production` · `preview` · `unknown`. */
  environment: string;
  domain: string | null;
  /** True when mail is written to disk instead of sent. */
  captured: boolean;
  live: boolean;
  alarming: boolean;
  /** Still on Resend's shared sandbox, which only delivers to the account owner. */
  sandbox: boolean;
  containedToAllowlist: boolean;
  allowlistCount: number;
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
  const live = !captured && !sandbox;

  const containedToAllowlist = environment !== "production";

  return {
    environment,
    domain,
    captured,
    live,
    sandbox,
    containedToAllowlist,
    allowlistCount: NON_PRODUCTION_ALLOWLIST.length,
    alarming: live && environment === "preview" && NON_PRODUCTION_ALLOWLIST.length > 0,
  };
}

export function sendingStateLine(s: SendingState = sendingState()): string {
  if (s.captured) return `[mail] CAPTURED — no mail leaves ${s.environment}`;
  if (s.sandbox) return `[mail] SANDBOX — ${s.environment}, only the Resend account owner can receive`;
  const warn = s.alarming ? "  ⚠⚠ LIVE FROM A PREVIEW — previews share the production database" : "";
  return `[mail] REAL SENDING: LIVE from ${s.environment}, as ${s.domain ?? "unknown domain"}${warn}`;
}
