import { prisma } from "@/lib/prisma";
import { emailConfigured } from "@/lib/email-status";
import { findCategory } from "@/lib/notification-categories";
import { sendEmail } from "@/lib/resend";
import { notificationEmailAllowed } from "@/lib/notification-email";
import { notificationEmail } from "@/lib/email/templates/notification";
import {
  NOTIFICATION_EVENTS,
  type NotificationEvent,
  type NotificationEventKey,
  type Vars,
} from "@/lib/notification-events";

/**
 * THE ONE WRITE PATH FOR NOTIFICATIONS (`P1-ALL`, 2026-09-01).
 *
 * ⚠⚠ NOTHING ELSE MAY CALL `prisma.notification.create`. `check:notifications`
 * fails the build if anything does — one write path, or the dedupe and preference
 * logic is bypassed on day two by someone in a hurry.
 *
 * ⚠ IT NEVER THROWS INTO THE CALLER'S TRANSACTION. A failed notification must not
 * roll back an enrollment: the notification is a side effect of the thing that
 * happened, never a condition of it. Catch, log, continue — the same contract
 * `lookupLogos` follows in `EmployersStep.tsx`.
 * ⚠ THE ONE EXCEPTION IS AN UNKNOWN EVENT KEY, which throws in development so a
 * typo fails loudly instead of vanishing. In production it is logged and
 * swallowed like everything else, because a typo must not take down a signup.
 */
