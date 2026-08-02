import { NextResponse } from "next/server";
import { getSessionViewer } from "@/lib/session";
import { homeFor } from "@/lib/home-for";

/**
 * GET /api/home — where this viewer's home is (WS2).
 *
 * The login page is a client component and cannot read the session's admin bit
 * before the credentials round-trip finishes, so it asks. One endpoint over
 * `homeFor` keeps the answer in one place rather than duplicating the rule in
 * the client.
 */
export async function GET() {
  const viewer = await getSessionViewer();
  return NextResponse.json({ home: homeFor(viewer) });
}
