import { NextResponse } from "next/server";
import { respondToValidation } from "@/lib/project-validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  const decision = body?.decision === "decline" ? "decline" : "confirm";

  const res = await respondToValidation(token, decision, {
    // Light provenance for a disputed confirmation. Never surfaced in the UI.
    ip:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip"),
    ua: request.headers.get("user-agent"),
  });

  if (!res.ok) {
    return NextResponse.json({ error: res.reason }, { status: 400 });
  }
  return NextResponse.json(res);
}
