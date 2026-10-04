import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";
import {
  hasCapability,
  type Capability,
  type TransactVerdict,
  type Viewer,
} from "@/lib/access";
import type { RouteRequirement } from "@/lib/route-access";

function passes(viewer: Viewer | null, req: RouteRequirement): boolean {
  if (!viewer) return false;
  if (req === "authenticated") return true;
  return hasCapability(viewer, req as Capability);
}

export async function guardPage(req: RouteRequirement): Promise<Viewer> {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login");
  if (!passes(viewer, req)) redirect("/dashboard?noaccess=1");
  return viewer;
}

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

export async function guardTransact(viewer: Viewer, from?: string): Promise<void> {
  const verdict = await checkTransact(viewer);
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
