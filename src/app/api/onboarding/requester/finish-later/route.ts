import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
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
/* ⚠ NO `request` PARAM ANY MORE — it existed only to give `appBaseUrl` the
   origin for the email's links, and the notification layer now resolves those
   itself. ⚠ Left in place it is an unused-variable warning, i.e. one NEW lint
   problem against a baseline of 35.
   ⚠⚠ IT CAME BACK ONCE, when a mutation restore copied a pre-fix snapshot over
   the file. Lint caught it the second time too. */
export async function POST() {
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

  /*
    ── ⚠⚠⚠ THE TRANSACTIONAL SEND IS GONE. **`notify()` OWNS THE EMAIL NOW**
       (`P0-E689` WS-C, Scott 2026-09-27) ──────────────────────────────────

    ⚠ **Scott's rule is the spec:** *"We never want to send multiple emails to
    the same person for the same event. That is a rule."* And: *"centralize the
    sending of emails to the NOTIFICATION job… Each transaction is responsible
    for adding the worklist entry. Then the notification job is responsible for
    sending notifications to the correct parties."*

    ⚠⚠⚠ **THIS ROUTE WAS THE ONLY GENUINE DOUBLE-SEND IN THE BUILD** — it sent
    `finish-later` AND fired `account.finish_later` for **the same person, the
    same act, in one handler.** The other two the brief suspected were measured
    and cleared: `colleague-invite` only ever emails a NON-member while its event
    only ever fires for a member, and `profile.validated` has no caller at all.

    ⚠⚠ **THE SWITCH-ON AND THE REMOVAL ARE ONE COMMIT, DELIBERATELY** (Scott):
    the event was added to the allowlist and this send deleted together, **so
    there is no commit in which the member gets two and none in which they get
    zero.** ⚠ Doing either half alone is a regression — rule 5 in both
    directions.

    ⚠ **THE EMAIL ITSELF IS UNCHANGED, AND THAT WAS THE HARD PART.**
    `notification-email.ts` gives this event its OWN renderer rather than the
    row-driven one, because the registry's bell wording is a paraphrase and
    **`finish-later.ts` protects Scott's copy verbatim.** Same subject, same
    body, same button, same destination.

    ⚠⚠ **RETRY-ON-FAILURE SURVIVES, BY A BETTER MECHANISM.** The old `catch`
    returned early so the dedupe row stayed UNWRITTEN and the next click retried.
    ⚠⚠⚠ **NOW THE ROW IS ALWAYS WRITTEN (ruling 86 — the entry is always made)
    AND THE RETRY HANGS OFF `email_sent_at` INSTEAD:** a failed send clears the
    stamp and records `email_send_failed`, so the next call re-attempts the mail
    **without losing the bell entry**. ⚠ The old design traded the worklist entry
    for the retry; this one keeps both.

    ⚠ SUPERSEDED, quoted not deleted (`E164`) — the send and its guard:
    //   const base = appBaseUrl(request.headers.get("origin"));
    //   const { subject, html, text } = finishLaterTemplate({
    //     firstName: person.first_name ?? "",
    //     resumeUrl: `${base}/join/requester/steps`,
    //     audience: "buyer",
    //     logoUrl: `${base}/brand/panameer-lockup-ink.png`,
    //   });
    //   try {
    //     NO SUBJECT — this is the sender that proves the columns are nullable
    //     for a reason. finish-later is a nudge about nothing. check:sent-email
    //     names it, so the omission is auditable.
    //     await sendEmail({ to: person.user.email, subject, html, text,
    //       template: "finish-later", userId: undefined });
    //   } catch (e) {
    //     A REFUSED SEND MUST NOT BE RECORDED AS ONE. Returning here leaves the
    //     dedupe row unwritten, so the next click genuinely retries.
    //     console.error("[finish-later] send failed:", e);
    //     return NextResponse.json({ ok: true, sent: false, reason: "send_failed" });
    //   }
  */
  await notify({
    event: "account.finish_later",
    personId: person.id,
    dedupeKey: DEDUPE_KEY,
  });

  /*
    ⚠⚠ **IT NO LONGER CLAIMS `sent: true`, BECAUSE IT NO LONGER KNOWS.**
    `notify()` never throws and deliberately swallows delivery outcomes, so a
    `sent: true` here would be **a guess reported as a fact** — the exact shape
    of defect `E522` exists to remove. ⚠ The answer now lives in one place that
    can actually answer it: `Notification.email_sent_at`.
    ⚠ **Nothing reads this field** — the only caller is
    `join/requester/steps/page.tsx`, which does `void fetch(...).catch(...)` and
    ignores the response entirely. **Measured, not assumed.**
    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   return NextResponse.json({ ok: true, sent: true });
  */
  return NextResponse.json({ ok: true, notified: true });
}

/** ⚠ One key per person, forever — see the note at the read above. */
const DEDUPE_KEY = "account.finish_later";
