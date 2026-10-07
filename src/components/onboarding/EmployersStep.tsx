"use client";

// PURE MODULE — no prisma, so a client component may import it. That is why
import { employerDisplayName } from "@/lib/employer-display";
import { dateRangeLabel } from "@/lib/date-range-label";
import { projectMonogram } from "@/lib/project-monogram";
import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
/* THE LOSS SENTENCE IS THE LIB'S, NOT RE-TYPED HERE (`E296`). */
import { describeProjectLoss as describeLoss, clean } from "@/lib/reclassify";
import { Field, TextInput, TextArea, Notice } from "@/components/onboarding/controls";
import { LocationFields } from "@/components/onboarding/LocationFields";

/** The "no job" option's wording. A STATE, NOT AN ERROR (`E413` WS-1). */
export const NO_PARENT_LABEL = "Not under a job yet";

// THE PARENT PICKER — ONE CONTROL, PLACED AND UNPLACED ( WS-1)
function ParentPicker({
  project,
  employers,
  currentEmployerId = "",
  disabled,
  onMove,
  className = "",
}: {
  project: EmployerProject;
  employers: EmployerCard[];
  /** The row's current parent, "" when it has none. */
  currentEmployerId?: string;
  disabled: boolean;
  onMove: (pr: EmployerProject, employerId: string | null) => void;
  className?: string;
}) {
  return (
    <label className={`flex items-center gap-2 text-[13px] text-ink-2 ${className}`}>
      <span className="sr-only">Which job is {project.name} under?</span>
      <select
        value={currentEmployerId}
        disabled={disabled || employers.length === 0}
        onChange={(ev) => onMove(project, ev.target.value || null)}
        className="rounded-[8px] border border-line bg-white px-2.5 py-1.5 text-[13.5px]"
      >
        {/* THE EMPTY OPTION IS "DETACH", NOT A PLACEHOLDER. On an unplaced row */}
        <option value="">
          {employers.length === 0 ? "Add a job first" : NO_PARENT_LABEL}
        </option>
        {employers.map((e) => (
          <option key={e.id} value={e.id}>
            {employerDisplayName(e.name)}
          </option>
        ))}
      </select>
    </label>
  );
}

// THE EMPLOYER CARD'S TWO LINES, AS FUNCTIONS WS-3)

/** The heading: the work if the row names any, otherwise the company. */
export function cardTitle(e: { roleTitle?: string | null; name?: string | null }): string {
  return clean(e.roleTitle, 200) ?? employerDisplayName(e.name);
}

/** The company line — `""` WHEN THE HEADING IS ALREADY THE COMPANY, which is */
export function cardCompany(e: { roleTitle?: string | null; name?: string | null }): string {
  const company = employerDisplayName(e.name);
  return cardTitle(e) === company ? "" : company;
}

/** Matches `TextInput` so a select doesn't read as a different control. */
const SELECT =
  "w-full rounded-[12px] border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none transition-colors focus:border-magenta";
import { ArtifactsModal } from "@/components/onboarding/ArtifactsModal";
import { useBulkSelect, BulkSelectBar, SelectTick } from "@/components/onboarding/BulkSelect";
import type { ArtifactView } from "@/lib/artifacts";
import {
  ProjectModal,
  emptyProject,
  type ProjectDraft,
} from "@/components/onboarding/ProjectModal";

/** Imported employers show as cards with edit/delete pencils; clicking a card */

export type EmployerProject = {
  id: string;
  name: string;
  description: string | null;
  url: string | null;
  imageUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  /** brief_project_model_v2 — the rest of the card + modal payload. */
  isCurrent?: boolean;
  /** `P1-J1.4-E296` — carried so a conversion round-trips. Not rendered. */
  roleTitle?: string | null;
  location?: string | null;
  clientName?: string;
  clientDomain?: string | null;
  clientVisibility?: string;
  codeName?: string | null;
  contactEmail?: string | null;
  validationStatus?: string;
  highlights?: string[];
  videoUrl?: string | null;
  documentPath?: string | null;
  documentName?: string | null;
  logoUrl?: string | null;
  roleType?: { id: string; name: string } | null;
  industry?: { id: string; name: string } | null;
  applications?: { id: string; name: string }[];
  outcomes?: { id: string; label: string; value: string }[];
  validatedAt?: string | null;
  validationRequestedAt?: string | null;
  artifacts?: ArtifactView[];
};

