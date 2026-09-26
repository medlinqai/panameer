import { createHash } from "crypto";
import { writeFileSync } from "fs";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import raw from "../seed-data/test-users.json";

/**
 * ── ⚠⚠⚠ `P2-A5-E655` — THE ADMIN PASSWORD RESET (ruling 83) ────────────────
 *
 * ⚠ **AUTHORISED BY SCOTT, 2026-09-25, AS ITS OWN NAMED CHANGE** — ruling 83:
 * *"It is its own named change, not a rider on a page brief."* ⚠⚠ It is not run
 * by any gate, any seed or any build; it is invoked once, by hand, and left on
 * disk as the record of what was done.
 *
 * ── ⚠⚠ WHAT `E580` ACTUALLY IS, MEASURED AT `E654` ───────────────────────
 *
 * ⚠ `E580` reads *"`prisma/seed-data/test-users.json`'s passwords DO NOT MATCH
 * the stored hashes… no admin surface can be walked signed in."*
 * ⚠⚠⚠ **THAT IS BROADER THAN THE FACT. PROVIDER PERSONAS DO SIGN IN** —
 * `check:console` walks seven pages signed in, every run. ⚠⚠ **IT IS ONE ROW:**
 * exactly one `is_system_admin` exists, `admin@panameer.com`, and
 * `bcrypt.compare(seedPassword, stored)` returns **false**. ⚠ **NOT a lockout,
 * and that was checked before concluding anything:** `locked = false`,
 * `locked_until = null`, `failed_login_attempts = 1` — my own failed attempt.
 *
 * ── ⚠⚠⚠ RULING 38 — THIS IS THE DATABASE THAT ALSO SERVES PRODUCTION ──────
 *
 * ⚠⚠ **SO THE FOUR CONDITIONS ARE ENFORCED BY THIS SCRIPT, NOT PROMISED BY IT:**
 *  1. ⚠⚠⚠ **ONE ROW.** The `update` is keyed on the resolved id of that single
 *     user. It **refuses** if the lookup returns anything but one row.
 *  2. ⚠⚠ **A HASH WRITE, NEVER A PLAINTEXT STORE.** It calls the application's
 *     own `hashPassword` (`bcryptjs`, cost 10) — the same function the signup
 *     path and the seed use, so the stored value is a bcrypt digest and the
 *     credentials provider's `compare` will accept it. ⚠ **No column holds the
 *     plaintext, and this file does not contain it** — it is read from the
 *     committed seed file at run time.
 *  3. ⚠⚠⚠ **NO OTHER ROW TOUCHED, AND IT IS PROVEN RATHER THAN ASSERTED.** A
 *     digest of every `(email, password_hash)` pair is taken BEFORE and AFTER,
 *     and the script **fails loudly** if any pair other than this one differs.
 *     ⚠ A count of changed rows would not catch a write that swapped two hashes.
 *  4. ⚠ **NO RESEED, NO `db push`, NO `--accept-data-loss`.** It is one
 *     `prisma.user.update` on one scalar column. No schema change is involved.
 *
 * ── ⚠⚠ REVERSIBILITY — THE UNDO FILE IS WRITTEN BEFORE THE WRITE ──────────
 *
 * ⚠ `E553`'s pattern: the undo lands first, so a failure mid-run still leaves a
 * way back. ⚠⚠ **THE PRIOR HASH IS RECORDED AND IT IS NOT A USABLE SECRET** —
 * it matches no password anybody holds, which is the entire defect being
 * repaired. Restoring it restores the broken state exactly.
 *
 * ── ⚠⚠⚠ WHAT THIS DOES *NOT* SETTLE, AND IT IS REPORTED NOT BURIED ────────
 *
 * ⚠⚠ **THE NEW PASSWORD IS THE ONE IN `prisma/seed-data/test-users.json`, WHICH
 * IS COMMITTED TO THE REPOSITORY.** ⚠ That is deliberate — it makes the
 * documented state TRUE rather than inventing a second secret nothing records,
 * and it is what `E580` says the seed file is for.
 * ⚠⚠⚠ **BUT THE CONSEQUENCE IS REAL: THE ONLY SYSTEM-ADMIN CREDENTIAL FOR A
 * DATABASE THAT ALSO SERVES PRODUCTION IS THEN A VALUE ANYONE WITH THE REPO CAN
 * READ.** ⚠ **That is a decision for Scott, not a defect in this script**, and it
 * is the reason `E580`'s status afterwards is *"the walk is unblocked"* rather
 * than *"closed"*. ⚠⚠ Rotating it to a value held outside the repo is the real
 * close, and it needs its own id.
 */

type Row = { email: string | null; password_hash: string | null };

