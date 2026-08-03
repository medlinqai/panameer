import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { OnboardingError } from "@/lib/onboarding";
import { acceptCompanyTos } from "@/lib/company";

const schema = z.object({ companyId: z.string().uuid() });

/** POST /api/company/tos — accept or re-accept the Company ToS. Admins only. */
export async function POST(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  try {
    return NextResponse.json(await acceptCompanyTos(gate, parsed.data.companyId));
  } catch (e) {
    if (e instanceof OnboardingError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 403 });
    }
    console.error("[company] tos acceptance failed:", e);
    return NextResponse.json({ error: "Could not record that" }, { status: 500 });
  }
}
