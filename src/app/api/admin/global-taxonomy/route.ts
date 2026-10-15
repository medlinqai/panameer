import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { writeAudit } from "@/lib/admin/audit";
import { prisma } from "@/lib/prisma";

const KIND = z.enum(["knowledgeSkill", "item", "role", "vendor", "product", "domain", "attribute"]);
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("rename"), kind: KIND, id: z.string().uuid(), name: z.string().trim().min(2).max(120) }),
  z.object({ action: z.literal("hide"), kind: KIND.exclude(["domain"]), id: z.string().uuid(), hidden: z.boolean() }),
  z.object({ action: z.literal("link"), id: z.string().uuid(), domainId: z.string().uuid().nullable() }),
  // Lane 6: an attribute's pick-list ("·"-separated).
  z.object({ action: z.literal("choices"), id: z.string().uuid(), choices: z.array(z.string().trim().min(1).max(80)).max(80) }),
]);

// GT-E005: Admin › Global Taxonomy edits. Only Global Taxonomy rows (origin GT) change — existing domains are read-only.
export async function POST(req: Request) {
  const viewer = await guardApi("canAdminister");
  if (viewer instanceof NextResponse) return viewer;
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: b.error.issues[0]?.message ?? "Bad request" }, { status: 400 });
  const d = b.data;
  try {
    if (d.action === "link") await prisma.systemItem.update({ where: { id: d.id }, data: { domain_id: d.domainId } });
    else if (d.action === "choices") await prisma.businessTypeAttribute.update({ where: { id: d.id }, data: { choices: d.choices } });
    else if (d.action === "rename") {
      const data = { name: d.name };
      if (d.kind === "domain") {
        const n = await prisma.domain.updateMany({ where: { id: d.id, origin: { not: null } }, data });
        if (!n.count) return NextResponse.json({ error: "Only Global Taxonomy domains can be renamed here" }, { status: 400 });
      } else if (d.kind === "knowledgeSkill") await prisma.knowledgeSkill.update({ where: { id: d.id }, data });
      else if (d.kind === "item") await prisma.systemItem.update({ where: { id: d.id }, data });
      else if (d.kind === "role") await prisma.workRole.update({ where: { id: d.id }, data });
      else if (d.kind === "vendor") await prisma.systemVendor.update({ where: { id: d.id }, data });
      else if (d.kind === "attribute") await prisma.businessTypeAttribute.update({ where: { id: d.id }, data });
      else await prisma.systemProduct.update({ where: { id: d.id }, data });
    } else {
      const data = { hidden: d.hidden };
      if (d.kind === "knowledgeSkill") await prisma.knowledgeSkill.update({ where: { id: d.id }, data });
      else if (d.kind === "item") await prisma.systemItem.update({ where: { id: d.id }, data });
      else if (d.kind === "role") await prisma.workRole.update({ where: { id: d.id }, data });
      else if (d.kind === "vendor") await prisma.systemVendor.update({ where: { id: d.id }, data });
      else if (d.kind === "attribute") await prisma.businessTypeAttribute.update({ where: { id: d.id }, data });
      else await prisma.systemProduct.update({ where: { id: d.id }, data });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message.includes("Unique") ? "That name is already used here" : "Could not save that" }, { status: 400 });
  }
  await writeAudit(viewer, { action: `global_taxonomy.${d.action}`, targetTable: d.action === "link" ? "system_items" : d.action === "choices" ? "business_type_attributes" : d.kind, targetId: d.id, detail: d, rowCount: 1 });
  return NextResponse.json({ ok: true });
}
