// GT-E003: Global Taxonomy seed from scripts/data/global-taxonomy-2026-10-14.json (Scott 10-14).
// Additive only: new Domain rows (origin GT), KnowledgeSkills, Systems (vendor › product › item), WorkRoles, and one LEGACY
// ProviderCapability per live ProviderSkill. Existing rows are never changed. Items with no domain get a proposed one
// (best name match inside their process, else anywhere) — CSV column link = proposed. Old business type "ERP" skills: noted, untouched.
// Dry run by default: writes scripts/out/global_taxonomy_dryrun.csv. Scott runs it with --apply. Undo: scripts/rollback-global-taxonomy.ts.
// Run: npx tsx --env-file=.env.local scripts/seed-global-taxonomy.ts [--apply]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { SystemItemKind, WorkMode } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const APPLY = process.argv.includes("--apply");
const ORIGIN = "GT_2026_10_14";
type K = { process: string; domain: string; skill: string | null; source: string; legacy_skill_ids: string[] };
type S = { vendor: string; product: string; item: string; kind: string; process: string | null; domain: string | null; link: string; legacy_skill_ids: string[] };
type W = { mode: string; role: string; source: string; legacy_skill_ids: string[] };
const DATA = JSON.parse(readFileSync("scripts/data/global-taxonomy-2026-10-14.json", "utf8")) as { new_vendors: string[]; knowledge: K[]; systems: S[]; way_of_working: W[] };
const MODE: Record<string, WorkMode> = { Implement: "IMPLEMENT", Support: "SUPPORT", "Do the Work": "OPERATE" };

const rows: { step: string; action: string; target: string; detail: string; link: string }[] = [];
const note = (step: string, action: string, target: string, detail = "", link = "") => rows.push({ step, action, target, detail, link });
const dkey = (process: string, name: string) => `${process}::${name}`.toLowerCase();
const STOP = new Set(["and", "the", "of", "for", "to", "in", "on", "with", "management", "cloud", "oracle", "fusion", "&", "-", "/", "services", "service"]);
const words = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)).map((w) => w.replace(/s$/, "")));

