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

/**
 * ⚠⚠ THE CAPTURE TRANSPORT (`P1-ALL-E371` WS-A2).
 *
 * ── WHY IT EXISTS ─────────────────────────────────────────────────────────
 *
 * `EMAIL_FROM` defaults to Resend's shared sandbox, `onboarding@resend.dev`, and
 * that domain **only delivers to the address on the Resend account**. ⚠ THAT
 * CONSTRAINT IS THE SAFETY NET FOR WS-A: a stray send during testing cannot
 * reach a real member. But it also means a SECOND recipient — a colleague
 * invite, a coordinator invite — cannot be tested by sending at all.
 *
 * ⚠ SO CAPTURE WRITES THE RENDERED MAIL TO DISK INSTEAD OF SENDING. Subject, to
 * and HTML, one file per send, into a GITIGNORED directory. Nothing captured
 * goes near the repo.
 *
 * ⚠⚠ IT IS NEVER THE DEFAULT, AND `check:email` ASSERTS THAT. Absent env var =
 * send normally. A capture mode that switched itself on would be the worst
 * possible failure: every transactional email silently stops reaching anyone
 * while the code reports success. The variable must be set EXPLICITLY to `1`.
 *
 * ⚠ NO ADMIN SCREEN, DELIBERATELY. The files are plain HTML and open in a
 * browser; a screen is a surface with its own design, its own access rule and
 * its own way of leaking a captured address. Reported at `E371` as not worth it
 * yet.
 */
export function mailCaptureEnabled(): boolean {
  /* ⚠ EXACTLY `"1"`. Not truthiness — `MAIL_CAPTURE=0` and `MAIL_CAPTURE=false`
     must both mean SEND, and a bare `Boolean("0")` is `true`. */
  return process.env.MAIL_CAPTURE?.trim() === "1";
}

/** Where captured mail lands. ⚠ Gitignored — see `.gitignore`. */
export const MAIL_CAPTURE_DIR = ".mail-capture";

async function captureEmail(args: SendEmailArgs) {
  /* ⚠ IMPORTED LAZILY so `node:fs` never enters a bundle that does not use
     capture — this module is imported by route handlers. */
  const { mkdir, writeFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  await mkdir(MAIL_CAPTURE_DIR, { recursive: true });

  const to = Array.isArray(args.to) ? args.to.join(", ") : args.to;
  /* ⚠ NO `Date.now()` IN THE NAME ALONE — two sends in the same millisecond
     would overwrite each other and the second would vanish silently, which is
     the one thing a capture transport must never do. A counter is appended. */
  captureSeq += 1;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const slug = args.subject.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
  const file = join(MAIL_CAPTURE_DIR, `${stamp}-${captureSeq}-${slug}.html`);

  /* ⚠ THE ENVELOPE IS WRITTEN INTO THE FILE, not just the body. A captured HTML
     body with no `to` is untestable — the whole question is who it addressed. */
  const header =
    `<!-- CAPTURED BY MAIL_CAPTURE=1 (P1-ALL-E371). NOT SENT. -->\n` +
    `<!-- to:      ${to} -->\n` +
    `<!-- from:    ${EMAIL_FROM} -->\n` +
    `<!-- subject: ${args.subject} -->\n` +
    (args.replyTo ? `<!-- replyTo: ${args.replyTo} -->\n` : "");
  await writeFile(file, header + args.html, "utf8");

  console.log(`[MAIL_CAPTURE] ${args.subject}  ->  ${to}   (${file})`);
  /* ⚠ RETURNS A SEND-SHAPED RESULT so every caller's success path is exercised
     exactly as it would be in production. A capture that returned a different
     shape would test the transport and not the caller. */
  return { id: `capture-${captureSeq}` };
}

let captureSeq = 0;

export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
}: SendEmailArgs) {
  /* ⚠⚠ THE CAPTURE BRANCH IS FIRST AND IS THE ONLY EARLY RETURN. It must come
     before `getResend()`, which throws without a key. */
  if (mailCaptureEnabled()) {
    return captureEmail({ to, subject, html, text, replyTo });
  }

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
