import { NextResponse } from "next/server";
import { getSessionViewer } from "@/lib/session";
import { appForPath, recordVisit } from "@/lib/usage-tracking";

// A-E001: the page beacon — one VISIT row per member per app per day. Never errors back to the page.
export async function POST(request: Request) {
  const viewer = await getSessionViewer();
  if (!viewer) return new NextResponse(null, { status: 204 });
  const body = (await request.json().catch(() => null)) as { path?: unknown } | null;
  const app = typeof body?.path === "string" ? appForPath(body.path.slice(0, 200)) : null;
  if (app) await recordVisit(viewer.userId, app).catch((e) => console.error("[usage] visit not recorded:", (e as Error).message));
  return new NextResponse(null, { status: 204 });
}
