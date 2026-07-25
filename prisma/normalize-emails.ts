/**
 * One-time (and safely re-runnable) email normalization + case-insensitive
 * uniqueness guard — brief_O.
 *
 * What it does, in order:
 *   1. Reports any User rows whose email is not already lowercase.
 *   2. Detects COLLISIONS — two accounts that differ only by case. These are
 *      NEVER deleted or merged; they are listed for Scott to resolve, and the
 *      script stops before touching data or adding the index.
 *   3. Backfills `users.email` and `coordinator_invites.invitee_email` to
 *      lowercase, reporting the row counts.
 *   4. Creates the unique index on `lower(email)` so two rows differing only by
 *      case can never exist again.
 *
 * Run with:  npm run db:email-guard
 *
 * IMPORTANT: `prisma db push` diffs the DB against schema.prisma and will DROP
 * this index, because Prisma cannot express a functional (expression) index.
 * Re-run this script after every `db push` until a migrations baseline exists.
 *
 * Loads .env.local itself — bare ts-node does not inherit it (see pitfalls.md).
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const INDEX_NAME = "users_email_lower_key";

type CollisionRow = { normalized: string; variants: string[]; ids: string[] };

async function main() {
  console.log("— Email normalization + lower(email) uniqueness guard —\n");

  // 1. How many User rows are not already lowercase?
  const mixed = await prisma.$queryRaw<{ id: string; email: string }[]>`
    SELECT id, email FROM users WHERE email <> lower(email) ORDER BY email
  `;
  console.log(`users needing lowercase: ${mixed.length}`);
  for (const row of mixed) console.log(`   · ${row.email}`);

  // 2. Collisions — accounts that differ ONLY by case. Never auto-resolved.
  const collisions = await prisma.$queryRaw<CollisionRow[]>`
    SELECT lower(email) AS normalized,
           array_agg(email ORDER BY created_at) AS variants,
           array_agg(id::text ORDER BY created_at) AS ids
    FROM users
    GROUP BY lower(email)
    HAVING count(*) > 1
    ORDER BY 1
  `;

  if (collisions.length > 0) {
    console.error(
      `\n⛔ ${collisions.length} COLLISION(S) — duplicate accounts differing only by case.`
    );
    console.error(
      "   Nothing was changed. These must be resolved by hand (decide which\n" +
        "   account survives) before the uniqueness guard can be applied.\n"
    );
    for (const c of collisions) {
      console.error(`   ${c.normalized}`);
      c.variants.forEach((v, i) => console.error(`      - ${v}  (id ${c.ids[i]})`));
    }
    console.error("\nRe-run this script once the duplicates are cleaned up.");
    process.exitCode = 1;
    return;
  }
  console.log("collisions: none ✓");

  // 3. Backfill. Safe now that no two rows can collide when lowercased.
  const usersUpdated = await prisma.$executeRaw`
    UPDATE users SET email = lower(email) WHERE email <> lower(email)
  `;
  const invitesUpdated = await prisma.$executeRaw`
    UPDATE coordinator_invites
    SET invitee_email = lower(invitee_email)
    WHERE invitee_email <> lower(invitee_email)
  `;
  console.log(`\nbackfilled users.email:                    ${usersUpdated} row(s)`);
  console.log(`backfilled coordinator_invites.invitee_email: ${invitesUpdated} row(s)`);

  // 4. The DB invariant. Prisma cannot express a functional unique index, so
  //    this is raw SQL — idempotent, and db-push-compatible (no column change).
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS ${INDEX_NAME} ON users (lower(email))`
  );
  const [{ exists }] = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE tablename = 'users' AND indexname = ${INDEX_NAME}
    ) AS exists
  `;
  console.log(
    `\nunique index ${INDEX_NAME} on users(lower(email)): ${exists ? "present ✓" : "MISSING ✗"}`
  );
  if (!exists) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
