import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { writeAudit } from "@/lib/admin/audit";
import { addBusinessType, addCategory, addTopCategory, addType, approve, merge, move, removeAt, removeTopCategory, rename, renameAt, renameTopCategory, setCategoryTile, setDefaultOn, setDescription, setHidden, updateType } from "@/lib/service-taxonomy-admin";

const UNITS = ["HOUR", "DAY", "WEEK", "MONTH", "SESSION", "VISIT", "EACH"] as const;
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("update"), id: z.string().uuid(), fields: z.object({ pricing_model: z.enum(["TIME", "FIXED", "RECURRING", "QUOTE"]).nullable().optional(), units: z.array(z.enum(UNITS)).optional(), delivery: z.enum(["OFFSITE", "ONSITE", "EITHER"]).nullable().optional(), lead_time_days: z.number().int().min(0).max(365).nullable().optional(), commodity_code: z.string().trim().max(8).nullable().optional(), required: z.boolean().optional(), description: z.string().trim().max(200).nullable().optional() }) }),
  z.object({ action: z.literal("move"), level: z.enum(["group", "businessType", "category", "type"]), id: z.string().uuid(), dir: z.union([z.literal(-1), z.literal(1)]) }),
  z.object({ action: z.literal("hide"), level: z.enum(["group", "businessType", "category", "type"]), id: z.string().uuid(), hidden: z.boolean() }),
  z.object({ action: z.literal("renameAt"), level: z.enum(["businessType", "category", "type"]), id: z.string().uuid(), name: z.string().min(2).max(60) }),
  z.object({ action: z.literal("delete"), level: z.enum(["businessType", "category", "type"]), id: z.string().uuid() }),
  z.object({ action: z.literal("defaultOn"), id: z.string().uuid(), on: z.boolean() }),
  z.object({ action: z.literal("addBusinessType"), id: z.string().uuid(), name: z.string().min(2).max(60) }),
  z.object({ action: z.literal("addCategory"), id: z.string().uuid(), name: z.string().min(2).max(60), kind: z.enum(["SERVICE", "SERVICE_PRODUCT"]) }),
  z.object({ action: z.literal("addType"), id: z.string().uuid(), to: z.enum(["category", "businessType", "commodity"]), name: z.string().min(2).max(60) }),
  z.object({ action: z.literal("describe"), level: z.enum(["group", "businessType"]), id: z.string().uuid(), description: z.string().max(300) }),
  z.object({ action: z.literal("approve"), id: z.string().uuid(), categoryId: z.string().uuid() }),
  z.object({ action: z.literal("rename"), id: z.string().uuid(), name: z.string().min(3).max(60) }),
  z.object({ action: z.literal("merge"), id: z.string().uuid(), into: z.string().uuid() }),
  z.object({ action: z.literal("addTopCategory"), name: z.string().min(2).max(60), id: z.string().optional() }),
  z.object({ action: z.literal("renameTopCategory"), id: z.string().uuid(), name: z.string().min(2).max(60) }),
  z.object({ action: z.literal("tile"), id: z.string().uuid(), icon: z.string().max(20).nullable().optional(), tile_line: z.string().max(120).nullable().optional(), show_in_shop: z.boolean().optional() }),
  z.object({ action: z.literal("deleteTopCategory"), id: z.string().uuid() }),
]);

// TX-E005: Admin › Service Taxonomy edits (system admins only), each written to the admin audit.
export async function POST(req: Request) {
  const viewer = await guardApi("canAdminister");
  if (viewer instanceof NextResponse) return viewer;
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: b.error.issues[0]?.message ?? "Bad request" }, { status: 400 });
  const d = b.data;
  try {
    if (d.action === "update") await updateType(d.id, { ...d.fields, commodity_code: d.fields.commodity_code === "" ? null : d.fields.commodity_code });
    else if (d.action === "move") await move(d.level, d.id, d.dir);
    else if (d.action === "hide") await setHidden(d.level, d.id, d.hidden);
    else if (d.action === "approve") await approve(d.id, d.categoryId);
    else if (d.action === "rename") await rename(d.id, d.name);
    else if (d.action === "renameAt") await renameAt(d.level, d.id, d.name);
    else if (d.action === "delete") await removeAt(d.level, d.id);
    else if (d.action === "defaultOn") await setDefaultOn(d.id, d.on);
    else if (d.action === "addBusinessType") await addBusinessType(d.id, d.name);
    else if (d.action === "addCategory") await addCategory(d.id, d.name, d.kind);
    else if (d.action === "addType") await addType(d.to === "category" ? { categoryId: d.id } : d.to === "commodity" ? { commodityGroupId: d.id } : { businessTypeId: d.id }, d.name);
    else if (d.action === "describe") await setDescription(d.level, d.id, d.description);
    else if (d.action === "addTopCategory") await addTopCategory(d.name);
    else if (d.action === "renameTopCategory") await renameTopCategory(d.id, d.name);
    else if (d.action === "tile") await setCategoryTile(d.id, { icon: d.icon, tile_line: d.tile_line, show_in_shop: d.show_in_shop });
    else if (d.action === "deleteTopCategory") await removeTopCategory(d.id);
    else await merge(d.id, d.into);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  await writeAudit(viewer, { action: `category_hierarchy.${d.action}`, targetTable: "service_types", targetId: d.id ?? null, detail: d, rowCount: 1 });
  return NextResponse.json({ ok: true });
}
