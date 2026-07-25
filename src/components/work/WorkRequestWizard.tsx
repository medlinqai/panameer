"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WizardShell } from "@/components/onboarding/WizardShell";
import {
  OptionCard,
  Chip,
  Field,
  TextInput,
  TextArea,
  Notice,
} from "@/components/onboarding/controls";

const SCREENS = ["start", "skills", "scope", "location", "review"] as const;
type Screen = (typeof SCREENS)[number];

const EXPERIENCE_OPTIONS = [
  { value: "BEGINNER", label: "Entry Level" },
  { value: "MID_CAREER", label: "Intermediate" },
  { value: "EXPERT", label: "Expert" },
];
const DURATION_OPTIONS = [
  { value: "LT_1_MONTH", label: "Less Than 1 Month" },
  { value: "ONE_TO_3_MONTHS", label: "1–3 Months" },
  { value: "THREE_TO_6_MONTHS", label: "3–6 Months" },
  { value: "GT_6_MONTHS", label: "More Than 6 Months" },
];
const WORKSITE_OPTIONS = [
  { value: "REMOTE", title: "Remote", description: "Work is performed remotely." },
  { value: "ONSITE", title: "At Your Location", description: "On-site at your premises." },
  { value: "HYBRID", title: "Both (Hybrid)", description: "A mix of remote and on-site." },
];

type RoleType = { id: string; display: string };
type SkillOpt = { id: string; name: string };

type Fields = {
  roleTypeId: string | null;
  skillIds: string[];
  title: string;
  experienceLevel: string | null;
  budgetType: string | null;
  budgetDollars: string;
  duration: string | null;
  description: string;
  locationCountry: string | null; // "US" | "NON_US"
  worksite: string | null;
};

const empty = (): Fields => ({
  roleTypeId: null,
  skillIds: [],
  title: "",
  experienceLevel: null,
  budgetType: null,
  budgetDollars: "",
  duration: null,
  description: "",
  locationCountry: null,
  worksite: null,
});

const centsToDollars = (c: number | null) => (c == null ? "" : String(c / 100));

