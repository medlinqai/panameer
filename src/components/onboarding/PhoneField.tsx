"use client";

import { useState } from "react";
import { Field, TextInput } from "@/components/onboarding/controls";
import { formatPhone, ruleFor, validatePhone } from "@/lib/phone";

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
 */
export function PhoneField({
  value,
  onChange,
  country,
  label = "Phone *",
  id = "phone",
}: {
  value: string;
  onChange: (next: string) => void;
  /** From the address block directly above — it decides the mask. */
  country: string | null | undefined;
  label?: string;
  id?: string;
}) {
  const [touched, setTouched] = useState(false);
  const check = validatePhone(value, country);
  const showError = touched && !check.ok;
  const rule = ruleFor(country);

  return (
    <Field label={label}>
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
        placeholder={rule?.example ?? "Phone number"}
        aria-invalid={showError || undefined}
        aria-describedby={showError ? `${id}-error` : undefined}
      />
      {showError ? (
        <span id={`${id}-error`} className="mt-1 block text-[13px] text-red-700">
          {check.reason}
        </span>
      ) : (
        rule && (
          <span className="mt-1 block text-[13px] text-ink-2">
            Digits only — we&apos;ll format it as {rule.example}.
          </span>
        )
      )}
    </Field>
  );
}
