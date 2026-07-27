"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { Field, TextInput, TextArea, Notice } from "@/components/onboarding/controls";

/**
 * "Your Employers" capture step (brief_U, per `employer-project-step-mockup.png`).
 *
 * Imported employers show as cards with edit/delete pencils; clicking a card
 * opens it to add PROJECTS within that job, and each project carries its
 * Solutions. Manual users get an empty state with "+ Add Employer".
 *
 * Everything writes through the owner-scoped `/api/provider/employers`
 * endpoint, which re-checks each id against the session's own profile — the
 * client never names a target profile.
 *
 * Optional by design: this step nudges but never blocks publishing.
 */

export type EmployerProject = {
  id: string;
  name: string;
  description: string | null;
  url: string | null;
  imageUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  solutions: { id: string; name: string }[];
};

export type EmployerCard = {
  id: string;
  name: string;
  roleTitle: string | null;
  location: string | null;
  description: string | null;
  logoUrl: string | null;
  isCurrent: boolean;
  startDate: string | null;
  endDate: string | null;
  projects: EmployerProject[];
};

type LogoSuggestion = { url: string; source: string; label: string };

const emptyEmployerForm = () => ({
  name: "",
  roleTitle: "",
  location: "",
  description: "",
  logoUrl: "" as string | null,
  startDate: "",
  endDate: "",
  isCurrent: false,
});
type EmployerForm = ReturnType<typeof emptyEmployerForm>;

const emptyProjectForm = () => ({
  name: "",
  description: "",
  url: "",
  startDate: "",
  endDate: "",
  solutions: "",
});
type ProjectForm = ReturnType<typeof emptyProjectForm>;

function dateRange(a: string | null, b: string | null, current: boolean) {
  if (!a && !b) return "";
  const y = (d: string | null) => (d ? d.slice(0, 4) : "?");
  return `${y(a)} – ${current ? "Present" : b ? y(b) : "Present"}`;
}

