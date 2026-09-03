/**
 * Backfill `LearningPath.pillar` (`P1-J3-E364`).
 *
 * ⚠ FROM THE MAPPING IN `lib/learn-pillars.ts`, NEVER GUESSED. A group the
 * mapping does not know keeps `pillar = null` and is listed in the output.
 * ⚠ IDEMPOTENT — a row already carrying the right value is not written.
 * ⚠ IT DOES NOT TOUCH `group`. Measured 2026-09-02: the live distinct list is
 * already clean — the `Finance` / `Finance Operations` / `Finance & Accounting`
 * triple `E364` describes DOES NOT EXIST in the data, and neither does the supply
 * chain one. Nothing was merged, because there was nothing to merge.
 */
import { prisma } from "@/lib/prisma";
import { pillarForGroup } from "@/lib/learn-pillars";

const DRY = process.argv.includes("--dry");

async function main() {
  const paths = await prisma.learningPath.findMany({
    select: { id: true, title: true, group: true, pillar: true, status: true },
    orderBy: { title: "asc" },
  });
  let set = 0;
  const nulls: { title: string; group: string | null; status: string }[] = [];

  for (const p of paths) {
    const want = pillarForGroup(p.group);
    if (want === null) {
      nulls.push({ title: p.title, group: p.group, status: p.status });
      /* ⚠ AND CLEAR A STALE VALUE rather than leaving a guess behind. */
      if (p.pillar !== null && !DRY) {
        await prisma.learningPath.update({ where: { id: p.id }, data: { pillar: null } });
      }
      continue;
    }
    if (p.pillar === want) continue;
    if (!DRY) await prisma.learningPath.update({ where: { id: p.id }, data: { pillar: want } });
    set += 1;
  }

  console.log(`${paths.length} paths · pillar set on ${set}`);
  console.log(`\n⚠ LEFT NULL (${nulls.length}) — group not in the mapping, NOT guessed:`);
  for (const n of nulls) console.log(`   [${n.status}] group=${n.group ?? "(null)"}  ${n.title}`);

  const byPillar = await prisma.learningPath.groupBy({ by: ["pillar"], _count: { _all: true } });
  console.log(`\nfinal distribution:`);
  for (const r of byPillar.sort((a, b) => String(a.pillar).localeCompare(String(b.pillar)))) {
    console.log(`   ${String(r.pillar ?? "(null)").padEnd(14)} ${r._count._all}`);
  }
}
main().then(() => prisma.$disconnect());