export type EmployerCard = {
  id: string;
  artifacts?: ArtifactView[];
  name: string;
  roleTitle: string | null;
  location: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  description: string | null;
  logoUrl: string | null;
  isCurrent: boolean;
  startDate: string | null;
  endDate: string | null;
  projects: EmployerProject[];
  // WS-4 — the per-job attribution the review step reads and writes. Optional
  suite?: string | null;
  roleTypeId?: string | null;
  skills?: { id: string; name: string }[];
  needsSuite?: boolean;
};

type LogoSuggestion = { url: string; source: string; label: string };

const emptyEmployerForm = () => ({
  name: "",
  roleTitle: "",
  location: "",
  city: "",
  state: "",
  country: "",
  description: "",
  logoUrl: "" as string | null,
  startDate: "",
  endDate: "",
  isCurrent: false,
});
type EmployerForm = ReturnType<typeof emptyEmployerForm>;



// — the provider's own list follows the profile's rule.
function dateRange(a: string | null, b: string | null, current: boolean) {
  return dateRangeLabel(a, b, current);
}

export function EmployersStep({
  employers,
  onChanged,
  onError,
  projects = [],
}: {
  employers: EmployerCard[];
  onChanged: (next: EmployerCard[]) => void;
  onError: (msg: string | null) => void;
  /** THE FLAT LIST, FOR THE OTHER HALF OF THE HOLE . */
  projects?: EmployerProject[];
}) {
  const [busy, setBusy] = useState(false);
  // WS9b — multi-select delete for AI-added employers.
  const bulk = useBulkSelect(employers.map((e) => e.id));
  const [openId, setOpenId] = useState<string | null>(null);

  const [employerModal, setEmployerModal] = useState<
    { mode: "add" } | { mode: "edit"; id: string } | null
  >(null);
  const [employerForm, setEmployerForm] = useState<EmployerForm>(emptyEmployerForm());

  // The schema has always allowed it and the importer has always produced
  const [projectModal, setProjectModal] = useState<
    { employerId: string | null; project?: EmployerProject } | null
  >(null);

  // RECLASSIFY IN PLACE
  const [reclassify, setReclassify] = useState<
    | { kind: "employer"; id: string; name: string }
    | { kind: "project"; id: string; name: string; clientName: string }
    | null
  >(null);
  /** `Employer` | `Project` — the radio's own value, independent of the row. */
  const [reclassifyAs, setReclassifyAs] = useState<"employer" | "project">("project");
  const [reclassifyTarget, setReclassifyTarget] = useState("");
  const [reclassifyClient, setReclassifyClient] = useState("");
  const [reclassifyName, setReclassifyName] = useState("");
  const [loss, setLoss] = useState<string | null>(null);
  // UNDO IS THE INVERSE CONVERSION, NOT A SNAPSHOT TABLE. The two directions
  const [undo, setUndo] = useState<
    | { kind: "toProject"; projectId: string; name: string }
    | { kind: "toEmployer"; employerId: string; name: string; targetEmployerId: string; clientName: string }
    | null
  >(null);
  const [projectForm, setProjectForm] = useState<ProjectDraft>(emptyProject());
  /** WS4 — which owner's artifacts are open. One modal serves BOTH an employer */
  const [artifactsFor, setArtifactsFor] = useState<
    | { kind: "employer"; id: string; label: string; items: ArtifactView[] }
    | { kind: "project"; id: string; label: string; items: ArtifactView[] }
    | null
  >(null);

  const [logos, setLogos] = useState<LogoSuggestion[]>([]);
  const [logoLoading, setLogoLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  // Upload your own logo — same endpoint as the company logo, stored under the person.
  const uploadLogo = async (file: File) => {
    setLogoUploading(true);
    setLogoError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/company/logo", { method: "POST", body: fd });
      const d = (await r.json().catch(() => ({}))) as { logoUrl?: string; error?: string };
      if (!r.ok || !d.logoUrl) throw new Error(d.error ?? "Could not upload that image.");
      setEmployerForm((f) => ({ ...f, logoUrl: d.logoUrl ?? null }));
    } catch (e) {
      setLogoError(e instanceof Error ? e.message : "Could not upload that image.");
    } finally {
      setLogoUploading(false);
    }
  };

  // THE UNATTACHED ROWS, DERIVED not fetched . `projects` is the
  const nested = new Set(employers.flatMap((e) => (e.projects ?? []).map((p) => p.id)));

  // A ROW DETACHED IN THIS SESSION MUST NOT VANISH WS-1)
  const [detached, setDetached] = useState<EmployerProject[]>([]);
  const knownProjects = new Map<string, EmployerProject>();
  for (const p of projects) knownProjects.set(p.id, p);
  for (const p of detached) knownProjects.set(p.id, p);
  // Rows deleted here (or already gone on the server) stay hidden — `projects`
  // is the page-load list and isn't refreshed after a delete.
  const [gone, setGone] = useState<Set<string>>(new Set());
  const unplaced = [...knownProjects.values()].filter((p) => !nested.has(p.id) && !gone.has(p.id));

  // IT RETURNS THE PAYLOAD, NOT A BOOLEAN .
  const post = async (
    body: Record<string, unknown>
  ): Promise<Record<string, unknown> | null> => {
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
        return null;
      }
      // alone rather than blanking it.
      if (data.employers) onChanged(data.employers);
      return data;
    } finally {
      setBusy(false);
    }
  };

  // ONE MOVE, THREE SURFACES WS-1 + WS-2)
  const moveTo = async (pr: EmployerProject, employerId: string | null) => {
    const ok = await post({ action: "moveProject", projectId: pr.id, employerId });
    if (!ok) return;
    setDetached((d) =>
      employerId === null
        ? [...d.filter((x) => x.id !== pr.id), pr]
        : d.filter((x) => x.id !== pr.id)
    );
    // FOLLOW THE ROW TO ITS NEW HOME WS-1)
    if (employerId) setOpenId(employerId);
  };

  // WHAT WOULD BE LOST, FETCHED BEFORE THE DIALOG COMMITS . Counted and
  const loadLoss = async (projectId: string) => {
    try {
      const r = await fetch("/api/provider/employers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "projectLoss", projectId }),
      });
      const d = await r.json().catch(() => ({}));
      setLoss(d?.loss ? describeLoss(d.loss) : null);
    } catch {
      setLoss(null);
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
      city: e.city ?? "",
      state: e.state ?? "",
      country: e.country ?? "",
      description: e.description ?? "",
      logoUrl: e.logoUrl,
      startDate: e.startDate ?? "",
      endDate: e.endDate ?? "",
      isCurrent: e.isCurrent,
    });
    setLogos([]);
    setEmployerModal({ mode: "edit", id: e.id });
  };

  /** E127 — a range that ends before it starts (shared by employers and */
  const badRange = (start: string, end: string, current: boolean): string | null => {
    if (current || !start || !end) return null;
    return end < start ? "The end date can't be before the start date." : null;
  };

  const saveEmployer = async () => {
    const range = badRange(
      employerForm.startDate,
      employerForm.endDate,
      employerForm.isCurrent
    );
    if (range) {
      onError(range);
      return;
    }

    const employer = {
      name: employerForm.name,
      roleTitle: employerForm.roleTitle,
      location: employerForm.location,
      city: employerForm.city,
      state: employerForm.state,
      country: employerForm.country,
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

  const openProject = (employerId: string | null, project?: EmployerProject) => {
    setProjectForm(
      project
        ? {
            name: project.name,
            codeName: project.codeName ?? "",
            clientName: project.clientName ?? "",
            clientDomain: project.clientDomain ?? "",
            clientVisibility:
              (project.clientVisibility as ProjectDraft["clientVisibility"]) ??
              "PUBLIC",
            logoUrl: project.logoUrl ?? null,
            startDate: project.startDate ?? "",
            endDate: project.endDate ?? "",
            isCurrent: Boolean(project.isCurrent),
            roleTypeId: project.roleType?.id ?? "",
            industrySpecializationId: project.industry?.id ?? "",
            applicationIds: (project.applications ?? []).map((a) => a.id),
            customApplications: [],
            description: project.description ?? "",
            highlights: project.highlights ?? [],
            outcomes: (project.outcomes ?? []).map((o) => ({
              label: o.label,
              value: o.value,
            })),
            contactEmail: project.contactEmail ?? "",
            imageUrl: project.imageUrl ?? "",
            url: project.url ?? "",
            videoUrl: project.videoUrl ?? "",
            documentPath: project.documentPath ?? null,
            documentName: project.documentName ?? null,
          }
        : {
            ...emptyProject(),
            // E113 — a project added from INSIDE a job defaults its client to
            clientName:
              employers.find((e) => e.id === employerId)?.name ?? "",
          }
    );
    setProjectModal({ employerId, project });
  };

  const saveProject = async () => {
    const projRange = badRange(
      projectForm.startDate,
      projectForm.endDate,
      Boolean(projectForm.isCurrent)
    );
    if (projRange) {
      onError(projRange);
      return;
    }

    const project = {
      ...projectForm,
      startDate: projectForm.startDate || null,
      endDate: projectForm.endDate || null,
      industrySpecializationId: projectForm.industrySpecializationId || null,
      contactEmail: projectForm.contactEmail || null,
      url: projectForm.url || null,
      imageUrl: projectForm.imageUrl || null,
      videoUrl: projectForm.videoUrl || null,
    };
    const ok = await post(
      projectModal?.project
        ? { action: "updateProject", projectId: projectModal.project.id, project }
        : {
            // PASSED THROUGH AS-IS, INCLUDING `null`. The route
            action: "createProject",
            employerId: projectModal!.employerId,
            project,
          }
    );
    if (ok) setProjectModal(null);
  };

  return (
    <div>
      {employers.length === 0 ? (
        <div className="rounded-brand border-2 border-dashed border-line p-10 text-center">
          {/* NOT IN WS-3's TABLE — reported. Same rule, same component */}
          <p className="font-bold">No companies yet</p>
          <p className="mx-auto mt-1 max-w-md text-[14px] text-ink-2">
            Add the companies you&apos;ve worked for, then add the projects you
            delivered within each job.
          </p>
          <button
            type="button"
            onClick={openAddEmployer}
            className="mt-4 bg-ink px-6 py-3 font-semibold text-surface transition-colors hover:bg-ink-hover"
          >
            + Add Company
          </button>
          {/* A PROJECT WITH NO COMPANY */}
          <p className="mt-3">
            <button
              type="button"
              onClick={() => openProject(null)}
              className="min-h-[44px] text-[13.5px] font-bold text-magenta underline underline-offset-2 hover:text-magenta-dark"
            >
              Add a Project with No Company
            </button>
          </p>
        </div>
      ) : (
        <>
          {/* E112 + E116 — a STACK, not a 3-column grid, and the two errors have */}
          <div className="space-y-4">
            {/* WS9b/E143 — tick the wrong AI-added employers and remove them in
                one action instead of a trash icon and a confirm() per card. */}
            <BulkSelectBar
              // NOT IN WS-3's TABLE — reported. `BulkSelect` interpolates this
              label="companies"
              count={employers.length}
              state={bulk}
              busy={busy}
              onDelete={async (ids) => {
                for (const employerId of ids) {
                  await post({ action: "deleteEmployer", employerId });
                }
                bulk.reset();
              }}
            />
            {employers.map((e) => (
              <article
                key={e.id}
                className={
                  "rounded-brand border p-4 transition-shadow hover:shadow-brand " +
                  (bulk.active && bulk.picked.has(e.id)
                    ? "border-ink bg-surface"
                    : "border-line")
                }
              >
                <div className="mb-3 flex items-center justify-end gap-2">
                  {bulk.active && (
                    <span className="mr-auto">
                      <SelectTick
                        checked={bulk.picked.has(e.id)}
                        onChange={() => bulk.toggle(e.id)}
                        label={employerDisplayName(e.name)}
                      />
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => openEditEmployer(e)}
                    aria-label={`Edit ${employerDisplayName(e.name)}`}
                    className="grid h-9 w-9 place-items-center border border-ink text-ink transition-colors hover:bg-surface-hover"
                  >
                    ✏️
                  </button>
                  {/* THE THIRD CONTROL */}
                  {/* THE PLAYBACK RADIO WS-3) */}
                  <fieldset className="flex items-center gap-2 rounded-full border border-line px-2 py-1">
                    <legend className="sr-only">
                      {`Is ${employerDisplayName(e.name)} a job or a project?`}
                    </legend>
                    <label className="flex items-center gap-1 text-[12px] font-semibold text-ink-2">
                      <input
                        type="radio"
                        name={`kind-${e.id}`}
                        value="employer"
                        checked
                        readOnly
                        className="accent-magenta"
                      />
                      {/* BRIEF DID NOT MAKE — reported for Scott to overrule. */}
                      Job
                    </label>
                    <label className="flex items-center gap-1 text-[12px] font-semibold text-ink-2">
                      <input
                        type="radio"
                        name={`kind-${e.id}`}
                        value="project"
                        checked={false}
                        onChange={() => {
                          setReclassify({
                            kind: "employer",
                            id: e.id,
                            name: employerDisplayName(e.name),
                          });
                          setReclassifyAs("employer");
                          setReclassifyTarget("");
                          setReclassifyClient("");
                          setLoss(null);
                        }}
                        className="accent-magenta"
                      />
                      Project
                    </label>
                  </fieldset>
                  <button
                    type="button"
                    onClick={() => {
                      // — THIS SENTENCE WAS FALSE
                      if (
                        confirm(
                          `Remove ${employerDisplayName(e.name)}? Any projects under it are kept — they move to “Projects not yet under a job”, where you can place them again.`
                        )
                      ) {
                        void post({ action: "deleteEmployer", employerId: e.id });
                      }
                    }}
                    aria-label={`Delete ${employerDisplayName(e.name)}`}
                    className="grid h-9 w-9 place-items-center border border-ink text-ink transition-colors hover:bg-surface-hover"
                  >
                    🗑
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setArtifactsFor({
                      kind: "employer",
                      id: e.id,
                      label: e.name,
                      items: e.artifacts ?? [],
                    })
                  }
                  // E125 — GREY WHEN EMPTY. Magenta reads as "this opens
                  className={
                    "mb-2 text-[13px] font-bold transition-colors " +
                    (e.artifacts?.length
                      ? "text-magenta hover:text-magenta-dark"
                      : "text-ink-2/70 hover:text-magenta")
                  }
                >
                  {/* E129/WS3 — matches the "Projects (N)" convention: a count
                      when there is something, an explicit invitation when there
                      isn't. "Artifacts" alone told you neither. */}
                  {e.artifacts?.length
                    ? `📎 Artifacts (${e.artifacts.length})`
                    : "+ Add Artifact"}
                </button>

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
                        // THE SECOND `📁`, AND THE BRIEF DID NOT KNOW ABOUT IT
                        className="grid h-10 w-10 flex-none place-items-center rounded-[8px] bg-ink/5 text-ink"
                      >
                        <span className="text-[14px] font-bold tracking-[0.02em]">
                          {projectMonogram(e.name)}
                        </span>
                      </span>
                    )}
                    <div className="min-w-0">
                      {/* NEVER PRINT ONE FIELD TWICE WS-3) */}
                      <p className="font-bold leading-snug">{cardTitle(e)}</p>
                      {(cardCompany(e) || e.description) && (
                        <p className="mt-1 text-[13.5px] text-ink-2">
                          {cardCompany(e) && (
                            <b className="text-ink">{cardCompany(e)}</b>
                          )}
                          {e.description
                            ? cardCompany(e)
                              ? ` — ${e.description}`
                              : e.description
                            : ""}
                        </p>
                      )}
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
                            <p className="font-semibold">
                              {pr.name}
                              {/* The review page nudges "classify your
                                  projects"; this is where that nudge is acted
                                  on, so the unclassified ones say so here. */}
                              {!pr.roleType && (
                                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                                  Unclassified
                                </span>
                              )}
                              {/* Validation state, provider-side (brief §6). */}
                              {pr.validationStatus === "VALIDATED" ? (
                                <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                                  ✓ Validated
                                </span>
                              ) : pr.validationStatus === "PENDING" ? (
                                <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                                  Awaiting reply
                                </span>
                              ) : null}
                            </p>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setArtifactsFor({
                                    kind: "project",
                                    id: pr.id,
                                    label: pr.name,
                                    items: pr.artifacts ?? [],
                                  })
                                }
                                className={
                                  "font-bold transition-colors " +
                                  (pr.artifacts?.length
                                    ? "text-magenta"
                                    : "text-ink-2/70 hover:text-magenta")
                                }
                              >
                                {pr.artifacts?.length
                                  ? `Artifacts (${pr.artifacts.length})`
                                  : "+ Add Artifact"}
                              </button>
                              <button
                                type="button"
                                onClick={() => openProject(e.id, pr)}
                                className="font-bold text-magenta"
                              >
                                Edit
                              </button>
                              {/* THE MIRROR CONTROL — same */}
                              <button
                                type="button"
                                onClick={() => {
                                  setReclassify({
                                    kind: "project",
                                    id: pr.id,
                                    name: pr.name,
                                    clientName: pr.clientName ?? "",
                                  });
                                  setReclassifyAs("project");
                                  setReclassifyName(pr.clientName || pr.name);
                                  setLoss(null);
                                  void loadLoss(pr.id);
                                }}
                                className="font-bold text-magenta"
                                title="This is a job, not a project"
                              >
                                ⇄
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  // FORGET A DELETED ROW so the client-side
                                  setDetached((d) => d.filter((x) => x.id !== pr.id));
                                  void post({
                                    action: "deleteProject",
                                    projectId: pr.id,
                                  });
                                }}
                                className="font-bold text-ink-2 hover:text-red-600"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                          {/* THE DOOR THAT ONLY OPENED OUTWARD ( WS-1) */}
                          <div className="mt-2 flex justify-end">
                            <ParentPicker
                              project={pr}
                              employers={employers}
                              currentEmployerId={e.id}
                              disabled={busy}
                              onMove={(project, employerId) => void moveTo(project, employerId)}
                            />
                          </div>
                        </div>
                      ))}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <button
                          type="button"
                          onClick={() => openProject(e.id)}
                          className="text-[13px] font-bold text-magenta hover:text-magenta-dark"
                        >
                          + Add Project
                        </button>
                        {/* CREATE WAS THE ONLY VERB ON OFFER ( WS-2) */}
                        {unplaced.length > 0 && (
                          <label className="flex items-center gap-2 text-[13px] text-ink-2">
                            <span className="sr-only">
                              Attach an existing project to {employerDisplayName(e.name)}
                            </span>
                            <select
                              value=""
                              disabled={busy}
                              onChange={(ev) => {
                                const pick = unplaced.find((u) => u.id === ev.target.value);
                                if (pick) void moveTo(pick, e.id);
                              }}
                              className="rounded-[8px] border border-line bg-white px-2.5 py-1.5 text-[13.5px]"
                            >
                              <option value="">
                                Attach an existing project ({unplaced.length})
                              </option>
                              {unplaced.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                      </div>
                    </div>
                  )}
                  {openId !== e.id && (
                    <button
                      type="button"
                      // E124 — ONE click. This used to only expand the card, and
                      onClick={() => {
                        setOpenId(e.id);
                        openProject(e.id);
                      }}
                      className="mt-1 text-[13px] font-bold text-magenta hover:text-magenta-dark"
                    >
                      Add Projects Within This Job
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <button
              type="button"
              onClick={openAddEmployer}
              className="border border-ink bg-surface px-5 py-2.5 font-semibold text-ink transition-colors hover:bg-surface-hover"
            >
              + Add Company
            </button>
            {/* THE SAME DOOR IN THE POPULATED STATE . Putting */}
            <button
              type="button"
              onClick={() => openProject(null)}
              className="min-h-[44px] text-[13.5px] font-bold text-magenta underline underline-offset-2 hover:text-magenta-dark"
            >
              Add a Project with No Company
            </button>
          </div>
        </>
      )}

      {/* WS-6 — THE OTHER HALF OF THE HOLE */}
      {unplaced.length > 0 && (
        <section className="mt-8 rounded-brand border border-dashed border-line p-4">
          <h3 className="text-[15px] font-bold">Projects not yet under a job</h3>
          <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-ink-2">
            These came off your résumé without a job attached, or the job they
            were under was removed. Pick where each one belongs.
          </p>
          <ul className="mt-3 grid gap-2">
            {unplaced.map((pr) => (
              <li
                key={pr.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[10px] border border-line bg-bg-soft px-3 py-2.5"
              >
                <span className="min-w-0 flex-1 text-[14px] font-semibold">{pr.name}</span>
                {/* held its own inline `<select value="">` with a *"Put it */}
                <ParentPicker
                  project={pr}
                  employers={employers}
                  disabled={busy}
                  onMove={(project, employerId) => void moveTo(project, employerId)}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (!window.confirm(`Delete "${pr.name}"?`)) return;
                    setDetached((d) => d.filter((x) => x.id !== pr.id));
                    setGone((g) => new Set(g).add(pr.id));
                    void (async () => {
                      const r = await post({ action: "deleteProject", projectId: pr.id });
                      // "Project not found" = already gone; nothing to report.
                      if (!r) onError(null);
                    })();
                  }}
                  aria-label={`Delete ${pr.name}`}
                  title="Delete this project"
                  className="grid h-9 w-9 place-items-center border border-ink text-ink transition-colors hover:bg-surface-hover"
                >
                  🗑
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* UNDO — THE INVERSE, NOT A SNAPSHOT */}
      {undo && (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-brand border border-line bg-bg-soft px-4 py-3">
          <span className="text-[13.5px]">
            <b>{undo.name}</b>{" "}
            {undo.kind === "toProject" ? "is now a project." : "is now a job."}
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              const ok =
                undo.kind === "toProject"
                  ? await post({
                      action: "projectToEmployer",
                      projectId: undo.projectId,
                      name: undo.name,
                    })
                  : await post({
                      action: "employerToProject",
                      employerId: undo.employerId,
                      targetEmployerId: undo.targetEmployerId,
                      clientName: undo.clientName,
                    });
              if (ok) setUndo(null);
            }}
            className="font-bold text-magenta hover:underline disabled:opacity-50"
          >
            Undo
          </button>
          <span className="text-[12.5px] text-ink-2">
            Only while you stay on this page.
          </span>
        </div>
      )}

      {/* THE RECLASSIFY MODAL */}
      <Modal
        open={reclassify !== null}
        onClose={() => setReclassify(null)}
        title={reclassify ? `What is “${reclassify.name}”?` : ""}
      >
        {reclassify && (
          <div className="space-y-4">
            <fieldset className="grid gap-2">
              {/* A THIRD ANSWER, NOT EITHER WORD (WS-3). The radios below read */}
              <legend className="sr-only">A job or a project</legend>
              {(["employer", "project"] as const).map((v) => (
                <label
                  key={v}
                  className={
                    "flex cursor-pointer items-start gap-3 rounded-[10px] border p-3 " +
                    (reclassifyAs === v ? "border-ink bg-surface" : "border-line")
                  }
                >
                  <input
                    type="radio"
                    name="reclassify-as"
                    value={v}
                    checked={reclassifyAs === v}
                    onChange={() => setReclassifyAs(v)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-magenta"
                  />
                  <span>
                    <span className="block text-[14.5px] font-bold">
                      {v === "employer" ? "A job" : "A project"}
                    </span>
                    <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-2">
                      {v === "employer"
                        ? "Somewhere you were employed. Projects can sit under it."
                        : "A piece of work delivered for a client, under one of your jobs."}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>

            {/* EMPLOYER → PROJECT: it needs a home and a client. */}
            {reclassify.kind === "employer" && reclassifyAs === "project" && (
              <>
                <Field label="Put it under this job *">
                  <select
                    value={reclassifyTarget}
                    onChange={(ev) => {
                      setReclassifyTarget(ev.target.value);
                      // SUGGESTED, THEN CONFIRMED — NEVER AUTO-APPLIED. The
                      const chosen = employers.find((x) => x.id === ev.target.value);
                      if (chosen && !reclassifyClient.trim()) setReclassifyClient(chosen.name);
                    }}
                    className="w-full rounded-[10px] border border-line px-3 py-2.5 text-[15px]"
                  >
                    <option value="">Choose a job…</option>
                    {/* NEVER ITSELF. A row cannot be its own parent, and the */}
                    {employers
                      .filter((x) => x.id !== reclassify.id)
                      .map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Client name *">
                  <TextInput
                    value={reclassifyClient}
                    onChange={(ev) => setReclassifyClient(ev.target.value)}
                    placeholder="Who the work was for"
                  />
                </Field>
                <p className="text-[13px] leading-relaxed text-ink-2">
                  Its skills, artifacts and any projects under it move with it.
                </p>
              </>
            )}

            {/* PROJECT → EMPLOYER: it needs a name, and it can lose things. */}
            {reclassify.kind === "project" && reclassifyAs === "employer" && (
              <>
                {/* THE RENAME HELD HERE, AND IT WAS CHECKED BEFORE IT WAS */}
                <Field label="Company name *">
                  <TextInput
                    value={reclassifyName}
                    onChange={(ev) => setReclassifyName(ev.target.value)}
                    placeholder="The company you worked for"
                  />
                </Field>
                <p className="text-[13px] leading-relaxed text-ink-2">
                  Its skills and artifacts move with it.
                </p>
                {/* ENUMERATED, NEVER GENERIC — the server counts and names it. */}
                {loss && (
                  <p className="rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] leading-relaxed text-amber-900">
                    {loss}
                  </p>
                )}
              </>
            )}

            <div className="flex flex-wrap justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setReclassify(null)}
                className="border border-ink bg-surface px-5 py-2.5 font-semibold text-ink transition-colors hover:bg-surface-hover"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  busy ||
                  /* Nothing changed — the radio still matches what the row is. */
                  (reclassify.kind === "employer" && reclassifyAs === "employer") ||
                  (reclassify.kind === "project" && reclassifyAs === "project") ||
                  (reclassify.kind === "employer" &&
                    (!reclassifyTarget || !reclassifyClient.trim())) ||
                  (reclassify.kind === "project" && !reclassifyName.trim())
                }
                onClick={async () => {
                  if (reclassify.kind === "employer") {
                    const target = reclassifyTarget;
                    const client = reclassifyClient.trim();
                    const ok = await post({
                      action: "employerToProject",
                      employerId: reclassify.id,
                      targetEmployerId: target,
                      clientName: client,
                    });
                    if (ok) {
                      setReclassify(null);
                      // THE INVERSE IS PRE-FILLED FROM THE SERVER'S OWN ANSWER —
                      setUndo({
                        kind: "toProject",
                        projectId: String(ok.projectId ?? ""),
                        name: reclassify.name,
                      });
                    }
                  } else {
                    const ok = await post({
                      action: "projectToEmployer",
                      projectId: reclassify.id,
                      name: reclassifyName.trim(),
                    });
                    if (ok) {
                      setReclassify(null);
                      // UNDOING THIS DIRECTION NEEDS A TARGET JOB, and the
                      const target = employers.find((x) => x.id !== ok.employerId);
                      setUndo(
                        target
                          ? {
                              kind: "toEmployer",
                              employerId: String(ok.employerId ?? ""),
                              name: reclassify.name,
                              targetEmployerId: target.id,
                              clientName: reclassify.clientName || reclassify.name,
                            }
                          : null
                      );
                    }
                  }
                }}
                className="bg-ink px-6 py-2.5 font-semibold text-surface transition-colors hover:bg-ink-hover disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ---- Employer modal ------------------------------------------- */}
      <Modal
        open={employerModal !== null}
        onClose={() => setEmployerModal(null)}
        title={employerModal?.mode === "edit" ? "Edit Company" : "Add Company"}
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
          {(
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
                      className="border border-line bg-white p-1 transition-colors hover:border-magenta"
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
              <label className="mt-2 inline-flex cursor-pointer items-center border border-ink px-3 py-1.5 text-[13px] font-bold text-ink hover:bg-surface-hover">
                {logoUploading ? "Uploading…" : "Upload Logo"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  disabled={logoUploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadLogo(f);
                    e.target.value = "";
                  }}
                />
              </label>
              {logoError && <p className="mt-1 text-[12.5px] text-red-700">{logoError}</p>}
              <p className="mt-1.5 text-[12.5px] text-ink-2">
                {logos.length > 0 ? "Pick a suggestion, upload your own, or leave it blank." : "Upload your own, or leave it blank."}
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
            {/* E123/E126 — the shared country-first block, so this modal and
                Your Details ask the same question the same way. */}
          </div>

          <LocationFields
            value={{
              city: employerForm.city,
              state: employerForm.state,
              country: employerForm.country,
            }}
            // The form's fields are non-null strings; the shared block speaks
            // nullable. Normalise on the way in rather than loosening the form.
            onChange={(patch) =>
              setEmployerForm({
                ...employerForm,
                ...(patch.city !== undefined ? { city: patch.city ?? "" } : {}),
                ...(patch.state !== undefined ? { state: patch.state ?? "" } : {}),
                ...(patch.country !== undefined
                  ? { country: patch.country ?? "" }
                  : {}),
              })
            }
          />
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
            className="border border-ink bg-surface px-5 py-2.5 font-semibold text-ink hover:bg-surface-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveEmployer}
            disabled={busy || !employerForm.name.trim()}
            className="bg-ink px-6 py-2.5 font-semibold text-surface transition-colors hover:bg-ink-hover disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save Company"}
          </button>
        </div>
      </Modal>

      {/* ---- Project modal (brief_project_model_v2) ------------------- */}
      <ProjectModal
        // E113 — the modal offers these as the Client choices, plus "Other".
        employerNames={employers.map((e) => e.name).filter(Boolean)}
        open={projectModal !== null}
        isEdit={Boolean(projectModal?.project)}
        projectId={projectModal?.project?.id}
        validationStatus={projectModal?.project?.validationStatus}
        validationRequestedAt={projectModal?.project?.validationRequestedAt}
        draft={projectForm}
        onChange={(patch) => setProjectForm((f) => ({ ...f, ...patch }))}
        onClose={() => setProjectModal(null)}
        onSave={saveProject}
        busy={busy}
        onDelete={
          projectModal?.project
            ? async () => {
                if (
                  await post({
                    action: "deleteProject",
                    projectId: projectModal.project!.id,
                  })
                ) {
                  setProjectModal(null);
                }
              }
            : undefined
        }
      />

      <ArtifactsModal
        open={artifactsFor !== null}
        onClose={() => setArtifactsFor(null)}
        ownerLabel={artifactsFor?.label ?? ""}
        owner={
          artifactsFor?.kind === "employer"
            ? { employerId: artifactsFor.id }
            : { projectId: artifactsFor?.id }
        }
        artifacts={artifactsFor?.items ?? []}
        onChanged={(all) => {
          // The API hands back EVERY artifact on the profile; keep the open
          // modal's list in sync and refresh the cards underneath.
          if (artifactsFor) {
            const mine = all.filter((a) =>
              artifactsFor.kind === "employer"
                ? a.employerId === artifactsFor.id
                : a.projectId === artifactsFor.id
            );
            setArtifactsFor({ ...artifactsFor, items: mine });
          }
          // Re-read the employers list so the cards under the modal show the
          // new counts — the artifacts API doesn't return employers.
          void fetch("/api/provider/employers")
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
              if (d?.employers) onChanged(d.employers as EmployerCard[]);
            })
            .catch(() => {});
        }}
      />

      {busy && employers.length > 0 && (
        <div className="mt-3">
          <Notice tone="info">Saving…</Notice>
        </div>
      )}
    </div>
  );
}
