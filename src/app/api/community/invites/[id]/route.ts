import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { cancelColleagueInvite, resendColleagueInvite } from "@/lib/colleague-invite";

// Invited-person card: Resend (once per 24 h) or Cancel Invite. Only the inviter may act.
const Body = z.object({ action: z.enum(["resend", "cancel"]) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await guardApi("authenticated");
  if (viewer instanceof NextResponse) return viewer;
  const { id } = await params;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "That didn't look right." }, { status: 400 });
  const me = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } });
  if (!me) return NextResponse.json({ error: "No person record." }, { status: 400 });
  const r = parsed.data.action === "resend" ? await resendColleagueInvite(me.id, id, new URL(request.url).origin) : await cancelColleagueInvite(me.id, id);
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
