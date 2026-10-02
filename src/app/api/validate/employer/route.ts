import { NextResponse } from "next/server";
import { respondToEmployerValidation } from "@/lib/employer-validation";

/**
 * ── ⚠⚠ POST /api/validate/employer — the contact's answer (`E747`, WS-B) ────
 *
 * ⚠ **PUBLIC AND UNAUTHENTICATED, like its project twin.** The single-use token
 * in the body IS the authorization: a former manager is not a Panameer user and
 * must not be made one to answer yes or no.
 * ⚠⚠ **POST ONLY.** A GET that confirmed would let a mail gateway's link-scanner
 * validate somebody's employment for them.
 * ⚠⚠⚠ **IT NEVER SAYS WHY IT REFUSED.** An unknown, used or expired token all
 * return the same `{ ok: false }` — distinguishing them tells anyone holding a
 * guessed token whether a real request exists.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = body?.token;
  const answer = body?.answer;
  if (typeof token !== "string" || (answer !== "yes" && answer !== "no")) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const res = await respondToEmployerValidation(token, answer, {
    /* ⚠ Light provenance so a disputed confirmation can be investigated. It is
       never shown to the provider. */
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    ua: request.headers.get("user-agent"),
  });
  return NextResponse.json(res, { status: res.ok ? 200 : 400 });
}
