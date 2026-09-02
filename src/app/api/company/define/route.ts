import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { OnboardingError } from "@/lib/onboarding";
import { defineCompany } from "@/lib/company";
import { ein as einFormat, usZip } from "@/lib/field-formats";

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
  /*
    `E273` — EIN. Writes to the pre-existing `Company.tin` column.

    ⚠⚠ THE FORMAT IS NOW CHECKED (`P1-J1.4-E299`). ⚠ SUPERSEDED, quoted: this was
    `z.string().trim().max(40).nullish()` — FORTY CHARACTERS OF ANYTHING, which is
    the same defect the ZIP half fixed for postcodes. A LENGTH CAP IS NOT A FORMAT.
    ⚠ THE RULE LIVES IN `lib/field-formats.ts`, not here — see the ZIP note below
    for why there is exactly one copy.
    ⚠ STILL OPTIONAL, AND THAT DOES NOT CHANGE. A blank EIN is valid; a malformed
    one is not. Scott: *"US only, never blocks."*
    ⚠ THE COUNTRY IS RESOLVED IN `superRefine` BELOW, not here — a per-field
    refinement cannot see its siblings, and EIN is a US-only rule.
  */
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
      /*
        ⚠⚠ MOVED, NOT COPIED (`P1-J1.4-E299`). The regex and the message used to
        be written out here, and the same sentence was ALSO a bare literal in
        `CompanyStep.tsx:523`. Both now come from `lib/field-formats.ts`, so the
        rule and the words have one home each. `check:field-quality` fails the
        build if a second copy of either reappears.
        ⚠ `isUnitedStates` REPLACED `country?.trim() !== "United States"`, which
        was an exact string compare — `"USA"` slipped past it and got no check
        at all.
      */
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
  /*
    ── ⚠⚠ EIN IS VALIDATED AT THE OBJECT LEVEL, BECAUSE OF THE COUNTRY ─────────

    ⚠ HOW COUNTRY IS RESOLVED, and it takes two fields: the top-level `country`
    is the JURISDICTION (`E260`, *"derived from the registered address's
    country"*), and it is `nullish` — `E274` lets a company be part-answered, so
    it is genuinely absent on some payloads. The registered address carries its
    own country too. **THE EFFECTIVE COUNTRY IS `country ?? registeredAddress
    .country`**, jurisdiction first because that is the field that means
    "which country's rules apply".
    ⚠ AND WHEN BOTH ARE ABSENT, EIN IS NOT CHECKED — the rule is US-only and an
    unknown country is not the US. Reported rather than defaulted: assuming US
    would tell a company with no country yet that its perfectly good foreign tax
    id is malformed.
    ⚠ A PER-FIELD `.refine` COULD NOT DO THIS. Zod field refinements cannot see
    sibling fields, which is why this sits on the object.
  */
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
    /*
      ── ⚠⚠ THE MESSAGE REACHES THE CLIENT (`P1-J1.4-E299`) ────────────────────

      ⚠ SUPERSEDED, quoted: this was `{ error: "Invalid input" }`, which THREW
      AWAY every message the schema had just produced.
      ⚠⚠ THAT MEANT THE ZIP HALF SHIPPED HALF-BROKEN AND NOBODY SAW IT. `E299`
      wrote *"Enter a US ZIP code — 5 digits, or ZIP+4 as 12345-6789."* into the
      route's `superRefine` on 2026-09-02, and a caller posting `295265326` got
      back the words *"Invalid input"*. The component only looked right because
      it had its OWN copy of the sentence — the second copy this brief deleted.
      Found by POSTing to the route directly rather than by reading the code.
      ⚠ `path` TRAVELS TOO, so a client can attach the message to the field it
      belongs to instead of guessing.
    */
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
