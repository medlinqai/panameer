import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { withdrawRequest } from "@/lib/connections";

/** Withdraw a pending colleague request. Owner-scoped: the sender is the session. */
export async function POST(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const body = (await request.json().catch(() => ({}))) as { connectionId?: string };
  if (!body.connectionId) return NextResponse.json({ error: "Which request?" }, { status: 400 });
  const ok = await withdrawRequest(gate, body.connectionId);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
