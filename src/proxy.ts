import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isMarketingHost } from "@/lib/host";

/**
 * Next.js 16 renamed "Middleware" to "Proxy" (same functionality). This does
 * two things:
 *
 *  1. Splits `/` by hostname — the marketing domains render the coming-soon
 *     page, every other host (app.panameer.com, Vercel previews, localhost)
 *     goes into the app. See `src/lib/host.ts`.
 *  2. Guards protected routes using the NextAuth JWT, and gates /admin on
 *     isSystemAdmin — the same intent as Medlinq's `withAuth` middleware,
 *     written against the Proxy convention so it's forward-correct on Next 16.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Host split for the root only. Deliberately before the auth check: `/` is
  // public on the marketing domains and must not cost a token lookup.
  if (pathname === "/") {
    // Vercel sets both, but x-forwarded-host is the value that survives the
    // proxy hop, so it wins; `host` is the direct/local fallback.
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

  if (pathname.startsWith("/admin") && token.isSystemAdmin !== true) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // "/" is the host split; the rest are the protected areas. Add paths here as
  // the app grows.
  matcher: ["/", "/dashboard/:path*", "/admin/:path*"],
};
