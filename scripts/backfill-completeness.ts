import { prisma } from "@/lib/prisma";
import { buildCompletenessInput } from "@/lib/onboarding";
import { computeProfileScore } from "@/lib/completeness";
import { isMarketplaceVisible, providerMeetsRequired } from "@/lib/access";

const WRITE = process.argv.includes("--write");

function bucket(n: number): string {
  if (n === 100) return "100";
  if (n >= 90) return "90-99";
  if (n >= 80) return "80-89";
  if (n >= 70) return "70-79";
  if (n >= 50) return "50-69";
  if (n >= 25) return "25-49";
  return "0-24";
}
const ORDER = ["0-24", "25-49", "50-69", "70-79", "80-89", "90-99", "100"];

async function main() {
  const rows = await prisma.providerProfile.findMany({
    select: {
      id: true,
      status: true,
      paused_at: true,
      completeness: true,
      role_type_id: true,
      hourly_rate_cents: true,
      rate_min_cents: true,
      rate_max_cents: true,
      onsite_rate_cents: true,
      remote_rate_cents: true,
      skills: { select: { id: true } },
      person: {
        select: {
          title: true,
          photo_url: true,
          phone: true,
          site: { select: { addresses: { select: { id: true } } } },
        },
      },
    },
  });

  const before: Record<string, number> = {};
  const after: Record<string, number> = {};
  let visibleBefore = 0;
  let visibleAfter = 0;
  let changed = 0;
  const writes: { id: string; from: number; to: number }[] = [];

  for (const p of rows) {
    const met = providerMeetsRequired(p as never);
    const vis = isMarketplaceVisible({ ...p, meetsRequired: met });

    const input = await buildCompletenessInput(p.id);
    if (!input) continue;
    const next = computeProfileScore(input).total;

    before[bucket(p.completeness)] = (before[bucket(p.completeness)] ?? 0) + 1;
    after[bucket(next)] = (after[bucket(next)] ?? 0) + 1;

    if (vis) visibleBefore += 1;
    if (isMarketplaceVisible({ ...p, completeness: next, meetsRequired: met })) {
      visibleAfter += 1;
    }

    if (next !== p.completeness) {
      changed += 1;
      writes.push({ id: p.id, from: p.completeness, to: next });
    }
  }

  console.log(`profiles read: ${rows.length}`);
  console.log(`scores that change: ${changed}`);
  console.log("\n── SCORE DISTRIBUTION ──");
  console.log("  bucket    before   after");
  for (const b of ORDER) {
    console.log(
      `  ${b.padEnd(8)}  ${String(before[b] ?? 0).padStart(6)}  ${String(after[b] ?? 0).padStart(6)}`
    );
  }

  console.log("\n── VISIBILITY (must not move) ──");
  console.log(`  visible before: ${visibleBefore}`);
  console.log(`  visible after : ${visibleAfter}`);

  /*
    ⚠⚠⚠ THE REFUSAL. A backfill that changes who is visible means the score is
    still gating something somewhere — which would mean `WS-A0` did not fully
    land. ⚠ In that case the right move is to STOP, not to write 111 rows and
    explain the difference afterwards.
  */
  if (visibleBefore !== visibleAfter) {
    console.error(
      `\n⚠⚠⚠ REFUSING TO WRITE — visibility moved ${visibleBefore} → ${visibleAfter}.` +
        `\nThe score must not gate anything. Investigate before backfilling.`
    );
    process.exit(1);
  }
  console.log("  ✓ unchanged — the score gates nothing");

  if (!WRITE) {
    console.log(
      `\nDRY RUN — nothing written. ${writes.length} rows would change. Re-run with --write.`
    );
    return;
  }

  /* ⚠ ONE UPDATE PER ROW, ONLY WHERE THE VALUE DIFFERS. Rows already correct
     are not touched, which is what makes a re-run a no-op. */
  for (const w of writes) {
    await prisma.providerProfile.update({
      where: { id: w.id },
      data: { completeness: w.to },
    });
  }
  console.log(`\nWROTE ${writes.length} rows.`);
}

main()
  .catch((e) => {
    /* ⚠ FAIL LOUDLY. A swallowed Prisma throw reads as a finding — that failure
       is on the record from 2026-09-19. */
    console.error("BACKFILL ERROR:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
