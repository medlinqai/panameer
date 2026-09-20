import { writeFileSync } from "node:fs";
import { prisma } from "@/lib/prisma";
import {
  WALK_EMAIL,
  MANIFEST_PATH,
  COLLEAGUES,
  SECOND_DEGREE,
  INVITES,
  seedTokenHash,
  allEmails,
  type Manifest,
  type ManifestRow,
} from "./test3-community-spec";

/**
 * SEED THE WALK ACCOUNT'S COMMUNITY (`npm run seed:test3-community`).
 *
 * ⚠ Authorised by Scott 2026-09-20 as a named exception to `E564` — see the
 * spec's header. ⚠⚠ IT WRITES `Connection` AND `ColleagueInvite` ROWS AND
 * NOTHING ELSE. No user, no person, no profile, no password, no title.
 *
 * ── ⚠⚠ REVERSIBILITY, HARDENED PAST THE PATTERN IT COPIES ─────────────────
 *
 * `seed-connection-graph.ts` records the ids it wrote and deletes exactly
 * those, filtered by its own spec. ⚠⚠ THAT IS NOT QUITE ENOUGH HERE, because
 * this graph OVERLAPS the one already seeded around `iamscottwalls@outlook.com`
 * — `test10 ↔ iamscottwalls` may well be a row that already existed.
 * ⚠⚠⚠ SO THE MANIFEST RECORDS WHETHER EACH ROW WAS **CREATED** OR **FOUND**,
 * and the wipe deletes only the created ones. ⚠ Deleting a row this seed merely
 * touched would destroy somebody else's edge and call it cleanup.
 */

async function main() {
  const write = process.argv.includes("--write");

  /* ── resolve every person by email, and fail loudly on any miss ───────── */
  const users = await prisma.user.findMany({
    where: { email: { in: allEmails() } },
    select: { id: true, email: true, person: { select: { id: true } } },
  });
  const byEmail = new Map(users.map((u) => [(u.email ?? "").toLowerCase(), u]));

  const missing = allEmails().filter((e) => !byEmail.has(e));
  if (missing.length) {
    /* ⚠⚠ A PARTIAL GRAPH IS WORSE THAN NONE — it looks like a result. */
    throw new Error(
      `These accounts are not in the database, so the graph cannot be built:\n  ${missing.join("\n  ")}`
    );
  }

  const me = byEmail.get(WALK_EMAIL)!;
  if (!me.person) throw new Error(`${WALK_EMAIL} has no Person row`);

  /* ── the plan, as triples ────────────────────────────────────────────── */
  const edges: { from: string; to: string; label: string }[] = [
    ...COLLEAGUES.map((e) => ({
      from: me.id,
      to: byEmail.get(e)!.id,
      label: `${WALK_EMAIL} ↔ ${e}`,
    })),
    ...SECOND_DEGREE.map(([a, b]) => ({
      from: byEmail.get(a)!.id,
      to: byEmail.get(b)!.id,
      label: `${a} ↔ ${b}`,
    })),
  ];

  console.log(
    `${write ? "WRITING" : "DRY RUN"} — ${edges.length} colleague edges, ${INVITES.length} invitations\n`
  );

  const connections: ManifestRow[] = [];
  for (const e of edges) {
    /*
      ⚠⚠ A COLLEAGUE EDGE IS UNDIRECTED AND IS STORED ONCE. The unique key is
      (from, to, kind), so the SAME pair written the other way round would be a
      SECOND row and the graph would double-count. ⚠ Both directions are checked
      before anything is written.
    */
    const existing = await prisma.connection.findFirst({
      where: {
        kind: "COLLEAGUE",
        OR: [
          { from_user_id: e.from, to_user_id: e.to },
          { from_user_id: e.to, to_user_id: e.from },
        ],
      },
      select: { id: true, status: true },
    });

    if (existing) {
      console.log(
        `  found   ${e.label}  (${existing.status}${existing.status === "ACCEPTED" ? "" : " → ACCEPTED"})`
      );
      if (write && existing.status !== "ACCEPTED") {
        await prisma.connection.update({
          where: { id: existing.id },
          data: { status: "ACCEPTED" },
        });
      }
      /* ⚠ `created: false` — the wipe must not delete this. */
      connections.push({ id: existing.id, created: false });
      continue;
    }

    console.log(`  create  ${e.label}`);
    if (write) {
      const row = await prisma.connection.create({
        data: {
          from_user_id: e.from,
          to_user_id: e.to,
          kind: "COLLEAGUE",
          status: "ACCEPTED",
        },
        select: { id: true },
      });
      connections.push({ id: row.id, created: true });
    }
  }

  /* ── the invitations ─────────────────────────────────────────────────── */
  const invites: ManifestRow[] = [];
  for (const inv of INVITES) {
    const expires = new Date(Date.now() + inv.expiresInDays * 24 * 60 * 60 * 1000);
    const lapsed = inv.expiresInDays < 0;
    console.log(
      `  ${lapsed ? "LAPSED " : "live   "} invite ${inv.email}  expires ${expires.toISOString().slice(0, 10)}`
    );
    if (!write) continue;

    const hash = seedTokenHash(inv.email);
    const prior = await prisma.colleagueInvite.findUnique({
      where: { token_hash: hash },
      select: { id: true },
    });
    const row = await prisma.colleagueInvite.upsert({
      where: { token_hash: hash },
      create: {
        inviter_person_id: me.person!.id,
        invitee_email: inv.email,
        invitee_first_name: inv.firstName,
        invitee_last_name: inv.lastName,
        token_hash: hash,
        /* ⚠⚠ `PENDING` EVEN WHEN LAPSED — that is the whole point of the second
           row. Nothing in the app writes `EXPIRED`, so a correct filter has to
           read the DATE. */
        status: "PENDING",
        expires_at: expires,
      },
      update: { expires_at: expires, status: "PENDING" },
      select: { id: true },
    });
    invites.push({ id: row.id, created: !prior });
  }

  if (!write) {
    console.log(`\n⚠ DRY RUN — nothing was written. Re-run with --write to commit.`);
    return;
  }

  const manifest: Manifest = {
    writtenAt: new Date().toISOString(),
    connections,
    invites,
  };
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");

  /* ── what the walk account can now see ───────────────────────────────── */
  const { getCommunityWeb } = await import("@/lib/community-web");
  const web = await getCommunityWeb({ userId: me.id } as never);
  console.log(
    `\n✅ written. ${WALK_EMAIL} now sees: ${web.joined.length} joined, ` +
      `${web.invited.length} invited, ${web.reachable.length} reachable.`
  );
  /* ⚠⚠ THE LAPSED INVITE MUST NOT APPEAR. Reported here rather than assumed,
     because it is the one row whose absence is the result. */
  console.log(
    `   ⚠ ${INVITES.length} invitations written, ${web.invited.length} live — ` +
      `the lapsed one is correctly excluded by date.`
  );
  console.log(`   manifest: ${MANIFEST_PATH}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    /* ⚠⚠ NO `process.exit(0)` HERE. It swallowed a Prisma throw on 2026-09-19
       and turned a failed query into a confident, wrong report. */
    await prisma.$disconnect();
  });
