import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { sendDigest } from "@/lib/build-digest";
import { writeAudit } from "@/lib/admin/audit";

export async function POST(request: Request) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;

  const body = (await request.json().catch(() => ({}))) as { week?: string; confirmed?: boolean };
  if (!body.week) return NextResponse.json({ error: "Which week?" }, { status: 400 });
  if (body.confirmed !== true) {
    return NextResponse.json({ error: "This sends real email. Confirm first." }, { status: 400 });
  }

  try {
    const { sent } = await sendDigest(body.week);
    await writeAudit(gate, {
      action: "digest.sent",
      targetTable: "build_digests",
      targetId: null,
      rowCount: sent,
      detail: { week: body.week },
    });
    return NextResponse.json({ ok: true, sent });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
