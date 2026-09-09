import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
import { appBaseUrl } from "@/lib/verification";
import { finishLaterTemplate } from "@/lib/email/templates/finish-later";
import { notify } from "@/lib/notifications";

/**
 * POST /api/onboarding/requester/finish-later — send the "continue the
 * registration you started" email (`P2-J1.1-E034`).
 *
 * ⚠⚠ IT FIRES ON THE CLICK. `Finish later` is a user action inside a request, so
 * this is SYNCHRONOUS — no scheduler, and therefore not the fate of
 * `work-request-draft-reminder.ts`, whose docblock records it as unwired for
 * exactly that reason.
 *
 * OWNER-SCOPED: the person is resolved from the SESSION. The body carries no id
 * — there is no request shape here that could send someone else's email.
 */
export async function POST(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const viewer = gate;

  const person = await prisma.person.findFirst({
    where: { user_id: viewer.userId },
    select: {
      id: true,
      first_name: true,
      user: { select: { email: true } },
    },
  });
  if (!person?.user?.email) {
    /* Nothing to send to. Not an error the user can act on — the button's job is
       to leave the wizard, and it still does. */
    return NextResponse.json({ ok: true, sent: false, reason: "no_recipient" });
  }

  /*
    ── ⚠⚠ IT MUST NOT SEND ON EVERY CLICK ─────────────────────────────────────

    `Finish later` is on EVERY step by design — `E245`: *"Every step means every
    step"* — so a requester who steps out three times must not receive three
    identical emails.

    ⚠ THE KEY IS `account.finish_later`, AND PERSON SCOPING IS THE INDEX'S JOB:
    `Notification` is `@@unique([person_id, dedupe_key])`, so the key itself does
    not repeat the person. That is the precedent the model's own comment sets —
    *"IDEMPOTENCY IS A COLUMN, NOT A CONVENTION"*.

    ⚠ READ-THEN-SEND, and the race is named rather than hidden: two clicks in the
    same instant could both miss the row and send twice. The window is a few
    milliseconds on a button a person presses, the unique index still collapses
    the ROWS, and every click after the first is silent forever. Worth far less
    than the alternative — sending inside a transaction that could roll back
    after the mail has already left.
  */
  const alreadySent = await prisma.notification.findUnique({
    where: {
      person_id_dedupe_key: { person_id: person.id, dedupe_key: DEDUPE_KEY },
    },
    select: { id: true },
  });
  if (alreadySent) {
    return NextResponse.json({ ok: true, sent: false, reason: "already_sent" });
  }

  const base = appBaseUrl(request.headers.get("origin"));
  const { subject, html, text } = finishLaterTemplate({
    firstName: person.first_name ?? "",
    /* ⚠ THE WIZARD, NOT `/dashboard` — and with no step in the URL, because the
       wizard reads `resumeStep` from the server itself, so the link cannot go
       stale if they resume elsewhere first. */
    resumeUrl: `${base}/join/requester/steps`,
    audience: "buyer",
    logoUrl: `${base}/brand/panameer-lockup-ink.png`,
  });

  try {
    await sendEmail({ to: person.user.email, subject, html, text });
  } catch (e) {
    /* ⚠ A REFUSED SEND MUST NOT BE RECORDED AS ONE. Returning here leaves the
       dedupe row unwritten, so the next click genuinely retries rather than
       going silent on the strength of a send that never happened. */
    console.error("[finish-later] send failed:", e);
    return NextResponse.json({ ok: true, sent: false, reason: "send_failed" });
  }

  await notify({
    event: "account.finish_later",
    personId: person.id,
    dedupeKey: DEDUPE_KEY,
  });

  return NextResponse.json({ ok: true, sent: true });
}

/** ⚠ One key per person, forever — see the note at the read above. */
const DEDUPE_KEY = "account.finish_later";
