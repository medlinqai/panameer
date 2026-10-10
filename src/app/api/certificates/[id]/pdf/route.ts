import { PDFDocument } from "pdf-lib";
import { certificateView } from "@/lib/certificates";
import { certificatePng } from "@/lib/certificate-image";

// L-E056: the certificate as a one-page PDF — the same design as the PNG.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await certificateView((await params).id);
  if (!c) return new Response("Not found", { status: 404 });
  const png = new Uint8Array(await (await certificatePng(c)).arrayBuffer());
  const doc = await PDFDocument.create();
  doc.setTitle(`${c.title} – Panameer Certificate`);
  doc.setAuthor("Panameer");
  const img = await doc.embedPng(png);
  const page = doc.addPage([1200, 630]);
  page.drawImage(img, { x: 0, y: 0, width: 1200, height: 630 });
  const bytes = await doc.save();
  return new Response(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="Panameer-Certificate-${c.credentialId}.pdf"` } });
}
