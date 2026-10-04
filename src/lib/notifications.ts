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

export type NotifyResult = { sendAfterCommit: (() => Promise<void>) | null };

export async function notify(input: {
  event: NotificationEventKey;
  personId: string;
  entityType?: string | null;
  entityId?: string | null;
  /** Natural key for idempotency. Null/omitted always inserts. */
  dedupeKey?: string | null;
  vars?: Vars;
  tx?: Prisma.TransactionClient;
}): Promise<NotifyResult> {
  const db: Prisma.TransactionClient = input.tx ?? prisma;
  try {
    const spec: NotificationEvent | undefined = NOTIFICATION_EVENTS[input.event];
    if (!spec) {
      throw new Error(`notify(): unknown event key "${input.event}"`);
    }
    const vars = input.vars ?? {};
    const category = findCategory(spec.category);
    if (!category) {
      throw new Error(
        `notify(): event "${input.event}" names unknown category "${spec.category}"`
      );
    }

    const pref = await db.notificationPreference.findFirst({
      where: { person_id: input.personId, category: spec.category },
      select: { in_app: true, email: true, sms: true },
    });
    const wantsInApp = pref ? pref.in_app : category.defaults.inApp;
    const wantsEmail = pref ? pref.email : category.defaults.email;
    const wantsSms = pref ? pref.sms : category.defaults.sms;

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

    let row: { id: string; email_sent_at: Date | null };
    if (input.dedupeKey) {
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

    if (input.tx) return { sendAfterCommit: send };

    await send();
    return { sendAfterCommit: null };
  } catch (e) {
    if (input.tx) throw e;
    console.error("[notify] failed:", input.event, e);
    return { sendAfterCommit: null };
  }
}

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
  if (a.suppressed) return;
  if (!a.wantsEmail) return;
  if (!emailConfigured()) return;

  if (!notificationEmailAllowed(a.event)) return;

  if (a.alreadySent) return;

  try {
    const person = await prisma.person.findUnique({
      where: { id: a.personId },
      select: { user: { select: { id: true, email: true, first_name: true } } },
    });
    const to = person?.user?.email;
    if (!to) {
      await prisma.notification.update({
        where: { id: a.notificationId },
        data: { suppressed_reason: "email_no_address" },
      });
      return;
    }

    const claim = await prisma.notification.updateMany({
      where: { id: a.notificationId, email_sent_at: null },
      data: { email_sent_at: new Date() },
    });
    if (claim.count === 0) return;

    try {
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
