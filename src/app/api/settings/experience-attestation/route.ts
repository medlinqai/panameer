import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { saveAttestations } from "@/lib/experience-attestation";
import { OnboardingError } from "@/lib/onboarding";

export async function POST(request: Request) {
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;
  try {
    const body = (await request.json().catch(() => ({}))) as { claims?: unknown };
    return NextResponse.json({ attestations: await saveAttestations(gate, body.claims) });
  } catch (e) {
    if (e instanceof OnboardingError) {
      const status = e.code === "NOT_A_PROVIDER" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[settings] experience-attestation failed:", e);
    return NextResponse.json(
      { error: "Could not save your experience" },
      { status: 500 }
    );
  }
}
