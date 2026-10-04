import { NextResponse } from "next/server";
import { getSessionViewer } from "@/lib/session";
import { issueEmailVerification } from "@/lib/verification";

export async function POST(request: Request) {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

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
