import { NextResponse } from "next/server";
import { TRANSACT_MESSAGE } from "@/lib/transact-message";
import { checkTransact, guardApi } from "@/lib/guard";
import {
  createDraft,
  WorkRequestError,
  WORK_REQUEST_SECTIONS,
  type WorkRequestSection,
} from "@/lib/work-request";

/**
 * POST /api/work-requests — create a fresh DRAFT (optionally applying the first
 * section in the same call). Gated canHireTalent; PAccount-scoped in the lib.
 */
export async function POST(request: Request) {
  const gate = await guardApi("canHireTalent");
  if (gate instanceof NextResponse) return gate;
  /*
    The company gate, server-side (WS4). The page redirects, but the API is the
    authoritative boundary — a work request commits a company, so the caller
    needs an approved membership on one that has accepted the company terms.
  */
  const transact = await checkTransact(gate);
  if (!transact.ok) {
    return NextResponse.json(
      { error: TRANSACT_MESSAGE[transact.reason], code: transact.reason },
      { status: 403 }
    );
  }
  const body = await request.json().catch(() => ({}));
  const section = body?.section as WorkRequestSection | undefined;
  if (section && !WORK_REQUEST_SECTIONS.includes(section)) {
    return NextResponse.json({ error: "Unknown section" }, { status: 400 });
  }
  try {
    return NextResponse.json(await createDraft(gate, section, body?.data ?? {}));
  } catch (e) {
    if (e instanceof WorkRequestError) {
      const status = e.code === "NOT_A_BUYER" ? 403 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[work-request] create failed:", e);
    return NextResponse.json({ error: "Could not create request" }, { status: 500 });
  }
}
