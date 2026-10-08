import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isMarketingHost, isStatusHost } from "@/lib/host";
import { requirementForPath, meetsRequirement } from "@/lib/route-access";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Host split for the root only. Before the auth check: `/` is public on the
  // marketing domains and must not cost a token lookup.
  if (pathname === "/") {
    const host =
      request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    if (isStatusHost(host)) {
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
  // Next reads `config.matcher` AT BUILD TIME and CANNOT EVALUATE an imported
  matcher: [
    "/",
    "/admin/:path*",
    "/coordinator/:path*",
    "/my-services/:path*",
    "/settings/:path*",
    "/profile/:path*",
    "/usage/:path*",
    "/account-health/:path*",
    "/worklist/:path*",
    "/worklist",
    // Paired with `route-access.ts`'s entry — the spec parses
    "/invite-colleague/:path*",
    "/hire/:path*",
    // Paired with `route-access.ts`'s entry — the spec parses
    "/work-requests/:path*",
    "/find-work/:path*",
    "/reports/:path*",
    "/search/:path*",
    /* `/contracts` -> `/orders` (`P1-ALL-E380`). */
    "/orders/:path*",
    // Paired with `route-access.ts`'s entry — the buyer's
    "/pay/:path*",
    "/payments/:path*",
    "/finances/:path*",
    "/messages/:path*",
    // Connect (2026-10-08): every Connect page lives under /connect/.
    "/connect/:path*",
    // Account areas (2026-10-05), paired with route-access.ts.
    "/companies/:path*",
    "/company/:path*",
    "/support/:path*",
    // Only the seller sub-route is guarded; the bare prefix is not. See the note
    "/services/offers/:path*",
    "/dashboard/:path*",
  ],
};
