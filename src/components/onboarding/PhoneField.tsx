"use client";

import { useState } from "react";
import { Field, TextInput } from "@/components/onboarding/controls";
import { formatPhone, isoFor, phoneExpectation, validatePhone } from "@/lib/phone";
import { ALL_COUNTRIES } from "@/lib/country";
import { getCountryCallingCode } from "libphonenumber-js";

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

  const options = ALL_COUNTRIES.map((c) => c.code).map((c) => {
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
          /*
            ⚠ WIDE ENOUGH FOR THE NAME, MEASURED IN THE WALK. At 128px the
            closed select truncated to "+966 · Saudi A…", which is exactly the
            country a Saudi user needs to be able to read back. ⚠ MEASURED IN THE
            APP, not guessed from a font metric — chat cannot measure text width
            (`CLAUDE.md` rule 4).
          */
          className="w-[172px] flex-none rounded-[12px] border border-line bg-white px-2 py-3 text-[14px] text-ink outline-none transition-colors focus:border-magenta disabled:bg-[#f7f6f9]"
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
