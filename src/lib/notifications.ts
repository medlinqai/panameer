import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { emailConfigured } from "@/lib/email-status";
import { findCategory } from "@/lib/notification-categories";
import { sendEmail } from "@/lib/resend";
import {
  notificationEmailAllowed,
  renderNotificationMail,
} from "@/lib/notification-email";
import {
  NOTIFICATION_EVENTS,
  type NotificationEvent,
  type NotificationEventKey,
  type Vars,
} from "@/lib/notification-events";

/**
 * ⚠⚠⚠ WHAT `notify()` HANDS BACK (`P2-A6-E707`, ruling `106a`).
 *
 * ⚠ `sendAfterCommit` is **non-null ONLY when a caller lent its transaction.** The
 * row is already written on that transaction; the SEND has deliberately not run,
 * because it is a network call and the caller's transaction is still open.
 * ⚠⚠ **THE CALLER RUNS IT AFTER COMMIT.** It never throws — the same contract the
 * inline path has always had.
 * ⚠⚠⚠ **IGNORING IT LOSES THE EMAIL AND NEVER THE BELL ROW**, which is the safe
 * direction and is exactly today's behaviour for every non-allowlisted event.
 * `check:offers` asserts the one caller that has a transaction does not drop it.
 */
export type NotifyResult = { sendAfterCommit: (() => Promise<void>) | null };

