import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isMarketingHost, isStatusHost } from "@/lib/host";
import { requirementForPath, meetsRequirement } from "@/lib/route-access";

/**
 * Next.js 16 renamed "Middleware" to "Proxy". This is the EDGE layer of the
 * two-layer role-based access control (brief_J) — the fast first line:
 *
 *  1. Splits `/` by hostname (marketing vs app). See `src/lib/host.ts`.
 *  2. Requires a session token on every protected route (→ /login).
 *  3. Consumes the ONE central route→capability map (`src/lib/route-access.ts`)
 *     — no hard-coded per-route `if`s — and redirects a user who lacks the
 *     required capability to /dashboard with a friendly no-access state.
 *
 * Fail closed: a matched route with no map entry is denied. The authoritative
 * gate is server-side (`src/lib/guard.ts` in protected layouts + every API
 * route); the edge must never be the only gate.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Host split for the root only. Before the auth check: `/` is public on the
  // marketing domains and must not cost a token lookup.
  if (pathname === "/") {
    const host =
      request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    /*
      ⚠⚠⚠ THE STATUS HOST IS TESTED FIRST (`P2-ALL-E753`).

      ⚠ `status.panameer.com` serves the public Work Tracker. It is NOT a
      marketing host, so without this branch it falls through to the app arm
      below and redirects a public visitor to `/login` — which is exactly what
      it did before this line existed.

      ⚠⚠ **A REWRITE, NOT A REDIRECT.** The visitor stays on
      `status.panameer.com` and never sees `/status` in the address bar; a
      redirect would send them to `app.panameer.com/status` and leak the app's
      hostname onto a page whose whole job is to be the public face of the build.

      ⚠ `/status` is ALSO reachable by path on any host — it is in
      `public-routes.ts`, so it is walkable locally without a hosts-file entry.
      The host is a convenience, not the gate.
    */
    if (isStatusHost(host)) {
      /*
        ⚠⚠⚠ THE SEARCH IS CARRIED THROUGH (`P2-ALL-E781`).

        ⚠ **MEASURED, NOT ASSUMED:** `new URL("/status", request.url)` builds the
        path from the FIRST argument and takes only the ORIGIN from the second, so
        the query is **dropped** — `new URL("/status",
        "https://status.panameer.com/?follow=1")` yields `search: ""`.
        ⚠⚠ **THAT SILENTLY BROKE THE FOLLOW ROUND TRIP ACROSS THE HOSTS.** The
        signed-out button sends people to `/join?next=/status&follow=1`; after
        sign-up they land on `<app host>/status?follow=1`, which `E780` now 307s to
        `status.panameer.com/?follow=1` **with the query intact** — and this rewrite
        was throwing that intent away on the last hop.
        ⚠ Appending `request.nextUrl.search` is the whole fix; it is `""` when there
        is no query, so the no-query case is byte-identical to before.
      */
      return NextResponse.rewrite(
        new URL(`/status${request.nextUrl.search}`, request.url),
      );
    }
    return isMarketingHost(host)
      ? NextResponse.next()
      : NextResponse.redirect(new URL("/login", request.url));
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  const requires = requirementForPath(pathname);
  // Matched by the config below but absent from the map → fail closed.
  const denied =
    requires === null ||
    !meetsRequirement(
      {
        isSystemAdmin: token.isSystemAdmin === true,
        isServiceBuyer: token.isServiceBuyer === true,
        isServiceProvider: token.isServiceProvider === true,
        isServiceCoordinator: token.isServiceCoordinator === true,
        isSupport: token.isSupport === true,
      },
      requires
    );

  if (denied) {
    // /dashboard is "authenticated", so this target never loops.
    return NextResponse.redirect(new URL("/dashboard?noaccess=1", request.url));
  }

  return NextResponse.next();
}

