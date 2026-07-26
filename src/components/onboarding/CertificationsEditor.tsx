"use client";

import { Field, TextInput } from "@/components/onboarding/controls";

export type CertificationDraft = {
  name: string;
  issuer: string | null;
  year: number | null;
  /** Credential fields (brief_T / E040) — all optional. */
  credentialId?: string | null;
  url?: string | null;
  expiresOn?: string | null;
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

          {/* Credential fields (brief_T / E040) — optional; a verify link is
              what turns a claimed certification into a checkable one. */}
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Field label="Credential ID">
              <TextInput
                value={c.credentialId ?? ""}
                onChange={(e) => upd(i, { credentialId: e.target.value })}
                placeholder="Optional"
              />
            </Field>
            <Field label="Verify URL">
              <TextInput
                type="url"
                value={c.url ?? ""}
                onChange={(e) => upd(i, { url: e.target.value })}
                placeholder="https://…"
              />
            </Field>
            <Field label="Expires">
              <TextInput
                type="date"
                value={c.expiresOn ?? ""}
                onChange={(e) => upd(i, { expiresOn: e.target.value || null })}
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
        onClick={() =>
          onChange([
            ...value,
            {
              name: "",
              issuer: "",
              year: null,
              credentialId: null,
              url: null,
              expiresOn: null,
            },
          ])
        }
        className="text-[14px] font-bold text-magenta hover:text-magenta-dark"
      >
        + Add Certification
      </button>
    </div>
  );
}
