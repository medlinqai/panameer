import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { createTicket, SupportError } from "@/lib/support";

// L-E051: "Want to Teach on Panameer?" — a message to Panameer's admins (a support ticket), not path creation.
export async function POST(req: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const b = z.object({ message: z.string().min(3).max(4000), topic: z.enum(["Wants to teach on Panameer", "New learning path proposal"]).optional() }).safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Tell us a little about what you'd teach." }, { status: 400 });
  try {
    const t = await createTicket(gate, { application: "Learn", title: b.data.topic ?? "Wants to teach on Panameer", description: b.data.message, priority: "Low" });
    return NextResponse.json({ ok: true, code: t.ticket_code });
  } catch (e) {
    if (e instanceof SupportError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
