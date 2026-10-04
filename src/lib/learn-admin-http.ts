import { NextResponse } from "next/server";
import { LearnAdminError } from "@/lib/learn-admin";

export function learnErrorResponse(e: unknown, fallback: string): NextResponse {
  if (e instanceof LearnAdminError) {
    const status =
      e.code === "NOT_FOUND" ? 404 : e.code === "INVALID" ? 400 : 409;
    return NextResponse.json({ error: e.message }, { status });
  }
  console.error(`[admin/learn] ${fallback}:`, e);
  return NextResponse.json({ error: fallback }, { status: 500 });
}
