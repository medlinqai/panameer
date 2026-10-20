// MS-E001/E002: the Active MSA (Panameer Terms of Service) and every existing Work Order attached to it as a SOW.
// Usage: npx tsx --env-file=.env.local scripts/seed-msa.ts [--apply]
import { prisma } from "@/lib/prisma";
import { activeMsa } from "@/lib/agreements";
(async () => {
  const apply = process.argv.includes("--apply");
  const have = await prisma.agreement.findFirst({ where: { kind: "MSA", status: "ACTIVE" } });
  const orphans = await prisma.workOrder.count({ where: { agreement_id: null } });
  console.log(`MSA: ${have ? `${have.agreement_number} v${have.version}` : "none yet"} · Work Orders without an MSA: ${orphans}`);
  if (apply) {
    const msa = await activeMsa();
    const r = await prisma.workOrder.updateMany({ where: { agreement_id: null }, data: { agreement_id: msa.id } });
    console.log(`Applied: ${msa.agreement_number} v${msa.version}; ${r.count} Work Orders attached.`);
  } else console.log("Dry run — add --apply.");
  await prisma.$disconnect();
})();