export async function notify(input: {
  event: NotificationEventKey;
  personId: string;
  entityType?: string | null;
  entityId?: string | null;
  /** Natural key for idempotency. Null/omitted always inserts. */
  dedupeKey?: string | null;
  vars?: Vars;
}): Promise<void> {
  try {
    /* ⚠ WIDENED DELIBERATELY. The registry is `as const satisfies` so each entry
       keeps its literal key for callers, but that also narrows every entry to its
       own shape — some have `href`, some do not. Reading through the interface is
       what lets one code path serve all of them. */
    const spec: NotificationEvent | undefined = NOTIFICATION_EVENTS[input.event];
    if (!spec) {
      /* ⚠ A TYPO'D EVENT MUST FAIL LOUDLY, NOT VANISH. */
      throw new Error(`notify(): unknown event key "${input.event}"`);
    }
    const vars = input.vars ?? {};
    const category = findCategory(spec.category);
    if (!category) {
      throw new Error(
        `notify(): event "${input.event}" names unknown category "${spec.category}"`
      );
    }

    /*
      PREFERENCES, WITHOUT CREATING ONE.

      ⚠ AN ABSENT ROW MEANS THE CATEGORY'S OWN DEFAULTS — that contract is in the
      model's comment and must hold, so a new category ships with sensible
      behaviour and no backfill. Writing a preference row here would quietly turn
      "never configured" into "configured exactly as the defaults were on the day
      you were first notified", which is a different and worse thing.
    */
    const pref = await prisma.notificationPreference.findFirst({
      where: { person_id: input.personId, category: spec.category },
      select: { in_app: true, email: true, sms: true },
    });
    const wantsInApp = pref ? pref.in_app : category.defaults.inApp;
    const wantsEmail = pref ? pref.email : category.defaults.email;
    const wantsSms = pref ? pref.sms : category.defaults.sms;

    /*
      ⚠⚠ A DROPPED DELIVERY WITH NO RECORD IS HOW "I NEVER GOT TOLD" BECOMES
      UNANSWERABLE. Every reason a row did not reach someone is written down.

      ORDER MATTERS: visibility beats preference. A `SILENT` row was never going to
      be delivered to anyone, so recording "user_opted_out" against it would be a
      lie about why.
    */
    let deliveredInApp: Date | null = null;
    let suppressed: string | null = null;
    if (spec.visibility === "SILENT") {
      suppressed = "silent";
    } else if (spec.visibility === "DIGEST") {
      suppressed = "digest";
    } else if (!wantsInApp) {
      suppressed = "user_opted_out";
    } else {
      deliveredInApp = new Date();
    }

    /*
      ── ⚠⚠⚠ CORRECTED (rule 6 / §6) — THIS PARAGRAPH WAS FALSE (`P0-E689` WS-B)

      ⚠⚠ **EMAIL NO LONGER ONLY RECORDS INTENT — `notify()` CAN NOW SEND**, and
      `RESEND_API_KEY` / `EMAIL_FROM` have been set for weeks, so the stated
      reason was already wrong before the sender existed. ⚠ **A stated rule that
      contradicts the code is the more dangerous half — the next person
      implements the comment.**
      ⚠ **SMS is untouched and STILL only records intent**, and its reason has
      also been corrected: it is not that phone verification is off by design —
      `Person.phone_verified_at`, a `PhoneVerification` model and a live
      `lib/phone-verification.ts` all exist. ⚠⚠⚠ **IT IS THAT THE TRANSPORT IS
      UNCONFIGURED:** all three `TWILIO_*` variables are unset, so
      `smsConfigured()` is false and `sendSms()` takes its console fallback.
      ⚠⚠ **WHICH IS WHY THE ONE "VERIFIED" PHONE ON THIS BUILD WAS VERIFIED BY A
      CODE PRINTED TO A CONSOLE, NOT BY A TEXT MESSAGE** (ruling `90b`). `86e`
      holds — a channel you cannot reach is not a channel you can offer — **but
      for the transport's reason, not the column's.**

      ⚠ When in-app carried the row we keep its timestamp and note the channel
      that could not fire — the row still reached the person, just not by every
      route they asked for.

      ⚠ SUPERSEDED, quoted not deleted (`E164`):
      //   EMAIL AND SMS RECORD INTENT AND DO NOT SEND. RESEND_API_KEY /
      //   EMAIL_FROM are commented out, and phone verification is off by design.
    */
    /* ⚠ THE SAME FACT THE SETTINGS SCREEN READS (`P1-ALL-E382`) — one function,
       two callers, so the UI can never claim email works while this records that
       it does not. */
    if (!suppressed && wantsEmail && !emailConfigured()) {
      suppressed = "email_not_configured";
    } else if (!suppressed && wantsSms) {
      suppressed = "sms_not_configured";
    }

    const data = {
      person_id: input.personId,
      event_key: input.event,
      category: spec.category,
      title: spec.title(vars),
      body: spec.body?.(vars) ?? null,
      href: spec.href?.(vars) ?? null,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      ai_mode: spec.aiMode,
      visibility: spec.visibility,
      requires_action: spec.requiresAction,
      dedupe_key: input.dedupeKey ?? null,
      delivered_in_app_at: deliveredInApp,
      suppressed_reason: suppressed,
    };

    /*
      ⚠⚠⚠ THE IN-APP ROW IS WRITTEN FIRST AND UNCONDITIONALLY (ruling 86: rules
      say the entry is always made; setup says what ADDITIONAL ways get
      notified). ⚠ **THE EMAIL IS A CONSEQUENCE OF THE ROW, NEVER A REPLACEMENT
      FOR IT** — which is why the send happens after this, reading the row back,
      and cannot run if the row was not written.
    */
    let row: { id: string; email_sent_at: Date | null };
    if (input.dedupeKey) {
      /* ⚠ THE DUPLICATE-ENROLLMENT FIX. Upsert on the unique pair, so enrolling
         twice updates one row rather than producing two. */
      row = await prisma.notification.upsert({
        where: {
          person_id_dedupe_key: {
            person_id: input.personId,
            dedupe_key: input.dedupeKey,
          },
        },
        create: data,
        update: {},
        select: { id: true, email_sent_at: true },
      });
    } else {
      row = await prisma.notification.create({
        data,
        select: { id: true, email_sent_at: true },
      });
    }

    await emailFor({
      event: input.event,
      notificationId: row.id,
      alreadySent: row.email_sent_at != null,
      personId: input.personId,
      category: spec.category,
      title: data.title,
      body: data.body,
      href: data.href,
      wantsEmail,
      suppressed,
    });
  } catch (e) {
    /* ⚠ NEVER INTO THE CALLER'S TRANSACTION — see the docblock. */
    console.error("[notify] failed:", input.event, e);
  }
}

