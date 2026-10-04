import { NextResponse } from "next/server";
import { getSessionViewer } from "@/lib/session";

const PATHS = new Set(["manual", "reupload", "dismissed"]);

export async function POST(request: Request) {
  const viewer = await getSessionViewer();
  if (!viewer) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const path = typeof body?.path === "string" ? body.path : "";
  if (!PATHS.has(path)) {
    return NextResponse.json({ error: "Unknown path" }, { status: 400 });
  }
  console.info(`[resume] path=${path} user=${viewer.userId}`);
  return NextResponse.json({ ok: true });
}