export function EmployersStep({
  employers,
  onChanged,
  onError,
}: {
  employers: EmployerCard[];
  onChanged: (next: EmployerCard[]) => void;
  onError: (msg: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const [employerModal, setEmployerModal] = useState<
    { mode: "add" } | { mode: "edit"; id: string } | null
  >(null);
  const [employerForm, setEmployerForm] = useState<EmployerForm>(emptyEmployerForm());

  const [projectModal, setProjectModal] = useState<
    { employerId: string; project?: EmployerProject } | null
  >(null);
  const [projectForm, setProjectForm] = useState<ProjectForm>(emptyProjectForm());

  const [logos, setLogos] = useState<LogoSuggestion[]>([]);
  const [logoLoading, setLogoLoading] = useState(false);

  const post = async (body: Record<string, unknown>): Promise<boolean> => {
    setBusy(true);
    onError(null);
    try {
      const r = await fetch("/api/provider/employers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        onError(data.error ?? "Could not save.");
        return false;
      }
      onChanged(data.employers ?? []);
      return true;
    } finally {
      setBusy(false);
    }
  };

  // --- logo suggestions (E043) ---------------------------------------------
  const lookupLogos = useCallback(async (name: string) => {
    if (name.trim().length < 2) {
      setLogos([]);
      return;
    }
    setLogoLoading(true);
    try {
      const r = await fetch(
        `/api/provider/company-logo?name=${encodeURIComponent(name)}`
      );
      const d = await r.json().catch(() => ({}));
      setLogos(d.suggestions ?? []);
    } catch {
      // A failed suggestion is a missing nicety, never a blocked save.
      setLogos([]);
    } finally {
      setLogoLoading(false);
    }
  }, []);

  // Debounce so typing a company name doesn't fire a lookup per keystroke.
  useEffect(() => {
    if (!employerModal) return;
    const name = employerForm.name;
    const t = setTimeout(() => void lookupLogos(name), 600);
    return () => clearTimeout(t);
  }, [employerModal, employerForm.name, lookupLogos]);

  const openAddEmployer = () => {
    setEmployerForm(emptyEmployerForm());
    setLogos([]);
    setEmployerModal({ mode: "add" });
  };

  const openEditEmployer = (e: EmployerCard) => {
    setEmployerForm({
      name: e.name,
      roleTitle: e.roleTitle ?? "",
      location: e.location ?? "",
      description: e.description ?? "",
      logoUrl: e.logoUrl,
      startDate: e.startDate ?? "",
      endDate: e.endDate ?? "",
      isCurrent: e.isCurrent,
    });
    setLogos([]);
    setEmployerModal({ mode: "edit", id: e.id });
  };

  const saveEmployer = async () => {
    const employer = {
      name: employerForm.name,
      roleTitle: employerForm.roleTitle,
      location: employerForm.location,
      description: employerForm.description,
      logoUrl: employerForm.logoUrl,
      startDate: employerForm.startDate || null,
      endDate: employerForm.endDate || null,
      isCurrent: employerForm.isCurrent,
    };
    const ok = await post(
      employerModal?.mode === "edit"
        ? { action: "updateEmployer", employerId: employerModal.id, employer }
        : { action: "createEmployer", employer }
    );
    if (ok) setEmployerModal(null);
  };

  const openProject = (employerId: string, project?: EmployerProject) => {
    setProjectForm(
      project
        ? {
            name: project.name,
            description: project.description ?? "",
            url: project.url ?? "",
            startDate: project.startDate ?? "",
            endDate: project.endDate ?? "",
            solutions: project.solutions.map((s) => s.name).join(", "),
          }
        : emptyProjectForm()
    );
    setProjectModal({ employerId, project });
  };

  const saveProject = async () => {
    const project = {
      name: projectForm.name,
      description: projectForm.description,
      url: projectForm.url,
      startDate: projectForm.startDate || null,
      endDate: projectForm.endDate || null,
      solutions: projectForm.solutions
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    const ok = await post(
      projectModal?.project
        ? { action: "updateProject", projectId: projectModal.project.id, project }
        : { action: "createProject", employerId: projectModal!.employerId, project }
    );
    if (ok) setProjectModal(null);
  };

  return (
    <div>
      {employers.length === 0 ? (
        <div className="rounded-brand border-2 border-dashed border-line p-10 text-center">
          <p className="font-bold">No employers yet</p>
          <p className="mx-auto mt-1 max-w-md text-[14px] text-ink-2">
            Add the companies you&apos;ve worked for, then add the projects you
            delivered within each job.
          </p>
          <button
            type="button"
            onClick={openAddEmployer}
            className="mt-4 rounded-full bg-magenta px-6 py-3 font-bold text-white transition-colors hover:bg-magenta-dark"
          >
            + Add Employer
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {employers.map((e) => (
              <article
                key={e.id}
                className="rounded-brand border border-line p-4 transition-shadow hover:shadow-brand"
              >
                <div className="mb-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => openEditEmployer(e)}
                    aria-label={`Edit ${e.name}`}
                    className="grid h-9 w-9 place-items-center rounded-full border-[1.5px] border-magenta text-magenta transition-colors hover:bg-magenta hover:text-white"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        confirm(
                          `Remove ${e.name}? Its projects will be removed too.`
                        )
                      ) {
                        void post({ action: "deleteEmployer", employerId: e.id });
                      }
                    }}
                    aria-label={`Delete ${e.name}`}
                    className="grid h-9 w-9 place-items-center rounded-full border-[1.5px] border-magenta text-magenta transition-colors hover:bg-magenta hover:text-white"
                  >
                    🗑
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setOpenId(openId === e.id ? null : e.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-start gap-3">
                    {e.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={e.logoUrl}
                        alt=""
                        className="h-10 w-10 flex-none rounded-[8px] border border-line bg-white object-contain p-1"
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="grid h-10 w-10 flex-none place-items-center rounded-[8px] bg-magenta/10 text-[18px]"
                      >
                        📁
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold leading-snug">
                        {e.roleTitle || e.name}
                      </p>
                      <p className="mt-1 text-[13.5px] text-ink-2">
                        <b className="text-ink">{e.name}</b>
                        {e.description ? ` — ${e.description}` : ""}
                      </p>
                      {dateRange(e.startDate, e.endDate, e.isCurrent) && (
                        <p className="mt-1 text-[12.5px] text-ink-2">
                          {dateRange(e.startDate, e.endDate, e.isCurrent)}
                        </p>
                      )}
                    </div>
                  </div>
                </button>

                <div className="mt-3 border-t border-line pt-3">
                  <p className="text-[12.5px] font-bold text-ink-2">
                    {e.projects.length} project
                    {e.projects.length === 1 ? "" : "s"}
                  </p>
                  {openId === e.id && (
                    <div className="mt-2 space-y-2">
                      {e.projects.map((pr) => (
                        <div
                          key={pr.id}
                          className="rounded-[10px] bg-bg-soft p-2.5 text-[13px]"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold">{pr.name}</p>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => openProject(e.id, pr)}
                                className="font-bold text-magenta"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void post({
                                    action: "deleteProject",
                                    projectId: pr.id,
                                  })
                                }
                                className="font-bold text-ink-2 hover:text-red-600"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                          {pr.solutions.length > 0 && (
                            <p className="mt-1 text-[12px] text-ink-2">
                              {pr.solutions.map((s) => s.name).join(" · ")}
                            </p>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => openProject(e.id)}
                        className="text-[13px] font-bold text-magenta hover:text-magenta-dark"
                      >
                        + Add Project
                      </button>
                    </div>
                  )}
                  {openId !== e.id && (
                    <button
                      type="button"
                      onClick={() => setOpenId(e.id)}
                      className="mt-1 text-[13px] font-bold text-magenta hover:text-magenta-dark"
                    >
                      Add projects within this job
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>

          <button
            type="button"
            onClick={openAddEmployer}
            className="mt-5 rounded-full border-[1.5px] border-line px-5 py-2.5 font-bold text-ink transition-colors hover:border-magenta hover:text-magenta"
          >
            + Add Employer
          </button>
        </>
      )}

      {/* ---- Employer modal ------------------------------------------- */}
      <Modal
        open={employerModal !== null}
        onClose={() => setEmployerModal(null)}
        title={employerModal?.mode === "edit" ? "Edit Employer" : "Add Employer"}
      >
        <div className="space-y-4">
          <Field label="Company *">
            <TextInput
              value={employerForm.name}
              onChange={(e) =>
                setEmployerForm({ ...employerForm, name: e.target.value })
              }
              placeholder="Acme Consulting"
            />
          </Field>

          {/* E043 — SUGGESTED logos. Never auto-applied: name → company
              matching is fuzzy, and a wrong logo is worse than none. */}
          {(logoLoading || logos.length > 0 || employerForm.logoUrl) && (
            <div>
              <p className="mb-2 text-[13px] font-bold">Company Logo</p>
              <div className="flex flex-wrap items-center gap-2">
                {employerForm.logoUrl && (
                  <span className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={employerForm.logoUrl}
                      alt="Selected logo"
                      className="h-12 w-12 rounded-[8px] border-2 border-magenta bg-white object-contain p-1"
                    />
                  </span>
                )}
                {logoLoading && (
                  <span className="text-[13px] text-ink-2">Looking…</span>
                )}
                {logos
                  .filter((l) => l.url !== employerForm.logoUrl)
                  .map((l) => (
                    <button
                      key={l.url}
                      type="button"
                      title={l.label}
                      onClick={() =>
                        setEmployerForm({ ...employerForm, logoUrl: l.url })
                      }
                      className="rounded-[8px] border border-line bg-white p-1 transition-colors hover:border-magenta"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={l.url}
                        alt={l.label}
                        className="h-10 w-10 object-contain"
                      />
                    </button>
                  ))}
                {employerForm.logoUrl && (
                  <button
                    type="button"
                    onClick={() => setEmployerForm({ ...employerForm, logoUrl: null })}
                    className="text-[13px] font-bold text-ink-2 underline underline-offset-4 hover:text-magenta"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-[12.5px] text-ink-2">
                Suggestions based on the company name — pick one or leave it blank.
              </p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Your Role">
              <TextInput
                value={employerForm.roleTitle}
                onChange={(e) =>
                  setEmployerForm({ ...employerForm, roleTitle: e.target.value })
                }
                placeholder="Procurement Solution Architect"
              />
            </Field>
            <Field label="Location">
              <TextInput
                value={employerForm.location}
                onChange={(e) =>
                  setEmployerForm({ ...employerForm, location: e.target.value })
                }
                placeholder="Chicago, IL"
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="From">
              <TextInput
                type="date"
                value={employerForm.startDate}
                onChange={(e) =>
                  setEmployerForm({ ...employerForm, startDate: e.target.value })
                }
              />
            </Field>
            <Field label="To">
              <TextInput
                type="date"
                value={employerForm.endDate}
                disabled={employerForm.isCurrent}
                onChange={(e) =>
                  setEmployerForm({ ...employerForm, endDate: e.target.value })
                }
              />
            </Field>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={employerForm.isCurrent}
              onChange={(e) =>
                setEmployerForm({
                  ...employerForm,
                  isCurrent: e.target.checked,
                  endDate: e.target.checked ? "" : employerForm.endDate,
                })
              }
              className="h-4 w-4 accent-[#D72CD6]"
            />
            <span className="text-[14px]">I currently work here</span>
          </label>

          <Field label="What You Did">
            <TextArea
              value={employerForm.description}
              onChange={(e) =>
                setEmployerForm({ ...employerForm, description: e.target.value })
              }
              placeholder="Led the Oracle Cloud Procurement rollout…"
            />
          </Field>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-line pt-5">
          <button
            type="button"
            onClick={() => setEmployerModal(null)}
            className="rounded-full border-[1.5px] border-line px-5 py-2.5 font-bold text-ink hover:border-[#d9d4e2]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveEmployer}
            disabled={busy || !employerForm.name.trim()}
            className="rounded-full bg-magenta px-6 py-2.5 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save Employer"}
          </button>
        </div>
      </Modal>

      {/* ---- Project modal -------------------------------------------- */}
      <Modal
        open={projectModal !== null}
        onClose={() => setProjectModal(null)}
        title={projectModal?.project ? "Edit Project" : "Add Project"}
      >
        <div className="space-y-4">
          <Field label="Project *">
            <TextInput
              value={projectForm.name}
              onChange={(e) =>
                setProjectForm({ ...projectForm, name: e.target.value })
              }
              placeholder="Global P2P Transformation"
            />
          </Field>
          <Field label="What You Delivered">
            <TextArea
              value={projectForm.description}
              onChange={(e) =>
                setProjectForm({ ...projectForm, description: e.target.value })
              }
            />
          </Field>
          <Field
            label="Solutions"
            hint="Comma-separated — the capabilities this project delivered."
          >
            <TextInput
              value={projectForm.solutions}
              onChange={(e) =>
                setProjectForm({ ...projectForm, solutions: e.target.value })
              }
              placeholder="Supplier Portal Rollout, Invoice Automation"
            />
          </Field>
          <Field label="Link">
            <TextInput
              type="url"
              value={projectForm.url}
              onChange={(e) =>
                setProjectForm({ ...projectForm, url: e.target.value })
              }
              placeholder="https://…"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="From">
              <TextInput
                type="date"
                value={projectForm.startDate}
                onChange={(e) =>
                  setProjectForm({ ...projectForm, startDate: e.target.value })
                }
              />
            </Field>
            <Field label="To">
              <TextInput
                type="date"
                value={projectForm.endDate}
                onChange={(e) =>
                  setProjectForm({ ...projectForm, endDate: e.target.value })
                }
              />
            </Field>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-5">
          {projectModal?.project ? (
            <button
              type="button"
              onClick={async () => {
                if (
                  await post({
                    action: "deleteProject",
                    projectId: projectModal.project!.id,
                  })
                ) {
                  setProjectModal(null);
                }
              }}
              className="text-[15px] font-semibold text-red-600 underline underline-offset-4"
            >
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setProjectModal(null)}
              className="rounded-full border-[1.5px] border-line px-5 py-2.5 font-bold text-ink hover:border-[#d9d4e2]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveProject}
              disabled={busy || !projectForm.name.trim()}
              className="rounded-full bg-magenta px-6 py-2.5 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save Project"}
            </button>
          </div>
        </div>
      </Modal>

      {busy && employers.length > 0 && (
        <div className="mt-3">
          <Notice tone="info">Saving…</Notice>
        </div>
      )}
    </div>
  );
}
