import { NextResponse } from "next/server";
import { getSessionViewer } from "@/lib/session";
import { getMe } from "@/lib/me";

/**
 * GET /api/me — the logged-in Person + Company. Thin handler: auth + delegate
 * to the lib, which holds all the logic (API-first, so the mobile app reuses
 * the exact same endpoint).
 */
export async function GET() {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const me = await getMe(viewer);
  if (!me) {
    // Authenticated, but this User isn't linked to a Person yet.
    return NextResponse.json(
      { error: "No linked person for this user" },
      { status: 404 }
    );
  }

  return NextResponse.json(me);
}
