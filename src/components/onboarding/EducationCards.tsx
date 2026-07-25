"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { Field, TextInput, TextArea } from "@/components/onboarding/controls";

/**
 * Education step (brief_P / E015): a card list with add / edit / delete, and an
 * "Edit Education History" modal — School* · Degree · Field of Study · Dates
 * Attended (start/end year) · Description, with Delete + Save.
 *
 * The step itself is OPTIONAL and carries a Skip; this component only owns the
 * list and the modal.
 */

export type EducationDraft = {
  institution: string;
  degree: string | null;
  field: string | null;
  startYear: number | null;
  endYear: number | null;
  description: string | null;
};

export const emptyEducation = (): EducationDraft => ({
  institution: "",
  degree: null,
  field: null,
  startYear: null,
  endYear: null,
  description: null,
});

const THIS_YEAR = new Date().getFullYear();
/** Newest first; a decade ahead covers expected graduation dates. */
const YEARS = Array.from({ length: 70 }, (_, i) => THIS_YEAR + 10 - i);

function yearRange(e: EducationDraft): string {
  if (!e.startYear && !e.endYear) return "";
  if (e.startYear && e.endYear) return `${e.startYear} – ${e.endYear}`;
  if (e.startYear) return `${e.startYear} – present`;
  return String(e.endYear);
}

export function EducationCards({
  items,
  onChange,
}: {
  items: EducationDraft[];
  onChange: (next: EducationDraft[]) => void;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<EducationDraft>(emptyEducation());
  const [error, setError] = useState<string | null>(null);

  const openAdd = () => {
    setDraft(emptyEducation());
    setEditing(-1); // -1 = adding
    setError(null);
  };
  const openEdit = (i: number) => {
    setDraft({ ...items[i] });
    setEditing(i);
    setError(null);
  };
  const close = () => {
    setEditing(null);
    setError(null);
  };

  const save = () => {
    if (!draft.institution.trim()) {
      setError("School is required.");
      return;
    }
    if (draft.startYear && draft.endYear && draft.endYear < draft.startYear) {
      setError("The end year can't be before the start year.");
      return;
    }
    const clean = { ...draft, institution: draft.institution.trim() };
    onChange(
      editing === -1
        ? [...items, clean]
        : items.map((it, i) => (i === editing ? clean : it))
    );
    close();
  };

  const remove = () => {
    if (editing !== null && editing >= 0) {
      onChange(items.filter((_, i) => i !== editing));
    }
    close();
  };

  return (
    <div>
      <div className="space-y-3">
        {items.map((e, i) => (
          <div
            key={`${e.institution}-${i}`}
            className="flex items-start justify-between gap-4 rounded-brand border border-line p-4"
          >
            <div className="min-w-0">
              <p className="font-bold">{e.institution}</p>
              {(e.degree || e.field) && (
                <p className="mt-0.5 text-[14.5px] text-ink-2">
                  {[e.degree, e.field].filter(Boolean).join(", ")}
                </p>
              )}
              {yearRange(e) && (
                <p className="mt-0.5 text-[13px] text-ink-2">{yearRange(e)}</p>
              )}
              {e.description && (
                <p className="mt-1.5 whitespace-pre-line text-[14px] text-ink-2">
                  {e.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => openEdit(i)}
              aria-label={`Edit ${e.institution}`}
              className="shrink-0 text-[14px] font-bold text-magenta hover:text-magenta-dark"
            >
              ✏️ Edit
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={openAdd}
        className="mt-4 rounded-full border-[1.5px] border-line px-5 py-2.5 font-bold text-ink transition-colors hover:border-magenta hover:text-magenta"
      >
        + Add Education
      </button>

      <Modal
        open={editing !== null}
        onClose={close}
        title="Edit Education History"
      >
        <div className="space-y-4">
          <Field label="School *">
            <TextInput
              value={draft.institution}
              onChange={(e) => setDraft({ ...draft, institution: e.target.value })}
              placeholder="Northwestern University"
            />
          </Field>
          <Field label="Degree">
            <TextInput
              value={draft.degree ?? ""}
              onChange={(e) => setDraft({ ...draft, degree: e.target.value || null })}
              placeholder="Bachelor of Science"
            />
          </Field>
          <Field label="Field of Study">
            <TextInput
              value={draft.field ?? ""}
              onChange={(e) => setDraft({ ...draft, field: e.target.value || null })}
              placeholder="Information Systems"
            />
          </Field>

          <div>
            <span className="mb-1.5 block text-[14px] font-bold text-ink">
              Dates Attended
            </span>
            <div className="grid grid-cols-2 gap-3">
              <YearSelect
                label="From"
                value={draft.startYear}
                onChange={(y) => setDraft({ ...draft, startYear: y })}
              />
              <YearSelect
                label="To"
                value={draft.endYear}
                onChange={(y) => setDraft({ ...draft, endYear: y })}
              />
            </div>
          </div>

          <Field label="Description">
            <TextArea
              value={draft.description ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value || null })
              }
              placeholder="Honors, activities, focus areas…"
            />
          </Field>
        </div>

        {error && (
          <p className="mt-4 rounded-[10px] bg-red-50 px-3 py-2 text-[14px] text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-5">
          <button
            type="button"
            onClick={remove}
            disabled={editing === -1}
            className="text-[15px] font-semibold text-red-600 underline underline-offset-4 hover:text-red-700 disabled:opacity-40"
          >
            Delete
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={close}
              className="rounded-full border-[1.5px] border-line px-5 py-2.5 font-bold text-ink transition-colors hover:border-[#d9d4e2]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              className="rounded-full bg-magenta px-6 py-2.5 font-bold text-white transition-colors hover:bg-magenta-dark"
            >
              Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function YearSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (y: number | null) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] text-ink-2">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="w-full rounded-[12px] border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none transition-colors focus:border-magenta"
      >
        <option value="">Year</option>
        {YEARS.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </label>
  );
}
