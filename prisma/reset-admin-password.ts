/**
 * `npm run admin:reset-password` — set the seed admin's password (`P1-J1.1-E251`).
 *
 * ⚠⚠ THIS EXISTS BECAUSE `prisma/seed.ts` CANNOT DO IT. That seeder puts
 * `password_hash` in its `create` branch only, so once the admin row exists a
 * reseed never touches the credentials and `SEED_ADMIN_PASSWORD` never reaches
 * the database. Scott lost access to `admin@panameer.com` on 2026-08-30 exactly
 * that way. Moving the hash into `update` was considered and REJECTED by him —
 * *"No on the password."* — because it would let any reseed overwrite a live
 * admin's credentials. So the capability lives here, deliberately and visibly,
 * instead of as a side effect of seeding.
 *
 * ⚠ IT ALSO CLEARS THE LOCKOUT, and that is not scope creep. The two travel
 * together, proven on 2026-08-30: the password that could never match drove
 * `failed_login_attempts` to `MAX_FAILED_LOGINS`, so resetting the hash alone
 * left the account just as unreachable as before.
 *
 *   npm run admin:reset-password              # DRY RUN — prints the plan
 *   npm run admin:reset-password -- --apply   # writes
 *
 * Mirrors `seed.ts` exactly: same `dotenv` path, same `normalizeEmail`, same
 * bcrypt cost factor. It prints neither the password nor the hash.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import path from "path";
import { normalizeEmail } from "../src/lib/normalizeEmail";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

/** Same cost factor as `seed.ts` — a different one would still work but would
 *  make the two paths quietly produce different-strength hashes. */
const BCRYPT_COST = 10;

const APPLY = process.argv.includes("--apply");

async function main() {
  const email = normalizeEmail(
    process.env.SEED_ADMIN_EMAIL ?? "admin@panameer.com"
  );
  const password = process.env.SEED_ADMIN_PASSWORD ?? "";

  if (!password) {
    console.error(
      "REFUSING: SEED_ADMIN_PASSWORD is empty or unset in .env.local."
    );
    process.exit(1);
  }

  console.log(`mode          : ${APPLY ? "APPLY" : "DRY RUN"}`);
  console.log(`target email  : ${email}`);
  console.log(
    `password      : <read from .env.local, ${password.length} chars, not printed>`
  );
  console.log(`bcrypt cost   : ${BCRYPT_COST}  (same as seed.ts)`);

  /*
    ⚠ THE WHERE-CLAUSE MUST MATCH EXACTLY ONE ROW. This script rewrites
    credentials, so "probably the right person" is not good enough — anything
    other than a single unambiguous match stops without writing.
  */
  const exact = await prisma.user.findMany({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      is_system_admin: true,
      locked: true,
      failed_login_attempts: true,
    },
  });

  /*
    ⚠ AND NO CASE-VARIANT TWIN. A `lower(email)` unique index backs this column
    (`npm run db:email-guard`), but the index is the thing that would be VIOLATED
    by a twin rather than proof one cannot exist — check, do not assume.
  */
  const ci = await prisma.user.findMany({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true },
  });

  console.log(`exact matches : ${exact.length}`);
  console.log(
    `ci matches    : ${ci.length}${ci.length ? "  -> " + ci.map((u) => u.email).join(", ") : ""}`
  );

  if (exact.length !== 1) {
    console.error(
      `REFUSING: where-clause matched ${exact.length} rows, expected exactly 1. Nothing written.`
    );
    process.exit(1);
  }
  if (ci.length !== 1) {
    console.error(
      `REFUSING: ${ci.length} case-variant rows share this address. Nothing written.`
    );
    process.exit(1);
  }

  const target = exact[0];
  console.log(
    `plan          : UPDATE users SET password_hash = <new bcrypt>, locked = false, failed_login_attempts = 0, locked_until = NULL`
  );
  console.log(`                WHERE email = '${email}'`);
  console.log(
    `                id=${target.id} role=${target.role} is_system_admin=${target.is_system_admin}`
  );
  console.log(
    `                currently locked=${target.locked} attempts=${target.failed_login_attempts}`
  );
  console.log(`rows affected : 1 (and only this row)`);

  if (!APPLY) {
    console.log("DRY RUN — nothing written. Re-run with -- --apply.");
    return;
  }

  const password_hash = await bcrypt.hash(password, BCRYPT_COST);
  const updated = await prisma.user.update({
    where: { email },
    data: {
      password_hash,
      /* The lock travels with the password — see the header. */
      locked: false,
      locked_until: null,
      failed_login_attempts: 0,
    },
    select: { email: true, password_hash: true, locked: true },
  });

  /*
    ⚠ PROVE IT RATHER THAN ANNOUNCE IT. A write that "succeeded" and a hash that
    actually verifies the password somebody will type are different claims.
  */
  const verifies = await bcrypt.compare(password, updated.password_hash ?? "");
  console.log(`${updated.email}: updated (locked=${updated.locked})`);
  console.log(
    `verify        : bcrypt.compare(SEED_ADMIN_PASSWORD, stored) -> ${verifies}`
  );
  if (!verifies) {
    console.error("REFUSING TO REPORT SUCCESS: the stored hash does not verify.");
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
