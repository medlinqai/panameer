// Backfills Skill.area by keyword rules (no AI). Dry run writes a CSV; --apply writes rows whose area is null.
import { writeFileSync } from "node:fs";
import { prisma } from "@/lib/prisma";
import { areaFor, SKILL_AREAS } from "@/lib/skill-areas";

(async () => {
  const apply = process.argv.includes("--apply");
  const rows = await prisma.skill.findMany({ where: { area: null, merged_into_id: null }, select: { id: true, name: true, aliases: true } });
  const plan = rows.map((r) => ({ ...r, area: areaFor(r.name, r.aliases) }));
  const csv = ["id,name,area", ...plan.map((p) => `${p.id},"${p.name.replace(/"/g, '""')}",${p.area ?? ""}`)].join("\n");
  const out = process.env.OUT ?? "/tmp/claude-501/skill-area-plan.csv";
  writeFileSync(out, csv);
  const counts = Object.fromEntries([...SKILL_AREAS.map((a) => [a.code, 0]), ["none", 0]]) as Record<string, number>;
  for (const p of plan) counts[p.area ?? "none"]++;
  console.log(JSON.stringify({ rows: plan.length, counts, csv: out }));
  if (apply) {
    for (const code of SKILL_AREAS.map((a) => a.code)) {
      const ids = plan.filter((p) => p.area === code).map((p) => p.id);
      if (ids.length) await prisma.skill.updateMany({ where: { id: { in: ids }, area: null }, data: { area: code } });
    }
    console.log("applied");
  }
  process.exit(0);
})();
