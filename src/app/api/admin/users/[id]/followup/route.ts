import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { writeAudit } from "@/lib/admin/audit";
import { sendPersonalFollowup, setStopReason, STOP_REASONS } from "@/lib/registration-followup";

const Body = z.union([
  z.object({ action: z.literal("email"), subject: z.string().trim().min(2).max(200), body: z.string().trim().min(5).max(5000) }),
  z.object({ action: z.literal("reason"), reason: z.enum(STOP_REASONS), note: z.string().trim().max(1000).nullish() }),
]);

// SO-E009: personal follow-up on someone who stopped partway (system admins only, audited). `id` = the person.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await guardApi("canAdminister");
  if (viewer instanceof NextResponse) return viewer;
  const { id } = await params;
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Check the form." }, { status: 400 });
  if (b.data.action === "email") await sendPersonalFollowup(viewer.userId, id, b.data.subject, b.data.body);
  else await setStopReason(id, b.data.reason, b.data.note?.trim() || null);
  await writeAudit(viewer, { action: `users.followup.${b.data.action}`, targetTable: "registration_followups", targetId: id, detail: b.data.action === "email" ? { subject: b.data.subject } : b.data, rowCount: 1 });
  return NextResponse.json({ ok: true });
}
