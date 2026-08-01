import { NextResponse } from "next/server";
import { LearnAdminError } from "@/lib/learn-admin";

/**
 * One place that maps a LearnAdminError to a status code.
 *
 * Every Learn admin route needs this mapping, and the codes carry meaning the
 * UI acts on — a 409 is "you have to do something first" and gets shown in the
 * dialog, a 404 means reload. Repeating the ternary in a dozen route files is
 * how one of them ends up returning 500 for a blocked delete and the dialog
 * shows "something went wrong" instead of the reason.
 */
export function learnErrorResponse(e: unknown, fallback: string): NextResponse {
  if (e instanceof LearnAdminError) {
    const status =
      e.code === "NOT_FOUND" ? 404 : e.code === "INVALID" ? 400 : 409;
    return NextResponse.json({ error: e.message }, { status });
  }
  console.error(`[admin/learn] ${fallback}:`, e);
  return NextResponse.json({ error: fallback }, { status: 500 });
}
