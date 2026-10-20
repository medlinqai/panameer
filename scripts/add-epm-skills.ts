// HF-E004: EPM skills the parser kept as custom (SD-003) — added beside Narrative Reporting (same Business Type, pillar,
// role) and as Global Taxonomy modules under Fusion Cloud › Management Reporting & FP&A. Dry run writes a CSV; --apply writes.
import { writeFileSync, mkdirSync } from "node:fs";
import { prisma } from "../src/lib/prisma";

const ADD: { name: string; aliases: string[] }[] = [
  { name: "Essbase", aliases: ["Oracle Essbase", "EssCS"] },
  { name: "XBRL Tagging", aliases: ["XBRL", "iXBRL"] },
  { name: "Doclets / Report Packages", aliases: ["Doclets", "Report Packages"] },
  { name: "Disclosure Management", aliases: ["SEC Disclosure Management"] },
];

(async () => {
  const apply = process.argv.includes("--apply");
  const ref = await prisma.skill.findFirstOrThrow({ where: { name: "Narrative Reporting", is_custom: false }, select: { id: true, business_type_id: true, role_id: true, pillar_id: true, area: true, aliases: true } });
  const refItem = await prisma.systemItem.findFirstOrThrow({ where: { legacy_skill_id: ref.id }, select: { product_id: true, domain_id: true, sort_order: true } });
  const rows: string[] = ["action,name,aliases"];
  let n = 0;
  for (const a of ADD) {
    const have = await prisma.skill.findFirst({ where: { name: { equals: a.name, mode: "insensitive" }, business_type_id: ref.business_type_id }, select: { id: true } });
    if (have) { rows.push(`skip (exists),${a.name},`); continue; }
    rows.push(`add skill + module,"${a.name}","${a.aliases.join("; ")}"`);
    if (!apply) continue;
    const s = await prisma.skill.create({ data: { business_type_id: ref.business_type_id, role_id: ref.role_id, pillar_id: ref.pillar_id, area: ref.area, name: a.name, aliases: a.aliases, origin: "SEED" } });
    await prisma.systemItem.create({ data: { product_id: refItem.product_id, domain_id: refItem.domain_id, name: a.name, kind: "MODULE", legacy_skill_id: s.id, sort_order: refItem.sort_order + ++n, origin: "HF_2026_10_20" } });
  }
  // Disclosure Management is its own skill now — no longer an alias of Narrative Reporting.
  if (ref.aliases.includes("Disclosure Management")) {
    rows.push(`remove alias,Narrative Reporting,Disclosure Management`);
    if (apply) await prisma.skill.update({ where: { id: ref.id }, data: { aliases: ref.aliases.filter((x) => x !== "Disclosure Management") } });
  }
  mkdirSync("scripts/out", { recursive: true });
  writeFileSync("scripts/out/epm_skills_dryrun.csv", rows.join("\n") + "\n");
  console.log(rows.join("\n"), apply ? "\nAPPLIED" : "\nDRY RUN — scripts/out/epm_skills_dryrun.csv");
  await prisma.$disconnect(); process.exit(0);
})();