/**
 * ── ⚠⚠⚠ THE SENDER. **ONE PLACE, AND `notify()` IS ITS ONLY CALLER** (`E585`).
 *
 * `P0-E689` WS-B. ⚠ **Scott, 2026-09-27:** *"centralize the sending of emails to
 * the NOTIFICATION job to ensure only one is being sent. Each transaction is
 * responsible for adding the worklist entry. Then the notification job is
 * responsible for sending notifications to the correct parties."*
 *
 * ── ⚠⚠⚠ ONE EMAIL PER PERSON PER EVENT, BY CONSTRUCTION ───────────────────
 *
 * ⚠⚠ **`Notification` IS ALREADY ONE ROW PER (EVENT × RECIPIENT)** — `dedupe_key`
 * is a column with a unique index, not a convention. ⚠⚠⚠ **SO SENDING FROM THE
 * ROW, AND STAMPING THE ROW, MAKES SCOTT'S RULE FALL OUT OF THE SCHEMA RATHER
 * THAN OUT OF SOMEBODY REMEMBERING IT.**
 *
 * ⚠⚠ **THE STAMP IS CLAIMED BEFORE THE SEND, NOT AFTER, AND THAT ORDER IS
 * DELIBERATE.** A conditional `updateMany` on `email_sent_at: null` is an atomic
 * claim: whoever wins it sends, and a second caller for the same row gets
 * `count === 0` and sends nothing. ⚠ Stamping AFTER would leave a window in
 * which two callers both read null and both send — and *"never two emails for
 * one event"* is stated as a RULE, so the design has to enforce it rather than
 * make it likely.
 * ⚠⚠⚠ **THE INVARIANT THE BRIEF ASKED FOR STILL HOLDS: A SURVIVING STAMP MEANS
 * A SUCCESSFUL SEND.** On failure the stamp is CLEARED again and the reason is
 * recorded, so the row never claims an email that did not go — and a failed send
 * stays retryable, which stamping-on-success-only would also have given but
 * without the exclusion.
 *
 * ⚠ **IT NEVER THROWS.** Same contract as `notify()` itself: a mail outage must
 * not roll back the thing that happened. A failure writes `suppressed_reason`.
 *
 * ⚠⚠ **`EmailSuppression` AND `UNDELIVERABLE_DOMAINS` ARE NOT RE-IMPLEMENTED
 * HERE.** Both are enforced inside the transport (`E386`, `E522`) precisely so a
 * new sender cannot forget them, and re-checking them here would be the second
 * definition that eventually disagrees. ⚠ Nor are they bypassed:
 * `bypassSuppressionFor` is not passed, and `check:sent-email` fails if any
 * sender but `password-reset` claims it.
 */
