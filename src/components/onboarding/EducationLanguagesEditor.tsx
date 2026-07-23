"use client";

import { Field, TextInput } from "@/components/onboarding/controls";

export type EducationDraft = {
  institution: string;
  degree: string | null;
  field: string | null;
  year: number | null;
};
export type LanguageDraft = { name: string; proficiency: string | null };

/** Optional education + languages, each an add/remove list. */
export function EducationLanguagesEditor({
  education,
  languages,
  onEducation,
  onLanguages,
}: {
  education: EducationDraft[];
  languages: LanguageDraft[];
  onEducation: (next: EducationDraft[]) => void;
  onLanguages: (next: LanguageDraft[]) => void;
}) {
  const updEdu = (i: number, patch: Partial<EducationDraft>) =>
    onEducation(education.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const updLang = (i: number, patch: Partial<LanguageDraft>) =>
    onLanguages(languages.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-3 font-bold">Education</h3>
        <div className="space-y-3">
          {education.map((e, i) => (
            <div key={i} className="rounded-brand border border-line p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Institution">
                  <TextInput
                    value={e.institution}
                    onChange={(ev) => updEdu(i, { institution: ev.target.value })}
                  />
                </Field>
                <Field label="Degree">
                  <TextInput
                    value={e.degree ?? ""}
                    onChange={(ev) => updEdu(i, { degree: ev.target.value })}
                  />
                </Field>
                <Field label="Field of study">
                  <TextInput
                    value={e.field ?? ""}
                    onChange={(ev) => updEdu(i, { field: ev.target.value })}
                  />
                </Field>
                <Field label="Year">
                  <TextInput
                    type="number"
                    value={e.year ?? ""}
                    onChange={(ev) =>
                      updEdu(i, {
                        year: ev.target.value ? Number(ev.target.value) : null,
                      })
                    }
                  />
                </Field>
              </div>
              <button
                type="button"
                onClick={() => onEducation(education.filter((_, idx) => idx !== i))}
                className="mt-3 text-[13px] font-bold text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            onEducation([
              ...education,
              { institution: "", degree: "", field: "", year: null },
            ])
          }
          className="mt-3 text-[14px] font-bold text-magenta hover:text-magenta-dark"
        >
          + Add education
        </button>
      </section>

      <section>
        <h3 className="mb-3 font-bold">Languages</h3>
        <div className="space-y-3">
          {languages.map((l, i) => (
            <div key={i} className="flex items-end gap-3">
              <div className="flex-1">
                <Field label="Language">
                  <TextInput
                    value={l.name}
                    onChange={(ev) => updLang(i, { name: ev.target.value })}
                  />
                </Field>
              </div>
              <div className="flex-1">
                <Field label="Proficiency">
                  <TextInput
                    value={l.proficiency ?? ""}
                    onChange={(ev) => updLang(i, { proficiency: ev.target.value })}
                    placeholder="e.g. Native, Fluent"
                  />
                </Field>
              </div>
              <button
                type="button"
                onClick={() => onLanguages(languages.filter((_, idx) => idx !== i))}
                className="pb-3 text-[13px] font-bold text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            onLanguages([...languages, { name: "", proficiency: "" }])
          }
          className="mt-3 text-[14px] font-bold text-magenta hover:text-magenta-dark"
        >
          + Add language
        </button>
      </section>
    </div>
  );
}
