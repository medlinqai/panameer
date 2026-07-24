import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { resendInvite, CoordinatorError } from "@/lib/coordinator";

const schema = z.object({ inviteId: z.string().uuid() });

/** POST /api/coordinator/invite/resend — refresh token + resend (owner-scoped). */
export async function POST(request: Request) {
  const gate = await guardApi("canCoordinate");
  if (gate instanceof NextResponse) return gate;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  try {
    const res = await resendInvite(gate, parsed.data.inviteId);
    return NextResponse.json({ ok: true, ...(res.devLink ? { devLink: res.devLink } : {}) });
  } catch (e) {
    if (e instanceof CoordinatorError) {
      const status = e.code === "NOT_A_COORDINATOR" ? 403 : e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[coordinator] resend failed:", e);
    return NextResponse.json({ error: "Could not resend" }, { status: 500 });
  }
}
