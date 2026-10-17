// Scott 10-17: turn Global Taxonomy (v2) ON for good (same switch as Admin › Settings) — no more TAXONOMY_V2_FORCE flag.
// Run: npx tsx --env-file=.env.local scripts/taxonomy-v2-on.ts
import { prisma } from "@/lib/prisma";
import { setSetting, getSetting } from "@/lib/platform-settings";

async function main() {
  await setSetting("taxonomy_v2", true, null);
  console.log(`Global Taxonomy (v2) is now ${(await getSetting("taxonomy_v2")) ? "ON" : "OFF"}.`);
}
main().finally(() => prisma.$disconnect());
