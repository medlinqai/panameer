import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import {
  getCompanyBinding,
  searchCompanies,
  updateCompanyDetails,
} from "@/lib/company";
import { OnboardingError } from "@/lib/onboarding";
import { TAX_TYPE_VALUES } from "@/lib/tax-types";

export async function GET(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;

  const q = new URL(request.url).searchParams.get("q");
  if (q !== null) {
    return NextResponse.json({ companies: await searchCompanies(q) });
  }
  return NextResponse.json({ binding: await getCompanyBinding(gate) });
}

const patchSchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    legalName: z.string().trim().max(200).optional(),
    taxType: z.enum(TAX_TYPE_VALUES as [string, ...string[]]).nullable().optional(),
    country: z.string().trim().max(80).nullable().optional(),
    stateOfFiling: z.string().trim().max(80).nullable().optional(),
    ein: z.string().trim().max(40).nullable().optional(),
  })
  .strict();

export async function PATCH(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Check those details" }, { status: 400 });
  }

  try {
    const result = await updateCompanyDetails(gate, parsed.data);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof OnboardingError) {
      return NextResponse.json(
        { error: e.message },
        { status: e.code === "GATE_UNMET" ? 403 : 400 }
      );
    }
    throw e;
  }
}
