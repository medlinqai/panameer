"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
/* ⚠ THE LOSS SENTENCE IS THE LIB'S, NOT RE-TYPED HERE (`E296`). */
import { describeProjectLoss as describeLoss } from "@/lib/reclassify";
import { Field, TextInput, TextArea, Notice } from "@/components/onboarding/controls";
import { LocationFields } from "@/components/onboarding/LocationFields";

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

/**
 * "Your Employers" capture step (brief_U, per `employer-project-step-mockup.png`).
 *
 * Imported employers show as cards with edit/delete pencils; clicking a card
 * opens it to add PROJECTS within that job. Manual users get an empty state
 * with "+ Add Employer".
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
  /** brief_project_model_v2 — the rest of the card + modal payload. */
  isCurrent?: boolean;
  /** ⚠ `P1-J1.4-E296` — carried so a conversion round-trips. Not rendered. */
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
  /*
    WS-4 — the per-job attribution the review step reads and writes. Optional
    because this card type is also built by surfaces that predate the per-job
    model (Settings, the project modal) and have no business inventing a suite.
  */
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



function dateRange(a: string | null, b: string | null, current: boolean) {
  if (!a && !b) return "";
  const y = (d: string | null) => (d ? d.slice(0, 4) : "?");
  return `${y(a)} – ${current ? "Present" : b ? y(b) : "Present"}`;
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
  /**
   * ⚠⚠ THE FLAT LIST, FOR THE OTHER HALF OF THE `E294` HOLE (`P1-J1.4-E296`).
   *
   * `listEmployers` returns projects NESTED UNDER employers only, so a project
   * with `employer_id: null` vanishes from that payload entirely. The Review step
   * already renders those as "Solo Projects"; THIS step did not, so somebody who
   * imported a résumé saw them on Review, came back to fix them, and found no
   * trace of them on the page where employers are edited.
   * ⚠ THE WIZARD'S STATUS PAYLOAD RETURNS THE FULL FLAT LIST DELIBERATELY —
   * `lib/onboarding.ts` says why. This prop is that list.
   */
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

  const [projectModal, setProjectModal] = useState<
    { employerId: string; project?: EmployerProject } | null
  >(null);

  /*
    ── ⚠⚠ RECLASSIFY IN PLACE (`P1-J1.4-E296`) ────────────────────────────────

    SCOTT: *"Maybe if there was a employer/project radio button?"* — so it is a
    radio, and it changes NOTHING until Save. A radio that mutates on click is a
    trapdoor.
  */
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
  /*
    ⚠ UNDO IS THE INVERSE CONVERSION, NOT A SNAPSHOT TABLE. The two directions
    are exact inverses now that `role_title` and `location` exist, so all that is
    held here is what to call the opposite action with.
    ⚠ AND IT IS PAGE-STATE ONLY, WHICH THE STRING SAYS OUT LOUD.
  */
  const [undo, setUndo] = useState<
    | { kind: "toProject"; projectId: string; name: string }
    | { kind: "toEmployer"; employerId: string; name: string; targetEmployerId: string; clientName: string }
    | null
  >(null);
  const [projectForm, setProjectForm] = useState<ProjectDraft>(emptyProject());
  /**
   * WS4 — which owner's artifacts are open. One modal serves BOTH an employer
   * and a project; the owner id decides which, and the server re-checks it.
   */
  const [artifactsFor, setArtifactsFor] = useState<
    | { kind: "employer"; id: string; label: string; items: ArtifactView[] }
    | { kind: "project"; id: string; label: string; items: ArtifactView[] }
    | null
  >(null);

  const [logos, setLogos] = useState<LogoSuggestion[]>([]);
  const [logoLoading, setLogoLoading] = useState(false);

  /*
    ⚠ THE UNATTACHED ROWS, DERIVED not fetched (`P1-J1.4-E296`). `projects` is the
    FLAT list from the wizard's status payload; anything already nested under an
    employer is filtered out by id so a row never appears twice on one screen.
  */
  const nested = new Set(employers.flatMap((e) => (e.projects ?? []).map((p) => p.id)));
  const unplaced = projects.filter((p) => !nested.has(p.id));

  /*
    ⚠ IT RETURNS THE PAYLOAD, NOT A BOOLEAN (`P1-J1.4-E296`).
    ⚠ SUPERSEDED, quoted: `Promise<boolean>`. The conversion actions return the id
    of the row they CREATED, and Undo has to call the inverse with that id — a
    boolean threw it away, and the first draft of Undo silently posted an empty
    string. An object is still truthy, so every existing `if (ok)` call site
    behaves exactly as before.
  */
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
      /* ⚠ `projectLoss` is a READ and returns no employer list — leave the list
         alone rather than blanking it. */
      if (data.employers) onChanged(data.employers);
      return data;
    } finally {
      setBusy(false);
    }
  };

  /*
    ⚠ WHAT WOULD BE LOST, FETCHED BEFORE THE DIALOG COMMITS (`E296`). Counted and
    NAMED by the server — never a generic "some data may be lost", which tells
    nobody anything.
  */
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

  /**
   * E127 — a range that ends before it starts (shared by employers and
   * projects). Certifications already refused expiry-before-issue; work history
   * and projects accepted it silently and then rendered "2019 – 2015" on the
   * profile, which reads as broken data rather than as a typo.
   */
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

  const openProject = (employerId: string, project?: EmployerProject) => {
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
            /*
              E113 — a project added from INSIDE a job defaults its client to
              that job's employer. It is the answer in every case but the
              exception (a project delivered for someone else), and typing the
              name of the company you are standing in is pure friction.
            */
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
          {/*
            E112 + E116 — a STACK, not a 3-column grid, and the two errors have
            one cause.

            At three across, each card got ~310px of a 976px column, so
            "Lead Oracle Cloud Procurement Consultant" wrapped to three lines and
            every project title wrapped too — the "squished" cards. And because
            grid cells share a row, expanding one card to show its projects
            re-flowed the two beside it: the page visibly jumped before the
            add-project modal appeared. Full-width rows fix both at once — the
            text gets the whole column, and expansion pushes content DOWN instead
            of shoving neighbours sideways.
          */}
          <div className="space-y-4">
            {/* WS9b/E143 — tick the wrong AI-added employers and remove them in
                one action instead of a trash icon and a confirm() per card. */}
            <BulkSelectBar
              label="employers"
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
                    ? "border-magenta bg-magenta/[0.04]"
                    : "border-line")
                }
              >
                <div className="mb-3 flex items-center justify-end gap-2">
                  {bulk.active && (
                    <span className="mr-auto">
                      <SelectTick
                        checked={bulk.picked.has(e.id)}
                        onChange={() => bulk.toggle(e.id)}
                        label={e.name}
                      />
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => openEditEmployer(e)}
                    aria-label={`Edit ${e.name}`}
                    className="grid h-9 w-9 place-items-center rounded-full border-[1.5px] border-magenta text-magenta transition-colors hover:bg-magenta hover:text-white"
                  >
                    ✏️
                  </button>
                  {/*
                    ── ⚠ THE THIRD CONTROL (`P1-J1.4-E296`) ────────────────────
                    SCOTT: *"I would need to delete EVERY employer and then
                    re-add them as a project."* Same 9x9 magenta circle as its two
                    neighbours — no new button style was invented.
                  */}
                  <button
                    type="button"
                    onClick={() => {
                      setReclassify({ kind: "employer", id: e.id, name: e.name });
                      setReclassifyAs("employer");
                      setReclassifyTarget("");
                      setReclassifyClient("");
                      setLoss(null);
                    }}
                    aria-label={`Change what ${e.name} is`}
                    title="This is a project, not a job"
                    className="grid h-9 w-9 place-items-center rounded-full border-[1.5px] border-magenta text-magenta transition-colors hover:bg-magenta hover:text-white"
                  >
                    ⇄
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      /*
                        ── ⚠⚠ `P1-J1.4-E307` — THIS SENTENCE WAS FALSE ──────────

                        ⚠ SUPERSEDED, quoted: *"Remove {name}? Its projects will
                        be removed too."* `Project.employer_id` is
                        `onDelete: SetNull`, NOT Cascade — the projects are not
                        removed, they are ORPHANED, and because `listEmployers`
                        only reaches projects through their employer they became
                        INVISIBLE while still sitting in the database.
                        ⚠ THE SCHEMA IS RIGHT AND THE COPY WAS WRONG. Deleting a
                        job must not destroy the project history under it, and
                        there is now somewhere for the orphans to land — the
                        "Projects not yet under a job" section below.
                      */
                      if (
                        confirm(
                          `Remove ${e.name}? Any projects under it are kept — they move to “Projects not yet under a job”, where you can place them again.`
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
                  onClick={() =>
                    setArtifactsFor({
                      kind: "employer",
                      id: e.id,
                      label: e.name,
                      items: e.artifacts ?? [],
                    })
                  }
                  /*
                    E125 — GREY WHEN EMPTY. Magenta reads as "this opens
                    something you have", so an empty Artifacts link beside a live
                    Edit link promised content that wasn't there.

                    Still CLICKABLE, deliberately: in the editor this link is the
                    only way to attach the first artifact, so disabling it at zero
                    would remove the feature rather than fix the signal. Colour
                    carries the state; the action stays available. On the
                    read-only profile (`WorkHistoryEntry`) there is nothing to
                    open, and there it is genuinely disabled.
                  */
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
                              {/* ⚠ THE MIRROR CONTROL (`P1-J1.4-E296`) — same
                                  modal, radio defaulted to Project. */}
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
                      /*
                        E124 — ONE click. This used to only expand the card, and
                        the "+ Add Project" button it revealed was what actually
                        opened the modal — so a link that says "Add projects
                        within this job" did not add a project, it changed its own
                        label. Now it expands AND opens, which is what the label
                        promises.
                      */
                      onClick={() => {
                        setOpenId(e.id);
                        openProject(e.id);
                      }}
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

      {/*
        ── ⚠⚠ WS-6 — THE OTHER HALF OF THE `E294` HOLE (`P1-J1.4-E296`) ─────────

        `resume/import.ts` writes projects with `employer_id: null` whenever the
        model could not place them, and `listEmployers` only reaches projects
        through their employer — so those rows were INVISIBLE on this step. The
        Review step already showed them as "Solo Projects"; a user who imported a
        résumé saw them there, came back here to fix them, and found nothing.

        ⚠ ONE CONTROL, ONE CLICK, NO MODAL. Scott's whole point is the cheapness
        of the edit: *"what really determines the value of the AI is how easy the
        edit is."* A picker that fires `moveProject` on change is the cheapest
        correct thing. ⚠ IT IS ALSO WHERE ORPHANS FROM A DELETED JOB LAND, which
        is what makes `E307`'s corrected copy true.

        ⚠ RENDERED ONLY WHEN THE LIST IS NON-EMPTY — an empty "nothing to place"
        section on every profile is noise.
      */}
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
                <label className="flex items-center gap-2 text-[13px] text-ink-2">
                  <span className="sr-only">Put {pr.name} under a job</span>
                  <select
                    value=""
                    disabled={busy || employers.length === 0}
                    onChange={(ev) => {
                      const employerId = ev.target.value;
                      if (!employerId) return;
                      void post({ action: "moveProject", projectId: pr.id, employerId });
                    }}
                    className="rounded-[8px] border border-line bg-white px-2.5 py-1.5 text-[13.5px]"
                  >
                    <option value="">
                      {employers.length === 0 ? "Add a job first" : "Put it under…"}
                    </option>
                    {employers.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/*
        ── ⚠ UNDO — THE INVERSE, NOT A SNAPSHOT (`P1-J1.4-E296`) ────────────────

        ⚠ NO UNDO LOG, NO UNDO TABLE, NO SOFT DELETE. The two conversions are
        exact inverses now that `role_title` and `location` have a home, so undo
        is just the opposite call with what the client already knew.
        ⚠ PERSISTENT, NOT A TOAST — a timed toast on a destructive edit is a race
        with the reader.
        ⚠ AND THE STRING SAYS ITS OWN SCOPE. "Undo" unqualified promises
        durability that does not exist here.
      */}
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

      {/*
        ── ⚠⚠ THE RECLASSIFY MODAL (`P1-J1.4-E296`) ─────────────────────────────

        SCOTT ASKED FOR A RADIO, SO IT SHIPS A RADIO. ⚠ AND THE RADIO CHANGES
        NOTHING UNTIL SAVE — a radio that mutates on click is a trapdoor on a
        destructive edit.
        ⚠ THE EXISTING `Modal` COMPONENT, not a hand-rolled one.
        ⚠ SAVE IS DISABLED UNTIL THE CHOICE IS COMPLETE. The modal is not the
        security boundary — the lib re-checks every id against the session — but
        it must not offer an impossible save.
      */}
      <Modal
        open={reclassify !== null}
        onClose={() => setReclassify(null)}
        title={reclassify ? `What is “${reclassify.name}”?` : ""}
      >
        {reclassify && (
          <div className="space-y-4">
            <fieldset className="grid gap-2">
              <legend className="sr-only">Employer or project</legend>
              {(["employer", "project"] as const).map((v) => (
                <label
                  key={v}
                  className={
                    "flex cursor-pointer items-start gap-3 rounded-[10px] border p-3 " +
                    (reclassifyAs === v ? "border-magenta bg-magenta/[0.04]" : "border-line")
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
                      /*
                        ⚠ SUGGESTED, THEN CONFIRMED — NEVER AUTO-APPLIED. The
                        `E043` rule the logo and `client_domain` already follow.
                        The natural client is the job it will sit under, but the
                        user has to be able to change it, and the server takes
                        whatever the field ends up holding.
                      */
                      const chosen = employers.find((x) => x.id === ev.target.value);
                      if (chosen && !reclassifyClient.trim()) setReclassifyClient(chosen.name);
                    }}
                    className="w-full rounded-[10px] border border-line px-3 py-2.5 text-[15px]"
                  >
                    <option value="">Choose a job…</option>
                    {/* ⚠ NEVER ITSELF. A row cannot be its own parent, and the
                        server refuses it too. */}
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
                <Field label="Employer name *">
                  <TextInput
                    value={reclassifyName}
                    onChange={(ev) => setReclassifyName(ev.target.value)}
                    placeholder="The company you worked for"
                  />
                </Field>
                <p className="text-[13px] leading-relaxed text-ink-2">
                  Its skills and artifacts move with it.
                </p>
                {/* ⚠⚠ ENUMERATED, NEVER GENERIC — the server counts and names it. */}
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
                className="rounded-full border-[1.5px] border-line px-5 py-2.5 font-bold text-ink transition-colors hover:border-magenta hover:text-magenta"
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
                      /* ⚠ THE INVERSE IS PRE-FILLED FROM THE SERVER'S OWN ANSWER —
                         `projectId` is the row it just created, which is the only
                         thing the opposite call needs. */
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
                      /*
                        ⚠ UNDOING THIS DIRECTION NEEDS A TARGET JOB, and the
                        project's original parent is gone by now. Only offer Undo
                        when there is somewhere for it to go back to — otherwise
                        the button would open a modal, which is not an undo.
                      */
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
                className="rounded-full bg-magenta px-6 py-2.5 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
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
