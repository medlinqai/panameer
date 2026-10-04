"use client";

import { Field, TextInput } from "@/components/onboarding/controls";
import { WORLD_LANGUAGES, LANGUAGE_NAMES, PROFICIENCY_OPTIONS } from "@/lib/languages";

export type EducationDraft = {
  institution: string;
  degree: string | null;
  field: string | null;
  year: number | null;
  startYear?: number | null;
  endYear?: number | null;
  description?: string | null;
};
export type LanguageDraft = {
  name: string;
  proficiency: string | null;
  level?: string | null;
};

/** Optional education + languages, each an add/remove list. */
export function EducationLanguagesEditor({
  education,
  languages,
  onEducation,
  onLanguages,
  showEducation = true,
}: {
  education: EducationDraft[];
  languages: LanguageDraft[];
  onEducation: (next: EducationDraft[]) => void;
  onLanguages: (next: LanguageDraft[]) => void;
  showEducation?: boolean;
}) {
  const updEdu = (i: number, patch: Partial<EducationDraft>) =>
    onEducation(education.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const updLang = (i: number, patch: Partial<LanguageDraft>) =>
    onLanguages(languages.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  return (
    <div className="space-y-8">
      {showEducation && (
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
                  <Field label="Field of Study">
                    <TextInput
                      value={e.field ?? ""}
                      onChange={(ev) => updEdu(i, { field: ev.target.value })}
                    />
                  </Field>
                  <Field label="From *" hint="Year you started.">
                    <TextInput
                      type="number"
                      inputMode="numeric"
                      placeholder="2000"
                      value={e.startYear ?? e.year ?? ""}
                      onChange={(ev) =>
                        updEdu(i, {
                          startYear: ev.target.value ? Number(ev.target.value) : null,
                        })
                      }
                    />
                  </Field>
                  <Field label="To" hint="Leave blank if you're still studying.">
                    <TextInput
                      type="number"
                      inputMode="numeric"
                      placeholder="2004"
                      value={e.endYear ?? ""}
                      onChange={(ev) =>
                        updEdu(i, {
                          endYear: ev.target.value ? Number(ev.target.value) : null,
                        })
                      }
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Description">
                      <TextInput
                        value={e.description ?? ""}
                        onChange={(ev) => updEdu(i, { description: ev.target.value })}
                      />
                    </Field>
                  </div>
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
            + Add Education
          </button>
        </section>
      )}

      <section>
        <h3 className="mb-3 font-bold">Languages</h3>
        <div className="space-y-3">
          {}
          {languages.map((l, i) => (
            <div key={i} className="flex items-end gap-3">
              <div className="flex-1">
                <Field label="Language">
                  <select
                    value={l.name}
                    onChange={(ev) => updLang(i, { name: ev.target.value })}
                    className="w-full rounded-[10px] border border-line bg-white px-3 py-2.5 text-[14.5px] outline-none focus:border-magenta"
                  >
                    {}
                    <option value="">Choose a language…</option>
                    {}
                    {l.name && !LANGUAGE_NAMES.has(l.name) && (
                      <option value={l.name}>{l.name} (not a standard name)</option>
                    )}
                    {WORLD_LANGUAGES.map((w) => (
                      <option key={w.code} value={w.name}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="flex-1">
                <Field label="Proficiency">
                  <select
                    value={l.level ?? ""}
                    onChange={(ev) => updLang(i, { level: ev.target.value })}
                    className="w-full rounded-[10px] border border-line bg-white px-3 py-2.5 text-[14.5px] outline-none focus:border-magenta"
                  >
                    <option value="">Choose…</option>
                    {}
                    {PROFICIENCY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              {}
              <div className="pb-3">
                <button
                  type="button"
                  disabled={languages.length <= 1}
                  onClick={() => onLanguages(languages.filter((_, idx) => idx !== i))}
                  className={
                    languages.length <= 1
                      ? "cursor-not-allowed text-[13px] font-bold text-ink-3"
                      : "text-[13px] font-bold text-red-600 hover:underline"
                  }
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          {languages.length <= 1 && (
            <p className="text-[12.5px] leading-relaxed text-ink-2">
              You need at least one language.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() =>
            onLanguages([...languages, { name: "", proficiency: null, level: "" }])
          }
          className="mt-3 text-[14px] font-bold text-magenta hover:text-magenta-dark"
        >
          + Add Language
        </button>
      </section>
    </div>
  );
}
