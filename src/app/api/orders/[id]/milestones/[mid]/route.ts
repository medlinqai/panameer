import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { reportMilestone } from "@/lib/order-milestones";
import { SettlementError } from "@/lib/settlements";
import { prisma } from "@/lib/prisma";

// CAT-E007: the provider reports a milestone (Delivered / Installed / Downloaded) → its payment request.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string; mid: string }> }) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const { id, mid } = await params;
  const m = await prisma.workOrderMilestone.findUnique({ where: { id: mid }, select: { work_order_line_id: true } });
  const line = m ? await prisma.workOrderLine.findUnique({ where: { id: m.work_order_line_id }, select: { work_order_id: true } }) : null;
  if (!line || line.work_order_id !== id) return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
  try {
    const s = await reportMilestone(gate, mid);
    return NextResponse.json({ settlementId: s.id });
  } catch (e) {
    if (e instanceof SettlementError) return NextResponse.json({ error: e.message }, { status: e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400 });
    if (e instanceof Error && (e.name === "SpineError" || e.name === "OrderError")) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[orders] milestone report failed:", e);
    return NextResponse.json({ error: "Could not report that milestone" }, { status: 500 });
  }
}
