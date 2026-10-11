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

/** TL-E002: AI Agent Support → merged into Managed Services (AMS); services and products using it are repointed. */
async function aiAgentSupport() {
  const [from, into] = await Promise.all([prisma.serviceType.findFirst({ where: { name: "AI Agent Support" } }), prisma.serviceType.findFirst({ where: { name: "Managed Services (AMS)", merged_into_id: null } })]);
  if (!from || !into) return note("TL-E002", "skip", "AI Agent Support", "type not found");
  if (from.status === "MERGED") return note("TL-E002", "skip", "AI Agent Support", "already merged");
  const [svc, prod] = await Promise.all([prisma.providerService.count({ where: { service_type_id: from.id } }), prisma.serviceProduct.count({ where: { service_type_id: from.id } })]);
  note("TL-E002", "merge", "AI Agent Support → Managed Services (AMS)", `${svc} services, ${prod} service products repointed; marked MERGED`);
  writes.push((tx) => tx.providerService.updateMany({ where: { service_type_id: from.id }, data: { service_type_id: into.id } }));
  writes.push((tx) => tx.serviceProduct.updateMany({ where: { service_type_id: from.id }, data: { service_type_id: into.id } }));
  writes.push((tx) => tx.serviceType.update({ where: { id: from.id }, data: { status: "MERGED", merged_into_id: into.id, reviewed_at: new Date() } }));
}

/** TL-E003: vendor pillars → Specializations (kind PRODUCT; reuse by name). Skills, skill tags and work requests under them get
 *  specialization_id (pillar_id kept); providers who picked the pillar get the specialization on their profile; the pillar is hidden. */
const VENDOR_PILLARS: Record<string, string> = {
  ORACLE_FUSION_CLOUD: "Oracle Fusion Cloud", ORACLE_E_BUSINESS_SUITE: "Oracle E-Business Suite", PEOPLESOFT: "PeopleSoft",
  WORKDAY: "Workday", SALESFORCE: "Salesforce", CROSS_VENDOR_PLATFORM_NEUTRAL: "Cross-Vendor (Platform-Neutral)",
};
async function vendorPillars() {
  const bt = await prisma.businessType.findUnique({ where: { code: ERP_CONSULTING } });
  if (!bt) return note("TL-E003", "skip", "vendor pillars", "ERP Consulting not found");
  for (const [code, specName] of Object.entries(VENDOR_PILLARS)) {
    const pillar = await prisma.pillar.findFirst({ where: { code } });
    if (!pillar) { note("TL-E003", "skip", code, "pillar not found"); continue; }
    const spec = await prisma.specialization.findFirst({ where: { name: { equals: specName, mode: "insensitive" }, kind: "PRODUCT", merged_into_id: null } });
    const [skills, tags, requests, providers] = await Promise.all([
      prisma.skill.count({ where: { pillar_id: pillar.id, specialization_id: null } }),
      prisma.skillTag.count({ where: { pillar_id: pillar.id, specialization_id: null } }),
      prisma.workRequest.count({ where: { pillar_id: pillar.id, specialization_id: null } }),
      prisma.providerProfile.findMany({ where: { pillar_id: pillar.id }, select: { id: true } }),
    ]);
    note("TL-E003", spec ? "reuse specialization" : "create specialization", specName, `${pillar.name} pillar → PRODUCT`);
    note("TL-E003", "re-link", `${pillar.name}`, `${skills} skills, ${tags} skill tags, ${requests} work requests, ${providers.length} provider profiles`);
    note("TL-E003", "hide pillar", pillar.name, "visible_to_members = false — its skills leave the Role › Domain picker (still searchable; linked to the specialization)");
    writes.push(async (tx) => {
      const id = spec?.id ?? (await tx.specialization.create({ data: { business_type_id: bt.id, name: specName, kind: "PRODUCT", origin: "ADMIN", status: "ACTIVE" } })).id;
      await tx.skill.updateMany({ where: { pillar_id: pillar.id, specialization_id: null }, data: { specialization_id: id } });
      await tx.skillTag.updateMany({ where: { pillar_id: pillar.id, specialization_id: null }, data: { specialization_id: id } });
      await tx.workRequest.updateMany({ where: { pillar_id: pillar.id, specialization_id: null }, data: { specialization_id: id } });
      if (providers.length) await tx.providerProfileSpecialization.createMany({ data: providers.map((p) => ({ provider_profile_id: p.id, specialization_id: id })), skipDuplicates: true });
      await tx.pillar.update({ where: { id: pillar.id }, data: { visible_to_members: false } });
    });
  }
}

async function main() {
  await oldErp();
  await aiAgentSupport();
  await vendorPillars();

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
