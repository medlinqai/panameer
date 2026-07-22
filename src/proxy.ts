import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Next.js 16 renamed "Middleware" to "Proxy" (same functionality). This guards
 * protected routes using the NextAuth JWT, and gates /admin on isSystemAdmin —
 * the same intent as Medlinq's `withAuth` middleware, written against the Proxy
 * convention so it's forward-correct on Next 16.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  // Only run on protected areas. Add paths here as the app grows.
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
