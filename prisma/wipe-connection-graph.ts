import { existsSync, readFileSync, unlinkSync } from "node:fs";
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
 * REMOVE EXACTLY WHAT `seed-connection-graph.ts` WROTE, AND NOTHING ELSE
 * (`npm run wipe:connection-graph`).
 *
 * ⚠⚠ "AND NOTHING ELSE" IS THE WHOLE DESIGN, AND IT IS NOT ACHIEVED BY
 * `deleteMany({})`. The `connections` table happened to be empty when the graph
 * was seeded, so a blanket delete would have looked correct — and would have
 * quietly destroyed every real connection made by a walk afterwards. This script
 * is built so it stays correct once the table has rows nobody seeded.
 *
 * ── ⚠ TWO INDEPENDENT WAYS TO IDENTIFY A SEEDED ROW ─────────────────────────
 *
 *   1  THE MANIFEST — the exact `Connection.id`s the seed wrote. Preferred.
 *   2  THE SPEC — the (from, to, kind) triples `buildPlan()` derives. Used when
 *      the manifest is missing, and used ALWAYS as the safety filter.
 *
 * ⚠⚠ A ROW IS ONLY DELETED IF IT MATCHES THE SPEC. Even an id listed in the
 * manifest is left alone if its triple is not one this graph defines — that is
 * what stops a stale or hand-edited manifest from deleting a stranger's row.
 *
 * ── ⚠ THE TITLE GOES BACK TOO ───────────────────────────────────────────────
 *
 * The seed recorded what `Person.title` held before it wrote. This restores that
 * value verbatim — including `null`. ⚠ It refuses to touch the title if somebody
 * has since changed it to something that is neither the seeded value nor the
 * recorded original, because that edit was a person's, not this script's.
 */

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const emails = allEmails();
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true, person: { select: { id: true, title: true } } },
  });
  const byEmail = new Map(users.map((u) => [u.email!, u]));

  /* ── the authoritative set: triples this graph defines ──────────────────── */
  const plan = buildPlan();
  const allowed = new Set<string>();
  for (const r of plan) {
    const from = byEmail.get(r.fromEmail);
    const to = byEmail.get(r.toEmail);
    /* ⚠ A participant who no longer exists simply contributes no triple. Their
       rows would have cascaded with the user anyway. */
    if (!from || !to) continue;
    allowed.add(`${from.id}|${to.id}|${r.kind}`);
  }

  let manifest: Manifest | null = null;
  if (existsSync(MANIFEST_PATH)) {
    try {
      manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Manifest;
    } catch {
      console.warn("⚠ manifest present but unreadable — falling back to the spec");
    }
  }

  /* ── candidates ─────────────────────────────────────────────────────────── */
  const candidates = manifest?.connectionIds?.length
    ? await prisma.connection.findMany({
        where: { id: { in: manifest.connectionIds } },
        select: { id: true, from_user_id: true, to_user_id: true, kind: true, status: true },
      })
    : await prisma.connection.findMany({
        where: {
          OR: plan
            .map((r) => {
              const from = byEmail.get(r.fromEmail);
              const to = byEmail.get(r.toEmail);
              return from && to
                ? { from_user_id: from.id, to_user_id: to.id, kind: r.kind }
                : null;
            })
            .filter((x): x is NonNullable<typeof x> => x !== null),
        },
        select: { id: true, from_user_id: true, to_user_id: true, kind: true, status: true },
      });

  /* ⚠⚠ THE SAFETY FILTER. Nothing outside the spec is deleted, whatever the
     manifest says. */
  const doomed = candidates.filter((c) =>
    allowed.has(`${c.from_user_id}|${c.to_user_id}|${c.kind}`)
  );
  const refused = candidates.filter(
    (c) => !allowed.has(`${c.from_user_id}|${c.to_user_id}|${c.kind}`)
  );

  console.log(`Source       : ${manifest ? `manifest (${manifest.connectionIds.length} ids)` : "spec (no manifest found)"}`);
  console.log(`Matched      : ${doomed.length} rows`);
  if (refused.length) {
    console.log(`⚠ REFUSED    : ${refused.length} row(s) listed but outside the spec — left alone`);
  }

  const total = await prisma.connection.count();
  console.log(`Table now    : ${total} connection rows total`);
  console.log(`Will remain  : ${total - doomed.length}`);

  if (dryRun) {
    console.log("\n--dry-run — nothing deleted.");
    await prisma.$disconnect();
    return;
  }

  const del = await prisma.connection.deleteMany({ where: { id: { in: doomed.map((d) => d.id) } } });
  console.log(`\nDeleted      : ${del.count} connection rows`);

  /* ── the title ──────────────────────────────────────────────────────────── */
  const walk = byEmail.get(WALK_EMAIL);
  if (walk?.person && manifest) {
    const current = walk.person.title;
    if (current === WALK_TITLE) {
      await prisma.person.update({
        where: { id: walk.person.id },
        data: { title: manifest.previousWalkTitle },
      });
      console.log(`Title        : restored to ${manifest.previousWalkTitle ?? "(none)"}`);
    } else if (current === manifest.previousWalkTitle) {
      console.log("Title        : already back to its original value");
    } else {
      /* ⚠ SOMEBODY ELSE CHANGED IT. Not this script's to overwrite. */
      console.log(`Title        : LEFT ALONE — it is now "${current}", which this script did not set`);
    }
  } else if (!manifest) {
    console.log("Title        : no manifest, so the original is unknown — left alone");
  }

  if (existsSync(MANIFEST_PATH)) {
    unlinkSync(MANIFEST_PATH);
    console.log(`Manifest     : removed (${MANIFEST_PATH})`);
  }

  console.log(`\nConnection rows remaining: ${await prisma.connection.count()}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("✗ wipe failed:", e instanceof Error ? e.message : e);
  await prisma.$disconnect();
  process.exit(1);
});
