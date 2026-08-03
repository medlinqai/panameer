import { NextResponse } from "next/server";
import { getSessionViewer } from "@/lib/session";
import { issueEmailVerification } from "@/lib/verification";

/**
 * POST /api/onboarding/resend-verification — re-send the verification email for
 * the signed-in user. Throttled to one per minute (enforced in the lib).
 */
export async function POST(request: Request) {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  /*
    The RESEND has to greet the same audience the first email did, or a
    requester who clicks "Resend" is suddenly told to build a provider profile.
    Read from the viewer's own flags rather than a query param — the client
    shouldn't get to choose which product it is signing up for.
  */
  const res = await issueEmailVerification(viewer.userId, {
    throttle: true,
    origin: new URL(request.url).origin,
    audience: viewer.isServiceBuyer && !viewer.isServiceProvider ? "buyer" : "seller",
  });
  if (!res.ok) {
    if (res.reason === "throttled") {
      return NextResponse.json(
        { error: "Please wait before requesting another email", retryAfterMs: res.retryAfterMs },
        { status: 429 }
      );
    }
    if (res.reason === "already_verified") {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }
    return NextResponse.json({ error: "Could not resend" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, sent: res.sent, ...(res.devLink ? { devLink: res.devLink } : {}) });
}
