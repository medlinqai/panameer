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

/**
 * POST /api/onboarding/requester/step — save one wizard step.
 *
 * OWNER-SCOPED: the requester is resolved from the session and the body carries
 * no person or profile id, so there is no request that writes to someone else's
 * record. The step name decides which fields are read, so a payload with extra
 * keys can't reach past the step it belongs to.
 */
/*
 * ACCESS GOES THROUGH `guardApi` (→ src/lib/access.ts), not a hand-rolled
 * session check — the brief's rule, and the reason is this file would
 * otherwise be a fourth place that decides what "signed in" means.
 *
 * The requirement is `authenticated`, not canHireTalent: a requester mid-
 * onboarding already carries is_service_buyer, but the real boundary here is
 * OWNERSHIP, and that is enforced below by resolving the requester from the
 * session. A capability check would be a weaker statement of the same thing.
 */
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
