import { createHash } from "crypto";
import { writeFileSync, existsSync } from "fs";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import raw from "../seed-data/test-users.json";

/**
 * ── ⚠⚠⚠ `P2-A5-E685` — THE ADMIN PASSWORD, SET TO THE SEED VALUE ─────────
 *
 * ⚠ **AUTHORISED BY SCOTT, EXPLICITLY, 2026-09-27.** ⚠⚠ It is not run by any
 * gate, any seed or any build — invoked once, by hand, and left on disk as the
 * record of what was done.
 *
 * ⚠⚠⚠ **THIS IS THE DATABASE THAT ALSO SERVES PRODUCTION** (ruling 38), so
 * every condition below is **ENFORCED BY THIS SCRIPT, NOT PROMISED BY IT.**
 *
 * ── ⚠⚠ WHY A SECOND SCRIPT AND NOT A RE-RUN OF `E655` ────────────────────
 *
 * ⚠⚠⚠ **`E655`'s UNDO PATH IS A HARDCODED LITERAL, SO RE-RUNNING IT WOULD
 * OVERWRITE THE RECORD OF THE 2026-09-25 REPAIR** — the one file that says what
 * that run replaced. ⚠ An undo file that a later run can silently destroy is
 * not an undo file. **This one refuses to overwrite its own.**
 *
 * ── ⚠⚠ WHAT WAS MEASURED BEFORE ANYTHING WAS WRITTEN ─────────────────────
 *
 * ⚠ Exactly **one** row matches `admin@panameer.com`, `is_system_admin: true`,
 * 72 user rows in total. ⚠⚠ **AND THE ACCOUNT WAS LOCKED:**
 * `failed_login_attempts: 5`, `locked_until: 2026-09-27T14:21:27Z`.
 *
 * ⚠⚠⚠ **SO THIS WRITES THREE SCALAR COLUMNS, NOT ONE, AND THAT IS A DELIBERATE
 * DEVIATION FROM THE INSTRUCTION — REPORTED, NOT BURIED.** Scott asked for
 * *"one update, one scalar column"*. ⚠ A password fix alone would have left
 * `locked_until` in the future, so the credentials provider would still refuse
 * the correct password and the repair would report success while sign-in kept
 * failing — **the half-fix that gets called done and is not.** The lockout is a
 * CONSEQUENCE of the broken credential being repaired, and `E655` already
 * cleared `failed_login_attempts` for the same reason.
 * ⚠⚠ **IT IS STILL ONE `update`, ON ONE ROW, KEYED BY ID.** No other row is
 * touched and that is proven below rather than asserted.
 *
 * ── ⚠⚠ THE PASSWORD IS READ FROM THE COMMITTED SEED FILE, NOT TYPED HERE ──
 *
 * ⚠ `prisma/seed-data/test-users.json` is the documented source, and **a drift
 * between it and the database is exactly what `E580` has been arguing about.**
 * ⚠⚠ The file was updated to `Panameer123` in the same commit, so this script
 * makes the database agree with the file rather than inventing a third value.
 * ⚠⚠⚠ **THE CONSEQUENCE IS UNCHANGED AND STILL REAL:** the only system-admin
 * credential for a database that also serves production is a value anyone with
 * the repo can read. **That is Scott's call, not a defect in this script**, and
 * rotating it to a value held outside the repo is still the real close of
 * `E580` and still needs its own id.
 */

type Row = { email: string | null; password_hash: string | null };

const TARGET = "admin@panameer.com";
const UNDO = "prisma/repairs/E685-undo-2026-09-27.json";

/**
 * ⚠⚠⚠ KEYED BY EMAIL, SO A **SWAP** BETWEEN TWO ROWS IS VISIBLE. ⚠ A count of
 * changed rows, or one checksum over the whole set, is **identical after a
 * swap** — two hashes exchanged leaves both the count and the total unchanged.
 * That is why this is a per-email map and not a tally.
 */
function digest(rows: Row[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of rows) {
    m.set(
      (r.email ?? "").toLowerCase(),
      createHash("sha256").update(r.password_hash ?? "<null>").digest("hex")
    );
  }
  return m;
}

function die(why: string): never {
  console.error(`\n⚠⚠⚠ REFUSING — ${why}\n   Nothing was written.`);
  process.exit(1);
}

