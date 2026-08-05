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
  // "/" is the host split; the rest MIRROR the prefixes in
  // `src/lib/route-access.ts` (ROUTE_ACCESS). Keep in sync — the map is the
  // source of truth for WHAT each requires; this list is only WHERE the edge
  // runs. Upwork-holdover routes (/find-work, /deliver-work, /manage-money)
  // were removed — they are not the real IA.
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
    "/work/:path*",
    "/reports/:path*",
    "/search/:path*",
    "/contracts/:path*",
    "/finances/:path*",
    "/messages/:path*",
    "/community/:path*",
    "/services/:path*",
    "/dashboard/:path*",
  ],
};
