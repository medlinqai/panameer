"use client";

import { Field, TextInput } from "@/components/onboarding/controls";
/* ⚠ THE ONE DEFINITION both this step and `/profile/edit/languages` read (`E723`, `E585`). */
import { WORLD_LANGUAGES, LANGUAGE_NAMES, PROFICIENCY_OPTIONS } from "@/lib/languages";

/*
  E164 — THIS EDITOR COULD NOT EXPRESS HALF THE RECORD.

  The wizard collects Dates Attended (from/to) and a description; this settings
  editor offered a single legacy "Year" and nothing else. Because the section
  save replaces the whole list, editing anything here rewrote every row without
  the fields it cannot see — so dates entered in the wizard vanished the first
  time a provider touched Education in settings, and the review then showed a
  row with no dates. That is the "edits don't show on Review" report, from the
  other end: the edit saved, and the fields it couldn't carry were dropped.

  It now carries the same shape the wizard does. `year` stays for rows written
  before start/end existed.
*/
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
  /** Canonical since E016; `proficiency` is the pre-brief_P free text. */
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
  /**
   * ⚠⚠⚠ THE EDUCATION HALF CAN BE HIDDEN (`P2-A2-E600` WS-F).
   *
   * ⚠ `/profile/edit/languages` edits languages ONLY — its step posts
   * `{ languages }` and its `onEducation` is a no-op. ⚠⚠ MEASURED: it rendered
   * an `+ Add Education` button that added a row nothing would ever save,
   * which is a control that lies about what it does.
   * ⚠ Defaults to `true`, so the wizard — which genuinely edits both on one
   * screen — is byte-unchanged.
   */
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
          {/*
            ── ⚠⚠⚠ TWO PICKLISTS, AND THE PROFICIENCY WRITES `level` (`P2-A2-E723`) ────────

            ⚠ **SCOTT: *"Languages: two picklists, not free text… Proficiency: exactly Native ·
            Fluent · Professional · Conversational · Beginner, required per language."***
            ⚠⚠⚠ **AND THE BUG HE FOUND: *"the proficiency box discards typing today.
            `EducationLanguagesEditor` writes `proficiency`, but `SectionEditorClient.tsx:384`
            saves `level ?? proficiency`, and `level` is `""` for existing rows, so the empty
            string wins."*** ⚠⚠ **`??` ONLY FALLS BACK ON `null`/`undefined`, NOT ON `""`** —
            so an empty `level` beat whatever was typed, every time. **The picklist now writes
            `level` directly and `proficiency` is gone from this editor's data**, which removes
            the two-field choice rather than fixing the operator.
            ⚠ **WHY FREE TEXT HAD TO GO, MEASURED:** live names include `"Spanish Native"`,
            `"English Advanced intermediate"` and `"German Basic"` — **the proficiency was
            being typed into the NAME box**, because nothing stopped it.
          */}
          {languages.map((l, i) => (
            <div key={i} className="flex items-end gap-3">
              <div className="flex-1">
                <Field label="Language">
                  <select
                    value={l.name}
                    onChange={(ev) => updLang(i, { name: ev.target.value })}
                    className="w-full rounded-[10px] border border-line bg-white px-3 py-2.5 text-[14.5px] outline-none focus:border-magenta"
                  >
                    {/* ⚠ An unchosen row shows a prompt, not the first language in the world. */}
                    <option value="">Choose a language…</option>
                    {/* ⚠⚠ A ROW WHOSE STORED NAME IS NOT IN THE LIST KEEPS ITS OWN OPTION.
                        Without this, opening the editor on `"Spanish Native"` would silently
                        reset the select to blank and a save would erase a real row. **Nothing
                        is rewritten behind the member's back; they are shown what is stored
                        and can pick a clean value.** */}
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
                    {/* ⚠⚠ SCOTT'S DISPLAY ORDER, NOT THE ENUM'S — see `lib/languages.ts`. */}
                    {PROFICIENCY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              {/*
                ── ⚠⚠⚠ THE LAST LANGUAGE CANNOT BE REMOVED (`E723` item 12) ────────────────

                ⚠ **SCOTT: *"the last language can't be removed; its Remove is disabled, with
                the line 'You need at least one language.'"***
                ⚠⚠ **THE BUTTON IS DISABLED, NOT HIDDEN.** A control that vanishes leaves the
                member wondering where it went; one that is visibly dead with a reason beside
                it answers the question (`E579` — a door onto a wall, inverted).
                ⚠ **THE SERVER REFUSES THIS TOO** — a disabled button is not a rule.
              */}
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
            /* ⚠ `proficiency` IS GONE FROM THIS EDITOR'S DATA (`E723`) — the picklist writes
               `level`. ⚠ SUPERSEDED, quoted not deleted (`E164`):
               //   onLanguages([...languages, { name: "", proficiency: "" }]) */
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
