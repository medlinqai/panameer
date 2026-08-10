import { NextResponse } from "next/server";
import { getSessionViewer } from "@/lib/session";
import { getMe } from "@/lib/me";

/**
 * GET /api/me — the logged-in Person + Company. Thin handler: auth + delegate
 * to the lib, which holds all the logic (API-first, so the mobile app reuses
 * the exact same endpoint).
 *
 * NO-STORE (WS-3). This is the shell's identity read — name, avatar, company,
 * membership badge — fetched by MeProvider for the rail and header. It went out
 * with no `Cache-Control` at all, which leaves freshness to whatever the client
 * decides: a browser applies heuristics, and any proxy in front of the app is
 * free to hold a per-user response it should never hold in the first place.
 *
 * The photo investigation could not pin a stale avatar on this, and the header
 * is not claimed as the fix — the actual cause was WS-2's split personas. But an
 * uncacheable, per-user, mutable response should say so itself rather than rely
 * on every client guessing right, and "the avatar is one layer of caching away
 * from being wrong" is not a thing to leave sitting in the shell.
 */
export async function GET() {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json(
      { error: "Unauthenticated" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const me = await getMe(viewer);
  if (!me) {
    // Authenticated, but this User isn't linked to a Person yet.
    return NextResponse.json(
      { error: "No linked person for this user" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(me, { headers: { "Cache-Control": "no-store" } });
}
