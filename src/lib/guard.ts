import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";
import {
  hasCapability,
  verifyTransactAbility,
  type Capability,
  type TransactVerdict,
  type Viewer,
} from "@/lib/access";
import { getCompanyBinding } from "@/lib/company";
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

/**
 * THE COMPANY GATE for pages (brief_company_model WS4).
 *
 * Runs after the capability guard: a buyer with no approved company is still a
 * buyer, they just have no entity to contract as. Denials redirect to /company
 * carrying the reason, so the page can say "your company hasn't accepted the
 * terms" rather than a blank refusal — a gate nobody can act on reads as a bug.
 */
export async function guardTransact(viewer: Viewer, from?: string): Promise<void> {
  const verdict = await checkTransact(viewer);
  /*
    ⚠ `from` IS THE CALLER'S TO SUPPLY. A server-side redirect has no idea what
    path it is running under, and `?blocked=` names the REASON rather than the
    origin — so `/company` falls back to `/dashboard` when nobody says. Pass the
    path when you have it (see `/create-work`).
  */
  if (!verdict.ok) {
    const to = from ? `&from=${encodeURIComponent(from)}` : "";
    redirect(`/company?blocked=${verdict.reason.toLowerCase()}${to}`);
  }
}

/** The same check, for API routes and for pages that want to render a reason. */
export async function checkTransact(viewer: Viewer): Promise<TransactVerdict> {
  // Staff never need the binding read at all.
  if (viewer.isSystemAdmin) return { ok: true };
  return verifyTransactAbility(viewer, await getCompanyBinding(viewer));
}
