import { NextResponse } from "next/server";
import { PUNCHOUT_COOKIE, startSession } from "@/lib/erp/punchout";

// X-E002: the StartPage. Trades the one-time token for a punchout-only cookie (not a Panameer sign-in).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const cookie = await startSession(url.searchParams.get("t") ?? "");
  if (!cookie) return NextResponse.redirect(new URL("/punchout?expired=1", url));
  const res = NextResponse.redirect(new URL("/punchout", url));
  res.cookies.set(PUNCHOUT_COOKIE, cookie, { httpOnly: true, secure: true, sameSite: "none", path: "/punchout", maxAge: 4 * 3600 });
  return res;
}
