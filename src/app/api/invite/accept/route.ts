import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionViewer } from "@/lib/session";
import { acceptInviteForUser } from "@/lib/coordinator";

const schema = z.object({ token: z.string().min(1) });

/**
 * POST /api/invite/accept — an EXISTING logged-in provider accepts an invite.
 * Requires a session; the lib enforces that the session user's email matches
 * the invite (no reassigning someone else's provider) and that they have a
 * provider profile. New users accept via provider onboarding instead.
 */
export async function POST(request: Request) {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const res = await acceptInviteForUser(viewer.userId, parsed.data.token);
  if (!res.ok) {
    const status = res.reason === "email_mismatch" ? 403 : 400;
    return NextResponse.json({ error: res.reason, code: res.reason }, { status });
  }
  return NextResponse.json({ ok: true, coordinatorName: res.coordinatorName });
}
