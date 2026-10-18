import { prisma } from "@/lib/prisma";
import { addBusinessType, addTopCategory, addType, moveBusinessType, moveTypeTo, renameAt, renameTopCategory, typeUseCounts } from "@/lib/service-taxonomy-admin";

// CH-E005: the Category Hierarchy as one sheet — export, edit in Excel, import as a dry run, then Apply.
// Rows are matched by their ID columns; a row without IDs adds by name. Nothing is ever deleted.
export const COLUMNS = ["Category", "Business Type", "Type", "Kind", "Hidden", "Sort", "Sellers", "Products", "Rates", "Category ID", "Business Type ID", "Type ID"] as const;
type SheetRow = { category: string; businessType: string; type: string; kind: string; hidden: boolean; sort: number | null; categoryId: string; businessTypeId: string; typeId: string };

const KIND = { SERVICE: "Service Type", SERVICE_PRODUCT: "Service Product Type" } as const;
const LIVE = { merged_into_id: null, status: { in: ["STOCK" as const, "APPROVED" as const] } };

export async function exportRows(): Promise<(string | number)[][]> {
  const [groups, uses] = await Promise.all([
    prisma.commodityGroup.findMany({
      orderBy: { sort_order: "asc" },
      include: {
        serviceCategories: { include: { serviceTypes: { where: LIVE, orderBy: { sort_order: "asc" } } } },
        businessTypes: { orderBy: { sort_order: "asc" }, include: { serviceCategories: { orderBy: { sort_order: "asc" }, include: { serviceTypes: { where: LIVE, orderBy: { sort_order: "asc" } } } } } },
      },
    }),
    typeUseCounts(),
  ]);
  const yn = (b: boolean) => (b ? "Y" : "N");
  const rows: (string | number)[][] = [];
  for (const g of groups) {
    const types = g.serviceCategories.flatMap((c) => c.serviceTypes);
    if (!types.length && !g.businessTypes.length) rows.push([g.name, "", "", "Category", yn(g.hidden), g.sort_order, 0, 0, 0, g.id, "", ""]);
    for (const t of types) {
      const u = uses.get(t.id) ?? { sellers: 0, products: 0, rates: 0 };
      rows.push([g.name, "", t.name, KIND[t.kind], yn(t.hidden), t.sort_order, u.sellers, u.products, u.rates, g.id, "", t.id]);
    }
    for (const b of g.businessTypes) {
      const bt = b.serviceCategories.flatMap((c) => c.serviceTypes);
      if (!bt.length) rows.push([g.name, b.name, "", "Business Type", yn(b.hidden), b.sort_order, 0, 0, 0, g.id, b.id, ""]);
      for (const t of bt) {
        const u = uses.get(t.id) ?? { sellers: 0, products: 0, rates: 0 };
        rows.push([g.name, b.name, t.name, KIND[t.kind], yn(t.hidden), t.sort_order, u.sellers, u.products, u.rates, g.id, b.id, t.id]);
      }
    }
  }
  return rows;
}

export async function exportWorkbook(): Promise<Buffer> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Category Hierarchy");
  ws.addRow([...COLUMNS]);
  ws.getRow(1).font = { bold: true };
  for (const r of await exportRows()) ws.addRow(r);
  ws.columns.forEach((c, i) => { c.width = i < 3 ? 34 : i >= 9 ? 38 : 12; });
  ws.views = [{ state: "frozen", ySplit: 1 }];
  return Buffer.from(await wb.xlsx.writeBuffer());
}

const cell = (v: unknown) => (v == null ? "" : typeof v === "object" && v && "text" in v ? String((v as { text: unknown }).text) : typeof v === "object" && v && "result" in v ? String((v as { result: unknown }).result ?? "") : String(v)).trim();

export async function readSheet(buf: ArrayBuffer): Promise<SheetRow[]> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("The file has no sheet.");
  const head = (ws.getRow(1).values as unknown[]).slice(1).map(cell);
  const col = (name: string) => head.indexOf(name) + 1;
  if (!col("Category")) throw new Error("The first row must have the column names (export a sheet first).");
  const out: SheetRow[] = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const v = (name: string) => (col(name) ? cell(row.getCell(col(name)).value) : "");
    if (!v("Category")) return;
    const sort = Number(v("Sort"));
    out.push({ category: v("Category"), businessType: v("Business Type"), type: v("Type"), kind: v("Kind"), hidden: /^y/i.test(v("Hidden")), sort: Number.isFinite(sort) && v("Sort") ? sort : null, categoryId: v("Category ID"), businessTypeId: v("Business Type ID"), typeId: v("Type ID") });
  });
  return out;
}

export type Change = { op: "add" | "rename" | "move" | "hide" | "show" | "sort"; level: "Category" | "Business Type" | "Type"; what: string };

