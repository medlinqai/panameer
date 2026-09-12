"use client";

import { useState } from "react";
import { Field, TextInput } from "@/components/onboarding/controls";
import { formatPhone, isoFor, phoneExpectation, validatePhone } from "@/lib/phone";
import { COUNTRIES } from "@/lib/countries";
import { getCountryCallingCode } from "libphonenumber-js";

/**
 * The phone input, masked and validated (E203).
 *
 * VALIDATES ON BLUR, NOT ON EVERY KEYSTROKE. "That's too short" is true of
 * every number for the first nine characters someone types, so showing it while
 * they type is scolding them for not having finished. The error appears when
 * they leave the field, and clears the moment they come back to fix it.
 *
 * The mask runs on CHANGE, though, because a format that only appears once the
 * number is complete makes the field look broken until the last keystroke.
 *
 * ── ⚠⚠ THE COUNTRY IS PART OF THE FIELD NOW (`P1-ALL-E417` WS-2a) ───────────
 *
 * **SCOTT, 2026-09-12, choosing this over a read-only label and over reordering
 * the steps:** *"Small country/dial-code select attached to the left of the
 * phone input… Pre-filled from the sign-up country; user can change it. The
 * phone value validates against the SELECTED country in that control, not the
 * sign-up country and not `draft.address.country`."*
 *
 * ⚠ THE DEFECT THIS CLOSES: on the requester journey the phone is step 1 and the
 * address is step 2, so this field used to validate against a country the screen
 * never showed and the person could not correct. A nine-digit Saudi mobile was
 * judged by the ten-digit US rule — because "United States" is the sign-up
 * form's default — and refused as *"too short"*, with nothing on screen saying
 * which country it had assumed. ⚠ THAT IS A HARD BLOCK: `Continue` reads
 * `isPhoneComplete`.
 *
 * ⚠ ONE COMPONENT, BOTH PATHWAYS, on Scott's instruction — the provider journey
 * gets the same control even though its address block sits on the same screen.
 * ⚠⚠ AND THE TWO COUNTRIES ARE INDEPENDENT: *"do not overwrite one from the
 * other."* The caller seeds this picker ONCE and never re-points it at the
 * address afterwards, because a consultant in Dubai with a British mobile is not
 * a data-entry error.
 *
 * ⚠ THE PICKER ALWAYS HOLDS A VALUE THE PERSON CAN SEE, which is what makes
 * "never validated against an unknown country" true rather than hopeful. When
 * the caller has nothing to seed it with it opens unset, and the field says so
 * instead of quietly falling through to a 7–15 digit band.
 */
export function PhoneField({
  value,
  onChange,
  country,
  onCountryChange,
  label = "Phone *",
  id = "phone",
}: {
  value: string;
  onChange: (next: string) => void;
  /**
   * ⚠ THE PHONE'S OWN COUNTRY — seeded by the caller from sign-up, then owned by
   * this control. NOT the address country (`E417`).
   */
  country: string | null | undefined;
  /** Omit to render the picker read-only — no caller does today. */
  onCountryChange?: (next: string) => void;
  label?: string;
  id?: string;
}) {
  const [touched, setTouched] = useState(false);
  const check = validatePhone(value, country);
  const showError = touched && !check.ok;
  const expectation = phoneExpectation(country);

  /*
    ⚠ DIAL CODES COME FROM THE LIBRARY, NOT A SECOND HAND-WRITTEN TABLE. The one
    hand-written map in the codebase is display-name → ISO (`lib/phone.ts`);
    every calling code is derived from that, so the two can never disagree.
    ⚠ `"Other"` HAS NO DIAL CODE and is deliberately absent from this picker —
    it is the escape hatch on the ADDRESS list, and a phone cannot be dialled in
    "Other". Somebody there keeps the generic digit band.
  */
  const options = COUNTRIES.filter((c) => c !== "Other").map((c) => {
    const iso = isoFor(c);
    let dial = "";
    try {
      dial = iso ? `+${getCountryCallingCode(iso)}` : "";
    } catch {
      dial = "";
    }
    return { name: c, dial };
  });

  return (
    <Field label={label}>
      <div className="flex gap-2">
        <select
          aria-label="Phone country"
          value={country ?? ""}
          onChange={(e) => {
            const next = e.target.value;
            onCountryChange?.(next);
            /*
              ⚠ RE-MASK THE NUMBER FOR THE NEW COUNTRY IMMEDIATELY. The digits
              are the person's; the grouping belongs to the country. Switching
              India → United States has to redraw 9876543210 as (987) 654-3210
              rather than leave the old country's shape on screen.
            */
            onChange(formatPhone(value, next));
          }}
          disabled={!onCountryChange}
          className="w-[128px] flex-none rounded-[12px] border border-line bg-white px-2 py-3 text-[14px] text-ink outline-none transition-colors focus:border-magenta disabled:bg-[#f7f6f9]"
        >
          <option value="">Country…</option>
          {options.map((o) => (
            <option key={o.name} value={o.name}>
              {o.dial ? `${o.dial} · ${o.name}` : o.name}
            </option>
          ))}
        </select>

        <TextInput
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={value}
          onChange={(e) => {
            // Re-masked on the way in, so the stored value and the displayed one
            // are the same string — nothing to reconcile on submit.
            onChange(formatPhone(e.target.value, country));
            if (touched) setTouched(false);
          }}
          onBlur={() => setTouched(true)}
          placeholder={expectation?.example ?? "Phone number"}
          aria-invalid={showError || undefined}
          aria-describedby={showError ? `${id}-error` : undefined}
        />
      </div>

      {showError ? (
        <span id={`${id}-error`} className="mt-1 block text-[13px] text-red-700">
          {check.reason}
        </span>
      ) : (
        /*
          ⚠ THE HINT SAYS WHAT IS TRUE FOR THE SELECTED COUNTRY, and says nothing
          when no country is selected. The old version promised a format for
          three countries and stayed silent for every other, on a screen whose
          country the person could not see.
        */
        <span className="mt-1 block text-[13px] text-ink-2">
          {!country
            ? "Pick your country so we check the number against the right rules."
            : expectation?.example
              ? `Digits only — we'll format it as ${expectation.example}.`
              : `Digits only — we'll check it as ${country}${expectation?.dialCode ? ` (+${expectation.dialCode})` : ""}.`}
        </span>
      )}
    </Field>
  );
}
