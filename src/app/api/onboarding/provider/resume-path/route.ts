import { NextResponse } from "next/server";
import { getSessionViewer } from "@/lib/session";

/**
 * POST { path } — record which way a low-confidence import was resolved (WS4).
 *
 * The escalation rate is the number that decides whether this tier flips to
 * AI-primary later, and it needs all three outcomes to mean anything:
 * `ai-escalated` and `ai-failed` are logged server-side where they happen, but
 * "the provider read the panel and typed it in themselves" and "they uploaded a
 * different file" only exist in the browser. Without this they would show up as
 * silence, and silence is indistinguishable from nobody seeing the panel.
 *
 * Logging only — no database write. This is instrumentation for a decision a
 * human will make by reading logs, not a metric anything queries; a table would
 * be more machinery than the question needs.
 */
const PATHS = new Set(["manual", "reupload", "dismissed"]);

export async function POST(request: Request) {
  const viewer = await getSessionViewer();
  if (!viewer) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const path = typeof body?.path === "string" ? body.path : "";
  if (!PATHS.has(path)) {
    return NextResponse.json({ error: "Unknown path" }, { status: 400 });
  }
  console.info(`[resume] path=${path} user=${viewer.userId}`);
  return NextResponse.json({ ok: true });
}
