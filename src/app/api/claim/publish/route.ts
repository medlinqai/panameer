import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { publishClaim } from "@/lib/external-claim";

export const runtime = "nodejs";

// EX-E005 step 3: publish free — the signed-in buyer whose work email was confirmed.
export async function POST(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const b = (await request.json().catch(() => ({}))) as { token?: string; title?: string; description?: string; location?: string; workType?: string };
  if (!b.token || !b.title?.trim()) return NextResponse.json({ error: "The job needs a title." }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, jobId: await publishClaim(gate, b.token, { title: b.title, description: b.description ?? "", location: b.location, workType: b.workType }) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
