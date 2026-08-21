import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * BACKFILL `Certification.user_id` FROM EACH ROW'S PROVIDER-PROFILE OWNER
 * (brief_certification_user_id WS2).
 *
 *   npm run db:backfill-certification-user
 *
 * ── ⚠ A DATA STEP, DELIBERATELY SEPARATE FROM THE SCHEMA STEP ────────────────
 *
 * `db push` is the repo's convention and there is no migrations folder, but the
 * order here is not optional and cannot be collapsed into one push:
 *
 *   1. push `user_id` NULLABLE
 *   2. run this
 *   3. verify ZERO nulls
 *   4. only then push the NOT NULL
 *
 * Enforcing before backfilling would either fail on existing rows or, worse,
 * succeed by inventing a default owner for a credential.
 *
 * ── ⚠ THIS IS NOT `_retired_backfill-memberships` ────────────────────────────
 *
 * That one was retired because it MANUFACTURED AN ATTESTATION — it wrote
 * memberships from `Person.company_id`, a signup placeholder, asserting that
 * people worked somewhere nobody had said they worked. This writes an owner that
 * is already recorded: `Certification -> ProviderProfile -> Person -> User` is a
 * chain that exists in the database today, and copying its endpoint onto the row
 * asserts nothing new. It is a denormalisation, not a claim.
 *
 * ⚠ IT NEVER OVERWRITES A NON-NULL `user_id`, so re-running it is safe and it
 * cannot re-home a credential that has already been moved.
 */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  /*
    ⚠ THE NULL SCAN IS RAW SQL ON PURPOSE. `user_id` is NOT NULL now — step 4 of
    this brief's own sequence — so `where: { user_id: null }` no longer typechecks
    against the generated client. Raw keeps this script COMPILING AND RUNNABLE
    against either shape, which matters because the only reason to run it again is
    a future in which the column has been relaxed.
  */
  const ids = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `select id::text as id from certifications where user_id is null`
  );
  const rows = ids.length
    ? await prisma.certification.findMany({
        where: { id: { in: ids.map((r) => r.id) } },
        select: {
          id: true,
          name: true,
          issued_from: true,
          providerProfile: { select: { person: { select: { user_id: true } } } },
        },
      })
    : [];

  let filled = 0;
  const unresolved: string[] = [];
  for (const r of rows) {
    const userId = r.providerProfile?.person?.user_id ?? null;
    if (!userId) {
      /*
        ⚠ REPORTED, NEVER GUESSED. A row whose chain has no User cannot be given
        an owner by this script — there is nothing to copy. It stays null and the
        NOT NULL push will refuse, which is the correct outcome: somebody has to
        decide who owns it.
      */
      unresolved.push(`${r.issued_from} "${r.name}" (${r.id})`);
      continue;
    }
    await prisma.certification.update({ where: { id: r.id }, data: { user_id: userId } });
    filled += 1;
  }

  const total = await prisma.certification.count();
  const after = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
    `select count(*)::bigint as n from certifications where user_id is null`
  );
  const nulls = Number(after[0].n);
  console.log(`certifications: ${total}`);
  console.log(`  needed a backfill: ${rows.length}`);
  console.log(`  filled:            ${filled}`);
  console.log(`  UNRESOLVED:        ${unresolved.length}`);
  for (const u of unresolved) console.log(`     ⚠ ${u}`);
  console.log(`  user_id IS NULL after backfill: ${nulls}`);
  if (nulls > 0) {
    console.error(
      "\n⚠ DO NOT ENFORCE NOT NULL YET — the rows above have no resolvable owner."
    );
  } else {
    console.log("\n✓ zero nulls — safe to enforce NOT NULL.");
  }
  await prisma.$disconnect();
}

void main();
