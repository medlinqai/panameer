import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { writeAudit } from "@/lib/admin/audit";
import { prisma } from "@/lib/prisma";
import { listConnections } from "@/lib/erp/connections";

// EO-E005: Suspend / Resume an ERP connection (a suspended one's punch-in lands on the "paused" page).
export async function POST(req: Request) {
  const viewer = await guardApi("canAdminister");
  if (viewer instanceof NextResponse) return viewer;
  const b = (await req.json().catch(() => ({}))) as { id?: string; action?: string };
  const c = b.id ? await prisma.erpConnection.findUnique({ where: { id: b.id }, select: { id: true, confirmed_at: true, created_via: true } }) : null;
  if (!c || !["suspend", "resume", "rotatePo"].includes(b.action ?? "")) return NextResponse.json({ error: "Pick a connection and an action." }, { status: 400 });
  // PE-E002: Rotate the PO email address (the old one stops working).
  if (b.action === "rotatePo") {
    await (await import("@/lib/erp/po-email")).rotatePoToken(c.id);
    await writeAudit(viewer, { action: "erp_connection.rotate_po_email", targetTable: "erp_connections", detail: { id: c.id }, rowCount: 1 });
    return NextResponse.json({ connections: await listConnections() });
  }
  const status = b.action === "suspend" ? "SUSPENDED" : c.created_via === "SELF" && !c.confirmed_at ? "SELF_PENDING" : "ACTIVE";
  await prisma.erpConnection.update({ where: { id: c.id }, data: { status } });
  await writeAudit(viewer, { action: `erp_connection.${b.action}`, targetTable: "erp_connections", detail: { id: c.id, status }, rowCount: 1 });
  return NextResponse.json({ connections: await listConnections() });
}
