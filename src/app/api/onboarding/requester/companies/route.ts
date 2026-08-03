import { NextResponse } from "next/server";
import { getSessionViewer } from "@/lib/session";
import { searchCompanies } from "@/lib/requester-onboarding";

/**
 * GET /api/onboarding/requester/companies?q= — the Company step's picker.
 *
 * SIGNED-IN ONLY, and it returns names and headcounts, nothing else. A company
 * name is not a secret — the point of the step is that a requester recognises
 * their employer — but an unauthenticated endpoint would hand the whole
 * customer list to anyone who asked for it.
 */
export async function GET(request: Request) {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  const q = new URL(request.url).searchParams.get("q") ?? "";
  return NextResponse.json({ companies: await searchCompanies(q) });
}
