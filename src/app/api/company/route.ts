import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import {
  getCompanyBinding,
  searchCompanies,
  updateCompanyDetails,
  CompanyMatchError,
} from "@/lib/company";
import { OnboardingError } from "@/lib/onboarding";
import { CompanyFieldError } from "@/lib/company-fields";
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
    description: z.string().trim().max(600).nullable().optional(),
    industryId: z.string().uuid().nullable().optional(),
    website: z.string().trim().max(200).nullable().optional(),
    onMatch: z.enum(["join", "distinct"]).optional(),
  })
  .strict();

export async function PATCH(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    // Name the field that failed, so the form can put the message under it.
    const field = String(parsed.error.issues[0]?.path?.[0] ?? "");
    const MSG: Record<string, string> = {
      name: "Enter the company name (at least 2 characters).",
      website: "Enter a website like strateerp.com",
      description: "Keep the description to 600 characters.",
      industryId: "Pick an industry from the list.",
      taxType: "Pick a business type from the list.",
    };
    return NextResponse.json({ error: MSG[field] ?? `Check ${field || "those details"}.`, field: field || undefined }, { status: 400 });
  }

  try {
    const result = await updateCompanyDetails(gate, parsed.data);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof CompanyMatchError) {
      // A tax-ID match never names the other company.
      const m = e.match;
      return NextResponse.json({ match: { kind: m.kind, name: m.kind === "tin" ? null : m.companyName } }, { status: 409 });
    }
    if (e instanceof CompanyFieldError) return NextResponse.json({ error: e.message, field: e.field }, { status: 400 });
    if (e instanceof OnboardingError) {
      return NextResponse.json({ error: e.message }, { status: e.code === "GATE_UNMET" ? 403 : 400 });
    }
    // Say what failed instead of a bare 500; the form stays open with the member's entries.
    console.error("[company] save failed:", e);
    const detail = e instanceof Error ? e.message.split("\n").filter(Boolean).pop()?.slice(0, 160) : null;
    return NextResponse.json(
      { error: `The server couldn't save your changes${detail ? ` (${detail})` : ""}. Your entries are still here — try again.` },
      { status: 500 }
    );
  }
}
