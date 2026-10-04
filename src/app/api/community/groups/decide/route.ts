import { NextResponse } from "next/server";
import { z } from "zod";
import { decideJoinRequest, GroupError } from "@/lib/group-membership";
import { guardApi } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";

export async function POST(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const BODY = z.object({
    membershipId: z.string().uuid(),
    decision: z.enum(["approve", "decline"]),
  });
  const parsed = BODY.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That isn't a valid request." }, { status: 400 });
  }

  try {
    const res = await decideJoinRequest(
      viewer.userId,
      parsed.data.membershipId,
      parsed.data.decision === "approve"
    );
    return NextResponse.json({ ok: true, state: res.state });
  } catch (err) {
    if (err instanceof GroupError) {
      const status = err.code === "NOT_OWNER" ? 403 : 409;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    throw err;
  }
}
