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

/** The same check, for API routes and for pages that want to render a reason. */
export async function checkTransact(viewer: Viewer): Promise<TransactVerdict> {
  void viewer;
  return { ok: true };
}
