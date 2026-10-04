import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { follow, isFollowing, unfollow } from "@/lib/work-tracker/followers";

/**
 * POST /api/status/follow — follow or unfollow the build (`P2-ALL-E758`).
 *
 * ⚠⚠ **`guardApi("authenticated")` — NOT PUBLIC.** The page is public; following
 * is not. Scott: *"if you create an account you will get notifications."*
 * ⚠ The 401 is what the signed-out button relies on never seeing: it sends the
 * visitor to `/join?next=/status&follow=1` instead of posting.
 *
 * ⚠ No person id is accepted from the body — `followers.ts` resolves it from the
 * session (load-bearing rule 5).
 */
export async function POST(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;

  let body: { following?: unknown; weeklyEmail?: unknown } = {};
  try {
    body = (await request.json()) as { following?: unknown; weeklyEmail?: unknown };
  } catch {
    /* ⚠ An empty body means "follow" — the sign-up return path posts nothing. */
  }

  /* ⚠⚠ THE CLIENT SENDS THE STATE IT WANTS, NOT A TOGGLE. A toggle double-fires
     on a slow connection and leaves the member in the state they did not pick. */
  if (body.following === false) await unfollow(gate);
  /* `weeklyEmail` is passed through ONLY when the body carries a boolean —
     `undefined` leaves an existing follower's choice exactly as they set it
     (`E818`). Following is not consent to be mailed. */
  else await follow(gate, typeof body.weeklyEmail === "boolean" ? body.weeklyEmail : undefined);

  return NextResponse.json({ ok: true, following: await isFollowing(gate) });
}
