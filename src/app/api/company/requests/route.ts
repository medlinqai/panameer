import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { OnboardingError } from "@/lib/onboarding";
import { decideRequest, getPendingRequests } from "@/lib/company";

const schema = z.object({
  membershipId: z.string().uuid(),
  decision: z.enum(["APPROVED", "REJECTED"]),
});

/** GET — the pending requests for companies this viewer administers. */
export async function GET() {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  return NextResponse.json({ requests: await getPendingRequests(gate) });
}

/**
 * POST — approve or reject one request.
 *
 * The membership id alone proves nothing (anyone could guess one), so the lib
 * reads the request's company and requires the CALLER to hold an approved ADMIN
 * membership on that same company. Deciding somebody else's queue is the attack
 * this endpoint exists to refuse.
 */
export async function POST(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  try {
    const res = await decideRequest(
      gate,
      parsed.data.membershipId,
      parsed.data.decision
    );
    return NextResponse.json(res);
  } catch (e) {
    if (e instanceof OnboardingError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 403 });
    }
    console.error("[company] decision failed:", e);
    return NextResponse.json({ error: "Could not save that decision" }, { status: 500 });
  }
}
