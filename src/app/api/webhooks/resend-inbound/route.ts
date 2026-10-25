import { NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { connectionForAddresses } from "@/lib/erp/po-email";
import { uploadPoEmailPdf } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 120;

// PE-E003: Resend Inbound — an ERP emails its PO PDF to po+{token}@PO_INBOUND_DOMAIN. Signature-verified (svix), idempotent on
// the Resend email id, PDF stored privately, then read and matched (PE-E004). Unknown token → logged and dropped (200).
export async function POST(request: Request) {
  const secret = process.env.RESEND_INBOUND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[resend-inbound] RESEND_INBOUND_WEBHOOK_SECRET is not set — refusing");
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  const payload = await request.text();
  const id = request.headers.get("svix-id"), timestamp = request.headers.get("svix-timestamp"), signature = request.headers.get("svix-signature");
  if (!id || !timestamp || !signature) return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  const resend = new Resend(process.env.RESEND_API_KEY);
  let event: { type: string; data: Record<string, unknown> };
  try {
    event = resend.webhooks.verify({ payload, headers: { id, timestamp, signature }, webhookSecret: secret }) as unknown as typeof event;
  } catch {
    console.error("[resend-inbound] signature verification FAILED");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
  if (event.type !== "email.received") return NextResponse.json({ ok: true, ignored: event.type });

  const d = event.data as { email_id: string; from?: string; to?: string[]; received_for?: string[]; subject?: string; attachments?: { id: string; filename?: string; content_type?: string }[] };
  if (await prisma.erpPoEmail.findUnique({ where: { resend_email_id: d.email_id }, select: { id: true } })) return NextResponse.json({ ok: true, duplicate: true });
  const conn = await connectionForAddresses([...(d.to ?? []), ...(d.received_for ?? [])]);
  if (!conn) {
    console.warn(`[resend-inbound] no connection for ${JSON.stringify(d.to)} — dropped`);
    return NextResponse.json({ ok: true, dropped: true });
  }
  const pdfMeta = (d.attachments ?? []).find((a) => a.content_type === "application/pdf" || /\.pdf$/i.test(a.filename ?? ""));
  const row = await prisma.erpPoEmail.create({ data: { connection_id: conn.id, from_address: String(d.from ?? ""), subject: d.subject ?? null, resend_email_id: d.email_id, order_ids: [], status: pdfMeta ? "RECEIVED" : "NEEDS_REVIEW", note: pdfMeta ? null : "No PDF Attached" } });
  if (!pdfMeta) {
    await (await import("@/lib/erp/po-email-process")).notifyNeedsReview(row.id).catch(() => null);
    return NextResponse.json({ ok: true, status: "NEEDS_REVIEW" });
  }
  try {
    const list = await resend.emails.receiving.attachments.list({ emailId: d.email_id });
    const att = list.data?.data.find((a) => a.id === pdfMeta.id) ?? list.data?.data.find((a) => a.content_type === "application/pdf");
    if (!att?.download_url) throw new Error("The PDF couldn't be downloaded from Resend.");
    const res = await fetch(att.download_url);
    if (!res.ok) throw new Error(`PDF download failed (${res.status}).`);
    const path = await uploadPoEmailPdf(conn.id, d.email_id, await res.arrayBuffer());
    await prisma.erpPoEmail.update({ where: { id: row.id }, data: { pdf_storage_path: path } });
    await (await import("@/lib/erp/po-email-process")).processPoEmail(row.id);
  } catch (e) {
    console.error("[resend-inbound] failed:", e);
    await prisma.erpPoEmail.update({ where: { id: row.id }, data: { status: "FAILED", note: (e as Error).message.slice(0, 500) } });
    await (await import("@/lib/erp/po-email-process")).notifyNeedsReview(row.id).catch(() => null);
  }
  return NextResponse.json({ ok: true });
}
