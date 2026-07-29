import { NextResponse } from "next/server";
import { respondToValidation } from "@/lib/project-validation";

/**
 * POST /api/validate — a client contact's answer (brief_project_validation).
 *
 * PUBLIC AND UNAUTHENTICATED BY DESIGN: the whole point is that the contact
 * needs no account. The single-use, hashed, expiring token IS the
 * authorization, and it is spent on first use either way, so a forwarded email
 * cannot be used to overturn an answer.
 *
 * Body: { token, decision: "confirm" | "decline" }.
 */
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
