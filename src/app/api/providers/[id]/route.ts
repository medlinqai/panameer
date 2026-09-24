import { NextResponse } from "next/server";
import { getProviderProfileView } from "@/lib/provider-profile-view";
import { getSessionViewer } from "@/lib/session";

/**
 * GET /api/providers/[id] — a provider's marketplace profile.
 *
 * ── ⚠⚠⚠ THIS ROUTE WAS AN UNAUTHENTICATED PROFILE LEAK (`P2-A2-E616`) ────
 *
 * ⚠⚠⚠ MEASURED LIVE 2026-09-24, signed out, no cookie, against the running
 * app: `GET /api/providers/<id>` returned **HTTP 200** carrying
 * `person.lastName: "Walls"` and `rates: { onsiteCents: 12500, remoteCents:
 * 9000 }`. ⚠ The PAGE at `/providers/[id]` redirects the same caller to
 * `/login` (307). **The door was locked and the window was open.**
 *
 * ── ⚠⚠ HOW IT HAPPENED: TWO DECIDERS FOR ONE QUESTION (`E585`) ───────────
 *
 * ⚠ `lib/providers.ts`'s `getPublicProviderProfile` carried its OWN `isOwner`
 * — the same predicate as `provider-profile-view.ts` — and then applied **none**
 * of the redactions that file exists for: no `identityVisibility` (the surname),
 * no `contactVisibility`, no `clientNameVisibility`, and **no `canHireTalent`
 * rate test at all.** ⚠⚠ One concept in two places is free to drift, and this
 * one had drifted all the way to serving the thing the other withholds.
 *
 * ⚠⚠ SCOTT, RULING 9, 2026-09-24: **"ONE RULE, EVERYWHERE — this governs every
 * surface a rate renders on, not only the peer view."** ⚠ This route is such a
 * surface, so it is fixed here rather than briefed separately.
 *
 * ── ⚠ THE FIX IS TWO THINGS, AND BOTH ARE NEEDED ─────────────────────────
 *
 * 1. ⚠⚠ **A SESSION IS REQUIRED**, matching the page's own gate exactly. A
 *    profile is not a public document; `E049` decided that for the page and
 *    this route never learned it.
 * 2. ⚠⚠⚠ **IT READS THROUGH `getProviderProfileView`** — the ONE view model —
 *    so every redaction the page applies, this applies, forever, without either
 *    of them being told about the other.
 *
 * ⚠ NOTHING IN THE CODEBASE CALLS THIS ROUTE (measured: zero references outside
 * its own file), so the payload shape change breaks no caller. ⚠⚠ It is left in
 * place rather than deleted because an unused route that is CORRECT is a
 * different thing from one that is removed — and removing it is a decision
 * nobody has made.
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — the header's own false claim and
 * the body that made it true:
 * //   Public: shared marketplace surface, no auth, not PAccount-scoped. The lib
 * //   enforces the visibility gate (brief_K: ACTIVE + ≥80% complete + not paused),
 * //   so a hidden profile 404s — but the OWNER always sees their own. Thin handler.
 * //   const profile = await getPublicProviderProfile(id, {
 * //     viewerUserId: viewer?.userId,
 * //   });
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const viewer = await getSessionViewer();

  /*
    ⚠⚠ THE SAME GATE THE PAGE APPLIES, AND IN THE SAME PLACE — before the read,
    so a profile is never assembled for a caller who cannot have it.
    ⚠ 401 rather than a redirect: an API tells a caller what happened; only a
    page can send somebody to a login screen.
  */
  if (!viewer) {
    return NextResponse.json({ error: "Sign in to view a profile." }, { status: 401 });
  }

  /*
    ⚠⚠⚠ THE ONE VIEW MODEL. `viewer` is passed WHOLE and not just its id,
    because every redaction downstream — the rate rule, the Plus contact gate,
    the client-name gate — asks a capability of it. ⚠ Passing only the id is how
    the old path ended up deciding nothing.
  */
  const profile = await getProviderProfileView(id, {
    viewerUserId: viewer.userId,
    viewer,
  });
  if (!profile) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }
  return NextResponse.json(profile);
}