/** Compare the sheet with the hierarchy; with apply, make the changes (adds, renames, moves, hide/show, sort — never deletes). */
export async function importSheet(rows: SheetRow[], apply: boolean): Promise<Change[]> {
  const changes: Change[] = [];
  const seen = new Set<string>();
  const once = (k: string) => (seen.has(k) ? false : (seen.add(k), true));
  const say = (c: Change) => changes.push(c);

  for (const r of rows) {
    // Category
    let group = r.categoryId ? await prisma.commodityGroup.findUnique({ where: { id: r.categoryId }, select: { id: true, name: true, hidden: true, sort_order: true } }) : null;
    group ??= await prisma.commodityGroup.findFirst({ where: { name: { equals: r.category, mode: "insensitive" } }, select: { id: true, name: true, hidden: true, sort_order: true } });
    if (!group) {
      if (once(`addg:${r.category.toLowerCase()}`)) {
        say({ op: "add", level: "Category", what: r.category });
        if (apply) await addTopCategory(r.category);
      }
      group = apply ? await prisma.commodityGroup.findFirst({ where: { name: { equals: r.category, mode: "insensitive" } }, select: { id: true, name: true, hidden: true, sort_order: true } }) : null;
    } else if (group.name !== r.category && once(`rg:${group.id}`)) {
      say({ op: "rename", level: "Category", what: `${group.name} → ${r.category}` });
      if (apply) await renameTopCategory(group.id, r.category);
    }
    if (group && !r.businessType && !r.type && r.kind === "Category") {
      if (group.hidden !== r.hidden && once(`hg:${group.id}`)) { say({ op: r.hidden ? "hide" : "show", level: "Category", what: r.category }); if (apply) await prisma.commodityGroup.update({ where: { id: group.id }, data: { hidden: r.hidden } }); }
      if (r.sort != null && r.sort !== group.sort_order && once(`sg:${group.id}`)) { say({ op: "sort", level: "Category", what: `${r.category} → ${r.sort}` }); if (apply) await prisma.commodityGroup.update({ where: { id: group.id }, data: { sort_order: r.sort } }); }
    }

    // Business Type
    let btId: string | null = null;
    if (r.businessType) {
      let bt = r.businessTypeId ? await prisma.businessType.findUnique({ where: { id: r.businessTypeId }, select: { id: true, name: true, hidden: true, sort_order: true, commodity_group_id: true } }) : null;
      bt ??= group ? await prisma.businessType.findFirst({ where: { commodity_group_id: group.id, name: { equals: r.businessType, mode: "insensitive" } }, select: { id: true, name: true, hidden: true, sort_order: true, commodity_group_id: true } }) : null;
      if (!bt) {
        if (once(`addb:${r.category}:${r.businessType}`.toLowerCase())) {
          say({ op: "add", level: "Business Type", what: `${r.category} › ${r.businessType}` });
          if (apply && group) await addBusinessType(group.id, r.businessType);
        }
        bt = apply && group ? await prisma.businessType.findFirst({ where: { commodity_group_id: group.id, name: { equals: r.businessType, mode: "insensitive" } }, select: { id: true, name: true, hidden: true, sort_order: true, commodity_group_id: true } }) : null;
      } else {
        if (bt.name !== r.businessType && once(`rb:${bt.id}`)) { say({ op: "rename", level: "Business Type", what: `${bt.name} → ${r.businessType}` }); if (apply) await renameAt("businessType", bt.id, r.businessType); }
        if (group && bt.commodity_group_id !== group.id && once(`mb:${bt.id}`)) { say({ op: "move", level: "Business Type", what: `${r.businessType} → ${r.category}` }); if (apply) await moveBusinessType(bt.id, group.id); }
        if (!r.type && r.kind === "Business Type") {
          if (bt.hidden !== r.hidden && once(`hb:${bt.id}`)) { say({ op: r.hidden ? "hide" : "show", level: "Business Type", what: r.businessType }); if (apply) await prisma.businessType.update({ where: { id: bt.id }, data: { hidden: r.hidden } }); }
          if (r.sort != null && r.sort !== bt.sort_order && once(`sb:${bt.id}`)) { say({ op: "sort", level: "Business Type", what: `${r.businessType} → ${r.sort}` }); if (apply) await prisma.businessType.update({ where: { id: bt.id }, data: { sort_order: r.sort } }); }
        }
      }
      btId = bt?.id ?? null;
    }

    // Type
    if (!r.type) continue;
    const kind = /product/i.test(r.kind) ? "SERVICE_PRODUCT" : "SERVICE";
    const t = r.typeId ? await prisma.serviceType.findUnique({ where: { id: r.typeId }, select: { id: true, name: true, hidden: true, sort_order: true, serviceCategory: { select: { business_type_id: true, commodity_group_id: true } } } }) : null;
    if (!t) {
      if (once(`addt:${r.category}:${r.businessType}:${r.type}`.toLowerCase())) {
        say({ op: "add", level: "Type", what: `${[r.category, r.businessType, r.type].filter(Boolean).join(" › ")} (${kind === "SERVICE" ? "Service Type" : "Service Product Type"})` });
        if (apply) {
          if (btId) {
            const cat = await prisma.serviceCategory.findFirst({ where: { business_type_id: btId, kind }, select: { id: true } });
            await addType(cat ? { categoryId: cat.id } : { businessTypeId: btId }, r.type);
          } else if (group) await addType({ commodityGroupId: group.id }, r.type);
        }
      }
      continue;
    }
    if (t.name !== r.type && once(`rt:${t.id}`)) { say({ op: "rename", level: "Type", what: `${t.name} → ${r.type}` }); if (apply) await renameAt("type", t.id, r.type); }
    if (btId && t.serviceCategory?.business_type_id !== btId && once(`mt:${t.id}`)) { say({ op: "move", level: "Type", what: `${r.type} → ${r.businessType}` }); if (apply) await moveTypeTo(t.id, btId); }
    if (t.hidden !== r.hidden && once(`ht:${t.id}`)) { say({ op: r.hidden ? "hide" : "show", level: "Type", what: r.type }); if (apply) await prisma.serviceType.update({ where: { id: t.id }, data: { hidden: r.hidden } }); }
    if (r.sort != null && r.sort !== t.sort_order && once(`st:${t.id}`)) { say({ op: "sort", level: "Type", what: `${r.type} → ${r.sort}` }); if (apply) await prisma.serviceType.update({ where: { id: t.id }, data: { sort_order: r.sort } }); }
  }
  return changes;
}
