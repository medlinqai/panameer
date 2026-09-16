import { writeFileSync } from "node:fs";
import { prisma } from "@/lib/prisma";
import {
  WALK_EMAIL,
  WALK_TITLE,
  MANIFEST_PATH,
  buildPlan,
  allEmails,
  type Manifest,
} from "./connection-graph-spec";

/**
 * SEED A REALISTIC CONNECTION GRAPH (`npm run seed:connection-graph`).
 *
 * SCOTT, 2026-09-16: *"seed a realistic connection graph… so every state on
 * /community is walkable"*.
 *
 * ⚠⚠ THE PROBLEM THIS SOLVES: the `connections` table held **ZERO ROWS**, so
 * four of the five blocks on `/community` rendered empty or hidden for every
 * member in the database, and Parts C and D of `E524` could not be walked at
 * all. The engine was never the gap — the data was.
 *
 * ── ⚠ WHAT IT WRITES ────────────────────────────────────────────────────────
 *
 * 27 `Connection` rows and ONE `Person.title`. Nothing else. No users, no
 * profiles, no employers, no messages.
 *
 * ── ⚠⚠ IDEMPOTENT, AND IT DOES NOT CLOBBER ─────────────────────────────────
 *
 * Every write is an `upsert` on the model's own `@@unique([from_user_id,
 * to_user_id, kind])`. Running it twice produces the same graph, not two of it.
 * ⚠ A row that already exists is UPDATED to the planned state, which is what
 * makes re-running after a walk (where you accepted or declined something) put
 * the board back rather than silently leaving it changed.
 *
 * ── ⚠⚠ REVERSIBILITY IS THE POINT ──────────────────────────────────────────
 *
 * Every id it writes is recorded in `prisma/seed-data/connection-graph-manifest.json`,
 * along with the walk account's PREVIOUS title. `npm run wipe:connection-graph`
 * removes exactly those rows and restores that title.
 * ⚠ The wipe does not depend on the manifest surviving — it can rebuild the same
 * (from, to, kind) triples from `connection-graph-spec.ts`. The manifest is the
 * belt; the spec is the braces.
 */

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  /* ⚠ EVERY PARTICIPANT IS RESOLVED BY EMAIL, AND A MISSING ONE IS FATAL. A
     seed that silently skips people produces a graph nobody can reason about,
     and a wipe that then cannot find what it expected. */
  const emails = allEmails();
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true, person: { select: { id: true, first_name: true, last_name: true } } },
  });
  const byEmail = new Map(users.map((u) => [u.email!, u]));

  const missing = emails.filter((e) => !byEmail.has(e));
  if (missing.length) {
    console.error("✗ These accounts do not exist — seed aborted, nothing written:");
    for (const m of missing) console.error("   ", m);
    process.exit(1);
  }
  const noPerson = emails.filter((e) => !byEmail.get(e)!.person);
  if (noPerson.length) {
    console.error("✗ These accounts have no Person, so they cannot render a card:");
    for (const m of noPerson) console.error("   ", m);
    process.exit(1);
  }

  const walk = byEmail.get(WALK_EMAIL)!;
  const plan = buildPlan();

  console.log(`Walk account : ${WALK_EMAIL}`);
  console.log(`             : ${walk.person!.first_name} ${walk.person!.last_name} (user ${walk.id})`);
  console.log(`Participants : ${emails.length - 1} besides the walk account`);
  console.log(`Planned rows : ${plan.length}`);

  if (dryRun) {
    console.log("\n--dry-run — nothing written. Planned rows:\n");
    for (const r of plan) {
      const f = byEmail.get(r.fromEmail)!.person!;
      const t = byEmail.get(r.toEmail)!.person!;
      console.log(
        `  ${r.kind.padEnd(9)} ${r.status.padEnd(8)} ${`${f.first_name} ${f.last_name}`.padEnd(24)} -> ${t.first_name} ${t.last_name}`
      );
    }
    await prisma.$disconnect();
    return;
  }

  /* ── the title ───────────────────────────────────────────────────────────
     ⚠ READ BEFORE WRITE. The manifest records what was there so the wipe can
     put it back, rather than assuming it was null and hard-coding that. */
  const walkPerson = await prisma.person.findUnique({
    where: { id: walk.person!.id },
    select: { id: true, title: true },
  });
  const previousWalkTitle = walkPerson!.title;
  const titleWasSet = previousWalkTitle !== WALK_TITLE;
  if (titleWasSet) {
    await prisma.person.update({ where: { id: walkPerson!.id }, data: { title: WALK_TITLE } });
    console.log(`\nTitle        : ${previousWalkTitle ?? "(none)"} -> "${WALK_TITLE}"`);
  } else {
    console.log(`\nTitle        : already "${WALK_TITLE}", left alone`);
  }

  /* ── the rows ────────────────────────────────────────────────────────────
     ⚠ `responded_at` FOLLOWS THE APPLICATION'S OWN RULE: set for ACCEPTED and
     DECLINED, null for PENDING. `check:community` E372/1 asserts no ACCEPTED
     colleague exists without one. */
  const now = new Date();
  const connectionIds: string[] = [];
  const tally: Record<string, number> = {};

  for (const r of plan) {
    const from = byEmail.get(r.fromEmail)!;
    const to = byEmail.get(r.toEmail)!;
    const data = {
      kind: r.kind,
      status: r.status,
      responded_at: r.responded ? now : null,
    } as const;

    const row = await prisma.connection.upsert({
      where: {
        from_user_id_to_user_id_kind: {
          from_user_id: from.id,
          to_user_id: to.id,
          kind: r.kind,
        },
      },
      update: data,
      create: { from_user_id: from.id, to_user_id: to.id, ...data },
      select: { id: true },
    });
    connectionIds.push(row.id);
    const key = `${r.kind}/${r.status}`;
    tally[key] = (tally[key] ?? 0) + 1;
  }

  const manifest: Manifest = {
    seededAt: now.toISOString(),
    walkEmail: WALK_EMAIL,
    walkPersonId: walkPerson!.id,
    previousWalkTitle,
    titleWasSet,
    connectionIds,
  };
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");

  console.log(`\nWrote ${connectionIds.length} connection rows:`);
  for (const [k, v] of Object.entries(tally).sort()) console.log(`  ${k.padEnd(20)} ${v}`);
  console.log(`\nManifest     : ${MANIFEST_PATH}`);
  console.log(`Undo         : npm run wipe:connection-graph`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("✗ seed failed:", e instanceof Error ? e.message : e);
  await prisma.$disconnect();
  process.exit(1);
});
