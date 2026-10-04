import { NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/password-reset";

export const runtime = "nodejs";

const MESSAGE: Record<string, string> = {
  invalid: "That link isn't valid. Request a new one and try again.",
  expired: "That link has expired. Request a new one and try again.",
  used: "That link has already been used. Request a new one if you still need it.",
  weak: "Password must be at least 8 characters.",
};

export async function POST(request: Request) {
  let token = "";
  let password = "";
  try {
    const body = await request.json();
    token = typeof body?.token === "string" ? body.token : "";
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    /* falls through to the invalid branch */
  }

  const result = await resetPasswordWithToken(token, password);
  if (result.ok) {
    return NextResponse.json({ ok: true, message: "Your password has been changed. You can sign in now." });
  }
  return NextResponse.json(
    { ok: false, error: MESSAGE[result.reason] ?? MESSAGE.invalid, code: result.reason },
    { status: result.reason === "weak" ? 400 : 410 }
  );
}
