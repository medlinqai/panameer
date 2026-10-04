import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/password-reset";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let email = "";
  try {
    const body = await request.json();
    email = typeof body?.email === "string" ? body.email : "";
  } catch {
  }

  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;

  const { devLink } = await requestPasswordReset(email, {
    origin: new URL(request.url).origin,
    ip,
  });

  return NextResponse.json({
    ok: true,
    message: "If that address has an account, a reset link is on its way.",
    ...(devLink ? { devLink } : {}),
  });
}