export function WorkRequestWizard() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>("start");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draftId, setDraftId] = useState<string | null>(null);
  const [f, setF] = useState<Fields>(empty());

  const [roleTypes, setRoleTypes] = useState<RoleType[]>([]);
  const [skillOpts, setSkillOpts] = useState<SkillOpt[]>([]);

  const idx = SCREENS.indexOf(screen);
  const progress = idx / (SCREENS.length - 1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hydrate = useCallback((wr: any) => {
    setDraftId(wr.id);
    setF({
      roleTypeId: wr.roleTypeId ?? null,
      skillIds: wr.skillIds ?? [],
      title: wr.title ?? "",
      experienceLevel: wr.experienceLevel ?? null,
      budgetType: wr.budgetType ?? null,
      budgetDollars: centsToDollars(wr.budgetAmountCents),
      duration: wr.duration ?? null,
      description: wr.description ?? "",
      locationCountry: wr.locationCountry ?? null,
      worksite: wr.worksite ?? null,
    });
  }, []);

  // Resume the buyer's most recent DRAFT, or start fresh.
  useEffect(() => {
    (async () => {
      const r = await fetch("/api/work-requests/current");
      if (r.ok) {
        const { draft } = await r.json();
        if (draft) {
          hydrate(draft);
          // Jump to the first incomplete step.
          if (!draft.roleTypeId || (draft.skillIds ?? []).length === 0) setScreen("skills");
          else if (!draft.title) setScreen("scope");
          else if (!draft.worksite) setScreen("location");
          else setScreen("review");
        }
      }
      setReady(true);
    })();
  }, [hydrate]);

  // Skills catalog.
  useEffect(() => {
    if (roleTypes.length === 0) {
      fetch("/api/catalog/role-types")
        .then((r) => r.json())
        .then((d) => setRoleTypes(d.roleTypes ?? []));
    }
  }, [roleTypes.length]);
  useEffect(() => {
    if (!f.roleTypeId) {
      setSkillOpts([]);
      return;
    }
    fetch(`/api/catalog/skills?roleTypeId=${f.roleTypeId}`)
      .then((r) => r.json())
      .then((d) => setSkillOpts(d.skills ?? []));
  }, [f.roleTypeId]);

  const goto = (s: Screen) => setScreen(s);
  const back = () => setScreen(SCREENS[Math.max(0, idx - 1)]);

  // Save one section, then advance (creates the DRAFT lazily on the first save).
  const save = async (section: Exclude<Screen, "start" | "review">, data: unknown, next: Screen) => {
    setBusy(true);
    setError(null);
    try {
      const r = draftId
        ? await fetch(`/api/work-requests/${draftId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ section, data }),
          })
        : await fetch("/api/work-requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ section, data }),
          });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(body.error ?? "Could not save.");
        return;
      }
      hydrate(body);
      setScreen(next);
    } finally {
      setBusy(false);
    }
  };

  const post = async () => {
    if (!draftId) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/work-requests/${draftId}/post`, { method: "POST" });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(body.error ?? "Could not post.");
        return;
      }
      router.push("/dashboard?posted=1");
    } finally {
      setBusy(false);
    }
  };

  const skip = () => router.push("/dashboard");

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-white font-body text-ink-2">
        Loading…
      </div>
    );
  }

  const shell = (props: Partial<React.ComponentProps<typeof WizardShell>> & { title: string }) => ({
    progress,
    busy,
    secondaryLabel: "Skip for Now",
    onSecondary: skip,
    ...props,
  });

  switch (screen) {
    case "start":
      return (
        <WizardShell
          {...shell({
            title: "Post a Work Request",
            subtitle: "Describe the service you need. It only takes a few minutes.",
            canBack: false,
            hideFooter: true,
          })}
        >
          <div className="space-y-3">
            <OptionCard
              selected={false}
              onClick={() => goto("skills")}
              title="Get Started Using AI"
              description="Draft your request with AI assistance. (Coming soon — continues manually for now.)"
            />
            <OptionCard
              selected={false}
              onClick={() => goto("skills")}
              title="I'll Do It Without AI"
              description="Fill in the details yourself, step by step."
            />
            {/* This screen hides the shell footer, so the skip is rendered
                inline — styled to match the shell's de-emphasised secondary. */}
            <button
              onClick={skip}
              className="text-[15px] font-semibold text-ink-2 underline underline-offset-4 transition-colors hover:text-magenta"
            >
              Skip for Now
            </button>
          </div>
        </WizardShell>
      );

    case "skills":
      return (
        <WizardShell
          {...shell({
            title: "What Are the Main Skills Required?",
            subtitle: "Pick one main category, then the skills for this request.",
            canBack: false,
            onContinue: () => {
              if (!f.roleTypeId || f.skillIds.length === 0) return;
              save("skills", { roleTypeId: f.roleTypeId, skillIds: f.skillIds }, "scope");
            },
            continueDisabled: !f.roleTypeId || f.skillIds.length === 0,
            continueLabel: "Next: Scope",
          })}
        >
          {error && <Notice>{error}</Notice>}
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-[14px] font-bold">Role Type (Pick One)</p>
              <div className="flex flex-wrap gap-2">
                {roleTypes.map((rt) => (
                  <Chip
                    key={rt.id}
                    selected={f.roleTypeId === rt.id}
                    onClick={() =>
                      setF((p) => ({
                        ...p,
                        roleTypeId: rt.id,
                        skillIds: p.roleTypeId === rt.id ? p.skillIds : [],
                      }))
                    }
                  >
                    {rt.display}
                  </Chip>
                ))}
              </div>
            </div>
            {f.roleTypeId && (
              <div>
                <p className="mb-2 text-[14px] font-bold">
                  Skills ({f.skillIds.length} selected)
                </p>
                <div className="flex flex-wrap gap-2">
                  {skillOpts.map((s) => {
                    const on = f.skillIds.includes(s.id);
                    return (
                      <Chip
                        key={s.id}
                        selected={on}
                        onClick={() =>
                          setF((p) => ({
                            ...p,
                            skillIds: on
                              ? p.skillIds.filter((x) => x !== s.id)
                              : [...p.skillIds, s.id],
                          }))
                        }
                      >
                        {s.name}
                      </Chip>
                    );
                  })}
                  {skillOpts.length === 0 && (
                    <p className="text-[14px] text-ink-2">Loading skills…</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </WizardShell>
      );

    case "scope":
      return (
        <WizardShell
          {...shell({
            title: "Scope the Work",
            subtitle: "A clear title and scope help you attract the right talent.",
            onBack: back,
            onContinue: () => {
              if (!f.title.trim()) {
                setError("A title is required.");
                return;
              }
              save(
                "scope",
                {
                  title: f.title,
                  experienceLevel: f.experienceLevel,
                  budgetType: f.budgetType,
                  budgetDollars: f.budgetDollars || null,
                  duration: f.duration,
                  description: f.description,
                },
                "location"
              );
            },
            continueDisabled: !f.title.trim(),
            continueLabel: "Next: Location",
          })}
        >
          {error && <Notice>{error}</Notice>}
          <div className="space-y-5">
            <Field label="Title">
              <TextInput
                value={f.title}
                onChange={(e) => setF({ ...f, title: e.target.value })}
                placeholder="e.g. Build 10 OTBI reports into one Finance dashboard"
              />
            </Field>

            <div>
              <p className="mb-2 text-[14px] font-bold">Experience Level</p>
              <div className="flex flex-wrap gap-2">
                {EXPERIENCE_OPTIONS.map((o) => (
                  <Chip
                    key={o.value}
                    selected={f.experienceLevel === o.value}
                    onClick={() => setF({ ...f, experienceLevel: o.value })}
                  >
                    {o.label}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[14px] font-bold">Duration</p>
              <div className="flex flex-wrap gap-2">
                {DURATION_OPTIONS.map((o) => (
                  <Chip
                    key={o.value}
                    selected={f.duration === o.value}
                    onClick={() => setF({ ...f, duration: o.value })}
                  >
                    {o.label}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[14px] font-bold">Budget</p>
              <div className="mb-3 flex gap-2">
                <Chip
                  selected={f.budgetType === "FIXED"}
                  onClick={() => setF({ ...f, budgetType: "FIXED" })}
                >
                  Fixed Price
                </Chip>
                <Chip
                  selected={f.budgetType === "HOURLY"}
                  onClick={() => setF({ ...f, budgetType: "HOURLY" })}
                >
                  Hourly Rate
                </Chip>
              </div>
              {f.budgetType && (
                <Field
                  label={f.budgetType === "HOURLY" ? "Rate (USD/hr)" : "Total Budget (USD)"}
                >
                  <TextInput
                    type="number"
                    min="0"
                    value={f.budgetDollars}
                    onChange={(e) => setF({ ...f, budgetDollars: e.target.value })}
                    placeholder={f.budgetType === "HOURLY" ? "120" : "10000"}
                  />
                </Field>
              )}
            </div>

            <Field label="Description (Optional)">
              <TextArea
                value={f.description}
                onChange={(e) => setF({ ...f, description: e.target.value })}
                placeholder="Describe the deliverables, context, and how you like to work."
              />
            </Field>
          </div>
        </WizardShell>
      );

    case "location":
      return (
        <WizardShell
          {...shell({
            title: "Where Is This Work Located?",
            onBack: back,
            onContinue: () => {
              if (!f.worksite) return;
              save(
                "location",
                { locationCountry: f.locationCountry, worksite: f.worksite },
                "review"
              );
            },
            continueDisabled: !f.worksite,
            continueLabel: "Next: Review",
          })}
        >
          {error && <Notice>{error}</Notice>}
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-[14px] font-bold">Location</p>
              <div className="flex gap-2">
                <Chip
                  selected={f.locationCountry === "US"}
                  onClick={() => setF({ ...f, locationCountry: "US" })}
                >
                  United States
                </Chip>
                <Chip
                  selected={f.locationCountry === "NON_US"}
                  onClick={() => setF({ ...f, locationCountry: "NON_US" })}
                >
                  Non-United States
                </Chip>
              </div>
            </div>
            <div>
              <p className="mb-2 text-[14px] font-bold">
                Where Does the Provider Perform This Work?
              </p>
              <div className="space-y-3">
                {WORKSITE_OPTIONS.map((o) => (
                  <OptionCard
                    key={o.value}
                    selected={f.worksite === o.value}
                    onClick={() => setF({ ...f, worksite: o.value })}
                    title={o.title}
                    description={o.description}
                  />
                ))}
              </div>
            </div>
          </div>
        </WizardShell>
      );

    case "review": {
      const roleTypeLabel = roleTypes.find((r) => r.id === f.roleTypeId)?.display ?? "—";
      const expLabel = EXPERIENCE_OPTIONS.find((o) => o.value === f.experienceLevel)?.label ?? "—";
      const durLabel = DURATION_OPTIONS.find((o) => o.value === f.duration)?.label ?? "—";
      const budget = f.budgetType
        ? `${f.budgetType === "HOURLY" ? "Hourly" : "Fixed"}${f.budgetDollars ? ` · $${f.budgetDollars}${f.budgetType === "HOURLY" ? "/hr" : ""}` : ""}`
        : "—";
      const worksiteLabel = WORKSITE_OPTIONS.find((o) => o.value === f.worksite)?.title ?? "—";
      const rows: [string, string, Screen][] = [
        ["Title", f.title || "—", "scope"],
        ["Category & Skills", `${roleTypeLabel} · ${f.skillIds.length} skills`, "skills"],
        ["Experience", expLabel, "scope"],
        ["Duration", durLabel, "scope"],
        ["Budget", budget, "scope"],
        ["Location", `${f.locationCountry === "US" ? "United States" : f.locationCountry === "NON_US" ? "Non-US" : "—"} · ${worksiteLabel}`, "location"],
      ];
      return (
        <WizardShell
          {...shell({
            title: "Review & Post",
            subtitle: "Check everything over, then post your request.",
            onBack: back,
            onContinue: post,
            continueLabel: "Post Work Request",
          })}
        >
          {error && <Notice>{error}</Notice>}
          <div className="space-y-4">
            {rows.map(([label, value, edit]) => (
              <div
                key={label}
                className="flex items-start justify-between gap-4 rounded-brand border border-line p-4"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-bold uppercase tracking-wide text-ink-2">
                    {label}
                  </p>
                  <p className="mt-0.5 truncate font-medium">{value}</p>
                </div>
                <button
                  onClick={() => goto(edit)}
                  className="shrink-0 text-[14px] font-bold text-magenta hover:text-magenta-dark"
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        </WizardShell>
      );
    }
  }
}
