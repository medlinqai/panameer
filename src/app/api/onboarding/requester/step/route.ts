import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { OnboardingError } from "@/lib/onboarding";
import { saveRequesterStep, REQUESTER_STEPS } from "@/lib/requester-onboarding";

const address = z
  .object({
    line1: z.string().trim().max(200).nullish(),
    line2: z.string().trim().max(200).nullish(),
    city: z.string().trim().max(120).nullish(),
    state: z.string().trim().max(120).nullish(),
    postalCode: z.string().trim().max(40).nullish(),
    country: z.string().trim().max(80).nullish(),
  })
  .optional();

const schema = z.object({
  step: z.enum(REQUESTER_STEPS),
  payload: z.object({
    // The company binding is written by /api/company/* (define or join), not
    // here — this step only confirms it exists.
    companyBound: z.boolean().optional(),
    firstName: z.string().trim().max(80).optional(),
    lastName: z.string().trim().max(80).optional(),
    title: z.string().trim().max(120).nullish(),
    phone: z.string().trim().max(40).nullish(),
    employeeId: z.string().trim().max(80).nullish(),
    address,
    buyerName: z.string().trim().max(120).nullish(),
    buyerEmail: z.string().trim().max(200).nullish(),
    approverName: z.string().trim().max(120).nullish(),
    approverEmail: z.string().trim().max(200).nullish(),
    workLocation: address,
  }),
});

export async function POST(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const viewer = gate;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const state = await saveRequesterStep(
      viewer,
      parsed.data.step,
      parsed.data.payload
    );
    return NextResponse.json({ ok: true, state });
  } catch (e) {
    if (e instanceof OnboardingError) {
      const status = e.code === "NOT_A_REQUESTER" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[onboarding] requester step save failed:", e);
    return NextResponse.json({ error: "Could not save that step" }, { status: 500 });
  }
}
