import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { writeAudit } from "@/lib/admin/audit";
import { prisma } from "@/lib/prisma";
import { BUYER_KEYS, SELLER_KEYS } from "@/lib/dashboard/progress";

// MD-E005: save the Panameer Targets for one role.
export async function POST(req: Request) {
  const viewer = await guardApi("canAdminister");
  if (viewer instanceof NextResponse) return viewer;
  const b = (await req.json().catch(() => ({}))) as { role?: string; rows?: { metric: string; value: number; label?: string | null }[] };
  const role = b.role === "BUYER" ? "BUYER" : b.role === "SELLER" ? "SELLER" : null;
  if (!role || !Array.isArray(b.rows)) return NextResponse.json({ error: "Pick a role and send its rows." }, { status: 400 });
  const keys = new Set<string>(role === "SELLER" ? SELLER_KEYS : BUYER_KEYS);
  const rows = b.rows.filter((r) => keys.has(r.metric) && Number.isFinite(Number(r.value)) && Number(r.value) >= 0);
  const by = (await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } }))?.id ?? null;
  for (const r of rows) {
    await prisma.performanceTarget.upsert({ where: { role_metric: { role, metric: r.metric } }, create: { role, metric: r.metric, value: Number(r.value), label: r.label?.trim() || null, updated_by: by }, update: { value: Number(r.value), label: r.label?.trim() || null, updated_by: by } });
  }
  await writeAudit(viewer, { action: "performance_targets.save", targetTable: "performance_targets", detail: { role, count: rows.length }, rowCount: rows.length });
  return NextResponse.json({ ok: true, saved: rows.length });
}
