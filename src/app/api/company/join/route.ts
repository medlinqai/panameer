import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { OnboardingError } from "@/lib/onboarding";
import { cancelJoinRequest, joinCompany } from "@/lib/company";

const schema = z.object({
  companyId: z.string().uuid(),
  attestation: z.boolean(),
  matchedOn: z.string().trim().max(120).nullable().optional(),
});

export async function POST(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await joinCompany(gate, parsed.data)) });
  } catch (e) {
    if (e instanceof OnboardingError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    }
    console.error("[company] join failed:", e);
    return NextResponse.json({ error: "Could not join that company" }, { status: 500 });
  }
}

/** Cancel your own pending request (Overview's "Request pending · Cancel request"). */
export async function DELETE(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const id = new URL(request.url).searchParams.get("companyId");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    return NextResponse.json(await cancelJoinRequest(gate, id));
  } catch (e) {
    if (e instanceof OnboardingError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
