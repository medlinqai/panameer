import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { writeAudit } from "@/lib/admin/audit";
import { sendMessage } from "@/lib/erp/outbound";
import { prisma } from "@/lib/prisma";

// X-E007: resend a FAILED or HELD outbound ERP message (stays HELD while ERP_SEND_ENABLED is off).
export async function POST(req: Request) {
  const viewer = await guardApi("canAdminister");
  if (viewer instanceof NextResponse) return viewer;
  const b = z.object({ id: z.string().uuid() }).safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Which message?" }, { status: 400 });
  const m = await prisma.erpMessage.findUnique({ where: { id: b.data.id }, select: { status: true, direction: true } });
  if (!m || m.direction !== "OUT" || !["FAILED", "HELD"].includes(m.status)) return NextResponse.json({ error: "Only failed or held outbound messages can be resent" }, { status: 400 });
  const r = await sendMessage(b.data.id);
  await writeAudit(viewer, { action: "erp_message.resend", targetTable: "erp_messages", targetId: b.data.id, detail: r, rowCount: 1 });
  return NextResponse.json(r);
}
