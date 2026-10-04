"use client";

import { LocationFields } from "@/components/onboarding/LocationFields";
import { PhoneField } from "@/components/onboarding/PhoneField";

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
  return (
    <div className="space-y-3">
      {}
      {}
      <PhoneField
        id="review-phone"
        value={phone}
        onChange={onPhoneChange}
        country={phoneCountry}
        onCountryChange={onPhoneCountryChange}
      />
      {}
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
