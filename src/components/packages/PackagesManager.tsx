"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import {
  Field,
  TextInput,
  TextArea,
  Notice,
} from "@/components/onboarding/controls";
import { formatCents, centsToDollarInput, dollarsToCents } from "@/lib/display";
import { GateNotice, type GateNoticeGap } from "@/components/GateNotice";

/**
 * Package management (brief_V / E045) — the provider's sellable catalog.
 *
 * Lives in Settings, NOT the onboarding wizard: packages are managed after
 * onboarding, so the wizard stays at 13 steps and a provider is never blocked
 * from publishing their profile by not having built an offering yet.
 *
 * Everything writes through the owner-scoped `/api/provider/packages`
 * endpoint, which re-checks each id against the session's own profile.
 */

export type PackageMilestone = { id?: string; label: string; percent: number };
export type PackageDeliverable = { id?: string; text: string };

export type ProviderPackage = {
  id: string;
  title: string;
  summary: string | null;
  durationWeeks: number | null;
  pricingType: string;
  priceCents: number | null;
  currency: string;
  coverImageUrl: string | null;
  status: string;
  deliverables: PackageDeliverable[];
  milestones: PackageMilestone[];
  skills: { id: string; name: string }[];
  /** The saved classification — see the note on the form controls. */
  capabilityDomainIds: string[];
  /** Derived from the first linked domain; null for a package that predates the field. */
  process: string | null;
};

export type CapabilityDomainOption = {
  id: string;
  process: string;
  name: string;
  key: string | null;
};

/** The default payment terms Scott specified. */
const DEFAULT_MILESTONES: PackageMilestone[] = [
  { label: "Upfront", percent: 50 },
  { label: "On completion", percent: 50 },
];

const emptyForm = () => ({
  title: "",
  /* the chosen business process — one, because a provider almost never serves two */
  process: "",
  capabilityDomainIds: [] as string[],
  summary: "",
  durationWeeks: "",
  priceDollars: "",
  coverImageUrl: null as string | null,
  deliverables: [""],
  milestones: DEFAULT_MILESTONES.map((m) => ({ ...m })),
});
type Form = ReturnType<typeof emptyForm>;

/**
 * ⚠ `sellGaps` IS COMPUTED ON THE SERVER (`P1-ALL-E034`) and passed down. It
 * MIRRORS the publish gate in `setPackageStatus`; the lib is the boundary.
 */
