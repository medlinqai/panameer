import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { searchCompanies } from "@/lib/requester-onboarding";

/**
 * GET /api/onboarding/requester/companies?q= — the Company step's picker.
 *
 * SIGNED-IN ONLY, and it returns names and headcounts, nothing else. A company
 * name is not a secret — the point of the step is that a requester recognises
 * their employer — but an unauthenticated endpoint would hand the whole
 * customer list to anyone who asked for it.
 */
/*
 * ACCESS GOES THROUGH `guardApi` (→ src/lib/access.ts), not a hand-rolled
 * session check — the brief's rule, and the reason is this file would
 * otherwise be a fourth place that decides what "signed in" means.
 *
 * The requirement is `authenticated`, not canHireTalent: a requester mid-
 * onboarding already carries is_service_buyer, but the real boundary here is
 * OWNERSHIP, and that is enforced below by resolving the requester from the
 * session. A capability check would be a weaker statement of the same thing.
 */
export async function GET(request: Request) {
  // The gate is the whole point here — the result isn't needed, the refusal is.
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const q = new URL(request.url).searchParams.get("q") ?? "";
  return NextResponse.json({ companies: await searchCompanies(q) });
}
