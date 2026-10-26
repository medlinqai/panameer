import { NextResponse } from "next/server";
import { getSessionViewer } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// HT-E004/E005: remember the person's At a Glance view ("start" | "work").
export async function POST(request: Request) {
  const viewer = await getSessionViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { view } = (await request.json().catch(() => ({}))) as { view?: string };
  if (view !== "start" && view !== "work") return NextResponse.json({ error: "Unknown view." }, { status: 400 });
  await prisma.person.updateMany({ where: { user_id: viewer.userId }, data: { dashboard_view: view } });
  return NextResponse.json({ ok: true });
}