async function emailFor(a: {
  event: NotificationEventKey;
  notificationId: string;
  alreadySent: boolean;
  personId: string;
  category: string;
  title: string;
  body: string | null;
  href: string | null;
  wantsEmail: boolean;
  suppressed: string | null;
}): Promise<void> {
  /* ⚠ A SUPPRESSED ROW NEVER REACHED THE PERSON IN-APP FOR A STATED REASON —
     silent, digest, or opted out. Emailing it anyway would route around the very
     reason that was recorded. */
  if (a.suppressed) return;
  if (!a.wantsEmail) return;
  /* ⚠ Already stamped above the write as `email_not_configured`; re-checked so
     this function is correct read on its own. */
  if (!emailConfigured()) return;

  /*
    ⚠⚠⚠ THE ALLOWLIST. **EMPTY ON THIS COMMIT, SO NOTHING IS SENT AT ALL** — the
    sender exists and is wired, and which event goes first is Scott's
    (`notification-email.ts` carries the whole reasoning). ⚠ An event that is not
    on it **records intent and does not send, exactly as before this commit**,
    which is today's behaviour preserved rather than a new suppression.
  */
  if (!notificationEmailAllowed(a.event)) return;

  if (a.alreadySent) return;

  try {
    const person = await prisma.person.findUnique({
      where: { id: a.personId },
      select: { user: { select: { id: true, email: true, first_name: true } } },
    });
    const to = person?.user?.email;
    /* ⚠ NO ACCOUNT, NO ADDRESS, NO SEND — and it is RECORDED, because a skip
       that records nothing is the defect `E522` exists to kill. */
    if (!to) {
      await prisma.notification.update({
        where: { id: a.notificationId },
        data: { suppressed_reason: "email_no_address" },
      });
      return;
    }

    /* ⚠⚠ THE ATOMIC CLAIM — see the docblock. Losing it means somebody already
       sent for this row, and losing it silently is correct. */
    const claim = await prisma.notification.updateMany({
      where: { id: a.notificationId, email_sent_at: null },
      data: { email_sent_at: new Date() },
    });
    if (claim.count === 0) return;

    try {
      const mail = notificationEmail({
        firstName: person.user?.first_name ?? null,
        title: a.title,
        body: a.body,
        href: a.href,
      });
      const result = await sendEmail({
        to,
        category: a.category,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        template: "notification",
        subjectType: "notification",
        subjectId: a.notificationId,
        userId: person.user?.id ?? null,
      });

      /*
        ── ⚠⚠⚠ A SEND-SHAPED SUCCESS IS NOT A SEND. **FOUND BY THE WS-B PROOF,
           IN MY OWN CODE, AND IT IS THE EXACT DEFECT THIS COLUMN EXISTS TO
           PREVENT.** ────────────────────────────────────────────────────────

        ⚠⚠ `sendEmail` DOES NOT THROW when it refuses. Two of its rails return
        **`{ id: "refused" }`** (an undeliverable domain, or `E607`'s
        non-production allow-list) and one returns **`{ id: "suppressed" }`** —
        each of them *"send-shaped success, so every caller's success path still
        runs."* ⚠ That is correct for the transport and it is a **trap for a
        caller that treats "did not throw" as "went"**.
        ⚠⚠⚠ **MEASURED: THE FIRST VERSION OF THIS FUNCTION STAMPED
        `email_sent_at` ON A MAIL THE TRANSPORT HAD REFUSED** — the row then
        claimed an email that nobody could ever have received, and the one
        question the column exists to answer would have been answered WRONG.
        **A stamp that lies is worse than no stamp**, for the same reason
        `E522` gives: a send that never happened and never bounced.

        ⚠ **A CAPTURE IS DELIBERATELY TREATED AS A SEND** (`capture-N`). The
        capture transport's own comment says it *"returns a send-shaped result so
        every caller's success path is exercised exactly as it would be in
        production"* — that is the whole point of it, and a proof that skipped
        the stamp would be testing the transport instead of this caller.
      */
      const wentNowhere = result?.id === "refused" || result?.id === "suppressed";
      if (wentNowhere) {
        await prisma.notification.update({
          where: { id: a.notificationId },
          data: {
            email_sent_at: null,
            suppressed_reason: `email_${result!.id}`,
          },
        });
        return;
      }
    } catch (sendError) {
      /* ⚠⚠ THE STAMP IS RELEASED SO THE ROW NEVER CLAIMS AN EMAIL THAT DID NOT
         GO, and so a retry is possible. The reason is written in the same
         update, so the row says what happened rather than going quiet. */
      await prisma.notification.update({
        where: { id: a.notificationId },
        data: { email_sent_at: null, suppressed_reason: "email_send_failed" },
      });
      console.error("[notify] email failed:", a.event, sendError);
    }
  } catch (e) {
    /* ⚠ NEVER INTO THE CALLER'S TRANSACTION. */
    console.error("[notify] email path failed:", a.event, e);
  }
}
