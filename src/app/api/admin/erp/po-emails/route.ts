import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { writeAudit } from "@/lib/admin/audit";
import { prisma } from "@/lib/prisma";
import { signedPoEmailPdfUrl } from "@/lib/storage";

// PE-E005: the admin's PO Emails actions — View PDF (signed link), Create Order (when every line now matches), Dismiss (with note).
export async function POST(req: Request) {
  const viewer = await guardApi("canAdminister");
  if (viewer instanceof NextResponse) return viewer;
  const b = (await req.json().catch(() => ({}))) as { id?: string; action?: string; note?: string };
  const row = b.id ? await prisma.erpPoEmail.findUnique({ where: { id: b.id }, select: { id: true, pdf_storage_path: true, status: true } }) : null;
  if (!row) return NextResponse.json({ error: "That PO email isn't there." }, { status: 404 });
  try {
    if (b.action === "pdf") {
      const url = row.pdf_storage_path ? await signedPoEmailPdfUrl(row.pdf_storage_path) : null;
      return url ? NextResponse.json({ url }) : NextResponse.json({ error: "No PDF stored for this email." }, { status: 404 });
    }
    if (b.action === "create") {
      const r = await (await import("@/lib/erp/po-email-process")).createFromReview(row.id);
      await writeAudit(viewer, { action: "erp_po_email.create_order", targetTable: "erp_po_emails", detail: { id: row.id, orders: r.orderIds }, rowCount: 1 });
      return NextResponse.json({ ok: true, orderIds: r.orderIds });
    }
    if (b.action === "dismiss") {
      if (!b.note?.trim()) return NextResponse.json({ error: "Add a note saying why." }, { status: 400 });
      await prisma.erpPoEmail.update({ where: { id: row.id }, data: { status: "FAILED", note: `Dismissed — ${b.note.trim().slice(0, 300)}` } });
      await writeAudit(viewer, { action: "erp_po_email.dismiss", targetTable: "erp_po_emails", detail: { id: row.id, note: b.note.trim() }, rowCount: 1 });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
