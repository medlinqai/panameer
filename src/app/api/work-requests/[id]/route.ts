import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import {
  getWorkRequest,
  saveSection,
  WorkRequestError,
  WORK_REQUEST_SECTIONS,
  type WorkRequestSection,
} from "@/lib/work-request";

function errStatus(code: WorkRequestError["code"]): number {
  if (code === "NOT_A_BUYER") return 403;
  if (code === "NOT_FOUND") return 404;
  return 400;
}

/** GET /api/work-requests/[id] — fetch one request the buyer owns (scoped). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await guardApi("canHireTalent");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  try {
    return NextResponse.json(await getWorkRequest(gate, id));
  } catch (e) {
    if (e instanceof WorkRequestError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: errStatus(e.code) });
    }
    console.error("[work-request] get failed:", e);
    return NextResponse.json({ error: "Could not load request" }, { status: 500 });
  }
}

/**
 * PATCH /api/work-requests/[id] — save one section of a DRAFT (save-as-you-go).
 * Gated canHireTalent; PAccount-scoped; a POSTED request is immutable.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await guardApi("canHireTalent");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const section = body?.section as WorkRequestSection | undefined;
  if (!section || !WORK_REQUEST_SECTIONS.includes(section)) {
    return NextResponse.json({ error: "Unknown section" }, { status: 400 });
  }
  try {
    return NextResponse.json(await saveSection(gate, id, section, body?.data ?? {}));
  } catch (e) {
    if (e instanceof WorkRequestError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: errStatus(e.code) });
    }
    console.error("[work-request] save failed:", e);
    return NextResponse.json({ error: "Could not save request" }, { status: 500 });
  }
}