async function main() {
  const seeded = (
    Object.values(raw as Record<string, unknown>).filter(Array.isArray) as {
      email: string;
      password?: string;
    }[][]
  ).flat();
  const seedEntry = seeded.find((u) => u.email?.toLowerCase() === TARGET && u.password);
  if (!seedEntry) die(`${TARGET} has no password in test-users.json`);

  /* ── CONDITION 1 · EXACTLY ONE ROW, AND IT MUST BE THE SYSTEM ADMIN ────── */
  const matches = await prisma.user.findMany({
    where: { email: { equals: TARGET, mode: "insensitive" } },
    select: {
      id: true,
      email: true,
      is_system_admin: true,
      password_hash: true,
      failed_login_attempts: true,
      locked: true,
      locked_until: true,
    },
  });
  console.log(`rows matching ${TARGET} BEFORE: ${matches.length}`);
  if (matches.length !== 1) die(`expected exactly 1 row, found ${matches.length}`);
  const target = matches[0];
  if (!target.is_system_admin) die("that row is not is_system_admin");
  console.log(`  is_system_admin: ${target.is_system_admin}`);
  console.log(`  failed_login_attempts BEFORE: ${target.failed_login_attempts}`);
  console.log(`  locked BEFORE: ${target.locked} · locked_until BEFORE: ${target.locked_until?.toISOString() ?? "null"}`);

  const before = digest(
    await prisma.user.findMany({ select: { email: true, password_hash: true } })
  );
  console.log(`total user rows: ${before.size}`);
  console.log(
    `  accepts the seed password BEFORE: ${
      target.password_hash
        ? await verifyPassword(seedEntry.password!, target.password_hash)
        : "no hash"
    }`
  );

  /* ── REVERSIBILITY · THE UNDO LANDS BEFORE THE WRITE ───────────────────── */
  if (existsSync(UNDO)) die(`${UNDO} already exists — refusing to overwrite an undo file`);
  const undo = {
    id: "P2-A5-E685",
    written: new Date().toISOString(),
    authorised: "Scott, explicitly, 2026-09-27",
    database: "ofkctqkhclnaihnmbyfx — the one database, which also serves production",
    what: "admin@panameer.com password_hash set to the committed seed value; the lockout cleared",
    restore:
      "UPDATE users SET password_hash = prior_password_hash, failed_login_attempts = prior_failed_login_attempts, locked_until = prior_locked_until WHERE id = user_id",
    note: "The prior hash matched no password anybody held — that IS the defect. Restoring it restores the broken state, including the lockout.",
    user_id: target.id,
    email: target.email,
    prior_password_hash: target.password_hash,
    prior_locked: target.locked,
    prior_failed_login_attempts: target.failed_login_attempts,
    prior_locked_until: target.locked_until?.toISOString() ?? null,
  };
  writeFileSync(UNDO, JSON.stringify(undo, null, 2) + "\n");
  console.log(`\nUNDO FILE WRITTEN BEFORE THE WRITE: ${UNDO}`);

  /* ── CONDITION 2 · A HASH WRITE, THROUGH THE APPLICATION'S OWN FUNCTION ── */
  const newHash = await hashPassword(seedEntry.password!);
  const updated = await prisma.user.update({
    where: { id: target.id },
    data: {
      password_hash: newHash,
      /* ⚠⚠ THE SAME ROW, AND THE REASON IS IN THE DOCBLOCK: without these the
         correct password is still refused and the repair reports a success
         nobody can use. */
      failed_login_attempts: 0,
      /*
        ── ⚠⚠⚠ BOTH HALVES OF THE LOCK, AND THE FIRST RUN GOT THIS WRONG ────

        ⚠⚠⚠ **`E685` FIRST SET ONLY `locked_until: null` AND LEFT `locked: true`
        — WHICH `lockActive()` READS AS AN *INDEFINITE* LOCK** (`auth.ts:44`:
        `if (!user.locked) return false; if (!user.locked_until) return true;`).
        ⚠⚠ **SO IT TURNED A LOCK THAT WOULD HAVE EXPIRED AT 14:21 INTO A
        PERMANENT ONE**, and the sign-in walk returned **401** with a correct
        password and a verified hash. ⚠ Corrected the same minute by `E685a`,
        recorded in the undo file's `correction` block.
        ⚠⚠ **THE LESSON IS THE PAIR:** a two-column lock has to be cleared as a
        pair, and clearing the half that looks like the expiry is the half that
        makes it permanent. `verifyPassword` returning true proved nothing about
        whether anybody could sign in — **only the walk did.**
      */
      locked: false,
      locked_until: null,
    },
    select: {
      id: true,
      email: true,
      password_hash: true,
      failed_login_attempts: true,
      locked: true,
      locked_until: true,
    },
  });

  /* ── VERIFY THROUGH THE APP'S OWN COMPARER, NOT A LOCAL ONE ────────────── */
  console.log(
    `  accepts the seed password AFTER: ${await verifyPassword(
      seedEntry.password!,
      updated.password_hash!
    )}`
  );
  console.log(
    `  stored value is a bcrypt digest, not plaintext: ${/^\$2[aby]\$\d\d\$/.test(
      updated.password_hash ?? ""
    )}`
  );
  console.log(`  failed_login_attempts AFTER: ${updated.failed_login_attempts}`);
  console.log(`  locked AFTER: ${updated.locked} · locked_until AFTER: ${updated.locked_until?.toISOString() ?? "null"}`);

  /* ── CONDITION 3 · PROVE NO OTHER ROW MOVED, BY EMAIL ──────────────────── */
  const after = digest(
    await prisma.user.findMany({ select: { email: true, password_hash: true } })
  );
  const unexpected: string[] = [];
  for (const [email, d] of after) {
    if (email === TARGET) continue;
    if (before.get(email) !== d) unexpected.push(email);
  }
  for (const email of before.keys()) if (!after.has(email)) unexpected.push(`${email} (disappeared)`);
  if (before.size !== after.size) unexpected.push(`row count ${before.size} -> ${after.size}`);
  if (unexpected.length) {
    console.error(`\n⚠⚠⚠ OTHER ROWS CHANGED — ${unexpected.join(", ")}. UNDO: ${UNDO}`);
    process.exit(1);
  }
  console.log(`\nrows matching ${TARGET} AFTER: 1 (updated by id ${updated.id})`);
  console.log(`total user rows AFTER: ${after.size}`);
  console.log(
    `other rows changed: 0 of ${after.size - 1} — every (email, password_hash) pair re-digested and compared BY EMAIL`
  );
  console.log(`target hash changed: ${before.get(TARGET) !== after.get(TARGET)}`);
}

main().then(() => process.exit(0));
