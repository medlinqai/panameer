import { NextResponse } from "next/server";
import { lookupInvite } from "@/lib/coordinator";

/**
 * GET /api/invite/lookup?token=… — validate an invite token (no side effects
 * beyond lazily expiring a past-due one). Public: the provider wizard uses it to
 * pre-fill the invitee email + show the inviter. Never links anything.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  return NextResponse.json(await lookupInvite(token));
}
