"use client";

import { Field, TextInput } from "@/components/onboarding/controls";

export type CertificationDraft = {
  name: string;
  issuer: string | null;
  year: number | null;
};

/** Add / edit / remove certifications. */
export function CertificationsEditor({
  value,
  onChange,
}: {
  value: CertificationDraft[];
  onChange: (next: CertificationDraft[]) => void;
}) {
  const upd = (i: number, patch: Partial<CertificationDraft>) =>
    onChange(value.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  return (
    <div className="space-y-3">
      {value.map((c, i) => (
        <div key={i} className="rounded-brand border border-line p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Certification">
              <TextInput
                value={c.name}
                onChange={(e) => upd(i, { name: e.target.value })}
                placeholder="e.g. Oracle Cloud Procurement Certified"
              />
            </Field>
            <Field label="Issuer">
              <TextInput
                value={c.issuer ?? ""}
                onChange={(e) => upd(i, { issuer: e.target.value })}
                placeholder="e.g. Oracle"
              />
            </Field>
            <Field label="Year">
              <TextInput
                type="number"
                value={c.year ?? ""}
                onChange={(e) =>
                  upd(i, { year: e.target.value ? Number(e.target.value) : null })
                }
              />
            </Field>
          </div>
          <button
            type="button"
            onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            className="mt-3 text-[13px] font-bold text-red-600 hover:underline"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...value, { name: "", issuer: "", year: null }])}
        className="text-[14px] font-bold text-magenta hover:text-magenta-dark"
      >
        + Add certification
      </button>
    </div>
  );
}
