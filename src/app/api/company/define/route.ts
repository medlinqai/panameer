import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { OnboardingError } from "@/lib/onboarding";
import { defineCompany } from "@/lib/company";

const schema = z.object({
  name: z.string().trim().min(2).max(200),
  taxType: z.enum([
    "C_CORP",
    "S_CORP",
    "LLC",
    "PARTNERSHIP",
    "SOLE_PROP_INDIVIDUAL",
    "NONPROFIT",
  ]),
  /* `E260`/`E260a` — jurisdiction, derived from the registered address's country. */
  country: z.string().trim().max(80).nullish(),
  /* `E273` — EIN. Writes to the pre-existing `Company.tin` column. */
  ein: z.string().trim().max(40).nullish(),
  /*
    `E280` — the REGISTERED address, stored as a Site + Address on the backbone.
    ⚠ Every part is nullish: `E274` makes the company itself optional at
    onboarding, so a partially-answered company must still be savable. The
    contracting requirement is enforced before HIRE, not here.
  */
  registeredAddress: z
    /*
      ── ⚠⚠ US ZIP IS VALIDATED ON THE SERVER TOO (`P1-J1.4-E299`) ─────────────

      `postalCode` was `z.string().trim().max(40).nullish()` — forty characters of
      anything. A LENGTH CAP IS NOT A FORMAT, and `295265326` sailed through.

      ⚠ THE CHECK IS CONDITIONAL ON `country === "United States"`, and only that.
      Imposing the 5-or-9-digit shape on the other 17 countries in `COUNTRIES`
      would reject perfectly good Canadian (`K1A 0B1`) and UK (`SW1A 1AA`)
      postcodes. NON-US KEEPS THE LENGTH CAP AND NOTHING ELSE — reported, not
      silently widened.

      ⚠ VALIDATED ON BOTH SIDES BY DESIGN. `CompanyStep` shows the message on
      blur, but a client-only check is a suggestion: this route is reachable
      without the form.
    */
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
      const zip = addr.postalCode?.trim();
      if (!zip) return; // absent is fine — `E274` allows a part-answered company
      if (addr.country?.trim() !== "United States") return;
      if (!/^\d{5}(-\d{4})?$/.test(zip)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["postalCode"],
          message: "Enter a US ZIP code — 5 digits, or ZIP+4 as 12345-6789.",
        });
      }
    }),
  website: z.string().trim().max(300).nullish(),
  logoUrl: z.string().trim().max(600).nullish(),
  attestation: z.boolean(),
  companyTos: z.boolean(),
});

/**
 * POST /api/company/define — create the company and become its admin.
 *
 * `authenticated`, then owner-scoped: the acting person comes from the session.
 * The attestation and the company-ToS acceptance are required by the lib rather
 * than only by the form — a checkbox is not a control.
 */
export async function POST(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
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
