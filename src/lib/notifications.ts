import { prisma } from "@/lib/prisma";
import { findCategory } from "@/lib/notification-categories";
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
      ⚠ EMAIL AND SMS RECORD INTENT AND DO NOT SEND. `RESEND_API_KEY` /
      `EMAIL_FROM` are commented out, and phone verification is off by design. When
      in-app carried the row we keep its timestamp and note the channel that could
      not fire — the row still reached the person, just not by every route they
      asked for.
    */
    if (!suppressed && wantsEmail && !process.env.RESEND_API_KEY) {
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

    if (input.dedupeKey) {
      /* ⚠ THE DUPLICATE-ENROLLMENT FIX. Upsert on the unique pair, so enrolling
         twice updates one row rather than producing two. */
      await prisma.notification.upsert({
        where: {
          person_id_dedupe_key: {
            person_id: input.personId,
            dedupe_key: input.dedupeKey,
          },
        },
        create: data,
        update: {},
      });
      return;
    }
    await prisma.notification.create({ data });
  } catch (e) {
    /* ⚠ NEVER INTO THE CALLER'S TRANSACTION — see the docblock. */
    console.error("[notify] failed:", input.event, e);
  }
}
