"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { WizardShell } from "@/components/onboarding/WizardShell";
import { DomainFields } from "@/components/assessment/DomainFields";
import {
  OptionCard,
  Chip,
  Field,
  TextInput,
  Notice,
} from "@/components/onboarding/controls";
import {
  COST_LEVER_BANDS,
  EBITDA_BANDS,
  ENTITY_TYPES,
  HEADCOUNT_BANDS,
  LEAPFROG_PLATFORM,
  PLATFORMS,
  REVENUE_BANDS,
  SPEND_BANDS,
  STATES,
} from "@/lib/assessment/bands";
import {
  AI_MODES,
  AI_MODE_QUESTION,
  MATURITY_RUNGS,
  P2P_DOMAINS,
  PROCESSES,
} from "@/lib/assessment/questions-p2p";
import {
  domainForStep,
  domainStepId,
  sectionProgress,
  stepsFor,
  type Step,
} from "@/lib/assessment/steps";
import {
  PERCENT_SUM_100,
  fieldsForDomain,
  parseFieldValue,
  type DomainFieldAnswers,
  type ParsedFieldValue,
} from "@/lib/assessment/domain-fields";

const TIME_ZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Mexico_City",
  "Europe/London",
  "Europe/Dublin",
  "Europe/Amsterdam",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Australia/Sydney",
];

const STEP_LABELS: Record<Step, string> = {
  basics: "Company Information",
  money: "Financial Information",
  process_detail: "Process Information",
  process: "Pick a Process",
  ...Object.fromEntries(P2P_DOMAINS.map((d) => [domainStepId(d.key), d.name])),
  aimode: "One Last Question",
  contact: "My Information",
} as Record<Step, string>;

const REQUIRED_BASICS: { key: keyof Basics; label: string; on: Step }[] = [
  { key: "companyName", label: "Company name", on: "basics" },
  { key: "state", label: "State of filing", on: "basics" },
  { key: "entityType", label: "Entity type", on: "basics" },
  { key: "platform", label: "What runs your business today", on: "basics" },
  { key: "revenueBand", label: "Last year's revenue", on: "money" },
  { key: "ebitdaBand", label: "Roughly, your profit (EBITDA) last year", on: "money" },
  { key: "email", label: "Your email", on: "contact" },
];

type Basics = {
  companyName: string;
  /** The catalog id. Empty string = not answered. */
  industrySpecializationId: string;
  state: string;
  entityType: string;
  revenueBand: string;
  ebitdaBand: string;
  platform: string;
  email: string;
  timeZone: string;
  firstName: string;
  lastName: string;
  mobile: string;
};

export type IndustryOption = { id: string; name: string };

