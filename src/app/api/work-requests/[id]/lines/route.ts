import { NextResponse } from "next/server";
import { TRANSACT_MESSAGE } from "@/lib/transact-message";
import { checkTransact, guardApi } from "@/lib/guard";
import { WorkRequestError } from "@/lib/work-request";
import { addLine } from "@/lib/work-request-lines";

export function errStatus(code: WorkRequestError["code"]): number {
  if (code === "NOT_A_BUYER") return 403;
  if (code === "NOT_FOUND") return 404;
  return 400;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await guardApi("canHireTalent");
  if (gate instanceof NextResponse) return gate;
  const transact = await checkTransact(gate);
  if (!transact.ok) {
    return NextResponse.json(
      { error: TRANSACT_MESSAGE[transact.reason], code: transact.reason },
      { status: 403 }
    );
  }
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Nothing to add" }, { status: 400 });
  try {
    return NextResponse.json(await addLine(gate, id, body));
  } catch (e) {
    if (e instanceof WorkRequestError)
      return NextResponse.json({ error: e.message, code: e.code }, { status: errStatus(e.code) });
    if (e instanceof Error && e.name === "SpineError")
      return NextResponse.json({ error: e.message, code: "INVALID" }, { status: 400 });
    console.error("[work-request] add line failed:", e);
    return NextResponse.json({ error: "Could not add that line" }, { status: 500 });
  }
}
