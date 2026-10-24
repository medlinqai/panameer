import { NextResponse } from "next/server";
import { PUNCHOUT_COOKIE, sessionFor, startSession } from "@/lib/erp/punchout";
import { punchinSignIn } from "@/lib/erp/punchin-signin";

// X-E002: the StartPage. Trades the one-time token for a punchout-only cookie (not a Panameer sign-in).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const cookie = await startSession(url.searchParams.get("t") ?? "");
  if (!cookie) return NextResponse.redirect(new URL("/punchout?expired=1", url));
  const live = await sessionFor(cookie);
  // Setup sessions (ES) stay on the setup page; a real punch-in signs the requester in and opens their dashboard (PI-E001).
  if (!live || live.connection.kind === "SETUP" || !live.requester_person_id) {
    const res = NextResponse.redirect(new URL("/punchout/setup", url));
    res.cookies.set(PUNCHOUT_COOKIE, cookie, { httpOnly: true, secure: true, sameSite: "none", path: "/punchout", maxAge: 4 * 3600 });
    return res;
  }
  const signIn = await punchinSignIn(live.id);
  if (!signIn.ok) return NextResponse.redirect(new URL(`/punchout/paused?reason=${encodeURIComponent(signIn.reason)}`, url));
  const res = NextResponse.redirect(new URL("/dashboard", url));
  res.cookies.set(PUNCHOUT_COOKIE, cookie, { httpOnly: true, secure: true, sameSite: "none", path: "/punchout", maxAge: 4 * 3600 });
  // The punch-in user replaces whoever was signed in: the ERP vouched for this person.
  res.cookies.set(signIn.cookieName, signIn.cookieValue, { ...(signIn.options as object), maxAge: signIn.maxAge });
  return res;
}
