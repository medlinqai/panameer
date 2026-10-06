import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { issueEmailVerification } from "@/lib/verification";
import { writeAudit } from "@/lib/admin/audit";

// R2-E003 Nudge for "Waiting to Verify": resend the verification email. Never to test accounts.
const Body = z.object({ userId: z.string().uuid() });
const THROWAWAY = /@(example\.seed|[^@]*\.example|example\.com)$/i;

export async function POST(request: Request) {
  const viewer = await guardApi("canAdminister");
  if (viewer instanceof NextResponse) return viewer;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const u = await prisma.user.findUnique({ where: { id: parsed.data.userId }, select: { email: true, is_test: true, email_verified: true, person: { select: { is_service_buyer: true, is_service_provider: true } } } });
  if (!u) return NextResponse.json({ error: "No such user" }, { status: 404 });
  if (u.is_test || THROWAWAY.test(u.email)) return NextResponse.json({ error: "Test accounts are never emailed." }, { status: 400 });
  if (u.email_verified) return NextResponse.json({ ok: true, alreadyVerified: true });
  const res = await issueEmailVerification(parsed.data.userId, {
    throttle: true,
    origin: new URL(request.url).origin,
    audience: u.person?.is_service_buyer && !u.person?.is_service_provider ? "buyer" : "seller",
  });
  if (!res.ok) return NextResponse.json({ error: res.reason === "throttled" ? "Sent recently — try again later." : "Could not resend." }, { status: 429 });
  await writeAudit(viewer, { action: "user.resend_verification", targetTable: "users", targetId: parsed.data.userId, detail: { email: u.email } });
  return NextResponse.json({ ok: true, sent: res.sent });
}
