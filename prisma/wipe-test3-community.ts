import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { prisma } from "@/lib/prisma";
import { MANIFEST_PATH, INVITES, seedTokenHash, type Manifest } from "./test3-community-spec";

/**
 * REMOVE EXACTLY WHAT `seed-test3-community.ts` CREATED, AND NOTHING ELSE
 * (`npm run wipe:test3-community`).
 *
 * ⚠⚠⚠ "AND NOTHING ELSE" IS THE WHOLE DESIGN, AND HERE IT IS SHARPER THAN IN
 * `wipe-connection-graph.ts`. That graph was seeded into an EMPTY table, so
 * every row it matched was its own. ⚠ This one deliberately overlaps the graph
 * around `iamscottwalls@outlook.com` — `test10 ↔ iamscottwalls` may be a row
 * that already existed and belongs to somebody else's spec.
 *
 * ⚠⚠ SO THE TEST IS NOT *"is this triple in my spec"* — IT IS *"did I CREATE
 * this row"*, which only the manifest can answer. A row this seed merely found
 * and set to ACCEPTED is left exactly where it is.
 *
 * ⚠ WITHOUT A MANIFEST IT REFUSES TO RUN. ⚠⚠ That is deliberate and it is the
 * opposite of the connection-graph wipe, which can fall back to its spec — the
 * fallback is only safe when the spec's triples are known to be yours, and here
 * they are provably not. ⚠ A wipe that guesses is a delete that guesses.
 */

async function main() {
  const write = process.argv.includes("--write");

  if (!existsSync(MANIFEST_PATH)) {
    console.error(
      [
        `⚠⚠ NO MANIFEST AT ${MANIFEST_PATH} — REFUSING TO RUN.`,
        "",
        "  This wipe deletes by RECORDED ID, never by pattern, because its",
        "  graph overlaps one seeded by a different script. Without the",
        "  manifest there is no way to tell a row this seed created from a row",
        "  it found — and deleting the second kind is destroying real data.",
        "",
        "  If the manifest is genuinely lost, remove the rows by hand after",
        "  reading them. Do not make this script guess.",
      ].join("\n")
    );
    process.exitCode = 1;
    return;
  }

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Manifest;

  const madeConnections = manifest.connections.filter((r) => r.created).map((r) => r.id);
  const keptConnections = manifest.connections.filter((r) => !r.created).length;
  const madeInvites = manifest.invites.filter((r) => r.created).map((r) => r.id);

  console.log(
    `${write ? "WIPING" : "DRY RUN"} — ${madeConnections.length} connections created by the seed ` +
      `(${keptConnections} pre-existing rows will be LEFT ALONE), ${madeInvites.length} invitations.\n`
  );

  /*
    ⚠⚠ THE SAFETY FILTER: a recorded id is deleted only if the row still looks
    like what was written — a COLLEAGUE connection. ⚠ If somebody has since
    turned it into something else, the id is stale and the row is not ours.
  */
  const conns = await prisma.connection.findMany({
    where: { id: { in: madeConnections }, kind: "COLLEAGUE" },
    select: { id: true, from_user_id: true, to_user_id: true },
  });
  for (const c of conns) console.log(`  delete connection ${c.id}`);
  const skipped = madeConnections.length - conns.length;
  if (skipped > 0) console.log(`  ⚠ ${skipped} recorded id(s) no longer match a COLLEAGUE row — left alone`);

  /*
    ⚠ Invitations are matched on the recorded id AND the seed's own
    `token_hash`, which is derived from a literal in the spec. Two independent
    identifiers, the same belt-and-braces the connection-graph wipe uses.
  */
  const hashes = INVITES.map((i) => seedTokenHash(i.email));
  const invs = await prisma.colleagueInvite.findMany({
    where: { id: { in: madeInvites }, token_hash: { in: hashes } },
    select: { id: true, invitee_email: true },
  });
  for (const i of invs) console.log(`  delete invitation ${i.invitee_email}`);

  if (!write) {
    console.log(`\n⚠ DRY RUN — nothing was deleted. Re-run with --write to commit.`);
    return;
  }

  await prisma.connection.deleteMany({ where: { id: { in: conns.map((c) => c.id) } } });
  await prisma.colleagueInvite.deleteMany({ where: { id: { in: invs.map((i) => i.id) } } });
  unlinkSync(MANIFEST_PATH);

  console.log(
    `\n✅ removed ${conns.length} connections and ${invs.length} invitations. ` +
      `${keptConnections} pre-existing row(s) untouched. Manifest deleted.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