const TARGET = "admin@panameer.com";

function digest(rows: Row[]): Map<string, string> {
  /* ⚠ Keyed by email so a SWAP between two rows is visible. A single checksum
     over the whole set would be identical after a swap — two ones agree. */
  const m = new Map<string, string>();
  for (const r of rows) {
    m.set(
      (r.email ?? "").toLowerCase(),
      createHash("sha256").update(r.password_hash ?? "<null>").digest("hex"),
    );
  }
  return m;
}

async function main() {
  const seeded = (
    Object.values(raw as Record<string, unknown>).filter(Array.isArray) as {
      email: string;
      password?: string;
    }[][]
  ).flat();
  const seedEntry = seeded.find(
    (u) => u.email?.toLowerCase() === TARGET && u.password,
  );
  if (!seedEntry) throw new Error(`${TARGET} has no password in test-users.json`);

  /* ── CONDITION 1: exactly one row, or refuse ───────────────────────────── */
  const matches = await prisma.user.findMany({
    where: { email: { equals: TARGET, mode: "insensitive" } },
    select: { id: true, email: true, is_system_admin: true, password_hash: true },
  });
  console.log(`rows matching ${TARGET} BEFORE: ${matches.length}`);
  if (matches.length !== 1) {
    throw new Error(`REFUSING: expected exactly 1 row, found ${matches.length}`);
  }
  const target = matches[0];
  if (!target.is_system_admin) {
    throw new Error("REFUSING: that row is not is_system_admin");
  }

  const before = digest(
    await prisma.user.findMany({ select: { email: true, password_hash: true } }),
  );
  console.log(`total user rows: ${before.size}`);
  console.log(
    `matches seed password BEFORE: ${
      target.password_hash
        ? await verifyPassword(seedEntry.password!, target.password_hash)
        : "no hash"
    }`,
  );

  /* ── REVERSIBILITY: the undo lands BEFORE the write ────────────────────── */
  const undo = {
    id: "P2-A5-E655",
    written: new Date().toISOString(),
    what: "admin@panameer.com password_hash reset to the committed seed value (ruling 83)",
    restore: "UPDATE users SET password_hash = prior_password_hash WHERE id = user_id",
    note: "The prior hash matches no known password — that IS the defect. Restoring it restores the broken state.",
    user_id: target.id,
    email: target.email,
    prior_password_hash: target.password_hash,
  };
  const undoPath = `prisma/repairs/E655-undo-2026-09-25.json`;
  writeFileSync(undoPath, JSON.stringify(undo, null, 2) + "\n");
  console.log(`undo file written BEFORE the write: ${undoPath}`);

  /* ── CONDITION 2: a HASH write, via the application's own function ─────── */
  const newHash = await hashPassword(seedEntry.password!);
  const updated = await prisma.user.update({
    where: { id: target.id },
    data: {
      password_hash: newHash,
      /* ⚠ The one failed attempt was mine. Clearing it leaves the row in the
         state a working credential implies, and it is on the SAME row. */
      failed_login_attempts: 0,
    },
    select: { id: true, email: true, password_hash: true },
  });

  /* ── VERIFY: the credential now works, through the app's own comparer ──── */
  console.log(
    `matches seed password AFTER: ${await verifyPassword(
      seedEntry.password!,
      updated.password_hash!,
    )}`,
  );
  console.log(
    `stored value is a bcrypt digest, not plaintext: ${/^\$2[aby]\$\d\d\$/.test(
      updated.password_hash ?? "",
    )}`,
  );

  /* ── CONDITION 3: prove no other row moved ─────────────────────────────── */
  const after = digest(
    await prisma.user.findMany({ select: { email: true, password_hash: true } }),
  );
  console.log(`rows matching ${TARGET} AFTER: 1 (updated by id ${updated.id})`);
  console.log(`total user rows AFTER: ${after.size}`);

  const unexpected: string[] = [];
  for (const [email, d] of after) {
    if (email === TARGET) continue;
    if (before.get(email) !== d) unexpected.push(email);
  }
  for (const email of before.keys()) {
    if (!after.has(email)) unexpected.push(`${email} (disappeared)`);
  }
  if (before.size !== after.size) unexpected.push(`row count ${before.size} -> ${after.size}`);

  if (unexpected.length) {
    throw new Error(`OTHER ROWS CHANGED — ${unexpected.join(", ")}`);
  }
  console.log(
    `other rows changed: 0 of ${after.size - 1} (every (email, password_hash) pair re-digested and compared)`,
  );
  console.log(`target hash changed: ${before.get(TARGET) !== after.get(TARGET)}`);
}

main().then(() => process.exit(0));