export const config = {
  /*
    ⚠⚠ `matcher` IS AND MUST REMAIN A STATIC LITERAL ARRAY OF STRINGS.
    Next reads `config.matcher` AT BUILD TIME and CANNOT EVALUATE an imported,
    spread or computed value. Deriving it from `ROUTE_ACCESS` looks tidier and
    TAKES THE WHOLE SITE DOWN. ⚠⚠ MEASURED 2026-08-26, not assumed — with
    `matcher: PROTECTED_PREFIX_MATCHERS` the edge runs on EVERY route:
      /talent /work /learn /shop   307 -> /login?callbackUrl=...
      /login                       307 -> /login   (redirects to ITSELF)
      /                            500
    ⚠ If you are here to make it dynamic, stop — you have misread this.

    ⚠ SO IT IS ASSERTED, NOT DERIVED. `e2e-shell/app-shell.spec.ts` ("THE PUBLIC
    ALLOWLIST") parses this literal out of this file's SOURCE and fails if it and
    `ROUTE_ACCESS` disagree in either direction. That is what replaced the old
    "Keep in sync" comment below — a comment cannot fail a build.

    "/" is the HOST SPLIT, not a gate (see the top of this file). The rest mirror
    the prefixes in `src/lib/route-access.ts`, which stays the source of truth
    for WHAT each requires; this list is only WHERE the edge runs.

    ⚠ PUBLIC IS NOW AN ENUMERATED ALLOWLIST: `src/lib/public-routes.ts`. A route
    that is in neither that file nor this matcher nor a self-guard FAILS the
    assertion by name. Absence from this list is no longer "public by default".

    The Upwork-holdover routes /deliver-work and /manage-money were removed from
    this matcher — they are not the real IA — and both self-guard with
    `guardPage`, which is why removing them did not open them.

    ⚠⚠ SUPERSEDED 2026-08-26 (`P1-ALL-E025`) — the dead half of the old comment:
      *"Their sibling /find-work is a PUBLIC page now (E029), so it is in the
       allowlist rather than here."*
    FALSE TWICE OVER: `/find-work/:path*` is listed BELOW, and since the route
    swap (`P1-ALL-E017`) `/find-work` is the SIGNED-IN PROVIDER FEED. The public
    page is `/work`. The comment described the pre-swap world.
  */
  matcher: [
    "/",
    "/admin/:path*",
    "/coordinator/:path*",
    "/my-services/:path*",
    "/settings/:path*",
    "/profile/:path*",
    "/usage/:path*",
    "/account-health/:path*",
    "/recommendations/:path*",
    "/worklist/:path*",
    "/worklist",
    /* ⚠ `P2-J3-E493`. Paired with `route-access.ts`'s entry — the spec parses
       this literal and fails if the two disagree in either direction. */
    "/invite-colleague/:path*",
    "/hire/:path*",
    /* ⚠ `P1-J4-E392`. Paired with `route-access.ts`'s entry — the spec parses
       this literal and fails if the two disagree in either direction. */
    "/work-requests/:path*",
    "/find-work/:path*",
    "/reports/:path*",
    "/search/:path*",
    /* ⚠ `/contracts` -> `/orders` (`P1-ALL-E380`). */
    "/orders/:path*",
    /* ⚠ `P1-J4-E394`. Paired with `route-access.ts`'s entry — the buyer's
       Payments surface was outside the edge entirely until it was built. */
    "/pay/:path*",
    "/payments/:path*",
    "/finances/:path*",
    "/messages/:path*",
    "/community/:path*",
    /* ⚠⚠ `P2-J3-E591` WS-A — the member's own profile moved from `/community`
       to `/connect`, and `/community/:path*` DOES NOT MATCH IT. Paired with
       `route-access.ts`'s `{ prefix: "/connect" }` entry; a route in neither is
       one the edge silently never runs on. */
    "/connect/:path*",
    /*
      Only the seller sub-route is guarded; the bare prefix is not. See the note
      in route-access.ts.
      ⚠ SUPERSEDED 2026-08-26 (`P1-ALL-E025`): this said *"/services itself is
      the PUBLIC Packages page"*. THERE IS NO `/services` PAGE — `src/app/services`
      does not exist. `/services` is a 308 in `next.config.ts` and, since
      `P1-ALL-E023`, it points at `/shop`. Keeping the prefix narrow is still
      right, for the reason route-access.ts gives; the stated reason was stale.
    */
    "/services/offers/:path*",
    "/dashboard/:path*",
  ],
};
