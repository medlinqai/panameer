"use client";

import { LocationFields } from "@/components/onboarding/LocationFields";
import { PhoneField } from "@/components/onboarding/PhoneField";

/**
 * ── ⚠⚠ THE CONTACT EDITOR, EXTRACTED (`P2-A2-E597` WS-B, editor 2 of 5) ──
 *
 * ⚠ 67 lines, and BOTH the things it mounts were already shared components —
 * `PhoneField` and `LocationFields`. Nothing moved with it, which is why it is
 * second in WS-A's order.
 *
 * ⚠⚠ PRESENTATION ONLY. No state, no `postStep`, no navigation. The caller owns
 * the values and the save — `postStep("finish", { address, phone })` stays with
 * `contactEditing()` in the wizard, because two save paths for one field is how
 * the two titles happened (`E595`).
 *
 * ── ⚠ IT WRITES TWO TABLES, AND THE NET READS BOTH ───────────────────────
 *
 * ⚠⚠ `Person.phone` IS UPDATED DIRECTLY and the address goes to
 * `saveProviderAddress`, which writes an `Address` row under the person's SITE.
 * `check:wizard-contract` asserts both — an assertion on the phone alone would
 * pass while every address was silently dropped, which is why it was added
 * BEFORE this extraction rather than after.
 */

export type EditableAddress = {
  country: string;
  line1: string;
  city: string;
  state: string;
  postalCode: string;
};

export function ContactEditor({
  address,
  onAddressChange,
  phone,
  onPhoneChange,
  phoneCountry,
  onPhoneCountryChange,
}: {
  address: EditableAddress;
  /** ⚠ A PARTIAL. Only the keys the fields actually touched are sent on. */
  onAddressChange: (patch: Partial<EditableAddress>) => void;
  phone: string;
  onPhoneChange: (next: string) => void;
  /* ⚠ NULLABLE, AND DELIBERATELY SO. `PhoneField` treats `null` as "not chosen
     yet" and refuses to validate against a country it has not been told —
     `E126`'s rule, which is why this is not defaulted to a string here. */
  phoneCountry: string | null;
  onPhoneCountryChange: (next: string | null) => void;
}) {
  return (
    <div className="space-y-3">
      {/*
        DATE OF BIRTH IS GONE (WS7). It was required here and gated
        both publish and marketplace visibility, and nothing in the
        marketplace ever used it: a buyer needs to reach a provider,
        not know their age. If age or legal capacity is ever needed it
        rides the tax/payout gate, where there is a reason to ask.
        The column stays nullable — no destructive drop.
      */}
      {/*
        E203 — masked, digits-only, validated on blur. The country
        comes from the address block below, whose hint has always
        promised it "sets how we format your phone number"; this is
        the first version where that is true.
        ⚠⚠ THE MASK CAPS AT TEN DIGITS, measured at `E597` WS-B: a value typed
        with a `+1` loses its last digit. The id is the net's handle.
      */}
      <PhoneField
        id="review-phone"
        value={phone}
        onChange={onPhoneChange}
        country={phoneCountry}
        onCountryChange={onPhoneCountryChange}
      />
      {/*
        E126 — COUNTRY FIRST, above the street line. It decides what
        the fields under it even mean ("State" here, "Province" in
        Canada, "County" in Ireland), so asking it last meant asking
        the rest before knowing what they were. Same shared block as
        the employer modal (E123), which is what stops one provider
        meeting two different location forms in one sitting.
      */}
      <LocationFields
        withStreet
        countryHint="Also sets how we format your phone number."
        value={{
          country: address.country,
          line1: address.line1,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
        }}
        /*
          ⚠⚠ `undefined` MEANS "NOT TOUCHED" AND `null` MEANS "CLEARED", and the
          two must not collapse. This normalisation moved WITH the fields rather
          than staying in the wizard: it is part of how these inputs report a
          change, not part of what the caller does with it.
        */
        onChange={(patch) =>
          onAddressChange({
            ...(patch.country !== undefined ? { country: patch.country ?? "" } : {}),
            ...(patch.line1 !== undefined ? { line1: patch.line1 ?? "" } : {}),
            ...(patch.city !== undefined ? { city: patch.city ?? "" } : {}),
            ...(patch.state !== undefined ? { state: patch.state ?? "" } : {}),
            ...(patch.postalCode !== undefined
              ? { postalCode: patch.postalCode ?? "" }
              : {}),
          })
        }
      />
    </div>
  );
}
