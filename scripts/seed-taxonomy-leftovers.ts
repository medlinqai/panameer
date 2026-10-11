// Taxonomy leftovers (Scott OK 2026-10-11): the rows the Service Taxonomy seed left for Scott. No deletes — retired rows are
// hidden or marked. Dry run by default: writes scripts/out/taxonomy_leftovers_dryrun.csv. Scott runs it with --apply.
// Run: npx tsx --env-file=.env.local scripts/seed-taxonomy-leftovers.ts [--apply]
import { mkdirSync, writeFileSync } from "node:fs";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const APPLY = process.argv.includes("--apply");
type Tx = Prisma.TransactionClient;
type Row = { step: string; action: string; target: string; detail: string };
const plan: Row[] = [];
const note = (step: string, action: string, target: string, detail = "") => plan.push({ step, action, target, detail });
const writes: ((tx: Tx) => Promise<unknown>)[] = [];

const ERP_CONSULTING = "PANAMEER_V1";

/** TL-E001: old business type "ERP" → its skills move to ERP Consulting (duplicates by name skipped and listed); "ERP" hidden. */
async function oldErp() {
  const [erp, target] = await Promise.all([prisma.businessType.findUnique({ where: { code: "ERP" } }), prisma.businessType.findUnique({ where: { code: ERP_CONSULTING } })]);
  if (!erp || !target) return note("TL-E001", "skip", "business types", "ERP or ERP Consulting not found");
  const skills = await prisma.skill.findMany({ where: { business_type_id: erp.id }, select: { id: true, name: true, role_id: true, pillar_id: true } });
  const taken = new Set((await prisma.skill.findMany({ where: { business_type_id: target.id }, select: { name: true } })).map((s) => s.name.toLowerCase()));
  for (const s of skills) {
    if (taken.has(s.name.toLowerCase())) { note("TL-E001", "skip duplicate", s.name, "ERP Consulting already has a skill with this name"); continue; }
    taken.add(s.name.toLowerCase());
    note("TL-E001", "move skill", s.name, "ERP → ERP Consulting");
    writes.push((tx) => tx.skill.update({ where: { id: s.id }, data: { business_type_id: target.id } }));
  }
  note("TL-E001", "hide", `business type "${erp.name}"`, "hidden = true");
  writes.push((tx) => tx.businessType.update({ where: { id: erp.id }, data: { hidden: true } }));
}

async function main() {
  await oldErp();

  mkdirSync("scripts/out", { recursive: true });
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  writeFileSync("scripts/out/taxonomy_leftovers_dryrun.csv", ["step,action,target,detail", ...plan.map((r) => [r.step, r.action, r.target, r.detail].map(esc).join(","))].join("\n") + "\n");
  const tally: Record<string, number> = {};
  for (const r of plan) tally[`${r.step} · ${r.action}`] = (tally[`${r.step} · ${r.action}`] ?? 0) + 1;
  console.log(JSON.stringify({ applied: APPLY, rows: plan.length, writes: writes.length, ...tally, csv: "scripts/out/taxonomy_leftovers_dryrun.csv" }, null, 1));
  if (!APPLY) return;
  await prisma.$transaction(async (tx) => { for (const w of writes) await w(tx); }, { timeout: 180_000 });
  console.log("applied");
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
