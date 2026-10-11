import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/admin/audit";

const BODY = z.object({ id: z.string().uuid(), action: z.enum(["approve", "merge"]), into: z.string().uuid().optional() });

// WS-E008: admins approve a suggested service product type, or merge it into another (its products move over).
export async function POST(req: Request) {
  const viewer = await guardApi("canAdminister");
  if (viewer instanceof NextResponse) return viewer;
  const b = BODY.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const { id, action, into } = b.data;
  if (action === "approve") await prisma.serviceProductType.update({ where: { id }, data: { reviewed_at: new Date() } });
  else {
    if (!into || into === id) return NextResponse.json({ error: "Pick the type to merge into" }, { status: 400 });
    await prisma.$transaction([
      prisma.serviceProduct.updateMany({ where: { product_type_id: id }, data: { product_type_id: into } }),
      prisma.serviceProductType.update({ where: { id }, data: { merged_into_id: into, reviewed_at: new Date() } }),
    ]);
  }
  await writeAudit(viewer, { action: `service_product_type.${action}`, targetTable: "service_product_types", targetId: id, detail: { into: into ?? null }, rowCount: 1 });
  return NextResponse.json({ ok: true });
}
