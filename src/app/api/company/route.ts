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

/**
 * GET /api/company — the viewer's own company binding, or `?q=` to search
 * joinable companies (defined ones only; names, domain and headcount).
 *
 * Signed-in only. Recognising your employer is the point of the join step, and
 * a company name is not a secret — but an open endpoint would hand the whole
 * customer list to anyone who asked.
 */
export async function GET(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;

  const q = new URL(request.url).searchParams.get("q");
  if (q !== null) {
    return NextResponse.json({ companies: await searchCompanies(q) });
  }
  return NextResponse.json({ binding: await getCompanyBinding(gate) });
}

/**
 * ── ⚠⚠ PATCH /api/company — EDIT YOUR OWN COMPANY (`P2-A2-E661`) ──────────
 *
 * ⚠ **SCOTT, walking `/company`: *"I cannot edit any of the data."*** This is
 * the write half. ⚠⚠ **IT IS A PATCH ON THE EXISTING ROUTE RATHER THAN A NEW
 * ONE** — the resource is the same and a second file would be a second place to
 * keep the gate in step (`E585`).
 *
 * ⚠⚠⚠ **NO `companyId` IN THE BODY, AND THAT IS THE POINT** (load-bearing rule
 * 5): `updateCompanyDetails` resolves the company from the SESSION via
 * `getCompanyBinding` and refuses anyone who is not an APPROVED ADMIN of it. An
 * id here would be a forgeable pointer on a surface that can rename a company.
 *
 * ⚠⚠ **`.strict()` SO AN UNKNOWN KEY IS REFUSED, NOT IGNORED.** `email_domain`
 * is deliberately NOT editable — it auto-approves joiners by domain, so a
 * silently-ignored extra field would be the quietest possible way for that to
 * change later. **A refusal is visible; an ignored key is not.**
 * ⚠ `.optional()` on every field means *"not submitted"*; an empty string means
 * *"clear it"*. The writer keeps those apart — see its comment (`67d`: never
 * manufacture a value from absence).
 */
const patchSchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    legalName: z.string().trim().max(200).optional(),
    /* ⚠⚠⚠ THE ENUM, NOT A STRING. `tax_type` is a Prisma enum, so an
       arbitrary value is rejected AT THE DATABASE and the member gets a 500
       instead of a refusal. Validating here turns that into a clean 400.
       ⚠ Derived from `TAX_LABELS`, never retyped (`E585`). */
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
    /* ⚠ THE REFUSAL IS THE WRITER'S, NOT THIS ROUTE'S — one gate, stated once.
       ⚠⚠ `GATE_UNMET` is the admin refusal and earns 403; everything else the
       writer names is a bad input and earns 400. A thrown anything-else is a
       500 and is NOT dressed up as a validation failure. */
    if (e instanceof OnboardingError) {
      return NextResponse.json(
        { error: e.message },
        { status: e.code === "GATE_UNMET" ? 403 : 400 }
      );
    }
    throw e;
  }
}
