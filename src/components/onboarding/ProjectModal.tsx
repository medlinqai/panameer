"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { Field, TextInput, TextArea, Chip, Notice } from "@/components/onboarding/controls";

/**
 * Add / Edit Project — the v2 capture form (brief_project_model_v2).
 *
 * A project is now the reporting grain of the product, so this modal collects a
 * lot. It is grouped into labelled sections rather than one long field run —
 * Identity, Timeline, Classification, What You Did, Outcomes, Proof, Media — so
 * it reads as six short forms instead of one intimidating one, and it scrolls
 * inside the centred dialog (E058).
 *
 * CLASSIFICATION IS CATALOG-LINKED, not free text: role is a single-select over
 * `RoleType`, tools are a multi-select over `Application`. That is what makes
 * "every Technical project that used Supplier Portal" a query later. Typing a
 * tool we don't carry adds it as a custom, flagged for admin review.
 */

export type ProjectDraft = {
  name: string;
  codeName: string;
  clientName: string;
  clientVisibility: "PUBLIC" | "PLUS_ONLY" | "CONFIDENTIAL";
  logoUrl: string | null;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  roleTypeId: string;
  industrySpecializationId: string;
  applicationIds: string[];
  customApplications: string[];
  description: string;
  highlights: string[];
  outcomes: { label: string; value: string }[];
  contactEmail: string;
  imageUrl: string;
  url: string;
  videoUrl: string;
  documentPath: string | null;
  documentName: string | null;
};

export const emptyProject = (): ProjectDraft => ({
  name: "",
  codeName: "",
  clientName: "",
  clientVisibility: "PUBLIC",
  logoUrl: null,
  startDate: "",
  endDate: "",
  isCurrent: false,
  roleTypeId: "",
  industrySpecializationId: "",
  applicationIds: [],
  customApplications: [],
  description: "",
  highlights: [],
  outcomes: [],
  contactEmail: "",
  imageUrl: "",
  url: "",
  videoUrl: "",
  documentPath: null,
  documentName: null,
});

type RoleTypeOpt = { id: string; name: string; display: string };
type AppOpt = { id: string; name: string; isCustom: boolean };
type IndustryOpt = { id: string; name: string };
type LogoSuggestion = { url: string; source: string; label: string };

