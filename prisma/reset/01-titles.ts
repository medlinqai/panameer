import { prisma } from "@/lib/prisma";
import { SURVIVORS } from "./survivors-spec";

/**
 * STEP 1 — write `Person.title` for every survivor (`P0-E595` WS-B).
 *
 * ⚠⚠⚠ THIS RUNS BEFORE THE WIPE AND BEFORE `headline` IS DROPPED. Three of the
 * four Learn experts have no `Person.title` at all; their title lives only in
 * `ProviderProfile.headline`. ⚠ Reversing the order destroys it.
 *
 * ⚠ It touches `Person.title` and nothing else. No delete, no schema change.
 */
async function main() {
  const write = process.argv.includes("--write");
  console.log(`${write ? "WRITING" : "DRY RUN"} — Person.title for ${SURVIVORS.length} survivors\n`);

  let missing = 0;
  for (const s of SURVIVORS) {
    const user = await prisma.user.findFirst({
      where: { email: s.email },
      /* headline is GONE since this script ran (E595 WS-B) - it was the
         step that made the drop safe, and it no longer needs to read it. */
      select: { person: { select: { id: true, title: true } } },
    });
    if (!user?.person) {
      console.log(`  ⚠⚠ MISSING  ${s.email} — no person row`);
      missing += 1;
      continue;
    }
    const before = user.person.title;
    const head: string | null = null;
    if (s.title === null) {
      console.log(`  skip     ${s.email.padEnd(30)} title stays ${JSON.stringify(before)}`);
      continue;
    }
    console.log(`  ${write ? "set " : "plan"}     ${s.email.padEnd(30)} ${JSON.stringify(before)} -> ${JSON.stringify(s.title)}`);
    if (before !== null && before !== s.title)
      console.log(`             ⚠ OVERWRITES an existing title. headline was ${JSON.stringify(head)}`);
    if (write) {
      await prisma.person.update({ where: { id: user.person.id }, data: { title: s.title } });
    }
  }

  /* ⚠⚠ A MISSING SURVIVOR IS A STOP, NOT A WARNING. The wipe that follows
     keys on this same list — a name that resolves to nothing here would be a
     person the wipe fails to protect. */
  if (missing > 0) throw new Error(`${missing} survivor(s) could not be resolved — REFUSING to continue`);

  if (!write) {
    console.log("\n⚠ DRY RUN — nothing written. Re-run with --write.");
    return;
  }
  console.log("\n✅ titles written. Verifying…");
  for (const s of SURVIVORS) {
    const u = await prisma.user.findFirst({
      where: { email: s.email },
      select: { person: { select: { title: true } } },
    });
    console.log(`  ${s.email.padEnd(30)} Person.title = ${JSON.stringify(u?.person?.title ?? null)}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
