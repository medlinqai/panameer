import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/guard";
import { signedMessageImageUrl } from "@/lib/storage";

// A message image, for its two people only: redirects to a short-lived signed URL.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const m = await prisma.message.findFirst({ where: { id, OR: [{ from_user_id: gate.userId }, { to_user_id: gate.userId }] }, select: { image_path: true } });
  if (!m?.image_path) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const url = await signedMessageImageUrl(m.image_path, 300);
  if (!url) return NextResponse.json({ error: "Not available" }, { status: 503 });
  return NextResponse.redirect(url, { headers: { "Cache-Control": "private, max-age=240" } });
}
