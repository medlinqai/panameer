import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/password-reset";

/**
 * ── ⚠⚠ REQUEST A PASSWORD RESET (`P1-ALL-E528` Part B) ─────────────────────
 *
 * ⚠⚠ THE RESPONSE IS IDENTICAL WHETHER OR NOT THE ADDRESS EXISTS. One shape,
 * one status, one sentence — *"If that address has an account, a reset link is
 * on its way."* ⚠ Anything else turns a public, unauthenticated form into a way
 * to find out who is a member. ⚠ `E525` opened member search deliberately, for a
 * SIGNED-IN member, rate-limited. This page is neither.
 *
 * ⚠ RATE LIMITING lives in `requestPasswordReset` — per address in the database,
 * per IP best-effort in memory — and a rejection is ALSO silent, for the same
 * reason: a "slow down" answer tells a prober their guess was interesting.
 */
export const runtime = "nodejs";

export async function POST(request: Request) {
  let email = "";
  try {
    const body = await request.json();
    email = typeof body?.email === "string" ? body.email : "";
  } catch {
    /* ⚠ A malformed body gets the same answer as everything else. */
  }

  /* ⚠ `x-forwarded-for` is the client chain on Vercel; the first entry is the
     caller. Absent locally, which the limiter handles. */
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;

  const { devLink } = await requestPasswordReset(email, {
    origin: new URL(request.url).origin,
    ip,
  });

  return NextResponse.json({
    ok: true,
    message: "If that address has an account, a reset link is on its way.",
    /* ⚠ DEV ONLY, and only so a localhost walk can follow the link without a
       mailbox — `requestPasswordReset` returns it in no other environment. */
    ...(devLink ? { devLink } : {}),
  });
}