export function PackagesManager({
  sellGaps = [],
}: {
  sellGaps?: GateNoticeGap[];
} = {}) {
  const cannotPublish = sellGaps.length > 0;
  const [packages, setPackages] = useState<ProviderPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modal, setModal] = useState<{ id?: string } | null>(null);
  const [form, setForm] = useState<Form>(emptyForm());
  const [uploading, setUploading] = useState(false);
  const [domains, setDomains] = useState<CapabilityDomainOption[]>([]);

  useEffect(() => {
    fetch("/api/provider/packages")
      .then((r) => (r.ok ? r.json() : { packages: [], capabilityDomains: [] }))
      .then((d) => {
        setPackages(d.packages ?? []);
        setDomains(d.capabilityDomains ?? []);
      })
      .catch(() => setError("We couldn't load your packages."))
      .finally(() => setLoading(false));
  }, []);

  const post = async (body: Record<string, unknown>): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/provider/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.error ?? "Could not save.");
        return false;
      }
      setPackages(data.packages ?? []);
      return true;
    } finally {
      setBusy(false);
    }
  };

  const openAdd = () => {
    setForm(emptyForm());
    setError(null);
    setModal({});
  };

  const openEdit = (p: ProviderPackage) => {
    setForm({
      title: p.title,
      /*
        ⚠ THE PROCESS IS RESTORED FROM THE SAVED DOMAINS, not from a stored column. If a
        legacy package has none it opens blank, which is exactly right: the notice below the
        picker then explains why it needs one.
      */
      process: p.process ?? "",
      capabilityDomainIds: p.capabilityDomainIds ?? [],
      summary: p.summary ?? "",
      durationWeeks: p.durationWeeks != null ? String(p.durationWeeks) : "",
      priceDollars: centsToDollarInput(p.priceCents),
      coverImageUrl: p.coverImageUrl,
      deliverables: p.deliverables.length
        ? p.deliverables.map((d) => d.text)
        : [""],
      milestones: p.milestones.length
        ? p.milestones.map((m) => ({ label: m.label, percent: m.percent }))
        : DEFAULT_MILESTONES.map((m) => ({ ...m })),
    });
    setError(null);
    setModal({ id: p.id });
  };

  /* nine processes, from the taxonomy the list endpoint sent — never a hard-coded list */
  const processes = [...new Set(domains.map((d) => d.process))].sort();
  /*
    ⚠ FILTERED BY THE CHOSEN PROCESS, AND THAT IS WHAT MAKES ~87 DOMAINS USABLE. A flat list
    of every domain in every process is unreadable and invites the wrong pick; nine options
    then ten is two easy decisions.
  */
  const domainsForProcess = domains.filter((d) => d.process === form.process);
  const allSelected =
    domainsForProcess.length > 0 &&
    domainsForProcess.every((d) => form.capabilityDomainIds.includes(d.id));
  /* a legacy package being edited that never had a domain — nagged, never blocked */
  const legacyUnclassified =
    Boolean(modal?.id) && form.capabilityDomainIds.length === 0;

  const milestoneTotal = form.milestones.reduce(
    (s, m) => s + (Number(m.percent) || 0),
    0,
  );

  const save = async () => {
    const pkg = {
      title: form.title,
      capabilityDomainIds: form.capabilityDomainIds,
      summary: form.summary,
      durationWeeks: form.durationWeeks ? Number(form.durationWeeks) : null,
      priceCents: dollarsToCents(form.priceDollars),
      coverImageUrl: form.coverImageUrl,
      deliverables: form.deliverables.map((d) => d.trim()).filter(Boolean),
      milestones: form.milestones
        .filter((m) => m.label.trim())
        .map((m) => ({ label: m.label, percent: Number(m.percent) })),
    };
    const ok = await post(
      modal?.id
        ? { action: "update", packageId: modal.id, package: pkg }
        : { action: "create", package: pkg },
    );
    if (ok) setModal(null);
  };

  const uploadCover = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const r = await fetch("/api/provider/package-image", {
        method: "POST",
        body,
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d.error ?? "Could not upload that image.");
        return;
      }
      setForm((f) => ({ ...f, coverImageUrl: d.url }));
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <p className="text-ink-2">Loading your packages…</p>;

  return (
    <div>
      {error && (
        <div className="mb-4">
          <Notice>{error}</Notice>
        </div>
      )}

      {/*
        ⚠⚠ SHOWN BEFORE THE BLOCK, ABOVE THE LIST (`P1-ALL-E034`). Scott's
        argument for the early gate is that the LATE one is what causes fake
        listings: *"you don't have details… then you add fake details and the
        product then is deemed to be fake."* Telling a seller what publishing
        needs while they are still BUILDING the product is the whole point —
        discovering it at the Publish button is the version that produces
        invented data.
        ⚠ BUILDING AND EDITING DRAFTS IS UNAFFECTED. This notice explains why
        Publish is disabled; nothing else on this page is.
      */}
      <GateNotice
        className="mb-4"
        heading="Before a buyer can see a service product"
        lede="Keep building — drafts are never blocked. These are what publishing needs."
        gaps={sellGaps}
      />

      {packages.length === 0 ? (
        <div className="rounded-brand border-2 border-dashed border-line p-10 text-center">
          <p className="font-bold">No service products yet</p>
          <p className="mx-auto mt-1 max-w-md text-[14px] text-ink-2">
            A package is something a buyer can buy outright — a fixed scope, a
            timeline and a price. For example: &ldquo;Install DocuSign for
            Oracle Cloud — 5 weeks, $40,000, 50% up front.&rdquo;
          </p>
          <button
            type="button"
            onClick={openAdd}
            className="mt-4 rounded-full bg-magenta px-6 py-3 font-bold text-white transition-colors hover:bg-magenta-dark"
          >
            + Create a Service Product
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {packages.map((p) => (
              <article
                key={p.id}
                className="rounded-brand border border-line p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-4">
                    {p.coverImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.coverImageUrl}
                        alt=""
                        className="h-16 w-16 flex-none rounded-[10px] border border-line object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[17px]">{p.title}</h3>
                        <span
                          className={
                            "rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide " +
                            (p.status === "PUBLISHED"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-bg-soft text-ink-2")
                          }
                        >
                          {p.status === "PUBLISHED" ? "Published" : "Draft"}
                        </span>
                      </div>
                      <p className="mt-1 text-[14px] text-ink-2">
                        {[
                          p.priceCents != null
                            ? formatCents(p.priceCents, p.currency)
                            : "No price",
                          p.durationWeeks != null
                            ? `${p.durationWeeks} week${p.durationWeeks === 1 ? "" : "s"}`
                            : null,
                          `${p.deliverables.length} deliverable${p.deliverables.length === 1 ? "" : "s"}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {p.milestones.length > 0 && (
                        <p className="mt-0.5 text-[13px] text-ink-2">
                          {p.milestones
                            .map((m) => `${m.percent}% ${m.label}`)
                            .join(" / ")}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/*
                      ⚠⚠ ONLY *PUBLISHING* IS BLOCKED (`P1-ALL-E034`).
                      `Unpublish` stays live for an already-published product —
                      nothing is retro-unpublished, and somebody who published
                      before the bar existed must still be able to withdraw it.
                      ⚠ THE BUTTON STAYS VISIBLE AND DISABLED, never hidden and
                      never `pointer-events: none` (the `E306` rule); the reason
                      is in the notice above the list.
                    */}
                    <button
                      type="button"
                      onClick={() =>
                        void post({
                          action: "setStatus",
                          packageId: p.id,
                          status:
                            p.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
                        })
                      }
                      disabled={
                        busy || (cannotPublish && p.status !== "PUBLISHED")
                      }
                      className="rounded-full border-[1.5px] border-line px-4 py-2 text-[13.5px] font-bold text-ink transition-colors hover:border-magenta hover:text-magenta disabled:opacity-50"
                    >
                      {p.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="rounded-full border-[1.5px] border-line px-4 py-2 text-[13.5px] font-bold text-ink transition-colors hover:border-magenta hover:text-magenta"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete "${p.title}"?`)) {
                          void post({ action: "delete", packageId: p.id });
                        }
                      }}
                      className="text-[13.5px] font-bold text-ink-2 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <button
            type="button"
            onClick={openAdd}
            className="mt-5 rounded-full border-[1.5px] border-line px-5 py-2.5 font-bold text-ink transition-colors hover:border-magenta hover:text-magenta"
          >
            + Create a Service Product
          </button>
        </>
      )}

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.id ? "Edit Package" : "Create a Service Product"}
        width="max-w-2xl"
      >
        <div className="space-y-4">
          <Field label="Title *">
            <TextInput
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Install DocuSign for Oracle Cloud"
            />
          </Field>

          {/*
            ⚠ CLASSIFICATION SITS DIRECTLY AFTER TITLE AND IS REQUIRED. Scott: "ok to put it
            near the top...REQUIRED." It is above scope and price because it decides whether
            the product is findable at all — the rest describes something nobody reaches
            otherwise.
          */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Business process *"
              hint="One process. Almost no provider serves more than one."
            >
              <select
                value={form.process}
                onChange={(e) =>
                  /*
                    ⚠ CHANGING PROCESS CLEARS THE DOMAINS, on purpose. A domain belongs to
                    exactly one process, so keeping the old selection would leave the product
                    classified under domains its process no longer offers — invisible in a way
                    that looks fine on screen.
                  */
                  setForm({
                    ...form,
                    process: e.target.value,
                    capabilityDomainIds: [],
                  })
                }
                aria-label="Business process"
                className="w-full rounded-[12px] border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none focus:border-magenta"
              >
                <option value="">Select a process…</option>
                {processes.map((pr) => (
                  <option key={pr} value={pr}>
                    {pr}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field
            label="Capability domains *"
            hint="This is how buyers find you: a roadmap line names a capability domain, and we show the products indexed to it. A product with none is invisible."
          >
            {!form.process ? (
              <p className="text-[14px] text-ink-2">
                Pick a business process first.
              </p>
            ) : (
              <>
                {/*
                  ⚠ ONE CLICK, NOT TEN. Scott: "Might have to be a 'select all CDs' as opposed
                  to choose which CD this agent runs on." A health check or an agent that
                  watches everything legitimately spans the whole process, and making that ten
                  clicks would push people to under-classify.
                */}
                <div className="mb-2.5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        capabilityDomainIds: allSelected
                          ? []
                          : domainsForProcess.map((d) => d.id),
                      })
                    }
                    className="rounded-[9px] border border-magenta px-3 py-1.5 text-[13px] font-bold text-magenta-dark"
                  >
                    {allSelected ? "Clear all" : "Select all in this process"}
                  </button>
                  <span className="text-[13px] text-ink-2">
                    {form.capabilityDomainIds.length} of{" "}
                    {domainsForProcess.length} selected
                  </span>
                </div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {domainsForProcess.map((d) => {
                    const on = form.capabilityDomainIds.includes(d.id);
                    return (
                      <label
                        key={d.id}
                        className={
                          "flex cursor-pointer items-start gap-2.5 rounded-[10px] border px-3 py-2 text-[14px] " +
                          (on
                            ? "border-magenta bg-magenta/[0.04]"
                            : "border-line")
                        }
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() =>
                            setForm({
                              ...form,
                              capabilityDomainIds: on
                                ? form.capabilityDomainIds.filter(
                                    (x) => x !== d.id,
                                  )
                                : [...form.capabilityDomainIds, d.id],
                            })
                          }
                          className="mt-0.5 accent-magenta"
                        />
                        <span className="text-ink">{d.name}</span>
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </Field>

          {/*
            ⚠ A NOTICE, NOT A BLOCK, FOR A PACKAGE THAT PREDATES THIS FIELD. Blocking every
            edit to a legacy package would freeze published catalog entries behind a field
            their author never saw. It can still be saved; it just cannot be found until it is
            classified, and it says so.
          */}
          {legacyUnclassified && (
            <Notice>
              This package has no capability domains yet, so buyers cannot find
              it from a roadmap. You can still save other changes — but pick at
              least one when you can.
            </Notice>
          )}

          <Field
            label="What's Included"
            hint="The scope a buyer is agreeing to."
          >
            <TextArea
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              placeholder="Integrate Oracle Cloud with DocuSign, create a resource org, onboard up to 5 contract admins…"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Price (USD)">
              <TextInput
                type="number"
                min="0"
                step="0.01"
                value={form.priceDollars}
                onChange={(e) =>
                  setForm({ ...form, priceDollars: e.target.value })
                }
                placeholder="40000"
              />
            </Field>
            <Field label="Duration (Weeks)">
              <TextInput
                type="number"
                min="0"
                value={form.durationWeeks}
                onChange={(e) =>
                  setForm({ ...form, durationWeeks: e.target.value })
                }
                placeholder="5"
              />
            </Field>
          </div>

          {/* Deliverables */}
          <div>
            <span className="mb-1.5 block text-[14px] font-bold text-ink">
              Deliverables
            </span>
            <div className="space-y-2">
              {form.deliverables.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <TextInput
                    value={d}
                    onChange={(e) => {
                      const next = [...form.deliverables];
                      next[i] = e.target.value;
                      setForm({ ...form, deliverables: next });
                    }}
                    placeholder="Oracle Cloud ↔ DocuSign integration configured"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        deliverables: form.deliverables.filter(
                          (_, n) => n !== i,
                        ),
                      })
                    }
                    aria-label="Remove deliverable"
                    className="shrink-0 px-2 text-[16px] text-ink-2 hover:text-red-600"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setForm({ ...form, deliverables: [...form.deliverables, ""] })
              }
              className="mt-2 text-[14px] font-bold text-magenta hover:text-magenta-dark"
            >
              + Add Deliverable
            </button>
          </div>

          {/* Payment milestones */}
          <div>
            <span className="mb-1.5 block text-[14px] font-bold text-ink">
              Payment Terms
            </span>
            <div className="space-y-2">
              {form.milestones.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <TextInput
                    value={m.label}
                    onChange={(e) => {
                      const next = [...form.milestones];
                      next[i] = { ...next[i], label: e.target.value };
                      setForm({ ...form, milestones: next });
                    }}
                    placeholder="Upfront"
                  />
                  <div className="relative w-28 shrink-0">
                    <TextInput
                      type="number"
                      min="1"
                      max="100"
                      value={m.percent}
                      onChange={(e) => {
                        const next = [...form.milestones];
                        next[i] = {
                          ...next[i],
                          percent: Number(e.target.value),
                        };
                        setForm({ ...form, milestones: next });
                      }}
                      className="pr-8"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-ink-2">
                      %
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        milestones: form.milestones.filter((_, n) => n !== i),
                      })
                    }
                    aria-label="Remove milestone"
                    className="shrink-0 px-2 text-[16px] text-ink-2 hover:text-red-600"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    milestones: [...form.milestones, { label: "", percent: 0 }],
                  })
                }
                className="text-[14px] font-bold text-magenta hover:text-magenta-dark"
              >
                + Add Milestone
              </button>
              {/* The server enforces this too; showing it live means the user
                  fixes it before submitting rather than after. */}
              <span
                className={
                  "text-[13px] font-bold " +
                  (milestoneTotal === 100 ? "text-emerald-600" : "text-red-700")
                }
              >
                Total {milestoneTotal}%
                {milestoneTotal === 100 ? " ✓" : " — must be 100%"}
              </span>
            </div>
          </div>

          {/* Cover image */}
          <div>
            <span className="mb-1.5 block text-[14px] font-bold text-ink">
              Cover Image
            </span>
            <div className="flex items-center gap-3">
              {form.coverImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.coverImageUrl}
                  alt=""
                  className="h-16 w-16 rounded-[10px] border border-line object-cover"
                />
              )}
              <label className="cursor-pointer rounded-full border-[1.5px] border-line px-4 py-2 text-[13.5px] font-bold text-ink transition-colors hover:border-magenta hover:text-magenta">
                {uploading
                  ? "Uploading…"
                  : form.coverImageUrl
                    ? "Replace"
                    : "Upload an Image"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadCover(f);
                  }}
                />
              </label>
              {form.coverImageUrl && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, coverImageUrl: null })}
                  className="text-[13.5px] font-bold text-ink-2 underline underline-offset-4 hover:text-magenta"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-line pt-5">
          <button
            type="button"
            onClick={() => setModal(null)}
            className="rounded-full border-[1.5px] border-line px-5 py-2.5 font-bold text-ink hover:border-[#d9d4e2]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy || !form.title.trim() || milestoneTotal !== 100}
            className="rounded-full bg-magenta px-6 py-2.5 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save Package"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
