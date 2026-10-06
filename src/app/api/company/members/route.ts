import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { changeMember } from "@/lib/company";
import { OnboardingError } from "@/lib/onboarding";

const Body = z.object({ membershipId: z.string().uuid(), action: z.enum(["make_admin", "remove"]) });

export async function POST(request: Request) {
  const viewer = await guardApi("authenticated");
  if (viewer instanceof NextResponse) return viewer;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "That change didn't look right." }, { status: 400 });
  try {
    return NextResponse.json(await changeMember(viewer, parsed.data.membershipId, parsed.data.action));
  } catch (e) {
    if (e instanceof OnboardingError) return NextResponse.json({ error: e.message }, { status: e.code === "GATE_UNMET" ? 403 : 400 });
    throw e;
  }
}
