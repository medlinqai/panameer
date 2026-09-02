"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WizardShell } from "@/components/onboarding/WizardShell";

/**
 * ⚠⚠ THE IN-APP WIZARD SHELL — NO PUBLIC CHROME (`P1-J1.1-E267`, 2026-08-30).
 *
 * This page renders INSIDE `AppShell`, which already supplies the header, the
 * rail and the footer. `E246` gave `OnboardingFrame` a `MarketingHeader` and a
 * `MarketingFooter` — correct for every PUBLIC onboarding page and wrong here,
 * so `/create-work` came out with two headers and two footers around one wizard.
 * That was chat's miss in the `E246` brief, not a CC error.
 *
 * ⚠ ONE WRAPPER, NOT A PROP ON EVERY CALL. There are nine `WizardShell`s in this
 * file and one more in `ReviewWorkRequest`; threading `chrome={false}` through
 * each by hand is a list somebody adds a tenth screen to and forgets. Setting it
 * in one place means a new step in this file CANNOT reintroduce the defect.
 * ⚠ THE DEFAULT ELSEWHERE IS STILL `true`, so no public page changed.
 */
function AppWizardShell(props: React.ComponentProps<typeof WizardShell>) {
  return <WizardShell {...props} chrome={false} />;
}

import { ParseHeartbeat } from "@/components/onboarding/ParseHeartbeat";
import { ReviewStep } from "@/components/work/ReviewWorkRequest";
import {
  OptionCard,
  Chip,
  Field,
  TextInput,
  TextArea,
  Notice,
} from "@/components/onboarding/controls";

/**
 * CREATE WORK REQUEST (brief_create_work_request_v1).
 *
 * Seven steps, then review, then post. It replaces the four-screen wizard at
 * /work/new, which asked for a category and a flat skill list; the deck's flow
 * is a CASCADE — Role narrows Domain narrows Skills — and that is the part with
 * teeth, because it is what makes a request matchable rather than a paragraph.
 *
 * WHAT NARROWS ALSO CLEARS. Changing the role in step 1 discards the domain and
 * skills chosen after it, because a skill belongs to exactly one role and
 * keeping them would post a request whose domain answers a question the
 * requester has since changed their mind about. Going BACK preserves everything;
 * only changing an answer resets what depended on it. The server enforces the
 * same rule — see `saveSection` — so a stale client cannot get around it.
 *
 * SAVE-AS-YOU-GO against a real DRAFT. Every step POSTs to /api/work-requests,
 * so a closed tab resumes from `/current` rather than starting over. Nothing
 * here holds a request that only exists in React state.
 *
 * VOCABULARY IS LOCKED: Work Request, Provider, Recruiter. Never job, job post,
 * freelancer or agency.
 */

const STEPS = [
  "role",
  "domain",
  "skills",
  /*
    SPECIALIZATIONS SITS AFTER SKILLS because it refines the same question.
    Skills say what the work IS; specializations say which products, processes
    and industries it touches. Asked before skills it would be abstract; asked
    after dates or budget it would drag the requester back into scoping after
    they had moved on to logistics.
  */
  "specializations",
  "dates",
  "location",
  "budget",
  "description",
  "review",
] as const;
export type Step = (typeof STEPS)[number];

/** The visible counter — review is the destination, not a numbered question. */
const NUMBERED: Step[] = STEPS.filter((s) => s !== "review") as Step[];

type RoleType = { id: string; display: string; name: string };
type Domain = { id: string; name: string; skillCount?: number };
type SkillOpt = { id: string; name: string };
type SpecGroup = { kind: string; label: string; items: { id: string; name: string }[] };

export type Draft = {
  id: string;
  status: string;
  title: string;
  description: string;
  roleTypeId: string | null;
  pillarId: string | null;
  skillIds: string[];
  skillNames: { id: string; name: string }[];
  specializationIds: string[];
  budgetType: string | null;
  budgetMinCents: number | null;
  budgetMaxCents: number | null;
  startDate: string | null;
  endDate: string | null;
  worksite: string | null;
  locationCountry: string | null;
  /** ⚠ `P1-J4-E025` — how the COMPANY NAME publishes. Never the person. */
  companyVisibility: string;
  companyCodeName: string | null;
};

