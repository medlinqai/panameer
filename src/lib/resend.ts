import { Resend } from "resend";

/**
 * Resend email client + a small typed helper.
 * Set RESEND_API_KEY and EMAIL_FROM in your environment.
 *
 * The client is created lazily (not at module load) because the Resend
 * constructor throws when RESEND_API_KEY is unset — which would break
 * `next build`'s page-data collection for any route that imports this module.
 * Callers should only reach sendEmail() when a key is configured.
 */
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

/**
 * IS MAIL CONFIGURED AT ALL? — read at CALL time, never at module load.
 *
 * A missing `RESEND_API_KEY` is a CONFIGURATION FACT, not an outage, and the
 * two must not read the same in the logs: "the key is absent" is something a
 * developer fixes in `.env.local`, while "Resend rejected the send" is
 * something operations chases. Callers branch on this so they can say which
 * one happened — see `api/assessment/route.ts`.
 *
 * ⚠ THIS IS NOT A STARTUP CHECK AND MUST NEVER BECOME ONE. It returns a
 * boolean; it does not throw. A deployment with no mail key has to keep
 * booting, because every non-mail surface in the app still works without it.
 */
export function mailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

/** Verified sender. Uses Resend's shared sandbox address until you verify a domain. */
export const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "Panameer <onboarding@resend.dev>";

type SendEmailArgs = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
}: SendEmailArgs) {
  const { data, error } = await getResend().emails.send({
    from: EMAIL_FROM,
    to,
    subject,
    html,
    text,
    replyTo,
  });

  if (error) {
    throw new Error(`Resend failed to send email: ${error.message}`);
  }

  return data;
}
