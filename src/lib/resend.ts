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
