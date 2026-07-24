import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";
import { hasCapability, type Capability, type Viewer } from "@/lib/access";
import type { RouteRequirement } from "@/lib/route-access";

/**
 * The AUTHORITATIVE server-side gate (brief_J). The edge proxy is a fast first
 * line but does not reliably cover API routes and must never be the only gate,
 * so protected server layouts and every protected API route call these. Fail
 * closed: no session, or missing capability, denies.
 */

function passes(viewer: Viewer | null, req: RouteRequirement): boolean {
  if (!viewer) return false;
  if (req === "authenticated") return true;
  return hasCapability(viewer, req as Capability);
}

/**
 * For SERVER COMPONENTS / layouts: resolve the viewer and enforce `req`,
 * redirecting on failure (→ /login when unauthenticated, → /dashboard?noaccess=1
 * when authenticated but lacking the capability). Returns the viewer on success.
 */
export async function guardPage(req: RouteRequirement): Promise<Viewer> {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login");
  if (!passes(viewer, req)) redirect("/dashboard?noaccess=1");
  return viewer;
}

/**
 * For API ROUTE HANDLERS: resolve the viewer and enforce `req`. On failure
 * returns a NextResponse (401/403) the handler should return immediately; on
 * success returns the viewer. Usage:
 *   const gate = await guardApi("canProvideServices");
 *   if (gate instanceof NextResponse) return gate;
 *   // gate is the Viewer
 */
export async function guardApi(
  req: RouteRequirement
): Promise<Viewer | NextResponse> {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  if (!passes(viewer, req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return viewer;
}
