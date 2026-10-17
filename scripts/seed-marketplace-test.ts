// TD-E001: marketplace test set (16 Oracle consultants, 5 other businesses, 2 buyers). Dry run by default.
// Usage: npx tsx --env-file=.env.local scripts/seed-marketplace-test.ts [--apply]   (apply needs TEST_ACCOUNT_PASSWORD)
import { prisma } from "@/lib/prisma";
import { createMarketplaceTestSet } from "@/lib/admin/marketplace-test-set";

(async () => {
  const out = await createMarketplaceTestSet({ apply: process.argv.includes("--apply") });
  console.table(out.rows.map((r) => ({ NN: r.nn, email: r.email, name: r.name, kind: r.kind, result: r.result })));
  if (out.misses.length) console.log("Missing from the catalog:\n  " + out.misses.join("\n  "));
  console.log(out.applied ? "Applied." : "Dry run — add --apply to create.");
  await prisma.$disconnect();
})().catch(async (e) => { console.error(e instanceof Error ? e.message : e); await prisma.$disconnect(); process.exit(1); });
