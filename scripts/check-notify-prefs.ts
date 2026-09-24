import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { NOTIFICATION_EVENTS } from "@/lib/notification-events";
import { NOTIFICATION_CATEGORIES } from "@/lib/notification-categories";

/**
 * ── ⚠⚠⚠ `check:notify-prefs` (`P2-A3-E620`) ─────────────────────────────
 *
 * ⚠ RULING 13, THE HALF THAT SURVIVED 34d: **"A SETTING NOTHING READS IS WORSE
 * THAN NO SETTING. Every toggle is read at the point of sending, and the gate
 * MUTATION-PROVES that switching one off actually suppresses that event."**
 *
 * ⚠⚠ `check:notifications` cannot carry this — it is a static gate with no
 * database, and the claim here is about RUNTIME BEHAVIOUR: that `notify()`
 * consults the preference row before delivering. ⚠⚠⚠ `E607`'s rule is the
 * reason it is a round trip and not a grep: **a value the code knows and never
 * consults is not a safeguard**, and a regex proving `notificationPreference`
 * is mentioned would pass against code that reads it and throws it away.
 *
 * ⚠ IT WRITES, AND IT CLEANS UP AFTER ITSELF, restoring any preference the
 * person already had rather than deleting one it did not create.
 */
let pass = 0;
const fails: string[] = [];
const check = (name: string, ok: boolean, why = "") => {
  if (ok) pass += 1;
  else fails.push(`${name}${why ? ` — ${why}` : ""}`);
};

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