async function main() {
  const [domains, provSkills, erpSkills] = await Promise.all([
    prisma.domain.findMany({ select: { id: true, process: true, name: true } }),
    prisma.providerSkill.findMany({ select: { provider_profile_id: true, skill_id: true } }),
    prisma.skill.findMany({ where: { businessType: { code: "ERP" } }, select: { id: true, name: true } }),
  ]);
  const erpIds = new Set(erpSkills.map((s) => s.id));

  // 1 · Domains: existing by (process, name); new ones from the Knowledge list.
  const dom = new Map<string, { id: string | null; process: string; name: string }>(domains.map((d) => [dkey(d.process, d.name), d]));
  for (const k of DATA.knowledge) {
    if (dom.has(dkey(k.process, k.domain))) continue;
    dom.set(dkey(k.process, k.domain), { id: null, process: k.process, name: k.domain });
    note("1 domain", "create", `${k.process} › ${k.domain}`, k.source);
  }

  // 2 · Knowledge skills (level 3) and the legacy → target map. One legacy skill → one target (first wins).
  type Target = { kind: "knowledge" | "system" | "role"; domain: string | null; skill?: string; item?: string; role?: string; mode: WorkMode };
  const map = new Map<string, Target>();
  const dups: string[] = [];
  const claim = (id: string, t: Target, where: string) => {
    if (erpIds.has(id)) return note("6 old ERP skill", "untouched", erpSkills.find((s) => s.id === id)!.name, `listed under ${where} — left as it is`);
    if (map.has(id)) { dups.push(id); return note("5 legacy map", "duplicate (first kept)", id, where); }
    map.set(id, t);
  };
  const kskills: { domain: string; name: string; legacy: string | null }[] = [];
  for (const k of DATA.knowledge) {
    const d = dkey(k.process, k.domain);
    if (k.skill) {
      kskills.push({ domain: d, name: k.skill, legacy: k.legacy_skill_ids[0] ?? null });
      note("2 knowledge skill", "create", `${k.process} › ${k.domain} › ${k.skill}`);
    }
    for (const id of k.legacy_skill_ids) claim(id, { kind: "knowledge", domain: d, skill: k.skill ?? undefined, mode: "IMPLEMENT" }, `Knowledge ${k.domain}`);
  }

  // 3 · Systems: vendors › products › items, each linked to a domain (given, or proposed by name).
  const vendors = [...new Set([...DATA.systems.map((s) => s.vendor), ...DATA.new_vendors])];
  for (const v of vendors) note("3 system vendor", "create", v, DATA.new_vendors.includes(v) ? "new vendor (no items yet)" : "");
  const products = [...new Set(DATA.systems.map((s) => `${s.vendor} › ${s.product}`))];
  for (const p of products) note("3 system product", "create", p);
  const allDomains = [...dom.values()];
  const linkStats = { given: 0, proposed: 0, none: 0 };
  const items: { key: string; vendor: string; product: string; name: string; kind: SystemItemKind; domain: string | null; legacy: string | null }[] = [];
  const seenItem = new Set<string>();
  for (const s of DATA.systems) {
    const key = `${s.vendor}|${s.product}|${s.item}`.toLowerCase();
    if (seenItem.has(key)) {
      note("3 system item", "duplicate (merged)", `${s.vendor} › ${s.product} › ${s.item}`, "its legacy skills map to the first copy");
      const first = items.find((x) => x.key === key)!;
      for (const id of s.legacy_skill_ids) claim(id, { kind: "system", domain: first.domain, item: key, mode: "IMPLEMENT" }, `Systems ${s.item}`);
      continue;
    }
    seenItem.add(key);
    let d: string | null = s.process && s.domain && dom.has(dkey(s.process, s.domain)) ? dkey(s.process, s.domain) : null;
    let link = "";
    if (d) { linkStats.given++; link = "given"; }
    else {
      const w = words(s.item);
      const pool = s.process ? allDomains.filter((x) => x.process === s.process) : allDomains;
      const best = pool.map((x) => ({ x, n: [...words(x.name)].filter((t) => w.has(t)).length })).filter((r) => r.n > 0).sort((a, b) => b.n - a.n)[0]
        ?? (s.process ? allDomains.map((x) => ({ x, n: [...words(x.name)].filter((t) => w.has(t)).length })).filter((r) => r.n > 0).sort((a, b) => b.n - a.n)[0] : undefined);
      if (best) { d = dkey(best.x.process, best.x.name); linkStats.proposed++; link = "proposed"; }
      else { linkStats.none++; link = "none"; }
    }
    const dd = d ? dom.get(d)! : null;
    items.push({ key, vendor: s.vendor, product: s.product, name: s.item, kind: s.kind === "Tool" ? "TOOL" : "MODULE", domain: d, legacy: s.legacy_skill_ids[0] ?? null });
    note("3 system item", "create", `${s.vendor} › ${s.product} › ${s.item}`, `${s.kind}${dd ? ` → ${dd.process} › ${dd.name}` : " → no domain"}`, link);
    for (const id of s.legacy_skill_ids) claim(id, { kind: "system", domain: d, item: key, mode: "IMPLEMENT" }, `Systems ${s.item}`);
  }

  // 4 · Way of Working roles.
  for (const w of DATA.way_of_working) {
    note("4 work role", "create", `${w.mode} › ${w.role}`, w.source);
    for (const id of w.legacy_skill_ids) claim(id, { kind: "role", domain: null, role: `${MODE[w.mode]}|${w.role}`, mode: MODE[w.mode] }, `Role ${w.role}`);
  }

  // 5 · Legacy backfill: each ProviderSkill → one LEGACY ProviderCapability (unconfirmed).
  const caps = provSkills.filter((ps) => map.has(ps.skill_id) && !erpIds.has(ps.skill_id));
  const unmapped = provSkills.filter((ps) => !map.has(ps.skill_id) && !erpIds.has(ps.skill_id));
  const byKind = { knowledge: 0, system: 0, role: 0 };
  for (const c of caps) byKind[map.get(c.skill_id)!.kind]++;
  note("5 legacy backfill", "create capabilities", `${caps.length} ProviderCapability (LEGACY, unconfirmed)`, `${new Set(caps.map((c) => c.provider_profile_id)).size} providers · knowledge ${byKind.knowledge} · system ${byKind.system} · role ${byKind.role}`);
  if (unmapped.length) note("5 legacy backfill", "not mapped", `${unmapped.length} provider skills`, `${new Set(unmapped.map((u) => u.skill_id)).size} skills not in the map — no capability, ProviderSkill untouched`);
  const heldErp = provSkills.filter((ps) => erpIds.has(ps.skill_id)).length;
  for (const s of erpSkills) if (!rows.some((r) => r.step === "6 old ERP skill" && r.target === s.name)) note("6 old ERP skill", "untouched", s.name, "old business type ERP");
  if (heldErp) note("6 old ERP skill", "held by providers", `${heldErp} provider skills`, "no capability made");

  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  mkdirSync("scripts/out", { recursive: true });
  writeFileSync("scripts/out/global_taxonomy_dryrun.csv", ["step,action,target,detail,link", ...rows.map((r) => [r.step, r.action, r.target, r.detail, r.link].map(esc).join(","))].join("\n") + "\n");
  const summary = {
    applied: APPLY, newDomains: [...dom.values()].filter((d) => !d.id).length, knowledgeSkills: kskills.length, vendors: vendors.length, products: products.length, items: items.length, links: linkStats,
    workRoles: DATA.way_of_working.length, legacyMapped: map.size, duplicates: dups.length, capabilities: caps.length, unmappedProviderSkills: unmapped.length, oldErpSkills: erpSkills.length,
    csv: "scripts/out/global_taxonomy_dryrun.csv",
  };
  console.log(JSON.stringify(summary));
  if (!APPLY) return;

  // ── apply (only new rows; every one carries origin) ──
  for (const d of dom.values()) if (!d.id) d.id = (await prisma.domain.create({ data: { process: d.process, name: d.name, origin: ORIGIN, sort_order: 500 } })).id;
  const did = (k: string | null) => (k ? dom.get(k)!.id! : null);
  const ks = new Map<string, string>();
  for (const k of kskills) ks.set(`${k.domain}|${k.name}`, (await prisma.knowledgeSkill.create({ data: { domain_id: did(k.domain)!, name: k.name, legacy_skill_id: k.legacy && !erpIds.has(k.legacy) ? k.legacy : null, origin: ORIGIN } })).id);
  const vid = new Map<string, string>();
  for (const [i, v] of vendors.entries()) vid.set(v, (await prisma.systemVendor.create({ data: { name: v, sort_order: i + 1, origin: ORIGIN } })).id);
  const pid = new Map<string, string>();
  for (const [i, p] of products.entries()) { const [v, n] = p.split(" › "); pid.set(p, (await prisma.systemProduct.create({ data: { vendor_id: vid.get(v)!, name: n, sort_order: i + 1, origin: ORIGIN } })).id); }
  const iid = new Map<string, string>();
  for (const [i, it] of items.entries()) iid.set(it.key, (await prisma.systemItem.create({ data: { product_id: pid.get(`${it.vendor} › ${it.product}`)!, name: it.name, kind: it.kind, domain_id: did(it.domain), legacy_skill_id: it.legacy && !erpIds.has(it.legacy) && map.get(it.legacy)?.item === it.key ? it.legacy : null, sort_order: i + 1, origin: ORIGIN } })).id);
  const rid = new Map<string, string>();
  for (const [i, w] of DATA.way_of_working.entries()) rid.set(`${MODE[w.mode]}|${w.role}`, (await prisma.workRole.create({ data: { mode: MODE[w.mode], name: w.role, legacy_skill_id: w.legacy_skill_ids.find((id) => map.get(id)?.role === `${MODE[w.mode]}|${w.role}`) ?? null, sort_order: i + 1, origin: ORIGIN } })).id);
  const data = caps.map((c) => {
    const t = map.get(c.skill_id)!;
    return { provider_profile_id: c.provider_profile_id, domain_id: did(t.domain), knowledge_skill_id: t.skill ? ks.get(`${t.domain}|${t.skill}`) ?? null : null, system_item_id: t.item ? iid.get(t.item) ?? null : null, work_role_id: t.role ? rid.get(t.role) ?? null : null, mode: t.mode, source: "LEGACY" as const, legacy_skill_id: c.skill_id, origin: ORIGIN };
  });
  for (let i = 0; i < data.length; i += 500) await prisma.providerCapability.createMany({ data: data.slice(i, i + 500), skipDuplicates: true });
  console.log("applied");
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
