import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isMarketingHost } from "@/lib/host";
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
    "/settings/:path*",
    "/profile/:path*",
    "/stats/:path*",
    "/account-health/:path*",
    "/recommendations/:path*",
    "/hire/:path*",
    "/find-work/:path*",
    "/reports/:path*",
    "/search/:path*",
    /* ⚠ `/contracts` -> `/orders` (`P1-ALL-E380`). */
    "/orders/:path*",
    "/finances/:path*",
    "/messages/:path*",
    "/community/:path*",
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
