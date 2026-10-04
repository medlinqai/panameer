import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { OnboardingError } from "@/lib/onboarding";
import { defineCompany, saveCompanyName } from "@/lib/company";
import { ein as einFormat, usZip } from "@/lib/field-formats";

const nameOnlySchema = z.object({
  nameOnly: z.literal(true),
  name: z.string().trim().min(2).max(200),
});

const defineSchema = z.object({
  name: z.string().trim().min(2).max(200),
  taxType: z
    .enum([
      "C_CORP",
      "S_CORP",
      "LLC",
      "PARTNERSHIP",
      "SOLE_PROP_INDIVIDUAL",
      "NONPROFIT",
    ])
    .nullish(),
  country: z.string().trim().max(80).nullish(),
  ein: z.string().trim().max(40).nullish(),
  stateOfFiling: z.string().trim().max(60).nullish(),
  registeredAddress: z
    .object({
      line1: z.string().trim().max(200).nullish(),
      city: z.string().trim().max(120).nullish(),
      state: z.string().trim().max(120).nullish(),
      postalCode: z.string().trim().max(40).nullish(),
      country: z.string().trim().max(80).nullish(),
    })
    .nullish()
    .superRefine((addr, ctx) => {
      if (!addr) return;
      const r = usZip(addr.postalCode, addr.country);
      if (!r.ok) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["postalCode"],
          message: r.message!,
        });
      }
    }),
  website: z.string().trim().max(300).nullish(),
  logoUrl: z.string().trim().max(600).nullish(),
  attestation: z.boolean(),
  companyTos: z.boolean(),
})
  .superRefine((val, ctx) => {
    const country = val.country ?? val.registeredAddress?.country ?? null;
    const r = einFormat(val.ein, country);
    if (!r.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ein"],
        message: r.message!,
      });
    }
  });

export async function POST(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;

  const body = await request.json().catch(() => null);

  const nameOnly = nameOnlySchema.safeParse(body);
  if (nameOnly.success) {
    try {
      return NextResponse.json({
        ok: true,
        ...(await saveCompanyName(gate, nameOnly.data.name)),
      });
    } catch (e) {
      if (e instanceof OnboardingError) {
        return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
      }
      console.error("[company] name-only save failed:", e);
      return NextResponse.json({ error: "Could not save that name" }, { status: 500 });
    }
  }

  const parsed = defineSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      {
        error: issue?.message ?? "Invalid input",
        field: issue?.path?.join(".") || undefined,
      },
      { status: 400 }
    );
  }
  try {
    return NextResponse.json({ ok: true, ...(await defineCompany(gate, parsed.data)) });
  } catch (e) {
    if (e instanceof OnboardingError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    }
    console.error("[company] define failed:", e);
    return NextResponse.json({ error: "Could not create that company" }, { status: 500 });
  }
}