const dollars = (cents: number | null) =>
  cents === null || cents === undefined ? "" : String(cents / 100);

/**
 * ⚠ `identityGaps` IS COMPUTED ON THE SERVER (`P1-J4-E025`) and passed down. It
 * is a MIRROR of the post gate, never the gate — `postWorkRequest` refuses on
 * the same rule whatever this component does with it.
 */
export function CreateWorkRequest({
  identityGaps = [],
}: {
  identityGaps?: { key: string; field: string; reason: string; href: string }[];
} = {}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("role");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // ---- catalog ------------------------------------------------------------
  const [roles, setRoles] = useState<RoleType[]>([]);
  const [domainsByRole, setDomainsByRole] = useState<Record<string, Domain[]>>({});
  const [skillOpts, setSkillOpts] = useState<{ key: string; skills: SkillOpt[] }>({
    key: "",
    skills: [],
  });
  const [skillQuery, setSkillQuery] = useState("");
  const [specGroups, setSpecGroups] = useState<SpecGroup[]>([]);

  /*
    THE IMPORT (WS-B). Held on the wizard rather than in the panel because its
    RESULT outlives the panel: the extracted skills cannot be saved until a role
    and domain exist, so they wait here until the requester reaches step 3.
  */
  /*
    WHICH DOOR IS OPEN, or null while the three are being offered. "manual" has
    no panel of its own — choosing it simply dismisses the doors and leaves the
    requester on the role step, which IS the manual path. It is a distinct state
    rather than the same `null` so that picking it is a decision the UI records,
    not an absence of one: the doors stay dismissed for the rest of the session
    instead of reappearing every time step 1 re-renders.
  */
  const [doorsOpen, setDoorsOpen] = useState<"paste" | "manual" | null>(null);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [pendingSkills, setPendingSkills] = useState<{ id: string; name: string }[]>([]);
  const [offCatalogSkills, setOffCatalogSkills] = useState<string[]>([]);

  // ---- local edits, flushed to the server on Continue ---------------------
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budgetType, setBudgetType] = useState<string | null>(null);
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [description, setDescription] = useState("");
  const [worksite, setWorksite] = useState<string | null>(null);
  const [locationCountry, setLocationCountry] = useState<string | null>(null);

  const hydrate = useCallback((d: Draft) => {
    setDraft(d);
    setStartDate(d.startDate ?? "");
    setEndDate(d.endDate ?? "");
    setBudgetType(d.budgetType);
    setBudgetMin(dollars(d.budgetMinCents));
    setBudgetMax(dollars(d.budgetMaxCents));
    setDescription(d.description ?? "");
    setWorksite(d.worksite);
    setLocationCountry(d.locationCountry);
  }, []);

  /* Resume an in-progress DRAFT, and load the role tree, on mount. */
  useEffect(() => {
    let alive = true;
    (async () => {
      const [cur, fields, specs] = await Promise.all([
        fetch("/api/work-requests/current").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/catalog/fields").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/catalog/specializations").then((r) => (r.ok ? r.json() : null)),
      ]);
      if (!alive) return;
      if (specs?.groups) setSpecGroups(specs.groups);
      if (fields?.roles) {
        setRoles(fields.roles);
        setDomainsByRole(
          Object.fromEntries(
            (fields.roles as (RoleType & { domains?: Domain[] })[]).map((r) => [
              r.id,
              r.domains ?? [],
            ])
          )
        );
      }
      // `/current` answers `{ draft }` — null when there is nothing in flight.
      if (cur?.draft) hydrate(cur.draft);
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [hydrate]);

  /*
    Skills follow the (role, domain) pair — the third rung of the cascade.

    THE EMPTY CASE IS NOT A setState IN THE EFFECT BODY. Clearing the list when
    the pair is incomplete looks like the obvious thing to do here, and this
    repo lints it as an error because it cascades renders. The fetch keys itself
    on the pair instead, and `skillsFor` below is what the UI reads — so a stale
    list can never be shown for a pair it does not belong to.
  */
  const pairKey = `${draft?.roleTypeId ?? ""}:${draft?.pillarId ?? ""}`;
  useEffect(() => {
    const [roleTypeId, pillarId] = pairKey.split(":");
    if (!roleTypeId || !pillarId) return;
    let alive = true;
    fetch(`/api/catalog/skills?roleTypeId=${roleTypeId}&pillarId=${pillarId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => alive && setSkillOpts({ key: pairKey, skills: b?.skills ?? [] }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pairKey]);

  /** Only ever the skills for the pair currently chosen. */
  const skills = skillOpts.key === pairKey ? skillOpts.skills : [];

  const domains = draft?.roleTypeId ? domainsByRole[draft.roleTypeId] ?? [] : [];
  const roleName = roles.find((r) => r.id === draft?.roleTypeId)?.display ?? "";
  const domainName = domains.find((d) => d.id === draft?.pillarId)?.name ?? "";
  // The draft carries ids; the review shows words.
  const specializationNames = (draft?.specializationIds ?? [])
    .map((id) => specGroups.flatMap((g) => g.items).find((i) => i.id === id)?.name)
    .filter((n): n is string => Boolean(n));

  /** Save one section, creating the DRAFT on the first call. */
  const save = async (section: string, data: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const url = draft ? `/api/work-requests/${draft.id}` : "/api/work-requests";
      const r = await fetch(url, {
        method: draft ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, data }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body?.error ?? "Could not save");
      // Both create and save answer with the serialized request itself.
      hydrate(body);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const runImport = async () => {
    setImporting(true);
    setError(null);
    try {
      const r = await fetch("/api/work-requests/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: importText }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body?.error ?? "Could not import that posting");

      // Load the DRAFT the import just created and carry its skills forward.
      const fresh = await fetch(`/api/work-requests/${body.workRequestId}`).then((x) =>
        x.ok ? x.json() : null
      );
      if (fresh) hydrate(fresh);
      setPendingSkills(body.matchedSkills ?? []);
      setOffCatalogSkills(body.unmatchedSkills ?? []);
      setDoorsOpen("manual");
      setImportText("");
      /*
        STILL STEP 1. The import fills everything downstream of the cascade, but
        role and domain are the requester's call — inferring them from a paste
        would have them confirm a taxonomy decision they never made.
      */
      setStep("role");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not import that posting");
    } finally {
      setImporting(false);
    }
  };

  const goTo = (s: Step) => {
    setError(null);
    setStep(s);
  };
  const next = () => {
    const i = STEPS.indexOf(step);
    if (i < STEPS.length - 1) goTo(STEPS[i + 1]);
  };
  const back = () => {
    const i = STEPS.indexOf(step);
    if (i > 0) goTo(STEPS[i - 1]);
  };
  const saveAnd = async (section: string, data: Record<string, unknown>) => {
    if (await save(section, data)) next();
  };

  const shell = (opts: {
    title: string;
    subtitle?: string;
    onContinue?: () => void;
    continueLabel?: string;
    continueDisabled?: boolean;
    secondaryLabel?: string;
    onSecondary?: () => void;
    wide?: boolean;
  }) => ({
    ...opts,
    stepLabel: NUMBERED.includes(step)
      ? `${NUMBERED.indexOf(step) + 1} / ${NUMBERED.length}`
      : undefined,
    canBack: STEPS.indexOf(step) > 0,
    onBack: back,
    busy,
  });

  if (!ready) {
    return (
      <AppWizardShell title="Create a Work Request" busy>
        <p className="text-[15px] text-ink-2">Loading…</p>
      </AppWizardShell>
    );
  }

  switch (step) {
    // ---- 1 — ROLE -------------------------------------------------------
    case "role":
      return (
        <AppWizardShell
          {...shell({
            title: "What Type of Role Is This?",
            subtitle: "This narrows everything that follows.",
            continueDisabled: !draft?.roleTypeId,
            onContinue: () => saveAnd("role", { roleTypeId: draft?.roleTypeId }),
          })}
        >
          {error && <Notice>{error}</Notice>}

          {/*
            BRING YOUR JD — three doors, mirroring the provider résumé step.

            The port already worked; what it lacked was a frame. A single dashed
            "Import a job you posted elsewhere" button above the role list read
            as an aside, which left "fill it in yourself" as the thing that
            happens when you ignore the aside. Manual is a legitimate choice and
            should be stated as one.

            Offered on step 1 only. A shortcut presented halfway through the
            wizard is not a shortcut, it is a reason to start over.
          */}
          {doorsOpen === null ? (
            <div className="mb-6">
              <p className="mb-1 text-[15px] font-bold">Bring your JD</p>
              <p className="mb-3 text-[13.5px] leading-relaxed text-ink-2">
                Already have a job description? Start from it. Otherwise, build
                the Work Request here.
              </p>
              <div className="space-y-3">
                <JdDoor
                  title="Paste Your JD"
                  badge="Fastest"
                  primary
                  description="Paste it in and we'll draft the Work Request from what it says."
                  onClick={() => setDoorsOpen("paste")}
                />
                <JdDoor
                  title="Fill It Out Manually"
                  description="Answer seven short questions. Takes a few minutes."
                  onClick={() => setDoorsOpen("manual")}
                />
                {/*
                  ⚠ NOT BUILT, AND NOT CLICKABLE. Inbound email needs a
                  tokenized intake address and sender verification — its own
                  brief. A door that opened onto nothing would be worse than one
                  that says it is not ready, so this one is disabled rather than
                  wired to a placeholder page.
                */}
                <JdDoor
                  title="Email Your JD"
                  badge="Coming soon"
                  disabled
                  description="Forward a JD to Panameer and we'll draft it for you."
                />
              </div>
            </div>
          ) : doorsOpen === "paste" ? (
            <div className="mb-5 rounded-brand border border-line bg-bg-soft p-5">
              <p className="text-[14.5px] font-bold">Paste your JD</p>
              <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink-2">
                We&apos;ll fill in what the JD actually says and leave the rest
                blank for you. Nothing is posted — you&apos;ll review it first.
              </p>
              <TextArea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste the full job description…"
                className="mt-3 min-h-[160px] bg-white"
                disabled={importing}
              />
              {importing ? (
                <ParseHeartbeat className="mt-3" />
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void runImport()}
                    disabled={importText.trim().length < 40}
                    className="rounded-full bg-magenta px-5 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-40"
                  >
                    Draft My Work Request
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDoorsOpen(null);
                      setImportText("");
                    }}
                    className="text-[14px] font-semibold text-ink-2 underline underline-offset-4 hover:text-magenta"
                  >
                    Back to the three ways in
                  </button>
                  {/* v2, named so nobody wonders why pasting is the only way. */}
                  <span className="text-[12.5px] text-ink-2">
                    Pasting only for now — Upwork, LinkedIn and Indeed all need a
                    login to read a JD from a link.
                  </span>
                </div>
              )}
            </div>
          ) : null}

          <div className="space-y-3">
            {roles.map((r) => (
              <OptionCard
                key={r.id}
                selected={draft?.roleTypeId === r.id}
                onClick={() =>
                  setDraft((d) =>
                    d
                      ? { ...d, roleTypeId: r.id }
                      : ({ roleTypeId: r.id, skillIds: [], skillNames: [] } as unknown as Draft)
                  )
                }
                title={r.display}
                /*
                  THE DECK DESCRIBES EACH ROLE BY WHAT IS INSIDE IT, not by a
                  count — "Core Technical Developers, Creative & Content
                  Generation, Data & Support Services" under AI-Specialist. "5
                  service domains" told the requester how much was behind the
                  card without telling them whether it was the right card.

                  Derived from the role's own domains rather than hand-written,
                  so it cannot drift from the catalog. The deck writes the
                  enterprise ones as example job titles instead ("Coder, Report
                  Writer, Integration Specialist"); that is copy Scott owns, and
                  a per-role line here would override this the day it exists.
                */
                description={(domainsByRole[r.id] ?? [])
                  .map((d) => d.name)
                  .join(", ")}
              />
            ))}
            {roles.length === 0 && (
              <Notice tone="info">
                The service catalog hasn&apos;t been loaded yet, so there are no
                roles to choose from.
              </Notice>
            )}
          </div>
        </AppWizardShell>
      );

    // ---- 2 — DOMAIN -----------------------------------------------------
    case "domain":
      return (
        <AppWizardShell
          {...shell({
            title: "What Service Domain Are You Requesting?",
            // The deck's step 2 carries the role name alone as the subtitle.
            subtitle: roleName || undefined,
            continueDisabled: !draft?.pillarId,
            onContinue: () => saveAnd("domain", { pillarId: draft?.pillarId }),
          })}
        >
          {error && <Notice>{error}</Notice>}
          <div className="space-y-3">
            {domains.map((d) => (
              <OptionCard
                key={d.id}
                selected={draft?.pillarId === d.id}
                onClick={() => setDraft((x) => (x ? { ...x, pillarId: d.id } : x))}
                title={d.name}
                description={
                  d.skillCount ? `${d.skillCount} skills` : undefined
                }
              />
            ))}
            {domains.length === 0 && (
              /*
                THE AI-SPECIALIST BRANCH LANDS HERE UNTIL THE VERTICAL IS SEEDED
                (noted in the brief as a parallel data task). An empty domain
                list is a catalog fact, so the step says so rather than
                pretending the role has no domains.
              */
              <Notice tone="info">
                No service domains are in the catalog for {roleName || "this role"}{" "}
                yet. Go back and pick another role, or come back once the catalog
                covers it.
              </Notice>
            )}
          </div>
        </AppWizardShell>
      );

    // ---- 3 — SKILLS -----------------------------------------------------
    case "skills": {
      const chosen = new Set(draft?.skillIds ?? []);
      const q = skillQuery.trim().toLowerCase();

      /*
        WHAT THE IMPORT FOUND, offered here rather than saved earlier.

        Imported skills cannot be written until a role and domain exist to
        validate them against, so they waited. Only the ones that belong to the
        pair the requester actually chose are offered — an import from a Java
        posting must not put Java in front of someone who picked Payables.

        SUGGESTED, NOT APPLIED. Every one is a tick. The requester is the one
        who knows whether the posting they pasted still describes what they
        want, and pre-selecting on their behalf is how a wrong skill gets posted
        unnoticed.
      */
      const inThisPair = new Set(skills.map((s) => s.id));
      const suggested = pendingSkills.filter(
        (s) => inThisPair.has(s.id) && !chosen.has(s.id)
      );
      const shown = skills
        .filter((s) => !chosen.has(s.id))
        .filter((s) => !q || s.name.toLowerCase().includes(q))
        .slice(0, 24);
      const toggle = (id: string) =>
        setDraft((d) =>
          d
            ? {
                ...d,
                skillIds: d.skillIds.includes(id)
                  ? d.skillIds.filter((x) => x !== id)
                  : [...d.skillIds, id],
              }
            : d
        );

      return (
        <AppWizardShell
          {...shell({
            title: "What Skills Does Your Work Require?",
            subtitle: domainName
              ? `${domainName} skills. Add 3–5 so providers can match.`
              : "Add 3–5 so providers can match.",
            continueDisabled: (draft?.skillIds.length ?? 0) === 0,
            onContinue: () =>
              saveAnd("skills", {
                roleTypeId: draft?.roleTypeId,
                skillIds: draft?.skillIds ?? [],
              }),
          })}
        >
          {error && <Notice>{error}</Notice>}

          {(draft?.skillIds.length ?? 0) > 0 && (
            <div className="mb-4">
              <p className="mb-1.5 text-[13px] font-bold">
                Chosen{" "}
                <span className="font-normal text-ink-2">
                  ({draft?.skillIds.length})
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {(draft?.skillNames.length
                  ? draft.skillNames
                  : skills.filter((s) => chosen.has(s.id))
                ).map((s) => (
                  <Chip key={s.id} selected onClick={() => toggle(s.id)}>
                    {s.name} ×
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {suggested.length > 0 && (
            <div className="mb-4 rounded-brand border border-magenta/25 bg-magenta/[0.04] p-4">
              <p className="text-[14px] font-bold">
                AI found these in your posting — tick the ones that fit
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {suggested.map((s) => (
                  <Chip key={s.id} selected={false} onClick={() => toggle(s.id)}>
                    + {s.name}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {offCatalogSkills.length > 0 && (
            <div className="mb-4 rounded-brand border border-line bg-bg-soft p-4">
              <p className="text-[14px] font-bold">
                Also mentioned, but not in our catalog
              </p>
              {/*
                SHOWN, NOT SELECTABLE. These are terms the posting used that the
                catalog does not have. A Work Request can only carry catalog
                skills — matching depends on it — so offering them as ticks
                would promise a match that cannot happen. Naming them is still
                worth it: it tells the requester what we did NOT capture, which
                is the difference between an honest import and a lossy one.
              */}
              <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">
                {offCatalogSkills.join(", ")} — add the closest catalog skill
                below, or mention them in the description.
              </p>
            </div>
          )}

          <TextInput
            value={skillQuery}
            onChange={(e) => setSkillQuery(e.target.value)}
            placeholder="Search skills…"
            aria-label="Search skills"
            className="max-w-md"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {shown.map((s) => (
              <Chip key={s.id} selected={false} onClick={() => toggle(s.id)}>
                {s.name}
              </Chip>
            ))}
          </div>
          {skills.length === 0 && (
            <Notice tone="info">
              The catalog has no skills for {domainName || "this domain"} yet.
            </Notice>
          )}
        </AppWizardShell>
      );
    }

    // ---- SPECIALIZATIONS — optional ---------------------------------------
    case "specializations": {
      const chosen = new Set(draft?.specializationIds ?? []);
      const toggle = (id: string) =>
        setDraft((d) =>
          d
            ? {
                ...d,
                specializationIds: d.specializationIds.includes(id)
                  ? d.specializationIds.filter((x) => x !== id)
                  : [...d.specializationIds, id],
              }
            : d
        );

      return (
        <AppWizardShell
          {...shell({
            title: "Anything Specific This Work Touches?",
            subtitle:
              "Products, processes or industries. Optional — pick what applies, or skip.",
            wide: true,
            onContinue: () =>
              saveAnd("specializations", {
                specializationIds: draft?.specializationIds ?? [],
              }),
            /*
              SKIP SAVES AN EMPTY SET rather than jumping the step. A requester
              who looked and decided none applied has answered the question, and
              the answer should survive a Back — which it cannot if the step is
              simply stepped over.
            */
            secondaryLabel: "None apply",
            onSecondary: () =>
              void saveAnd("specializations", { specializationIds: [] }),
          })}
        >
          {error && <Notice>{error}</Notice>}

          {/*
            TWO LEVELS, THREE SECTIONS, ONE PAGE. The vocabulary is already
            grouped by `kind` server-side, so the section headers are the
            catalog's own — Products & Platforms, Processes & Methodologies,
            Industries — rather than three labels typed here that could drift
            from what the endpoint returns.
          */}
          {specGroups.map((g) => (
            <section key={g.kind} className="mb-6">
              <h2 className="mb-2 text-[13px] font-bold uppercase tracking-[0.07em] text-ink-2">
                {g.label}
              </h2>
              <div className="flex flex-wrap gap-2">
                {g.items.map((it) => (
                  <Chip
                    key={it.id}
                    selected={chosen.has(it.id)}
                    onClick={() => toggle(it.id)}
                  >
                    {it.name}
                  </Chip>
                ))}
              </div>
            </section>
          ))}

          {specGroups.length === 0 && (
            <Notice tone="info">
              The specialization vocabulary hasn&apos;t been seeded yet, so
              there is nothing to choose from. Skipping is fine.
            </Notice>
          )}
        </AppWizardShell>
      );
    }

    // ---- 4 — DATES ------------------------------------------------------
    case "dates":
      return (
        <AppWizardShell
          {...shell({
            title: "When Does This Work Start and End?",
            subtitle: "An estimate is fine — providers use it to judge fit.",
            onContinue: () => saveAnd("dates", { startDate, endDate }),
            secondaryLabel: "I'm not sure yet",
            onSecondary: () => void saveAnd("dates", { startDate: null, endDate: null }),
          })}
        >
          {error && <Notice>{error}</Notice>}
          <div className="grid max-w-lg gap-4 sm:grid-cols-2">
            <Field label="Start date">
              <TextInput
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Field>
            <Field label="End date">
              <TextInput
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Field>
          </div>
        </AppWizardShell>
      );

    // ---- 5 — LOCATION ---------------------------------------------------
    case "location":
      return (
        <AppWizardShell
          {...shell({
            title: "Where Will This Work Be Performed?",
            subtitle:
              "A preference, not a filter — providers see it, and anyone may still propose.",
            continueDisabled: !locationCountry,
            onContinue: () =>
              saveAnd("location", {
                locationCountry,
                worksite: worksite ?? "REMOTE",
              }),
          })}
        >
          {error && <Notice>{error}</Notice>}
          <div className="space-y-3">
            <OptionCard
              selected={locationCountry === "United States"}
              onClick={() => setLocationCountry("United States")}
              title="US Only"
              description="Providers based in the United States."
            />
            <OptionCard
              selected={locationCountry === "Worldwide"}
              onClick={() => setLocationCountry("Worldwide")}
              title="Worldwide"
              description="Anywhere — the widest pool of providers."
            />
          </div>

          <div className="mt-6 max-w-lg">
            <Field label="How is the work performed?">
              <div className="flex flex-wrap gap-2">
                {[
                  { v: "REMOTE", l: "Remote" },
                  { v: "ONSITE", l: "On site" },
                  { v: "HYBRID", l: "Hybrid" },
                ].map((o) => (
                  <Chip
                    key={o.v}
                    selected={(worksite ?? "REMOTE") === o.v}
                    onClick={() => setWorksite(o.v)}
                  >
                    {o.l}
                  </Chip>
                ))}
              </div>
            </Field>
          </div>
        </AppWizardShell>
      );

    // ---- 6 — BUDGET -----------------------------------------------------
    case "budget":
      return (
        <AppWizardShell
          {...shell({
            title: "What Is Your Budget?",
            subtitle: "A range is fine. You can change it after you post.",
            onContinue: () =>
              saveAnd("budget", {
                budgetType: budgetType ?? "HOURLY",
                budgetMinDollars: budgetMin,
                budgetMaxDollars: budgetMax,
              }),
            /*
              THE ESCAPE IS A REAL ANSWER, not a skip. It clears the range and
              moves on, so a request with no budget is a stated position rather
              than an unfinished step.
            */
            secondaryLabel: "Not ready to set a budget",
            onSecondary: () =>
              void saveAnd("budget", {
                budgetType: null,
                budgetMinDollars: null,
                budgetMaxDollars: null,
              }),
          })}
        >
          {error && <Notice>{error}</Notice>}

          <div className="flex flex-wrap gap-2">
            {[
              { v: "HOURLY", l: "Hourly rate" },
              { v: "FIXED", l: "Fixed price" },
            ].map((o) => (
              <Chip
                key={o.v}
                selected={(budgetType ?? "HOURLY") === o.v}
                onClick={() => setBudgetType(o.v)}
              >
                {o.l}
              </Chip>
            ))}
          </div>

          <div className="mt-5 grid max-w-lg gap-4 sm:grid-cols-2">
            <Field label="From">
              <TextInput
                type="number"
                min="0"
                inputMode="decimal"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                placeholder="0"
              />
            </Field>
            <Field label="To">
              <TextInput
                type="number"
                min="0"
                inputMode="decimal"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                placeholder="0"
              />
            </Field>
          </div>

          {/*
            NO RATE HISTOGRAM. The deck shows "the average rate for similar
            projects" as a distribution; nothing has been transacted through
            Panameer, so drawing one would be inventing a market. It comes back
            when there are rates to average.
          */}
        </AppWizardShell>
      );

    // ---- 7 — DESCRIPTION ------------------------------------------------
    case "description":
      return (
        <AppWizardShell
          {...shell({
            title: "Describe What You Need in Detail",
            subtitle: "Already have a description? Paste it here.",
            continueDisabled: description.trim().length === 0,
            continueLabel: "Review Work Request",
            onContinue: () => saveAnd("description", { description }),
            wide: true,
          })}
        >
          {error && <Notice>{error}</Notice>}
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <TextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What needs doing, what done looks like, and anything a provider should know before proposing."
              className="min-h-[260px]"
            />
            <aside className="rounded-brand border border-line bg-bg-soft p-5">
              <p className="text-[14px] font-bold">A good description covers</p>
              <ul className="mt-2 grid gap-2 text-[14px] leading-relaxed text-ink-2">
                <li>· The outcome you need, not the steps to get there</li>
                <li>· Which systems and versions are involved</li>
                <li>· What already exists and what is missing</li>
                <li>· How you will judge the work is done</li>
              </ul>
              {/*
                NO ATTACH FILE. There is no attachment model on WorkRequest —
                `Artifact` belongs to a provider's Employer or Project — so the
                button would either drop the file or write it somewhere it does
                not belong. Deferred, and said out loud rather than shipped as a
                control that silently loses a document.
              */}
              <p className="mt-4 border-t border-line pt-3 text-[13px] text-ink-2">
                Attachments aren&apos;t supported yet — paste the key details
                here and share documents once a provider is engaged.
              </p>
            </aside>
          </div>
        </AppWizardShell>
      );

    // ---- REVIEW ---------------------------------------------------------
    case "review":
      return (
        <ReviewStep
          identityGaps={identityGaps}
          onSaveVisibility={(v, code) => save("review", { companyVisibility: v, companyCodeName: code })}
          draft={draft}
          roleName={roleName}
          domainName={domainName}
          specializationNames={specializationNames}
          onEdit={goTo}
          onBack={back}
          busy={busy}
          error={error}
          onPost={async () => {
            if (!draft) return;
            setBusy(true);
            setError(null);
            try {
              const r = await fetch(`/api/work-requests/${draft.id}/post`, {
                method: "POST",
              });
              const body = await r.json();
              if (!r.ok) throw new Error(body?.error ?? "Could not post");
              router.push(`/work-requests/${draft.id}/share`);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not post");
              setBusy(false);
            }
          }}
        />
      );
  }
}

/**
 * One of the three ways in.
 *
 * Same shape as the provider journey's method cards, deliberately: a requester
 * who has already onboarded as a provider has seen this exact chooser, and two
 * different-looking answers to "how do you want to start?" is two things to
 * learn instead of one.
 *
 * `disabled` renders the door as a static div rather than a dead <button>. A
 * disabled button still draws a pointer on some platforms and still reads as
 * "control" to a screen reader; a card that is plainly not a control is a
 * clearer statement that this one is not ready yet.
 */
function JdDoor({
  title,
  description,
  onClick,
  primary = false,
  badge,
  disabled = false,
}: {
  title: string;
  description: string;
  onClick?: () => void;
  primary?: boolean;
  badge?: string;
  disabled?: boolean;
}) {
  const inner = (
    <>
      <span className="flex items-center gap-2">
        <span className="text-[15px] font-bold">{title}</span>
        {badge && (
          <span
            className={
              "rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide " +
              (disabled ? "bg-bg-soft text-ink-2" : "bg-magenta text-white")
            }
          >
            {badge}
          </span>
        )}
      </span>
      <span className="mt-0.5 block text-[13.5px] leading-relaxed text-ink-2">
        {description}
      </span>
    </>
  );

  if (disabled) {
    return (
      <div
        aria-disabled="true"
        className="w-full cursor-default rounded-brand border-2 border-dashed border-line p-5 text-left opacity-60"
      >
        {inner}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "w-full rounded-brand border-2 p-5 text-left transition-all hover:border-magenta hover:shadow-brand " +
        (primary ? "border-magenta bg-magenta/[0.04] shadow-brand" : "border-line")
      }
    >
      {inner}
    </button>
  );
}
