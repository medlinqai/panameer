import { mkdirSync, writeFileSync } from "node:fs";
import { prisma } from "@/lib/prisma";

// Skill catalog cleanup (2026-10-06, Scott-approved). Dry run writes a CSV; --apply writes the rows.
// Usage: tsx scripts/catalog-cleanup.ts <aliases|samematch|case> [--apply]
const step = process.argv[2];
const apply = process.argv.includes("--apply");
const csv = (rows: (string | number)[][]) => rows.map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))).join(",")).join("\n") + "\n";
const out = (name: string, rows: (string | number)[][]) => {
  if (rows.length < 2) return `docs/catalog/${name} (nothing to change — file left as is)`;
  mkdirSync("docs/catalog", { recursive: true });
  writeFileSync(`docs/catalog/${name}`, csv(rows));
  return `docs/catalog/${name}`;
};

// Row 1: "procure" finds the whole Oracle procurement area.
const PROCUREMENT_DOMAINS = ["Oracle Fusion Cloud", "Oracle E-Business Suite", "PeopleSoft"];
const PROCUREMENT_AREA = /purchas|sourcing|negotiation|supplier|iprocurement|isupplier|requisition|receiving|catalog|punch-?out|spend classification/i;

async function aliases() {
  const skills = await prisma.skill.findMany({
    where: { pillar: { name: { in: PROCUREMENT_DOMAINS } }, status: "ACTIVE" },
    select: { id: true, name: true, aliases: true, pillar: { select: { name: true } } },
    orderBy: [{ pillar: { name: "asc" } }, { name: "asc" }],
  });
  const hit = skills.filter(
    (s) => PROCUREMENT_AREA.test(s.name) && !/procure/i.test(s.name) && !s.aliases.some((a) => a.toLowerCase() === "procurement")
  );
  const path = out("aliases_procurement_2026-10-06.csv", [["skill_id", "domain", "skill", "aliases_before", "aliases_after"], ...hit.map((s) => [s.id, s.pillar!.name, s.name, s.aliases.join(" · "), [...s.aliases, "procurement"].join(" · ")])]);
  if (apply) for (const s of hit) await prisma.skill.update({ where: { id: s.id }, data: { aliases: [...s.aliases, "procurement"] } });
  console.log(`aliases ${apply ? "APPLIED" : "dry run"} — ${hit.length} skills get "procurement" → ${path}`);
}

const steps: Record<string, () => Promise<void>> = { aliases };
(async () => {
  if (!steps[step]) throw new Error(`step must be one of ${Object.keys(steps).join(", ")}`);
  await steps[step]();
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
