"use client";

import { Field, TextInput, TextArea } from "@/components/onboarding/controls";

export type ProjectDraft = { name: string; description: string | null };
export type ExperienceDraft = {
  employer: string;
  roleTitle: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  projects: ProjectDraft[];
};

export function emptyExperience(): ExperienceDraft {
  return {
    employer: "",
    roleTitle: "",
    description: "",
    startDate: null,
    endDate: null,
    projects: [],
  };
}

/** Add / edit / remove employers, each with its own projects. */
export function ExperienceEditor({
  value,
  onChange,
}: {
  value: ExperienceDraft[];
  onChange: (next: ExperienceDraft[]) => void;
}) {
  const update = (i: number, patch: Partial<ExperienceDraft>) =>
    onChange(value.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));

  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  const updateProject = (ei: number, pi: number, patch: Partial<ProjectDraft>) =>
    update(ei, {
      projects: value[ei].projects.map((p, idx) =>
        idx === pi ? { ...p, ...patch } : p
      ),
    });

  return (
    <div className="space-y-5">
      {value.map((exp, i) => (
        <div key={i} className="rounded-brand border border-line p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold">Employer {i + 1}</h3>
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-[13px] font-bold text-red-600 hover:underline"
            >
              Remove
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company">
              <TextInput
                value={exp.employer}
                onChange={(e) => update(i, { employer: e.target.value })}
                placeholder="e.g. Ceres Holdings"
              />
            </Field>
            <Field label="Role Title">
              <TextInput
                value={exp.roleTitle}
                onChange={(e) => update(i, { roleTitle: e.target.value })}
                placeholder="e.g. Lead Oracle Cloud Consultant"
              />
            </Field>
            <Field label="Start Date">
              <TextInput
                type="date"
                value={exp.startDate ?? ""}
                onChange={(e) => update(i, { startDate: e.target.value || null })}
              />
            </Field>
            <Field label="End Date" hint="Leave blank if current">
              <TextInput
                type="date"
                value={exp.endDate ?? ""}
                onChange={(e) => update(i, { endDate: e.target.value || null })}
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="What Did You Do?">
              <TextArea
                value={exp.description ?? ""}
                onChange={(e) => update(i, { description: e.target.value })}
                placeholder="Briefly describe your responsibilities and impact."
              />
            </Field>
          </div>

          {/* Projects */}
          <div className="mt-4">
            <p className="mb-2 text-[14px] font-bold">Notable Projects</p>
            <div className="space-y-3">
              {exp.projects.map((p, pi) => (
                <div key={pi} className="rounded-[12px] bg-bg-soft p-3">
                  <div className="flex items-center gap-2">
                    <TextInput
                      value={p.name}
                      onChange={(e) => updateProject(i, pi, { name: e.target.value })}
                      placeholder="Project name"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        update(i, {
                          projects: exp.projects.filter((_, idx) => idx !== pi),
                        })
                      }
                      className="shrink-0 px-2 text-[13px] font-bold text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                  <TextInput
                    value={p.description ?? ""}
                    onChange={(e) =>
                      updateProject(i, pi, { description: e.target.value })
                    }
                    placeholder="One line about the project"
                    className="mt-2"
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                update(i, {
                  projects: [...exp.projects, { name: "", description: "" }],
                })
              }
              className="mt-3 text-[14px] font-bold text-magenta hover:text-magenta-dark"
            >
              + Add Project
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...value, emptyExperience()])}
        className="rounded-full border-[1.5px] border-line px-5 py-2.5 font-bold text-ink transition-colors hover:border-[#d9d4e2]"
      >
        + Add Employer
      </button>
    </div>
  );
}
