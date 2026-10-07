import { Resend } from "resend";
import { isSuppressed, unsubscribeUrl } from "@/lib/unsubscribe";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/normalizeEmail";
import { undeliverableRule } from "@/lib/email/undeliverable-domains";
import { PANAMEER_URL, UNSUBSCRIBE_PLACEHOLDER } from "@/lib/email/shell";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export function mailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

/** Verified sender. Uses Resend's shared sandbox address until you verify a domain. */
export const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "Panameer <onboarding@resend.dev>";

export function sendingEnvironment(): string {
  const v = process.env.VERCEL_ENV;
  if (v === "production" || v === "preview") return v;
  if (v === "development") return "localhost";
  return process.env.VERCEL ? "unknown" : "localhost";
}

type SendEmailArgs = {
  to: string | string[];
  category?: string | null;
  bypassSuppressionFor?: "password-reset";
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  template: string;
  subjectType?: string | null;
  subjectId?: string | null;
  /** The recipient's account, when the mail goes to one. Drives the cascade. */
  userId?: string | null;
};

export function mailCaptureEnabled(): boolean {
  return process.env.MAIL_CAPTURE?.trim() === "1";
}

export const MAIL_CAPTURE_DIR = ".mail-capture";

async function captureEmail(args: Pick<SendEmailArgs, "to" | "subject" | "html" | "text" | "replyTo">) {
  const { mkdir, writeFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  await mkdir(MAIL_CAPTURE_DIR, { recursive: true });

  const to = Array.isArray(args.to) ? args.to.join(", ") : args.to;
  captureSeq += 1;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const slug = args.subject.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
  const file = join(MAIL_CAPTURE_DIR, `${stamp}-${captureSeq}-${slug}.html`);

  // THE ENVELOPE IS WRITTEN INTO THE FILE, not just the body. A captured HTML
  const header =
    `<!-- CAPTURED BY MAIL_CAPTURE=1 (P1-ALL-E371). NOT SENT. -->\n` +
    `<!-- to:      ${to} -->\n` +
    `<!-- from:    ${EMAIL_FROM} -->\n` +
    `<!-- subject: ${args.subject} -->\n` +
    (args.replyTo ? `<!-- replyTo: ${args.replyTo} -->\n` : "");
  await writeFile(file, header + args.html, "utf8");

  console.log(`[MAIL_CAPTURE] ${args.subject}  ->  ${to}   (${file})`);
  // RETURNS A SEND-SHAPED RESULT so every caller's success path is exercised
  return { id: `capture-${captureSeq}` };
}

let captureSeq = 0;

export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
  category,
  template,
  subjectType,
  subjectId,
  userId,
  bypassSuppressionFor,
}: SendEmailArgs) {
  // SUPPRESSION IS CHECKED IN THE TRANSPORT
  // ONE ROW PER RECIPIENT, AND IT NEVER FAILS A SEND
  const record = async (
    rows: { email: string; status: string; messageId?: string | null }[]
  ) => {
    try {
      await prisma.sentEmail.createMany({
        data: rows.map((r) => ({
          resend_message_id: r.messageId ?? null,
          to_email: normalizeEmail(r.email),
          template,
          category: category ?? null,
          subject_type: subjectType ?? null,
          subject_id: subjectId ?? null,
          status: r.status,
          environment: sendingEnvironment(),
          user_id: userId ?? null,
        })),
      });
    } catch (e) {
      console.error(`[mail] receipt write failed for ${template}:`, e);
    }
  };

  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);

  // UNDELIVERABLE DOMAINS ARE REFUSED HERE, IN THE TRANSPORT
  // OUTSIDE PRODUCTION, A RECIPIENT MUST BE NAMED

  const deliverable: string[] = [];
  const refused: string[] = [];
  for (const r of recipients) {
    const rule = undeliverableRule(r);
    if (rule) {
      console.warn(`[mail] REFUSED (undeliverable domain, matched "${rule}") ${subject} -> ${r}`);
      refused.push(r);
      continue;
    }
    deliverable.push(r);
  }
  if (refused.length > 0) {
    await record(refused.map((email) => ({ email, status: "refused" })));
  }
  if (deliverable.length === 0) {
    // SEND-SHAPED SUCCESS, like the suppressed branch — a caller's flow must
    return { id: "refused" };
  }

  const allowed: string[] = [];
  const skipped: string[] = [];
  for (const r of deliverable) {
    if (await isSuppressed(r, category ?? undefined, bypassSuppressionFor)) {
      console.log(`[mail] SKIPPED (suppressed) ${subject} -> ${r}`);
      skipped.push(r);
      continue;
    }
    allowed.push(r);
  }
  // A SUPPRESSED SKIP GETS A ROW, AND IT IS THE MOST IMPORTANT ONE HERE.
  if (skipped.length > 0) {
    await record(skipped.map((email) => ({ email, status: "suppressed" })));
  }
  if (allowed.length === 0) {
    /* SEND-SHAPED SUCCESS, so every caller's success path still runs. */
    return { id: "suppressed" };
  }

  // THE UNSUBSCRIBE LINK IS INJECTED HERE TOO, AND FOR THE SAME REASON.
  const withUnsubscribe =
    allowed.length === 1
      ? html.replaceAll(
          UNSUBSCRIBE_PLACEHOLDER,
          unsubscribeUrl(PANAMEER_URL, allowed[0], category ?? null)
        )
      : html.replaceAll(UNSUBSCRIBE_PLACEHOLDER, `${PANAMEER_URL}/settings/notifications`);

  // THE CAPTURE BRANCH IS THE ONLY OTHER EARLY RETURN. It must come before
  if (mailCaptureEnabled()) {
    // CAPTURED, NOT SENT — a distinct status so a test run can never be read
    await record(allowed.map((email) => ({ email, status: "captured" })));
    return captureEmail({ to: allowed, subject, html: withUnsubscribe, text, replyTo });
  }

  const { data, error } = await getResend().emails.send({
    from: EMAIL_FROM,
    to: allowed,
    subject,
    html: withUnsubscribe,
    text,
    replyTo,
  });

  if (error) {
    // A REFUSED SEND IS RECORDED BEFORE THE THROW. The caller still sees the
    await record(allowed.map((email) => ({ email, status: "failed" })));
    throw new Error(`Resend failed to send email: ${error.message}`);
  }

  await record(allowed.map((email) => ({ email, status: "sent", messageId: data?.id })));

  return data;
}
