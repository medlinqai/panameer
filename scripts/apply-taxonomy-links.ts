// Scott-reviewed links for the 240 unlinked modules/tools (10-14). Dry run by default (CSV); --apply to write.
// link = set the item's Knowledge domain · move = new vendor/product (merges if the name already exists there)
// merge = point capabilities at the existing item, hide the duplicate · hide = hidden, nothing deleted.
// Everything new is origin GT_2026_10_14, so rollback-global-taxonomy.ts still removes it all.
// Run: npx tsx --env-file=.env.local scripts/apply-taxonomy-links.ts [--apply]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { prisma } from "@/lib/prisma";

const APPLY = process.argv.includes("--apply");
const ORIGIN = "GT_2026_10_14";
type Ref = { vendor: string; product: string; item?: string };
type Act = Ref & { item: string; action: "link" | "move" | "merge" | "hide"; domain: [string, string] | null; to?: Ref; into?: Ref & { item: string }; rename?: string };
const data = JSON.parse(readFileSync("scripts/data/taxonomy-links-2026-10-14.json", "utf8")) as { new_domains: [string, string][]; actions: Act[] };
const rows: string[][] = [["vendor", "product", "item", "action", "domain", "result"]];

async function product(vendor: string, name: string, create: boolean) {
  let v = await prisma.systemVendor.findFirst({ where: { name: vendor } });
  if (!v && create && APPLY) v = await prisma.systemVendor.create({ data: { name: vendor, origin: ORIGIN } });
  if (!v) return null;
  let p = await prisma.systemProduct.findFirst({ where: { vendor_id: v.id, name } });
  if (!p && create && APPLY) p = await prisma.systemProduct.create({ data: { vendor_id: v.id, name, origin: ORIGIN } });
  return p;
}
async function item(r: Ref & { item: string }) {
  const p = await product(r.vendor, r.product, false);
  return p ? prisma.systemItem.findFirst({ where: { product_id: p.id, name: r.item } }) : null;
}
const domainId = async (d: [string, string] | null) => (d ? (await prisma.domain.findFirst({ where: { process: d[0], name: d[1] } }))?.id ?? null : null);
async function setDomain(itemId: string, dId: string | null) {
  if (!dId || !APPLY) return;
  await prisma.systemItem.update({ where: { id: itemId }, data: { domain_id: dId } });
  await prisma.providerCapability.updateMany({ where: { system_item_id: itemId, domain_id: null }, data: { domain_id: dId } });
}
async function mergeInto(srcId: string, targetId: string, dId: string | null) {
  if (!APPLY) return;
  const t = await prisma.systemItem.findUniqueOrThrow({ where: { id: targetId } });
  if (!t.domain_id && dId) await setDomain(targetId, dId);
  await prisma.providerCapability.updateMany({ where: { system_item_id: srcId }, data: { system_item_id: targetId } });
  await prisma.providerCapability.updateMany({ where: { system_item_id: targetId, domain_id: null }, data: { domain_id: t.domain_id ?? dId } });
  await prisma.systemItem.update({ where: { id: srcId }, data: { hidden: true } });
}

async function main() {
  for (const [process, name] of data.new_domains) {
    const has = await prisma.domain.findFirst({ where: { process, name } });
    if (!has && APPLY) await prisma.domain.create({ data: { process, name, origin: ORIGIN } });
    rows.push(["", "", "", "new domain", `${process} › ${name}`, has ? "exists" : "create"]);
  }
  const n: Record<string, number> = {};
  for (const a of data.actions) {
    const src = await item(a);
    const dId = await domainId(a.domain);
    let result = "";
    if (!src) result = "NOT FOUND";
    else if (a.domain && !dId && APPLY) result = "domain not found";
    else if (a.action === "hide") { if (APPLY) await prisma.systemItem.update({ where: { id: src.id }, data: { hidden: true } }); result = "hidden"; }
    else if (a.action === "merge") {
      const t = await item(a.into!);
      if (t) { await mergeInto(src.id, t.id, dId); result = `merged into ${a.into!.product} › ${a.into!.item}`; }
      else { await setDomain(src.id, dId); result = `target ${a.into!.item} not found — linked only`; }
    } else if (a.action === "move") {
      const name = a.rename ?? a.item;
      const p = await product(a.to!.vendor, a.to!.product, true);
      const there = p ? await prisma.systemItem.findFirst({ where: { product_id: p.id, name } }) : null;
      if (there) { await mergeInto(src.id, there.id, dId); result = `merged into ${a.to!.vendor} › ${a.to!.product} › ${name}`; }
      else { if (APPLY && p) await prisma.systemItem.update({ where: { id: src.id }, data: { product_id: p.id, name } }); await setDomain(src.id, dId); result = `moved to ${a.to!.vendor} › ${a.to!.product}${a.rename ? ` as ${name}` : ""}`; }
    } else { await setDomain(src.id, dId); result = dId || !APPLY ? "linked" : "no domain"; }
    const k = result.split(" ")[0]; n[k] = (n[k] ?? 0) + 1;
    rows.push([a.vendor, a.product, a.item, a.action, a.domain?.join(" › ") ?? "", result]);
  }
  mkdirSync("scripts/out", { recursive: true });
  const csv = "scripts/out/taxonomy_links_" + (APPLY ? "applied" : "dryrun") + ".csv";
  writeFileSync(csv, rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n"));
  console.log(JSON.stringify({ applied: APPLY, ...n, csv }));
}
main().finally(() => prisma.$disconnect());
