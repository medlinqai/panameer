/**
 * ── ⚠⚠⚠ `P2-A1.4-E724` item 1b — ENGLISH · FLUENT FOR THE ZERO-LANGUAGE PROFILES ────────
 *
 * ⚠ **SCOTT, 2026-09-30: *"The 59 existing profiles with zero languages get one row, English
 * · FLUENT, and an in-app notification… Count before and after; touch only profiles with zero
 * languages."***
 *
 * ── ⚠⚠ WHAT IT WILL AND WILL NOT DO ─────────────────────────────────────────────────────
 *
 * ⚠⚠⚠ **IT TOUCHES ONLY PROFILES WITH `languages: { none: {} }`.** That predicate is the
 * whole safety argument: a profile that already holds a language — including the three with
 * malformed names — is never selected, so nothing existing is edited, replaced or deleted.
 * ⚠ **IT IS IDEMPOTENT.** A second run finds zero matching profiles and writes nothing; the
 * notification is deduped on the profile id besides.
 * ⚠⚠ **IT WRITES ITS UNDO FILE BEFORE THE FIRST ROW**, the pattern `E553` set: the file lists
 * every profile it is about to touch, so the write can be reversed exactly rather than
 * approximately.
 * ⚠⚠⚠ **NO EMAIL CAN LEAVE.** `notify()` sends only for events on `NOTIFICATION_EMAIL_EVENTS`,
 * which holds exactly `account.finish_later`. `profile.language_defaulted` is not on it, so
 * each call writes a `Notification` row and stops. **Checked, not assumed.**
 * ⚠ No reseed, no reset, no money moves: one `Language` row and one `Notification` row per
 * affected profile, and nothing else.
 *
 * ⚠⚠ RUN:  npx esbuild prisma/repairs/E724-default-language-2026-09-30.ts --bundle
 *          --platform=node --format=cjs --packages=external --alias:@=./src
 *          --outfile=.harness/e724.cjs && node -r dotenv/config .harness/e724.cjs
 *          dotenv_config_path=.env.local [--apply]
 * ⚠⚠⚠ **WITHOUT `--apply` IT ONLY COUNTS AND PRINTS.** A repair that runs on import is a
 * repair somebody triggers by opening it.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { writeFileSync } from "node:fs";
import { notify } from "@/lib/notifications";
import { notificationEmailAllowed } from "@/lib/notification-email";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const UNDO = "prisma/repairs/E724-undo-2026-09-30.json";

async function main() {
  const apply = process.argv.includes("--apply");

  /* ⚠⚠⚠ THE MAIL CHECK RUNS FIRST AND REFUSES, rather than being a comment somebody trusts. */
  if (notificationEmailAllowed("profile.language_defaulted")) {
    throw new Error(
      "REFUSING: profile.language_defaulted is on NOTIFICATION_EMAIL_EVENTS — this would mail 59 real members."
    );
  }

  const totalProfiles = await prisma.providerProfile.count();
  const before = await prisma.providerProfile.count({ where: { languages: { none: {} } } });
  const languageRowsBefore = await prisma.language.count();
  console.log(`BEFORE  profiles ${totalProfiles} · zero-language ${before} · Language rows ${languageRowsBefore}`);

  const targets = await prisma.providerProfile.findMany({
    where: { languages: { none: {} } },
    select: { id: true, person_id: true, person: { select: { first_name: true, last_name: true } } },
    orderBy: { id: "asc" },
  });
  console.log(`TARGETS ${targets.length} profiles with zero languages`);

  if (!apply) {
    console.log("\nDRY RUN — nothing written. Re-run with --apply.");
    for (const t of targets.slice(0, 5))
      console.log(`   would add English/FLUENT to ${t.id.slice(0, 8)} (${t.person.first_name} ${t.person.last_name})`);
    console.log(`   … and ${Math.max(0, targets.length - 5)} more`);
    return;
  }

  /*
    ── ⚠⚠⚠ A NO-OP RUN MUST NOT TOUCH THE UNDO FILE. THIS BIT ME. ──────────────────────────

    ⚠⚠ **THE FIRST `--apply` WROTE ALL 59 ROWS AND THEN CRASHED ON A REPORTING LINE** (it
    counted `notification.event`; the column is `event_key`). ⚠⚠⚠ **RE-RUNNING WAS SAFE FOR
    THE DATA — the target query correctly found ZERO profiles and wrote nothing — BUT THE
    SECOND RUN REACHED THIS LINE FIRST AND OVERWROTE THE UNDO FILE WITH AN EMPTY LIST.**
    ⚠ **SO THE IDEMPOTENCY GUARD PROTECTED THE ROWS AND NOT THE RECORD OF THEM.** The undo
    file was reconstructed from the 59 notifications, which name every profile touched — but
    that only worked because the notifications happened to carry `entity_id`. **It could
    easily have been unrecoverable.**
    ⚠⚠ **A REPAIR THAT CANNOT BE REVERSED IS A REPAIR NOBODY SHOULD RUN**, so the guard is
    here now: nothing to do means nothing is written, including the undo file.
  */
  if (targets.length === 0) {
    console.log("NOTHING TO DO — 0 profiles with zero languages. Undo file left untouched.");
    return;
  }
  /* ⚠ THE UNDO FILE IS WRITTEN BEFORE THE FIRST ROW (`E553`'s pattern). */
  writeFileSync(
    UNDO,
    JSON.stringify(
      {
        wroteAt: new Date().toISOString(),
        brief: "P2-A1.4-E724 item 1b",
        note: "Delete the Language rows named below and the profile.language_defaulted Notification rows for these people to reverse exactly.",
        beforeZeroLanguage: before,
        profiles: targets.map((t) => ({ providerProfileId: t.id, personId: t.person_id })),
      },
      null,
      2
    )
  );
  console.log(`UNDO    written to ${UNDO} (${targets.length} profiles)`);

  let rows = 0;
  let notes = 0;
  for (const t of targets) {
    await prisma.language.create({
      data: { provider_profile_id: t.id, name: "English", level: "FLUENT", proficiency: "Fluent" },
    });
    rows++;
    /* ⚠⚠ DEDUPED ON THE PROFILE, so a re-run cannot double-notify anybody. */
    await notify({
      event: "profile.language_defaulted",
      personId: t.person_id,
      entityType: "ProviderProfile",
      entityId: t.id,
      dedupeKey: `profile.language_defaulted:${t.id}`,
    });
    notes++;
  }

  const after = await prisma.providerProfile.count({ where: { languages: { none: {} } } });
  const languageRowsAfter = await prisma.language.count();
  const sent = await prisma.notification.count({ where: { event_key: "profile.language_defaulted" } });
  console.log(`\nAFTER   zero-language ${after} · Language rows ${languageRowsAfter}`);
  console.log(`WROTE   ${rows} Language rows · ${notes} notifications (rows in table: ${sent})`);
  console.log(`DELTA   Language rows ${languageRowsBefore} -> ${languageRowsAfter} (+${languageRowsAfter - languageRowsBefore})`);
  if (after !== 0) console.log(`⚠ ${after} profiles STILL have zero languages — investigate before assuming success.`);
}

main().finally(() => prisma.$disconnect());
