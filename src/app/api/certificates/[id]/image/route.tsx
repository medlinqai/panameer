import { certificateView } from "@/lib/certificates";
import { certificatePng } from "@/lib/certificate-image";

// L-E059: public — the same certificate the verify page vouches for (Panameer-issued only).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await certificateView((await params).id);
  if (!c) return new Response("Not found", { status: 404 });
  const png = await certificatePng(c);
  const download = new URL(req.url).searchParams.get("download") === "1";
  const headers = new Headers(png.headers);
  headers.set("Cache-Control", "public, max-age=3600");
  if (download) headers.set("Content-Disposition", `attachment; filename="Panameer-Certificate-${c.credentialId}.png"`);
  return new Response(png.body, { headers });
}
