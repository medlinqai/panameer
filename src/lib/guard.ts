import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";
/* ⚠ `verifyTransactAbility` and `getCompanyBinding` ARE NO LONGER IMPORTED HERE
   (`E418`) — `checkTransact` below no longer reads a company binding. Both
   functions are untouched in their own modules, for work order acceptance. */
import {
  hasCapability,
  type Capability,
  type TransactVerdict,
  type Viewer,
} from "@/lib/access";
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

/**
 * The same check, for API routes and for pages that want to render a reason.
 *
 * ── ⚠⚠ IT PASSES EVERYONE NOW (`P1-A1.4-E418`, 2026-09-11) ──────────────────
 *
 * ⚠ SUPERSEDED, quoted not deleted:
 *     if (viewer.isSystemAdmin) return { ok: true };
 *     return verifyTransactAbility(viewer, await getCompanyBinding(viewer));
 *
 * SCOTT, 2026-09-11: to register, read communities, search talent and service
 * products, connect, learn, POST A WORK REQUEST, create a service product,
 * interview and request a test, Panameer needs ONLY the person's details.
 *
 * ⚠⚠ THIS FUNCTION WAS THE BUYER-SIDE BLOCKER AND IT WAS WIDER THAN THE COMPANY
 * STEP. It sits in front of every work-request route and page — create, edit,
 * lines, invite, complete, import, plus `/create-work`, `/hire` and
 * `/work-requests/[id]` — and it demanded an APPROVED `CompanyMembership` on a
 * company that had accepted the company ToS. `E418` removes both of those
 * things from registration, so left alone this would have refused every buyer a
 * DRAFT, redirecting them to `/company?blocked=no_company` with no way to
 * satisfy it. ⚠ MEASURED before the change: 9 of 26 buyer-side people passed it.
 *
 * ⚠ THE CALL SITES ARE DELIBERATELY LEFT IN PLACE, and so is
 * `verifyTransactAbility` in `lib/access.ts` with its four denial reasons and
 * `TRANSACT_MESSAGE` (`E164`). ⚠⚠ THEY ARE THE WORK-ORDER-ACCEPTANCE GATE
 * WAITING FOR ITS EVENT — see the TODO on `acceptOrder` in `lib/orders.ts`.
 * Re-pointing this at a binding is how the gate comes back, at the right moment
 * rather than at registration; ripping the call sites out would mean rebuilding
 * twelve of them to get there.
 *
 * ⚠ NOT DELETED AND NOT INLINED TO `true`: the function keeps its signature and
 * its verdict type so the day a company IS required, one edit here re-arms every
 * caller at once.
 */
export async function checkTransact(viewer: Viewer): Promise<TransactVerdict> {
  void viewer;
  return { ok: true };
}
