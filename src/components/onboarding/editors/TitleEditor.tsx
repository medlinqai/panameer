"use client";

import { Field, TextInput } from "@/components/onboarding/controls";

export const HEADLINE_MAX = 42;

export function titleCanSave(headline: string): boolean {
  return headline.trim() !== "";
}

export function TitleEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <>
      {}
      <Field
        label="Your Title"
        hint="This is the title buyers see on your profile — one line, so keep it tight."
      >
        <TextInput
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, HEADLINE_MAX))}
          placeholder="e.g. Oracle Cloud P2P / Procurement Expert"
          maxLength={HEADLINE_MAX}
        />
      </Field>
      <p
        className={
          "mt-1.5 text-right text-[13px] font-semibold tabular-nums " +
          (value.length > HEADLINE_MAX - 6 ? "text-magenta" : "text-ink-2")
        }
      >
        {value.length} / {HEADLINE_MAX}
      </p>
    </>
  );
}