export function AssessmentWizard({
  industries = [],
}: {
  industries?: IndustryOption[];
}) {
  const router = useRouter();

  const { data: session } = useSession();
  const signedInEmail = session?.user?.email?.trim() || null;
  const STEPS = useMemo(() => stepsFor(signedInEmail), [signedInEmail]);

  const [rawStep, setRawStep] = useState<Step>("process");
  const step: Step = STEPS.includes(rawStep) ? rawStep : STEPS[STEPS.length - 1];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [basics, setBasics] = useState<Basics>({
    companyName: "",
    industrySpecializationId: "",
    state: "",
    entityType: "",
    revenueBand: "",
    ebitdaBand: "",
    platform: "",
    email: "",
    timeZone: (() => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
      } catch {
        return "";
      }
    })(),
    firstName: "",
    lastName: "",
    mobile: "",
  });
  const [process, setProcess] = useState<string>("P2P");
  const [spendBand, setSpendBand] = useState("");
  const [costLeverBand, setCostLeverBand] = useState("");
  const [headcountBand, setHeadcountBand] = useState("");
  /** domainKey → rung (10-50) or null for "Not sure". Absent = unanswered. */
  const [maturity, setMaturity] = useState<Record<string, number | null>>({});
  const [aiMode, setAiMode] = useState("");
  const [domainText, setDomainText] = useState<Record<string, Record<string, string>>>({});

  const set = <K extends keyof Basics>(k: K, v: Basics[K]) =>
    setBasics((b) => ({ ...b, [k]: v }));

  /** What is currently typed in one of the deck's boxes. */
  const fieldText = (domainKey: string, fieldId: string) =>
    domainText[domainKey]?.[fieldId] ?? "";

  const setFieldText = (domainKey: string, fieldId: string, v: string) =>
    setDomainText((d) => ({ ...d, [domainKey]: { ...(d[domainKey] ?? {}), [fieldId]: v } }));

  const percentGroupTotal = (domainKey: string) => {
    const group = PERCENT_SUM_100[domainKey];
    if (!group) return null;
    let sum = 0;
    for (const id of group) {
      const r = parseFieldValue("percent", fieldText(domainKey, id));
      if (!r.ok || typeof r.value !== "number") return null;
      sum += r.value;
    }
    return sum;
  };

  const domainFieldsComplete = (domainKey: string) => {
    for (const field of fieldsForDomain(domainKey)) {
      const r = parseFieldValue(field.type, fieldText(domainKey, field.id));
      if (!r.ok) return false;
    }
    const total = percentGroupTotal(domainKey);
    if (total !== null && total !== 100) return false;
    return true;
  };

  const canonicalDomainFields = (): DomainFieldAnswers => {
    const out: DomainFieldAnswers = {};
    for (const d of P2P_DOMAINS) {
      const fields = fieldsForDomain(d.key);
      /* Slides 10 and 11: asked, no fields. `{}` records that they were walked. */
      if (fields.length === 0) {
        if (d.key in maturity) out[d.key] = {};
        continue;
      }
      const vals: Record<string, ParsedFieldValue> = {};
      for (const field of fields) {
        const r = parseFieldValue(field.type, fieldText(d.key, field.id));
        if (r.ok) vals[field.id] = r.value;
      }
      if (Object.keys(vals).length > 0) out[d.key] = vals;
    }
    return out;
  };

  const goTo = (s: Step) => {
    setError(null);
    setRawStep(s);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };
  const next = () => {
    const i = STEPS.indexOf(step);
    if (i < STEPS.length - 1) goTo(STEPS[i + 1]);
  };
  const back = () => {
    const i = STEPS.indexOf(step);
    if (i > 0) goTo(STEPS[i - 1]);
  };

  const shell = (opts: {
    title: string;
    subtitle?: string;
    onContinue?: () => void;
    continueLabel?: string;
    continueDisabled?: boolean;
    wide?: boolean;
    aside?: React.ReactNode;
  }) => ({
    continueLabel:
      opts.continueLabel ??
      (STEPS.indexOf(step) === STEPS.length - 1
        ? "Get My Report"
        : `Next: ${STEP_LABELS[STEPS[STEPS.indexOf(step) + 1]]}`),
    ...opts,
    // E017 — `.marketing-surface` on every step. `/assess` was the only public
    frameClassName: "marketing-surface",
    // THE BAR IS PER-SCREEN, THE LABEL IS PER-SECTION (E036), and mixing them is
    step: STEPS.indexOf(step) + 1,
    totalSteps: STEPS.length,
    stepLabel: sectionProgress(step, STEPS).label,
    counterText: null,
    /* bare "4 of 10" — never "Domain 4 of 10"; `domain` is reserved for the
       capability domains themselves. Null on single-screen sections. */
    subCounter: sectionProgress(step, STEPS).sub,
    canBack: STEPS.indexOf(step) > 0,
    onBack: back,
    busy,
  });

  // The old single-screen maturity step counted answers to decide between

  /** WS-4 — CONTINUE IS NEVER SILENTLY DISABLED. */
  /** The first unanswered required field ON THIS STEP. */
  const firstMissing = (onStep: Step) =>
    REQUIRED_BASICS.find(
      (f) => f.on === onStep && !String(basics[f.key] ?? "").trim()
    ) ?? null;

  function continueStep(onStep: Step, then: () => void) {
    const missing = firstMissing(onStep);
    if (!missing) {
      setError(null);
      then();
      return;
    }
    setError(`${missing.label} is needed before we can size your opportunity.`);
    const el = document.querySelector<HTMLElement>(`[data-field="${missing.key}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    (el?.querySelector("input,select,button") as HTMLElement | null)?.focus();
  }

  async function submit() {
    setBusy(true);
    setError(null);
    // THE SESSION ADDRESS IS SENT WHEN THERE IS ONE, so the schema's required
    const email = signedInEmail ?? basics.email;
    try {
      const r = await fetch("/api/assessment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...basics,
          email,
          process,
          // THE FOUR NEW CONTACT FIELDS RIDE IN `answers`, NOT AT THE TOP LEVEL, and
          answers: {
            maturity,
            spendBand,
            costLeverBand,
            headcountBand,
            aiMode,
            // BEFORE `contact`, AND THAT IS LOAD-BEARING. `check:catalog-value`
            domainFields: canonicalDomainFields(),
            contact: {
              timeZone: basics.timeZone,
              firstName: basics.firstName,
              lastName: basics.lastName,
              mobile: basics.mobile,
            },
          },
        }),
      });
      const body = await r.json().catch(() => null);
      if (!r.ok) throw new Error(body?.error ?? "Could not submit your answers");

      // THE REPORT IS THE LANDING, NOT THE EMAIL
      const token: string | undefined = body?.shareToken;
      if (token) {
        router.push(`/assess/r/${token}${body?.emailSent ? "?emailed=1" : ""}`);
        return;
      }
      /* No token in a 200 body should not happen — but losing the visitor is
         worse than a plain page, so /assess/submitted stays as the floor. */
      router.push(`/assess/submitted?to=${encodeURIComponent(email)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit your answers");
      setBusy(false);
    }
  }

  switch (step) {
    // ---- 1 — COMPANY DETAILS ------------------------------------------------
    case "basics":
      return (
        <WizardShell
          {...shell({
            /* Deck slide 12's own title (E040). Was "Company Details". */
            title: "Company Information",
            subtitle:
              "First, a few basics about your business. Ninety seconds. This is what lets us size the opportunity in real dollars — and figure out how much of it the tax code can fund.",
            /* Never disabled — see `continueBasics`. */
            onContinue: () => continueStep("basics", next),
            // NO ASIDE. `<ProofStats variant="wizard" />` used to sit here and
          })}
        >
          {error && <Notice>{error}</Notice>}

          {/* TWO COLUMNS AT `lg:` — the step is full width now the aside is gone */}
          <div className="grid gap-x-8 gap-y-5 lg:grid-cols-2 lg:items-start">
            <div data-field="companyName">
              <Field label="Company name">
                <TextInput
                  aria-required="true"
                  value={basics.companyName}
                  onChange={(e) => set("companyName", e.target.value)}
                  placeholder="Meridian Dental Group"
                />
              </Field>
            </div>

            {/* MARK THE ONE OPTIONAL FIELD, NOT THE SEVEN REQUIRED ONES. Industry */}
            <Field label="Industry (optional)">
              <select
                value={basics.industrySpecializationId}
                onChange={(e) => set("industrySpecializationId", e.target.value)}
                aria-label="Industry"
                className="w-full rounded-[12px] border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none focus:border-magenta"
              >
                {/* Placeholder first, so an unanswered field cannot look answered. */}
                <option value="">Select an industry…</option>
                {industries.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </Field>

            {/* WS-3 — TWO FACTS, TWO LABELS. One label ("Where do you file?") */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div data-field="state">
                <Field label="State of filing">
                  <select
                    aria-required="true"
                    value={basics.state}
                    onChange={(e) => set("state", e.target.value)}
                    aria-label="State of filing"
                    className="w-full rounded-[12px] border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none focus:border-magenta"
                  >
                    {/* THE EMPTY PLACEHOLDER IS LOAD-BEARING. `state` starts as */}
                    <option value="">Select a state…</option>
                    {STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div data-field="entityType">
                <Field label="Entity type">
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Entity type">
                    {ENTITY_TYPES.map((e) => (
                      <Chip
                        key={e.id}
                        selected={basics.entityType === e.id}
                        onClick={() => set("entityType", basics.entityType === e.id ? "" : e.id)}
                      >
                        {e.label}
                      </Chip>
                    ))}
                  </div>
                </Field>
              </div>
            </div>
            <p className="-mt-2 text-[13px] text-ink-2">
              State and entity type together set the tax picture — not the state alone.
            </p>

            <div data-field="platform">
            <Field label="What runs your business today?">
              <div className="space-y-3" role="group" aria-label="What runs your business today?">
                {PLATFORMS.map((p) => (
                  <OptionCard
                    key={p.id}
                    selected={basics.platform === p.id}
                    onClick={() => set("platform", p.id)}
                    title={p.label}
                  />
                ))}
              </div>
            </Field>
            </div>

            {/* THE LEAPFROG MESSAGE, and it only appears for the people it is */}
            {basics.platform === LEAPFROG_PLATFORM && (
              <Notice>
                If you&rsquo;re on legacy and dreading a cloud migration, there&rsquo;s usually a
                faster, cheaper path — AI on top of what you already run.
              </Notice>
            )}
          </div>
        </WizardShell>
      );

    // ---- 1 — PICK A PROCESS -------------------------------------------------
    case "process":
      return (
        <WizardShell
          {...shell({
            title: "What Process Do You Want to Assess First?",
            subtitle:
              "Start with one process — about 8 minutes. You'll answer for the area you know best; you can send the others to the people who own them.",
            continueDisabled: process !== "P2P",
            onContinue: next,
          })}
        >
          <div className="space-y-3">
            {PROCESSES.map((p) => (
              <OptionCard
                key={p.key}
                selected={process === p.key}
                // ONLY P2P IS SELECTABLE THIS PHASE, and the inactive tiles say
                onClick={() => p.active && setProcess(p.key)}
                title={p.active ? p.name : `${p.name} — not available`}
                description={
                  p.active
                    ? p.blurb
                    : `${p.blurb} Send it to a colleague from your report.`
                }
                className={p.active ? "" : "cursor-not-allowed opacity-55"}
              />
            ))}
          </div>
          {/* WS-8 — DERIVED FROM `active`, not written by hand. */}
          {(() => {
            const live = PROCESSES.filter((p) => p.active);
            if (live.length === 0) return null;
            return (
              <p className="mt-5 text-[14.5px] text-ink-2">
                Not sure? Start with{" "}
                <span className="font-bold text-ink">
                  {live.map((p) => p.name).join(" or ")}
                </span>{" "}
                — for most businesses it&rsquo;s where the money moves first.
              </p>
            );
          })()}
        </WizardShell>
      );

    // ---- 2a — THE MONEY INPUTS ----------------------------------------------
    case "money":
      return (
        <WizardShell
          {...shell({
            /* Deck slide 13's own title (E040). Was "Financial Details". */
            title: "Financial Information",
            subtitle: "Tell us about your revenue and earnings?",
            // NO `continueDisabled` HERE ANY MORE, AND ITS REMOVAL IS THE FIX FOR A
            onContinue: () => continueStep("money", next),
          })}
        >
          {/* Two columns at `lg:`, same reasoning as Company Details. */}
          <div className="grid gap-x-8 gap-y-6 lg:grid-cols-2 lg:items-start">
            <div data-field="revenueBand">
            <Field label="Last year's revenue">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Last year's revenue">
                {REVENUE_BANDS.map((b) => (
                  <Chip
                    key={b.id}
                    selected={basics.revenueBand === b.id}
                    onClick={() => set("revenueBand", b.id)}
                  >
                    {b.label}
                  </Chip>
                ))}
              </div>
            </Field>
            </div>

            {/* WS-4 — EBITDA IS REQUIRED NOW, and the helper names the payoff */}
            <div data-field="ebitdaBand">
            <Field
              label="Roughly, your profit (EBITDA) last year"
              hint="A band is fine. This is what lets us estimate how much of the work the tax code can fund."
            >
              <div className="flex flex-wrap gap-2" role="group" aria-label="Roughly, your profit (EBITDA) last year">
                {EBITDA_BANDS.map((b) => (
                  <Chip
                    key={b.id}
                    selected={basics.ebitdaBand === b.id}
                    onClick={() => set("ebitdaBand", basics.ebitdaBand === b.id ? "" : b.id)}
                  >
                    {b.label}
                  </Chip>
                ))}
              </div>
            </Field>
            </div>

          </div>
        </WizardShell>
      );

    // SLIDE 14 — PROCESS INFORMATION (E038)
    case "process_detail":
      return (
        <WizardShell
          {...shell({
            title: "Process Information",
            subtitle: "And finally, give us a few process-specific details…",
            continueDisabled: !spendBand || !costLeverBand || !headcountBand,
            onContinue: next,
          })}
        >
          <div className="grid gap-x-8 gap-y-6 lg:grid-cols-2 lg:items-start">
            <Field label="About how much did you spend with outside suppliers last year?">
              <div className="flex flex-wrap gap-2">
                {SPEND_BANDS.map((b) => (
                  <Chip key={b.id} selected={spendBand === b.id} onClick={() => setSpendBand(b.id)}>
                    {b.label}
                  </Chip>
                ))}
              </div>
            </Field>

            {/* LOCKED COPY EDIT — percentage bands, not Most/Some/Little. */}
            <Field label="Roughly what share of that is on negotiated contracts or catalogs?">
              <div className="flex flex-wrap gap-2">
                {COST_LEVER_BANDS.map((b) => (
                  <Chip
                    key={b.id}
                    selected={costLeverBand === b.id}
                    onClick={() => setCostLeverBand(b.id)}
                  >
                    {b.label}
                  </Chip>
                ))}
              </div>
            </Field>

            {/* LOCKED COPY EDIT — ONE combined headcount across the whole cycle. */}
            <Field label="How many people spend most of their time supporting purchasing — requesting, approving, negotiating, contracting, ordering, matching, invoicing, and paying?">
              <div className="flex flex-wrap gap-2">
                {HEADCOUNT_BANDS.map((b) => (
                  <Chip
                    key={b.id}
                    selected={headcountBand === b.id}
                    onClick={() => setHeadcountBand(b.id)}
                  >
                    {b.label}
                  </Chip>
                ))}
              </div>
            </Field>
          </div>
        </WizardShell>
      );

    // ---- 2b — THE MATURITY TAPS --------------------------------------------
  }

  // ONE STEP PER CAPABILITY DOMAIN (WS-3)
  const domain = domainForStep(step);
  if (domain) {
    const chosen = maturity[domain.key];
    return (
      <WizardShell
        {...shell({
          /* The deck's own title, verbatim. */
          title: `Capability Domain: ${domain.name}`,
          subtitle: domain.question,
          // THE MATURITY LADDER IS STILL NEVER BLOCKING. `next()` with nothing
          continueDisabled: !domainFieldsComplete(domain.key),
          onContinue: next,
        })}
      >
        <div className="space-y-3">
          {domain.rungs.map((r, i) => (
            <OptionCard
              key={r.title}
              selected={chosen === MATURITY_RUNGS[i]}
              onClick={() =>
                setMaturity((m) => ({ ...m, [domain.key]: MATURITY_RUNGS[i] }))
              }
              title={r.title}
              description={r.examples}
            />
          ))}
        </div>

        {/* the deck, which drops it. */}
        <button
          type="button"
          onClick={() => setMaturity((m) => ({ ...m, [domain.key]: null }))}
          aria-pressed={domain.key in maturity && chosen === null}
          className={
            "mt-4 text-[14.5px] underline underline-offset-4 transition-colors " +
            (domain.key in maturity && chosen === null
              ? "font-bold text-magenta"
              : "text-ink-2 hover:text-ink")
          }
        >
          I&rsquo;m Not Sure
        </button>

        <DomainFields
          domainKey={domain.key}
          fields={fieldsForDomain(domain.key)}
          value={(id) => fieldText(domain.key, id)}
          onChange={(id, v) => setFieldText(domain.key, id, v)}
          groupTotal={percentGroupTotal(domain.key)}
        />
      </WizardShell>
    );
  }

  switch (step) {
    case "aimode":
      return (
        <WizardShell
          {...shell({
            title: "One Last Question",
            subtitle: AI_MODE_QUESTION,
            continueDisabled: !aiMode,
            // THE LAST STEP FOR A SIGNED-IN VISITOR. Signed out, the email
            ...(signedInEmail
              ? { continueLabel: "See My Results", onContinue: submit }
              : { onContinue: next }),
          })}
        >
          {error && <Notice>{error}</Notice>}
          <div className="space-y-3">
            {AI_MODES.map((m) => (
              <OptionCard
                key={m.id}
                selected={aiMode === m.id}
                onClick={() => setAiMode(m.id)}
                title={m.label}
              />
            ))}
          </div>

          {/* THE ADDRESS IS CONFIRMED, NOT REQUESTED. This is what replaces step */}
          {signedInEmail && (
            <p className="mt-6 rounded-brand border border-line bg-bg-soft p-4 text-[14.5px] text-ink-2">
              Your report opens as soon as you submit, and it is saved to your
              account. We&rsquo;ll email the link to{" "}
              <span className="font-bold text-ink">{signedInEmail}</span> as well.
            </p>
          )}
        </WizardShell>
      );

    // ---- 13 — WHERE DO WE SEND IT? -----------------------------------------
    case "contact":
      return (
        <WizardShell
          {...shell({
            title: "My Information",
            /* Deck slide 15's own question — it asks WHO as well as where now. */
            subtitle: "Who and where do we send your dashboard link to?",
            // STILL REQUIRED, AND SIGNED-OUT ONLY. Moving email to the end is
            continueLabel: "See My Results",
            onContinue: () => continueStep("contact", submit),
          })}
        >
          {error && <Notice>{error}</Notice>}
          {/* EMAIL IS THE ONLY REQUIRED FIELD ON THIS SCREEN, AND THAT IS A CHOICE I */}
          <div className="grid max-w-xl gap-5 sm:grid-cols-2">
            <div data-field="firstName">
              <Field label="First name (optional)">
                <TextInput
                  value={basics.firstName}
                  onChange={(e) => set("firstName", e.target.value)}
                  placeholder="Paul"
                />
              </Field>
            </div>
            <div data-field="lastName">
              <Field label="Last name (optional)">
                <TextInput
                  value={basics.lastName}
                  onChange={(e) => set("lastName", e.target.value)}
                  placeholder="Ingrao"
                />
              </Field>
            </div>
          </div>
          <div className="mt-5 max-w-xl" data-field="email">
            <Field
              label="Your email"
              // BRACES, NOT A BARE ATTRIBUTE STRING -- and that is the fix, not
              hint={"Your report link is delivered here. We don\u2019t sell it or add you to a list."}
            >
              <TextInput
                aria-required="true"
                type="email"
                autoFocus
                value={basics.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="you@company.com"
              />
            </Field>
          </div>
          <div className="mt-5 grid max-w-xl gap-5 sm:grid-cols-2">
            <div data-field="mobile">
              <Field
                label="Mobile (optional)"
                hint="Only if you would rather be texted the link than emailed it."
              >
                <TextInput
                  type="tel"
                  value={basics.mobile}
                  onChange={(e) => set("mobile", e.target.value)}
                  placeholder="+1 555 010 4477"
                />
              </Field>
            </div>
            <div data-field="timeZone">
              <Field
                label="Time zone (optional)"
                hint="Prefilled from your browser. It sets the times we offer for the expert session."
              >
                <select
                  value={basics.timeZone}
                  onChange={(e) => set("timeZone", e.target.value)}
                  aria-label="Time zone"
                  className="w-full rounded-[12px] border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none focus:border-magenta"
                >
                  {/* THE EMPTY OPTION STAYS even though this is prefilled — the same */}
                  <option value="">Not sure</option>
                  {(TIME_ZONES.includes(basics.timeZone) || !basics.timeZone
                    ? TIME_ZONES
                    : [basics.timeZone, ...TIME_ZONES]
                  ).map((tz) => (
                    <option key={tz} value={tz}>
                      {tz.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
          {/* NO PHOTO CONTROL, DELIBERATELY. Slide 13 offers an optional "Add */}
        </WizardShell>
      );
  }
}
