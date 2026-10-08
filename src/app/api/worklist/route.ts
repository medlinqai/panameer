import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { OnboardingError } from "@/lib/onboarding";
import { WorklistActionError, decideFromRow, dismissFromRow } from "@/lib/worklist-actions";

// Row actions for the Worklist and the Notifications list (one route, so the two never disagree).
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("decide"), id: z.string().uuid(), decision: z.enum(["APPROVED", "REJECTED"]) }),
  z.object({ action: z.literal("dismiss"), id: z.string().uuid() }),
]);

export async function POST(req: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "That didn't look right." }, { status: 400 });
  const b = parsed.data;
  try {
    if (b.action === "decide") await decideFromRow(gate, b.id, b.decision);
    else await dismissFromRow(gate, b.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof WorklistActionError || e instanceof OnboardingError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