/** Cap the tool suggestions, like every other picker (brief_Y / E053). */
const MAX_APP_SUGGESTIONS = 12;

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-4 first:border-t-0 first:pt-0">
      <h3 className="mb-3 text-[12px] font-bold uppercase tracking-wide text-ink-2">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function ProjectModal({
  open,
  draft,
  onChange,
  onClose,
  onSave,
  onDelete,
  busy = false,
  error,
  isEdit,
}: {
  open: boolean;
  draft: ProjectDraft;
  onChange: (patch: Partial<ProjectDraft>) => void;
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
  busy?: boolean;
  error?: string | null;
  isEdit: boolean;
}) {
  const [roleTypes, setRoleTypes] = useState<RoleTypeOpt[]>([]);
  const [apps, setApps] = useState<AppOpt[]>([]);
  const [industries, setIndustries] = useState<IndustryOpt[]>([]);
  const [appQuery, setAppQuery] = useState("");
  const [logos, setLogos] = useState<LogoSuggestion[]>([]);
  const [logoLoading, setLogoLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Reference data — loaded once the modal is first opened, not on mount, so a
  // provider who never adds a project never pays for these three requests.
  useEffect(() => {
    if (!open || roleTypes.length > 0) return;
    fetch("/api/catalog/role-types")
      .then((r) => r.json())
      .then((d) => setRoleTypes(d.roleTypes ?? []))
      .catch(() => {});
    fetch("/api/catalog/applications")
      .then((r) => r.json())
      .then((d) => setApps(d.applications ?? []))
      .catch(() => {});
    fetch("/api/catalog/specializations")
      .then((r) => r.json())
      .then((d) => {
        const group = (d.groups ?? []).find(
          (g: { kind: string }) => g.kind === "INDUSTRY"
        );
        setIndustries(group?.items ?? []);
      })
      .catch(() => {});
  }, [open, roleTypes.length]);

  // Logo suggestions from the CLIENT name — the E043 flow, one debounce.
  const clientName = draft.clientName;
  const suggestLogos = useCallback(async (name: string) => {
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
      setLogos([]);
    } finally {
      setLogoLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => void suggestLogos(clientName), 500);
    return () => clearTimeout(t);
  }, [open, clientName, suggestLogos]);

  const q = appQuery.trim().toLowerCase();
  const chosenApps = new Set(draft.applicationIds);
  const matching = apps.filter(
    (a) => !chosenApps.has(a.id) && (!q || a.name.toLowerCase().includes(q))
  );
  const shownApps = matching.slice(0, MAX_APP_SUGGESTIONS);
  const hiddenApps = matching.length - shownApps.length;

  const addCustomApp = () => {
    const name = appQuery.trim();
    if (!name) return;
    const existing = apps.find(
      (a) => a.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) {
      if (!chosenApps.has(existing.id)) {
        onChange({ applicationIds: [...draft.applicationIds, existing.id] });
      }
    } else if (
      !draft.customApplications.some((c) => c.toLowerCase() === name.toLowerCase())
    ) {
      onChange({ customApplications: [...draft.customApplications, name] });
    }
    setAppQuery("");
  };

  const uploadDoc = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const r = await fetch("/api/provider/project-file", { method: "POST", body });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setUploadError(d.error ?? "Could not upload that file.");
        return;
      }
      onChange({ documentPath: d.path, documentName: d.name });
    } catch {
      setUploadError("Could not upload that file.");
    } finally {
      setUploading(false);
    }
  };

  // Mirrors the server's required set exactly (see `projectData`), so Save is
  // never enabled for something the API will refuse.
  const missing: string[] = [];
  if (!draft.name.trim()) missing.push("project name");
  if (!draft.clientName.trim()) missing.push("client");
  if (!draft.roleTypeId) missing.push("role");
  if (!draft.startDate) missing.push("start date");
  if (!draft.description.trim()) missing.push("description");
  if (!draft.isCurrent && !draft.endDate) missing.push("end date");
  if (draft.clientVisibility === "CONFIDENTIAL" && !draft.codeName.trim()) {
    missing.push("code name");
  }
  const canSave = missing.length === 0;

  const setHighlight = (i: number, v: string) =>
    onChange({ highlights: draft.highlights.map((h, n) => (n === i ? v : h)) });
  const setOutcome = (i: number, patch: Partial<{ label: string; value: string }>) =>
    onChange({
      outcomes: draft.outcomes.map((o, n) => (n === i ? { ...o, ...patch } : o)),
    });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Project" : "Add Project"}
      width="max-w-2xl"
    >
      <div className="space-y-5">
        {error && <Notice>{error}</Notice>}

        {/* ---- Identity -------------------------------------------------- */}
        <Group title="Identity">
          <Field label="Project Name *">
            <TextInput
              value={draft.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="Global P2P Transformation"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Client *">
              <TextInput
                value={draft.clientName}
                onChange={(e) => onChange({ clientName: e.target.value })}
                placeholder="Northwind Industrials"
              />
            </Field>
            <Field
              label={
                draft.clientVisibility === "CONFIDENTIAL"
                  ? "Code Name *"
                  : "Code Name"
              }
              hint="Shown instead of the client when confidential."
            >
              <TextInput
                value={draft.codeName}
                onChange={(e) => onChange({ codeName: e.target.value })}
                placeholder="Project Falcon"
              />
            </Field>
          </div>

          <Field
            label="Who Can See The Client"
            hint="Confidential hides the client name everywhere — the card shows your code name and the industry instead."
          >
            <select
              value={draft.clientVisibility}
              onChange={(e) =>
                onChange({
                  clientVisibility: e.target.value as ProjectDraft["clientVisibility"],
                })
              }
              className="w-full rounded-[12px] border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none transition-colors focus:border-magenta"
            >
              <option value="PUBLIC">Everyone</option>
              <option value="PLUS_ONLY">Panameer Plus buyers only</option>
              <option value="CONFIDENTIAL">Confidential — hide the client</option>
            </select>
          </Field>

          {draft.clientVisibility === "PLUS_ONLY" && (
            <p className="text-[12.5px] text-ink-2">
              Plus isn&apos;t live yet — until it is, this behaves like
              &ldquo;Everyone&rdquo;.
            </p>
          )}

          {draft.clientVisibility !== "CONFIDENTIAL" && (
            <div>
              <p className="mb-2 text-[13px] font-bold">Client Logo</p>
              <div className="flex flex-wrap items-center gap-2">
                {draft.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={draft.logoUrl}
                    alt="Selected logo"
                    className="h-12 w-12 rounded-[8px] border-2 border-magenta bg-white object-contain p-1"
                  />
                )}
                {logoLoading && <span className="text-[13px] text-ink-2">Looking…</span>}
                {logos
                  .filter((l) => l.url !== draft.logoUrl)
                  .map((l) => (
                    <button
                      key={l.url}
                      type="button"
                      title={l.label}
                      onClick={() => onChange({ logoUrl: l.url })}
                      className="rounded-[8px] border border-line bg-white p-1 transition-colors hover:border-magenta"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={l.url} alt={l.label} className="h-10 w-10 object-contain" />
                    </button>
                  ))}
                {draft.logoUrl && (
                  <button
                    type="button"
                    onClick={() => onChange({ logoUrl: null })}
                    className="text-[13px] font-bold text-ink-2 underline underline-offset-4 hover:text-magenta"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-[12.5px] text-ink-2">
                Suggested from the client name — pick one or leave it blank.
              </p>
            </div>
          )}
        </Group>

        {/* ---- Timeline -------------------------------------------------- */}
        <Group title="Timeline">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="From *">
              <TextInput
                type="date"
                value={draft.startDate}
                onChange={(e) => onChange({ startDate: e.target.value })}
              />
            </Field>
            <Field label={draft.isCurrent ? "To" : "To *"}>
              <TextInput
                type="date"
                value={draft.endDate}
                disabled={draft.isCurrent}
                onChange={(e) => onChange({ endDate: e.target.value })}
              />
            </Field>
          </div>
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={draft.isCurrent}
              onChange={(e) =>
                onChange({
                  isCurrent: e.target.checked,
                  endDate: e.target.checked ? "" : draft.endDate,
                })
              }
              className="h-4 w-4 accent-[#D72CD6]"
            />
            <span className="text-[14px]">I currently work on this</span>
          </label>
        </Group>

        {/* ---- Classification -------------------------------------------- */}
        <Group title="Classification">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Your Role *" hint="What you did on this project.">
              <select
                value={draft.roleTypeId}
                onChange={(e) => onChange({ roleTypeId: e.target.value })}
                className="w-full rounded-[12px] border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none transition-colors focus:border-magenta"
              >
                <option value="">Choose a role…</option>
                {roleTypes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Industry"
              hint="Shown on the card when the client is confidential."
            >
              <select
                value={draft.industrySpecializationId}
                onChange={(e) =>
                  onChange({ industrySpecializationId: e.target.value })
                }
                className="w-full rounded-[12px] border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none transition-colors focus:border-magenta"
              >
                <option value="">—</option>
                {industries.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-bold">
              Tools &amp; Applications{" "}
              <span className="font-normal text-ink-2">
                ({draft.applicationIds.length + draft.customApplications.length})
              </span>
            </p>
            {(draft.applicationIds.length > 0 ||
              draft.customApplications.length > 0) && (
              <div className="mb-2 flex max-h-[84px] flex-wrap gap-2 overflow-y-auto overscroll-contain pr-1">
                {draft.applicationIds.map((id) => (
                  <Chip
                    key={id}
                    selected
                    onClick={() =>
                      onChange({
                        applicationIds: draft.applicationIds.filter((x) => x !== id),
                      })
                    }
                  >
                    {apps.find((a) => a.id === id)?.name ?? "Tool"}
                  </Chip>
                ))}
                {draft.customApplications.map((name) => (
                  <Chip
                    key={`custom:${name}`}
                    selected
                    onClick={() =>
                      onChange({
                        customApplications: draft.customApplications.filter(
                          (c) => c !== name
                        ),
                      })
                    }
                  >
                    {name}
                  </Chip>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Field label="Search or Add a Tool">
                  <TextInput
                    value={appQuery}
                    onChange={(e) => setAppQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomApp();
                      }
                    }}
                    placeholder="Start typing… e.g. Supplier Portal"
                  />
                </Field>
              </div>
              <button
                type="button"
                onClick={addCustomApp}
                disabled={!appQuery.trim()}
                className="mb-[2px] rounded-full border-[1.5px] border-line px-5 py-3 font-bold text-ink transition-colors hover:border-magenta hover:text-magenta disabled:opacity-40"
              >
                + Add
              </button>
            </div>
            <div className="mt-2 max-h-[104px] overflow-y-auto overscroll-contain rounded-[12px] border border-line/70 bg-bg-soft/40 p-3">
              <div className="flex flex-wrap gap-2">
                {shownApps.map((a) => (
                  <Chip
                    key={a.id}
                    selected={false}
                    onClick={() =>
                      onChange({ applicationIds: [...draft.applicationIds, a.id] })
                    }
                  >
                    {a.name}
                  </Chip>
                ))}
                {shownApps.length === 0 && (
                  <p className="text-[13.5px] text-ink-2">
                    No matches — use &ldquo;+ Add&rdquo; to create it.
                  </p>
                )}
              </div>
            </div>
            {hiddenApps > 0 && (
              <p className="mt-1.5 text-[12.5px] text-ink-2">
                +{hiddenApps} more — keep typing to narrow the list.
              </p>
            )}
          </div>
        </Group>

        {/* ---- What you did ---------------------------------------------- */}
        <Group title="What You Did">
          <Field label="Overview *">
            <TextArea
              value={draft.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="End-to-end Procure-to-Pay rollout across 14 countries…"
            />
          </Field>

          <div>
            <p className="mb-2 text-[13px] font-bold">Highlights</p>
            <div className="space-y-2">
              {draft.highlights.map((h, i) => (
                <div key={i} className="flex items-center gap-2">
                  <TextInput
                    value={h}
                    onChange={(e) => setHighlight(i, e.target.value)}
                    placeholder="Replaced 6 legacy purchasing systems"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        highlights: draft.highlights.filter((_, n) => n !== i),
                      })
                    }
                    aria-label="Remove highlight"
                    className="shrink-0 text-[13px] font-bold text-ink-2 hover:text-red-600"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onChange({ highlights: [...draft.highlights, ""] })}
              className="mt-2 text-[14px] font-bold text-magenta hover:text-magenta-dark"
            >
              + Add a highlight
            </button>
          </div>
        </Group>

        {/* ---- Outcomes --------------------------------------------------- */}
        <Group title="Outcomes">
          <p className="text-[13px] text-ink-2">
            Numbers are the most persuasive thing on your profile — savings,
            timelines, volumes.
          </p>
          <div className="space-y-2">
            {draft.outcomes.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <TextInput
                  value={o.label}
                  onChange={(e) => setOutcome(i, { label: e.target.value })}
                  placeholder="Savings"
                />
                <TextInput
                  value={o.value}
                  onChange={(e) => setOutcome(i, { value: e.target.value })}
                  placeholder="$10M+"
                />
                <button
                  type="button"
                  onClick={() =>
                    onChange({ outcomes: draft.outcomes.filter((_, n) => n !== i) })
                  }
                  aria-label="Remove outcome"
                  className="shrink-0 text-[13px] font-bold text-ink-2 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              onChange({ outcomes: [...draft.outcomes, { label: "", value: "" }] })
            }
            className="text-[14px] font-bold text-magenta hover:text-magenta-dark"
          >
            + Add an outcome
          </button>
        </Group>

        {/* ---- Proof ------------------------------------------------------ */}
        <Group title="Proof">
          <Field
            label="Client Contact Email"
            hint="We'll ask them to validate this project. Nothing is sent yet."
          >
            <TextInput
              type="email"
              value={draft.contactEmail}
              onChange={(e) => onChange({ contactEmail: e.target.value })}
              placeholder="programme.director@client.com"
            />
          </Field>
        </Group>

        {/* ---- Media ------------------------------------------------------ */}
        <Group title="Media">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Cover Image URL">
              <TextInput
                type="url"
                value={draft.imageUrl}
                onChange={(e) => onChange({ imageUrl: e.target.value })}
                placeholder="https://…"
              />
            </Field>
            <Field label="Video URL">
              <TextInput
                type="url"
                value={draft.videoUrl}
                onChange={(e) => onChange({ videoUrl: e.target.value })}
                placeholder="https://…"
              />
            </Field>
          </div>
          <Field label="Project Link">
            <TextInput
              type="url"
              value={draft.url}
              onChange={(e) => onChange({ url: e.target.value })}
              placeholder="https://…"
            />
          </Field>

          <div>
            <span className="mb-1.5 block text-[14px] font-bold text-ink">
              Supporting Document
            </span>
            {draft.documentPath ? (
              <div className="flex items-center gap-3 text-[14px]">
                <span className="truncate font-semibold">
                  📎 {draft.documentName ?? "Attached"}
                </span>
                <button
                  type="button"
                  onClick={() => onChange({ documentPath: null, documentName: null })}
                  className="text-[13px] font-bold text-ink-2 underline underline-offset-4 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="inline-flex cursor-pointer items-center rounded-full border-[1.5px] border-line px-4 py-2 text-[13.5px] font-bold text-ink transition-colors hover:border-magenta hover:text-magenta">
                {uploading ? "Uploading…" : "Attach PDF, Doc or Image"}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadDoc(f);
                  }}
                />
              </label>
            )}
            <p className="mt-1.5 text-[12.5px] text-ink-2">
              Stored privately — never shown publicly.
            </p>
            {uploadError && (
              <p className="mt-1.5 text-[13px] text-red-700">{uploadError}</p>
            )}
          </div>
        </Group>
      </div>

      {!canSave && (
        <p className="mt-4 rounded-[10px] bg-bg-soft px-3 py-2 text-[13px] text-ink-2">
          Still needed: {missing.join(", ")}.
        </p>
      )}

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-5">
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="text-[15px] font-semibold text-red-600 underline underline-offset-4 disabled:opacity-40"
          >
            Delete
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-full border-[1.5px] border-line px-5 py-2.5 font-bold text-ink hover:border-[#d9d4e2] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={busy || !canSave}
            className="rounded-full bg-magenta px-6 py-2.5 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save Project"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
