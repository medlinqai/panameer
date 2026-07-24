import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { createInvite, CoordinatorError } from "@/lib/coordinator";

const schema = z.object({
  email: z.string().trim().email().max(200),
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
  message: z.string().trim().max(1000).optional(),
});

/**
 * POST /api/coordinator/invite — "Invite a Provider". Gated to canCoordinate.
 * Creates a PENDING invite (revoking prior pending to the same email) and sends
 * the branded Resend invite (dev fallback logs the link when no key).
 */
export async function POST(request: Request) {
  const gate = await guardApi("canCoordinate");
  if (gate instanceof NextResponse) return gate;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  try {
    const res = await createInvite(gate, parsed.data);
    return NextResponse.json({
      ok: true,
      inviteId: res.inviteId,
      ...(res.devLink ? { devLink: res.devLink } : {}),
    });
  } catch (e) {
    if (e instanceof CoordinatorError) {
      const status = e.code === "NOT_A_COORDINATOR" ? 403 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[coordinator] invite failed:", e);
    return NextResponse.json({ error: "Could not send invite" }, { status: 500 });
  }
}
