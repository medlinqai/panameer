"use client";

import { LocationFields } from "@/components/onboarding/LocationFields";
import { PhoneField } from "@/components/onboarding/PhoneField";
import { useEffect } from "react";
import { ALL_COUNTRIES, codeForName } from "@/lib/country";

// Stored country can be a name ("United States") from the résumé parse;
// the pickers key on the ISO code ("US").
function toCountryCode(v: string | null | undefined): string {
  const t = (v ?? "").trim();
  if (!t) return "";
  if (ALL_COUNTRIES.some((c) => c.code === t.toUpperCase())) return t.toUpperCase();
  if (/^usa?$|^united states of america$/i.test(t)) return "US";
  return codeForName(t) ?? t;
}

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
  onAddressChange: (patch: Partial<EditableAddress>) => void;
  phone: string;
  onPhoneChange: (next: string) => void;
  phoneCountry: string | null;
  onPhoneCountryChange: (next: string | null) => void;
}) {
  const countryCode = toCountryCode(address.country);

  // Normalize a name to its code, and default the phone country to it.
  useEffect(() => {
    if (countryCode && countryCode !== address.country) {
      onAddressChange({ country: countryCode });
    }
    if (countryCode && !phoneCountry) onPhoneCountryChange(countryCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryCode]);

  return (
    <div className="space-y-3">
      {}
      {}
      {}
      <LocationFields
        part="country"
        countryHint="Also sets how we format your phone number."
        value={{
          country: countryCode,
          line1: address.line1,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
        }}
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
      <PhoneField
        id="review-phone"
        value={phone}
        onChange={onPhoneChange}
        country={phoneCountry}
        onCountryChange={onPhoneCountryChange}
      />
      <LocationFields
        part="rest"
        withStreet
        countryHint="Also sets how we format your phone number."
        value={{
          country: countryCode,
          line1: address.line1,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
        }}
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