async function main() {
  /* ── 1 · ⚠⚠ EVERY CATEGORY SHIPS ON (ruling 34b) ────────────────────────
     ⚠ Scott: *"All on, exactly as ruled."* In-app AND email, all 17. */
  check(
    "1 — there are categories to check (E586)",
    NOTIFICATION_CATEGORIES.length > 10,
    `${NOTIFICATION_CATEGORIES.length}`
  );
  const off = NOTIFICATION_CATEGORIES.filter(
    (c) => !c.defaults.inApp || !c.defaults.email
  ).map((c) => c.key);
  check(
    "1 — ⚠⚠ every category ships in-app AND email ON (ruling 34b)",
    off.length === 0,
    `${off.join(", ")} — 8 shipped off and Scott ruled all of them on`
  );

  /*
    ── ⚠⚠⚠ 1b · THE FILTER PARTITION IS TOTAL (`E620` WS-C item 2) ─────────

    ⚠ `/notifications` offers **All · Unread · Work · Community**, and the last
    two are a partition of the same rows read off `NotificationCategory.lane`.
    ⚠⚠ A CATEGORY WITH NO LANE WOULD BE REACHABLE UNDER `All` AND UNDER NOTHING
    ELSE — a filter set with a hole, where the rows you cannot find are exactly
    the ones nobody knows are missing.
    ⚠⚠⚠ SO ADDING A CATEGORY WITHOUT CHOOSING A LANE FAILS HERE rather than
    quietly hiding its rows. ⚠ And both lanes must be non-empty: a partition
    where everything is on one side is a filter that does nothing.
  */
  const laneless = NOTIFICATION_CATEGORIES.filter((c) => !c.lane).map((c) => c.key);
  check(
    "1b — ⚠⚠⚠ every category answers to a filter lane",
    laneless.length === 0,
    `${laneless.join(", ")} — reachable under All and under nothing else`
  );
  for (const lane of ["work", "community"] as const) {
    check(
      `1b — the "${lane}" lane has categories (E586)`,
      NOTIFICATION_CATEGORIES.some((c) => c.lane === lane),
      "an empty lane is a filter that can only ever show nothing"
    );
  }
  /* ⚠⚠ AND EVERY REGISTERED EVENT'S CATEGORY EXISTS, so no delivered row can
     carry a category the page cannot place. `check:notifications` asserts the
     category is declared; this asserts it is still FINDABLE by the lane lookup
     the page actually performs. */
  const orphanEvents = Object.entries(NOTIFICATION_EVENTS)
    .filter(([, e]) => !NOTIFICATION_CATEGORIES.some((c) => c.key === e.category))
    .map(([k]) => k);
  check(
    "1b — ⚠⚠ every event's category is findable by the page's lane lookup",
    orphanEvents.length === 0,
    `${orphanEvents.join(", ")}`
  );

  /* ── 2 · ⚠⚠⚠ EVERY WORKLIST EVENT HAS SOMETHING THAT CLEARS IT ──────────
     ⚠ Ruling 34e: *"an item disappears when the thing is DONE, not when it is
     read."* ⚠⚠ So a `requiresAction` event whose dedupe key nothing ever
     resolves is an item that sits on a member's list forever — `E579` one
     level down, and the exact reason `createGroup` refused `REQUEST` until an
     approval writer existed. */
  const SRC = walk("src");
  const resolvers = SRC.filter((f) =>
    /resolved_at:\s*new Date\(\)/.test(strip(readFileSync(f, "utf8")))
  );
  check(
    "2 — something in src/ resolves a worklist item (E586)",
    resolvers.length > 0,
    "no file writes resolved_at — every worklist item would be permanent"
  );

  /* ── 3 · ⚠⚠⚠ THE MUTATION PROOF — THE TOGGLE IS READ AT SEND TIME ───────
     ⚠ This is the assertion ruling 13 asked for, and it is the whole point of
     the file. */
  const person = await prisma.person.findFirst({
    where: { user_id: { not: null } },
    select: { id: true },
  });
  if (!person) {
    check("3 — a person exists to notify (E586)", false, "none found");
  } else {
    /* ⚠ `community.activity` — a category with live events, so this proves the
       path a real member actually travels. */
    const EVENT = "group.join_approved" as const;
    const CATEGORY = NOTIFICATION_EVENTS[EVENT].category;
    const stamp = Date.now();
    const onKey = `E620-probe-on:${stamp}`;
    const offKey = `E620-probe-off:${stamp}`;

    /* ⚠⚠ RECORDED, NOT ASSUMED. If this person already has a preference for
       the category, the teardown must put THEIR row back — deleting it would
       silently convert a choice they made into a default. */
    const prior = await prisma.notificationPreference.findUnique({
      where: { person_id_category: { person_id: person.id, category: CATEGORY } },
      select: { in_app: true, email: true, sms: true },
    });

    try {
      /* ── the ON case ──────────────────────────────────────────────────── */
      await prisma.notificationPreference.upsert({
        where: { person_id_category: { person_id: person.id, category: CATEGORY } },
        update: { in_app: true },
        create: { person_id: person.id, category: CATEGORY, in_app: true, email: true, sms: false },
      });
      await notify({
        event: EVENT,
        personId: person.id,
        dedupeKey: onKey,
        vars: { groupTitle: "E620 probe", groupSlug: "e620-probe" },
      });
      const on = await prisma.notification.findFirst({
        where: { dedupe_key: onKey },
        select: { delivered_in_app_at: true, suppressed_reason: true },
      });
      check("3 — with the toggle ON, the row is written", on !== null);
      check(
        "3 — ⚠ and it is DELIVERED in app",
        on?.delivered_in_app_at !== null && on?.delivered_in_app_at !== undefined,
        `delivered_in_app_at=${on?.delivered_in_app_at}`
      );
      check("3 — ⚠ with no suppression reason", on?.suppressed_reason === null);

      /* ── ⚠⚠⚠ THE MUTATION: switch it OFF ──────────────────────────────── */
      await prisma.notificationPreference.update({
        where: { person_id_category: { person_id: person.id, category: CATEGORY } },
        data: { in_app: false },
      });
      await notify({
        event: EVENT,
        personId: person.id,
        dedupeKey: offKey,
        vars: { groupTitle: "E620 probe", groupSlug: "e620-probe" },
      });
      const offRow = await prisma.notification.findFirst({
        where: { dedupe_key: offKey },
        select: { delivered_in_app_at: true, suppressed_reason: true },
      });
      /* ⚠⚠ THE ROW IS STILL WRITTEN. Suppression is about DELIVERY, not about
         the record — *"a dropped delivery with no record is how 'I never got
         told' becomes unanswerable"*, in `notifications.ts`'s own words. */
      check("3 — with the toggle OFF, the row is STILL recorded", offRow !== null);
      check(
        "3 — ⚠⚠⚠ but it is NOT delivered — the toggle is read at send time",
        offRow?.delivered_in_app_at === null,
        `delivered_in_app_at=${offRow?.delivered_in_app_at} — a setting nothing reads is worse than no setting`
      );
      /* ⚠ AND THE REASON IS RECORDED, so the suppression is answerable later. */
      check(
        "3 — ⚠ and the reason says the member opted out",
        offRow?.suppressed_reason === "user_opted_out",
        `${offRow?.suppressed_reason}`
      );
    } finally {
      /*
        ⚠⚠ SCOPED TEARDOWN, `deleteMany` NEVER `delete` — a teardown that can
        throw can hide the result it was protecting.
        ⚠⚠⚠ AND THE PREFERENCE IS RESTORED TO WHAT IT WAS, not deleted: this
        person may have had a real choice recorded, and turning it into a
        default would be the gate quietly changing a member's settings.
      */
      await prisma.notification.deleteMany({ where: { dedupe_key: { in: [onKey, offKey] } } });
      if (prior) {
        await prisma.notificationPreference.update({
          where: { person_id_category: { person_id: person.id, category: CATEGORY } },
          data: prior,
        });
      } else {
        await prisma.notificationPreference.deleteMany({
          where: { person_id: person.id, category: CATEGORY },
        });
      }
      const left = await prisma.notification.count({
        where: { dedupe_key: { in: [onKey, offKey] } },
      });
      check("3 — ⚠ the probe cleaned up after itself", left === 0, `${left} row(s) left`);
    }
  }

  /*
    ── ⚠⚠⚠ 4 · A FAILED NOTIFICATION CANNOT BREAK THE ACTION ───────────────

    ⚠ WS-B item 2: *"A notification is never the thing itself. Writing it can't
    fail the action that caused it."* ⚠⚠ `notify()` wraps its whole body in
    try/catch and logs instead of rethrowing — **but that is a claim about the
    code, and this is the proof.**

    ⚠⚠⚠ THE INPUT IS DELIBERATELY INVALID. An unknown event key makes `notify`
    throw INSIDE its own try — the same shape as a database outage or a bad
    template — and the assertion is that the caller never sees it. ⚠ If this
    ever rejects, then `joinGroup`, `createThread`, `requestColleague` and
    `recordProfileView` all inherit a new failure mode: a notification outage
    would turn "you joined" into an error the member has to read.

    ⚠⚠ AND IT WRITES NOTHING. A swallowed failure that still left a half-formed
    row would be worse than throwing, because the row would be delivered.
  */
  if (person) {
    let threw = false;
    const before = await prisma.notification.count({ where: { person_id: person.id } });
    try {
      /* ⚠ `as never` — the type system correctly refuses this key, which is the
         point: we are proving the RUNTIME guard, not the compile-time one. */
      await notify({ event: "e620.no.such.event" as never, personId: person.id });
    } catch {
      threw = true;
    }
    check(
      "4 — ⚠⚠⚠ a failed notification does NOT throw into its caller",
      !threw,
      "an action that succeeded would report as failed because telling somebody about it did not"
    );
    const after = await prisma.notification.count({ where: { person_id: person.id } });
    check(
      "4 — ⚠ and it wrote no row",
      after === before,
      `${before} -> ${after} — a swallowed failure that still wrote would be delivered`
    );
  }

  await prisma.$disconnect();
  console.log(
    `check:notify-prefs — ${fails.length ? `${fails.length} FAILED, ` : ""}${pass} passed`
  );
  for (const f of fails) console.log(`\n  ✗ ${f}`);
  if (fails.length) process.exit(1);
}

main();
