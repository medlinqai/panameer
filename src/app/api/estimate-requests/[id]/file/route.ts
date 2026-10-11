import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { requestFor } from "@/lib/estimate-requests";
import { signedEstimateRequestFileUrl } from "@/lib/storage";

// EST-E001: an attachment, for the two parties only — a short-lived signed link.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  const path = new URL(req.url).searchParams.get("path") ?? "";
  const r = await requestFor(gate, id).catch(() => null);
  if (!r || !r.attachments.some((a) => a.path === path)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const url = await signedEstimateRequestFileUrl(path);
  return url ? NextResponse.redirect(url) : NextResponse.json({ error: "Could not open that file" }, { status: 500 });
}
