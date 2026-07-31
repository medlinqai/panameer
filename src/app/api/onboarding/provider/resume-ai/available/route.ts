import { NextResponse } from "next/server";
import { getSessionViewer } from "@/lib/session";
import { aiExtractionAvailable } from "@/lib/resume/ai-extract";

/**
 * GET — is the AI tier configured here? (WS3)
 *
 * Returns a BOOLEAN and nothing else: whether a key exists, never the key or any
 * detail about it. The review step asks so it can hide "Let AI take a pass" on an
 * environment without one — offering a button that can only 503 is worse than
 * offering no button.
 */
export async function GET() {
  const viewer = await getSessionViewer();
  if (!viewer) return NextResponse.json({ available: false }, { status: 401 });
  return NextResponse.json({ available: aiExtractionAvailable() });
}
