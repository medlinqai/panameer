import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
 *
 * ── ⚠ THREE OUTCOMES, AND "NO PERSON" IS NOT ONE OF THE FAILURES (P1-ALL-E002)
 *
 *   401  no session at all
 *   404  a session naming a User row that does not exist
 *   200  a real User — WITH OR WITHOUT a linked Person
 *
 * The middle case is the one worth keeping sharp: a JWT can outlive the row it
 * names (`/api/assessment` reasons about the same hazard), and that genuinely is
 * an unknown user. The LAST case is what changed. It used to 404, which made the
 * whole shell — greeting, avatar, company chip — degrade for a person the
 * product's own funnel creates: `/assess/claim` deliberately makes a `User` and
 * nothing else. A 404 for a user who exists says "you are not here", and the
 * shell believed it.
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
  if (me) {
    return NextResponse.json(me, { headers: { "Cache-Control": "no-store" } });
  }

  /*
    No Person. Is there a USER? The two are different answers and used to share
    a 404.

    ⚠ THE UNKNOWN-USER 404 IS DELIBERATELY KEPT. A session token can outlive the
    row it names, and answering 200 for a deleted account would let the shell
    render for somebody who no longer exists.
  */
  const user = await prisma.user.findUnique({
    where: { id: viewer.userId },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json(
      { error: "Unknown user" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  /*
    A real, signed-in user who has no Person yet. 200 with the person-shaped
    fields null, so the shell renders its signed-in-but-unprofiled state instead
    of treating a normal account as an error. `orgCompanyCount` is 0 rather than
    absent — it is a count, and the honest count is zero.
  */
  return NextResponse.json(
    {
      person: null,
      company: null,
      pAccount: null,
      providerProfile: null,
      buyerProfile: null,
      orgCompanyCount: 0,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