/**
 * THE ONE WRITE PATH FOR NOTIFICATIONS (`P1-ALL`, 2026-09-01).
 *
 * ⚠⚠ NOTHING ELSE MAY CALL `prisma.notification.create`. `check:notifications`
 * fails the build if anything does — one write path, or the dedupe and preference
 * logic is bypassed on day two by someone in a hurry.
 *
 * ── ⚠⚠⚠ ROW INSIDE, SEND OUTSIDE (`P2-A6-E707`, ruling `106a`) ───────────────
 *
 * ⚠⚠ **THE 2026-09-01 RULE AND THE 2026-09-29 REQUIREMENT WERE ABOUT TWO DIFFERENT
 * OBJECTS, AND READING THEM AS ONE IS WHAT STOPPED A RUN.**
 * · **The row** is a database insert on the caller's own connection. ⚠ It cannot fail
 *   independently — if it fails, the transaction was already failing — **so it cannot
 *   roll back anything that was not already rolling back.**
 * · **The send** is a network call to somebody else's machine. ⚠⚠ **IT FAILS ON ITS
 *   OWN, ROUTINELY, AND THAT IS WHAT THE 2026-09-01 RULE PROTECTS AGAINST.**
 *
 * ⚠⚠⚠ **SO: PASS `tx` AND THE ROW IS WRITTEN INSIDE YOUR TRANSACTION AND THE SEND IS
 * HANDED BACK FOR YOU TO RUN AFTER COMMIT. PASS NOTHING AND NOTHING CHANGES.**
 * ⚠ **AND WITH `tx` THE ROW'S FAILURE IS RE-THROWN, DELIBERATELY:** swallowing it
 * would leave the caller running inside a Postgres transaction that is already
 * aborted, so every later statement fails with a message about a transaction the
 * caller never knew was broken. ⚠⚠ **A swallowed error there does not protect the
 * caller, it disguises the caller's own failure.**
 * ⚠⚠⚠ **AND RULING 86 REQUIRES IT: *"notification will ALWAYS add to the bell."* If
 * the row can be lost after a successful write, "always" is false — silently.**
 *
 * ⚠ **WITHOUT `tx` IT STILL NEVER THROWS INTO THE CALLER.** A failed notification must
 * not roll back an enrollment: the notification is a side effect of the thing that
 * happened, never a condition of it. Catch, log, continue — the same contract
 * `lookupLogos` follows in `EmployersStep.tsx`.
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — it read, without qualification:
 * //   ⚠ IT NEVER THROWS INTO THE CALLER'S TRANSACTION. A failed notification must
 * //   not roll back an enrollment ... Catch, log, continue.
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
  /**
   * ⚠⚠⚠ THE CALLER'S TRANSACTION, FOR THE ROW ONLY (`106a`).
   *
   * ⚠ Omit it and the row goes on the shared client and the email sends inline —
   * byte-for-byte today's behaviour. ⚠⚠ Pass it and you MUST run the returned
   * `sendAfterCommit` after your transaction commits, or the email is skipped.
   */
  tx?: Prisma.TransactionClient;
}): Promise<NotifyResult> {
  /*
    ⚠⚠ ONE NAME FOR "WHERE THE ROW GOES", RESOLVED ONCE. A `?? prisma` repeated at
    each write is the second definition that eventually disagrees (`E585`).
    ⚠ The SEND deliberately does NOT use this — see `emailFor`'s call below.
  */
  const db: Prisma.TransactionClient = input.tx ?? prisma;
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
    /* ⚠ ON `db` (`106a`): read the preference on the same connection the row is
       written on, so a caller's transaction sees one consistent snapshot. */
    const pref = await db.notificationPreference.findFirst({
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
      row = await db.notification.upsert({
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
      row = await db.notification.create({
        data,
        select: { id: true, email_sent_at: true },
      });
    }

    /*
      ⚠⚠⚠ THE SEND, BOUND BUT NOT YET RUN (`106a`). It reads and writes through
      `prisma`, NEVER `db` — a network call must not sit inside the caller's open
      transaction, and stamping `email_sent_at` on a transaction that later rolls
      back would claim an email that did go with a row that no longer exists.
    */
    const send = () =>
      emailFor({
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

    /* ⚠⚠ ROW INSIDE, SEND OUTSIDE. The caller owns the commit, so the caller owns
       the moment the send becomes safe. */
    if (input.tx) return { sendAfterCommit: send };

    await send();
    return { sendAfterCommit: null };
  } catch (e) {
    /*
      ⚠⚠⚠ WITH A LENT TRANSACTION THE FAILURE IS THE CALLER'S AND IS RE-THROWN
      (`106a`). Postgres has already aborted their transaction; swallowing here
      would hand them a broken connection and a confusing failure several
      statements later. ⚠ See the docblock — this is not a weakening of the
      2026-09-01 rule, it is that rule applied to the object it was written about.
    */
    if (input.tx) throw e;
    /* ⚠ NEVER INTO THE CALLER — see the docblock. */
    console.error("[notify] failed:", input.event, e);
    return { sendAfterCommit: null };
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
    ⚠⚠⚠ THE ALLOWLIST. **IT IS NOT EMPTY AND HAS NOT BEEN SINCE `E689` WS-C.**
    ⚠ CORRECTED BY `P2-A1.1-E737`: it holds **`account.finish_later`** and now
    **`colleague.invite_received`**, so mail DOES go from this function.
    ⚠⚠ **THE STALE VERSION OF THIS COMMENT WAS A SAFETY DEFECT, NOT A TYPO** — Scott,
    2026-09-29, on the same class of error one file over: *"A reader would add a category at
    `email:on` believing it is mail-free."* A reader who trusted the sentence below would
    have believed this function could not send, while it was already sending.
    ⚠ An event that is NOT on the list still records intent and does not send.
    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   THE ALLOWLIST. **EMPTY ON THIS COMMIT, SO NOTHING IS SENT AT ALL** - the
    //   sender exists and is wired, and which event goes first is Scott's. An event
    //   that is not on it records intent and does not send, exactly as before this
    //   commit, which is today's behaviour preserved rather than a new suppression.
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
      /* ⚠ THE LINK IS RESOLVED ONCE, HERE, AND HANDED TO WHICHEVER RENDERER RUNS
         — a relative path is meaningless in a mail client, and two renderers
         each doing their own resolution is the drift `E585` names. ⚠⚠ An
         already-absolute `href` is left alone so a future event pointing at a
         full URL is not mangled. */
      const base = (
        process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3100"
      ).replace(/\/+$/, "");
      const link = a.href
        ? /^https?:\/\//i.test(a.href)
          ? a.href
          : `${base}/${a.href.replace(/^\/+/, "")}`
        : null;

      const mail = renderNotificationMail(a.event, {
        firstName: person.user?.first_name ?? null,
        title: a.title,
        body: a.body,
        link,
        logoUrl: `${base}/brand/panameer-lockup-ink.png`,
      });
      const result = await sendEmail({
        to,
        category: a.category,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        /* ⚠⚠ THE EVENT'S OWN TEMPLATE NAME, NOT A CONSTANT. `E522` makes
           `template` required precisely so a receipt says WHICH mail went, and
           stamping every notification `"notification"` would have made the
           `finish-later` receipts indistinguishable from the rest the day a
           bounce needed tracing. */
        template: mail.template,
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
