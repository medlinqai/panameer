import { NextResponse } from "next/server";
import { TRANSACT_MESSAGE } from "@/lib/transact-message";
import { checkTransact, guardApi } from "@/lib/guard";
import { WorkRequestError } from "@/lib/work-request";
import { inviteProviders } from "@/lib/work-request-invite";

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
  if (!body) return NextResponse.json({ error: "Nothing to send" }, { status: 400 });
  try {
    return NextResponse.json(
      await inviteProviders(gate, id, {
        lineId: body.lineId,
        providerPersonIds: Array.isArray(body.providerPersonIds) ? body.providerPersonIds : [],
        respondsBy: body.respondsBy ?? null,
        message: body.message ?? null,
      })
    );
  } catch (e) {
    if (e instanceof WorkRequestError) {
      const status = e.code === "NOT_A_BUYER" ? 403 : e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    if (e instanceof Error && e.name === "SourcingError")
      return NextResponse.json({ error: e.message, code: "INVALID" }, { status: 400 });
    console.error("[work-request] invite failed:", e);
    return NextResponse.json({ error: "Could not send those invitations" }, { status: 500 });
  }
}
