import { Resend } from "resend";
import { isSuppressed, unsubscribeUrl } from "@/lib/unsubscribe";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/normalizeEmail";
import { undeliverableRule } from "@/lib/email/undeliverable-domains";
import { allowedOutsideProduction } from "@/lib/email/non-production-allowlist";
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
  category,
  template,
  subjectType,
  subjectId,
  userId,
  bypassSuppressionFor,
}: SendEmailArgs) {
  /*
    ── ⚠⚠ SUPPRESSION IS CHECKED IN THE TRANSPORT (`P1-ALL-E386`) ────────────

    HERE, not in the seven callers, SO A NEW SENDER CANNOT FORGET. Seven senders
    exist today and each one is a place the check could have been omitted; there
    is one transport.

    ⚠⚠ A SUPPRESSED ADDRESS IS A SILENT SKIP THAT RETURNS SUCCESS, NOT A THROW.
    A caller's flow must not break because somebody opted out — a provider
    validating a project should not see an error because the contact
    unsubscribed months ago. The skip is logged so it is auditable.

    ⚠ IT RUNS BEFORE CAPTURE AND BEFORE `getResend()`: a suppressed address must
    not be written to a capture file either. Capture is for testing what WOULD
    have been sent, and this would not have been.

    ⚠ MULTI-RECIPIENT SENDS ARE FILTERED, NOT ALL-OR-NOTHING. One suppressed
    address in a list of three must not silence the other two.
  */
  /*
    ── ⚠⚠ ONE ROW PER RECIPIENT, AND IT NEVER FAILS A SEND ────────────────────

    ⚠ PER RECIPIENT, NOT PER SEND: Resend returns ONE message id for a batch, so
    a bounce for one address would otherwise implicate all three. The webhook
    matches on (resend_message_id, to_email) — its payload carries the recipient.
    ⚠⚠ THAT IS WHY `resend_message_id` IS NOT UNIQUE. A unique there would reject
    the second recipient of every batch send.

    ⚠⚠ A FAILED RECEIPT MUST NEVER FAIL A SEND. This is bookkeeping; the mail has
    already gone. Throwing here would turn a logging outage into a signup outage,
    which is a worse defect than the one the table exists to fix.
  */
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

  /*
    ── ⚠⚠⚠ UNDELIVERABLE DOMAINS ARE REFUSED HERE, IN THE TRANSPORT ───────────

    ⚠ SCOTT, 2026-09-17: *"In the transport, so it cannot be forgotten on a
    machine."* ⚠⚠ THAT IS THE WHOLE POINT — `MAIL_CAPTURE` is a real rail and it
    is OFF, because it is a per-machine env var nobody is reminded about. A rail
    that lives in the code cannot be left off.

    ⚠⚠ REFUSED, NOT SILENTLY DROPPED. Scott: *"You just built the thing that
    makes a refusal visible — use it. A skip that records nothing is the defect
    this whole brief existed to kill."* ⚠ So a refusal writes a `SentEmail` row
    with `status: "refused"` and no `resend_message_id`, because Resend never saw
    it. ⚠ The matched RULE is logged rather than stored: it is derivable from the
    address plus the list, and Scott's own ruling an hour ago was not to
    denormalise what a join already answers.

    ⚠ WHY IT RUNS BEFORE SUPPRESSION: an address at `example.com` can never
    receive mail whatever its suppression state, and asking the database about a
    domain that cannot exist is a query for nothing.
    ⚠⚠ MEASURED: ~89 of 207 `User` addresses sit on these domains. Without this,
    `E526`'s bulk invite is ~89 hard bounces in one run against a sending domain
    days old.
  */
  /*
    ── ⚠⚠⚠ OUTSIDE PRODUCTION, A RECIPIENT MUST BE NAMED (`P2-ALL-E607`) ──────

    ⚠ MEASURED: `EMAIL_FROM` has been set in Vercel PRODUCTION **and PREVIEW**
    since 2026-07-23; `MAIL_CAPTURE` is a local-only variable and is not in
    Vercel at all; **previews share the one production database.** So any branch
    deploy could reach any real address with nothing in front of it.

    ⚠⚠ `sendingEnvironment()` ALREADY EXISTED AND THE TRANSPORT ALREADY CALLED
    IT — at line ~244, to stamp the receipt, AFTER the send. **It knew where it
    was running and only ever said so afterwards.** This asks the same function
    the same question before Resend is touched.

    ⚠ IT SITS BESIDE THE UNDELIVERABLE-DOMAIN REFUSAL DELIBERATELY: same shape,
    same `status: "refused"`, same absent `resend_message_id` because Resend
    never saw it, same loud `console.warn`. **A skip that records nothing is the
    defect that whole brief existed to kill.**

    ⚠⚠⚠ PRODUCTION IS UNTOUCHED. `sendingEnvironment()` returns `"production"`
    only for `VERCEL_ENV === "production"`, and this branch cannot run there.
    A real tester is on production today; this must be invisible to them.

    ⚠ ORDER: after the undeliverable-domain check, because an `example.com`
    address is refusable everywhere and the cheaper, more specific reason should
    be the one reported.
  */
  const env = sendingEnvironment();
  const isProduction = env === "production";

  const deliverable: string[] = [];
  const refused: string[] = [];
  for (const r of recipients) {
    const rule = undeliverableRule(r);
    if (rule) {
      console.warn(`[mail] REFUSED (undeliverable domain, matched "${rule}") ${subject} -> ${r}`);
      refused.push(r);
      continue;
    }
    if (!isProduction && !allowedOutsideProduction(r)) {
      console.warn(
        `[mail] REFUSED (environment "${env}" is not production and ${r} is not on the non-production allow-list) ${subject}`
      );
      refused.push(r);
      continue;
    }
    deliverable.push(r);
  }
  if (refused.length > 0) {
    await record(refused.map((email) => ({ email, status: "refused" })));
  }
  if (deliverable.length === 0) {
    /* ⚠ SEND-SHAPED SUCCESS, like the suppressed branch — a caller's flow must
       not break because a seeded fixture had a fake address. */
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
  /*
    ⚠⚠ A SUPPRESSED SKIP GETS A ROW, AND IT IS THE MOST IMPORTANT ONE HERE.
    Scott, 2026-09-17, on including `suppressed` in the event set: *"A send that
    never happened and never bounced is the exact invisible failure this brief
    exists to kill."* ⚠ The skip returns SUCCESS to the caller by design
    (`E386`), so without this row nothing anywhere records that the mail did not
    go. ⚠ `resend_message_id` is null because Resend never saw it.
  */
  if (skipped.length > 0) {
    await record(skipped.map((email) => ({ email, status: "suppressed" })));
  }
  if (allowed.length === 0) {
    /* ⚠ SEND-SHAPED SUCCESS, so every caller's success path still runs. */
    return { id: "suppressed" };
  }

  /*
    ⚠⚠ THE UNSUBSCRIBE LINK IS INJECTED HERE TOO, AND FOR THE SAME REASON.
    Templates are recipient-agnostic — `footer()` takes only a year — so a
    per-recipient signed link CANNOT be built in a template. The transport is
    the only place that knows `to`.
    ⚠ ONE RECIPIENT ONLY. A shared link for a multi-recipient send would let one
    recipient unsubscribe another, so a batch keeps the placeholder resolved to
    the generic settings route instead.
  */
  const withUnsubscribe =
    allowed.length === 1
      ? html.replaceAll(
          UNSUBSCRIBE_PLACEHOLDER,
          unsubscribeUrl(PANAMEER_URL, allowed[0], category ?? null)
        )
      : html.replaceAll(UNSUBSCRIBE_PLACEHOLDER, `${PANAMEER_URL}/settings/notifications`);

  /* ⚠⚠ THE CAPTURE BRANCH IS THE ONLY OTHER EARLY RETURN. It must come before
     `getResend()`, which throws without a key. */
  if (mailCaptureEnabled()) {
    /* ⚠ CAPTURED, NOT SENT — a distinct status so a test run can never be read
       as delivery. ⚠ The row is still written: capture is how the receipt path
       is exercised without spending a real send. */
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
    /* ⚠⚠ A REFUSED SEND IS RECORDED BEFORE THE THROW. The caller still sees the
       error; what changes is that the failure stops being invisible the moment
       the stack trace scrolls away. */
    await record(allowed.map((email) => ({ email, status: "failed" })));
    throw new Error(`Resend failed to send email: ${error.message}`);
  }

  await record(allowed.map((email) => ({ email, status: "sent", messageId: data?.id })));

  return data;
}
