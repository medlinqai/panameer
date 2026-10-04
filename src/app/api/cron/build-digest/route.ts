import { NextResponse } from "next/server";
import { composeDigest } from "@/lib/build-digest";

/**
 * THE FRIDAY JOB (`P2-ALL-E818`). It COMPOSES and never sends.
 *
 * `sendDigest` is deliberately not imported here: the one function that can mail
 * real followers is not reachable from a route a scheduler calls. That is the
 * whole safety argument, and it is structural rather than a flag somebody could
 * flip.
 *
 * Guarded by CRON_SECRET. A public route must be registered in
 * `lib/public-routes.ts` — this one is NOT, so the default DENY applies and the
 * secret is the second gate rather than the only one.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    new URL(request.url).searchParams.get("secret");
  if (!secret || given !== secret) {
    /* The same answer either way: a missing secret and a wrong one must not be
       distinguishable from outside. */
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const result = await composeDigest();
  return NextResponse.json({ ok: true, ...result, note: "draft only — nothing was sent" });
}
