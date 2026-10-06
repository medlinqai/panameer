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
    /*
      ⚠ E017 — `.marketing-surface` on every step. `/assess` was the only public
      pre-account page without it (`/learn`, `/explore`, `/assess/r/[token]` and
      `/assess/scope` all have it), which is why dark mode painted `text-ink`
      figures onto a dark card. It goes on the frame rather than on a wrapper so
      the `body > flex-1` chain that E020 depends on stays intact.
    */
    frameClassName: "marketing-surface",
    /*
      ⚠ THE BAR IS PER-SCREEN, THE LABEL IS PER-SECTION (E036), and mixing them is
      deliberate. `step`/`totalSteps` still count screens so the bar advances every
      time the visitor answers something; a bar driven by the five sections would sit
      motionless through ten consecutive domain screens and read as broken. The words
      beside it name sections, because "4 of 15" reads as a chore where "Section 2 of
      5 · Capability Domains" reads as a place in a structure.

      The whole section string goes in `stepLabel` and the numeric counter is hidden
      (`counterText: null`), so the top line is exactly the one the brief specifies
      rather than the shell's default label-left/count-right split.
    */
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

  /*
    The old single-screen maturity step counted answers to decide between
    "Continue" and "Continue anyway". With one domain per step there is nothing
    to count — each step is individually skippable — so the counter went with it.
  */

  /**
   * WS-4 — CONTINUE IS NEVER SILENTLY DISABLED.
   *
   * It used to grey out with nothing on screen saying which of eight fields was
   * missing, which is exactly what made Scott stop and ask. Now the button is
   * always live: clicking with something outstanding names the FIRST missing
   * field and moves focus to it, so the answer is one glance away instead of a
   * hunt.
   */
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
    /*
      THE SESSION ADDRESS IS SENT WHEN THERE IS ONE, so the schema's required
      `email` is satisfied without a step asking for it. It is NOT the authority
      — the API re-resolves the address from its own session and overrides this
      — but posting a blank email would just earn a 400 from a rule the visitor
      cannot see.
    */
    const email = signedInEmail ?? basics.email;
    try {
      const r = await fetch("/api/assessment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...basics,
          email,
          process,
          /*
            ⚠ THE FOUR NEW CONTACT FIELDS RIDE IN `answers`, NOT AT THE TOP LEVEL, and
            that is not cosmetic: the `z` schema strips unknown keys, so the copies the
            `...basics` spread above puts at the top level are DISCARDED. `answers` is
            Json on the model precisely so a new question is not a migration — the
            column comment says so — and adding columns would be a schema change this
            brief does not authorise.
          */
          answers: {
            maturity,
            spendBand,
            costLeverBand,
            headcountBand,
            aiMode,
            /*
              ⚠ BEFORE `contact`, AND THAT IS LOAD-BEARING. `check:catalog-value`
              reads this payload by slicing from `answers: {` to the FIRST `},` —
              which is the end of the `contact` block below. A key added after it
              falls outside the slice and the guard silently stops seeing it.
            */
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

      /*
        ── THE REPORT IS THE LANDING, NOT THE EMAIL ────────────────────────────

        This used to push to /assess/submitted, which told the visitor to check
        an inbox — and with no RESEND_API_KEY configured, nothing ever arrived.
        The assessment was write-only: eight minutes of answers, no report. The
        API has always returned the share token; now it is used.

        `?emailed=1` is set only when the API says the send actually happened,
        so the report's "we've also emailed this to you" bar cannot claim a mail
        that was skipped or refused. It is a flag, not the address — the report
        already knows the address, and putting an email in a URL puts it in
        history, logs and referrers.
      */
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
            /*
              ⚠ NO ASIDE. `<ProofStats variant="wizard" />` used to sit here and
              it cost this step a third of its width: `WizardShell` only applies
              the `1fr_380px` grid when an aside exists, so removing it widens
              the step by itself and eight fields stop being a single tall
              column. E018.
            */
          })}
        >
          {error && <Notice>{error}</Notice>}

          {/*
            TWO COLUMNS AT `lg:` — the step is full width now the aside is gone,
            and seven fields stacked in one column is what put the Continue
            button off the bottom of the screen. `items-start` so a field that
            grows a hint does not stretch its neighbour.
          */}
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

            {/*
              MARK THE ONE OPTIONAL FIELD, NOT THE SEVEN REQUIRED ONES. Industry
              is the only skippable field on this step; starring seven and
              leaving one bare reads as a form that wants everything, which is
              the wrong tone on a free diagnostic.

              A SELECT, NOT FREE TEXT (E007). Scott typed "Den" and stopped —
              nothing guided the answer and nothing downstream could use it. The
              options are the catalog's INDUSTRY specializations, passed from the
              server component.
            */}
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

            {/*
              WS-3 — TWO FACTS, TWO LABELS. One label ("Where do you file?")
              asked a single question while the control captured two, so a
              visitor who picked a state reasonably believed they had answered
              it. Kept adjacent, and the helper below still ties them together
              as one tax question.
            */}
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
                    {/*
                      ⚠ THE EMPTY PLACEHOLDER IS LOAD-BEARING. `state` starts as
                      "", and a <select> with no empty option renders its first
                      real option as though it were chosen — so someone would see
                      "AL" and submit a state they never picked. Verified present.
                    */}
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

            {/*
              THE LEAPFROG MESSAGE, and it only appears for the people it is
              true for. Shown to legacy-ERP answers only — telling a QuickBooks
              shop there is "a faster path than a cloud migration" is answering
              a question they did not ask.
            */}
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
                /*
                  ONLY P2P IS SELECTABLE THIS PHASE, and the inactive tiles say
                  so rather than being hidden. Hiding them would misrepresent
                  the product as procurement-only; disabling them with an
                  honest label sets up step 6, where the other three are the
                  thing you forward to a colleague.
                */
                onClick={() => p.active && setProcess(p.key)}
                /* ⚠ RULING 18: no schedule on a disabled control. SUPERSEDED (`E164`):
                   //   title={p.active ? p.name : `${p.name} — coming soon`} */
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
          {/*
            WS-8 — DERIVED FROM `active`, not written by hand.

            The old hint named "Procurement" and "Billing" — neither word is on
            this page, and "Billing" is Order-to-Cash, which renders as a
            disabled "coming soon" card. The one line whose job is to help an
            undecided visitor was pointing at an option they cannot choose.
            Reading the flags means a second suggestion returns by itself when a
            second process goes live.
          */}
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
            /*
              ⚠ NO `continueDisabled` HERE ANY MORE, AND ITS REMOVAL IS THE FIX FOR A
              DEAD END (E038). It used to read
              `!spendBand || !costLeverBand || !headcountBand` — three fields that have
              MOVED to `process_detail`. Left in place, this screen would have greyed
              its own Continue out over answers it no longer displays, with no way for
              the visitor to satisfy it.

              Revenue and EBITDA are gated the way every other required field is: by
              `continueStep`, which names the first missing one and moves focus to it
              rather than silently disabling the button (WS-4).
            */
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

            {/*
              WS-4 — EBITDA IS REQUIRED NOW, and the helper names the payoff
              instead of the escape hatch. funding = EBITDA x TAX_RATE, so
              skipping it produced a savings figure with no funding figure —
              half a report. It is a band, so the ask stays small.
            */}
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

    /*
      ── SLIDE 14 — PROCESS INFORMATION (E038) ────────────────────────────────

      Scott: "SLIDE 14 IS NOT RELATED TO AI MODE." These three questions used to
      share the `money` screen, which made that screen carry five answers and made
      slide 14 look like it had no content of its own. They are the PROCESS-SPECIFIC
      three: spend with outside suppliers, share on negotiated contracts, and people
      supporting purchasing are all about Procure-to-Pay, where revenue and EBITDA
      would read identically on an Order-to-Cash assessment.

      ⚠ THIS SCREEN GATES ONLY ON FIELDS IT SHOWS. All three are rendered below and
      all three are in `continueDisabled`; none of them is required anywhere else.
      They are not in `REQUIRED_BASICS` because they are not part of `basics` — they
      are their own state and ride to the API inside `answers`.
    */
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

  /*
    ── ONE STEP PER CAPABILITY DOMAIN (WS-3) ────────────────────────────────────

    Handled before the switch because `cd_*` is a family, not five literals. The
    deck gives each domain a title, one plain question and four option rows; the
    rows are the ONBOARDING TRAINSTOP pattern — `OptionCard` from
    `onboarding/controls`, the same component `/join/requester`, `/join/provider`
    and `/join/buyer` use — rather than the chips this step used to render.
  */
  const domain = domainForStep(step);
  if (domain) {
    const chosen = maturity[domain.key];
    return (
      <WizardShell
        {...shell({
          /* The deck's own title, verbatim. */
          title: `Capability Domain: ${domain.name}`,
          subtitle: domain.question,
          /*
            ⚠ THE MATURITY LADDER IS STILL NEVER BLOCKING. `next()` with nothing
            chosen leaves the key absent, which scores exactly like "Not sure":
            excluded from the average rather than counted as the worst rung.

            ⚠ WHAT DOES BLOCK NOW IS THE DECK'S EXTRA FIELDS, on slides 2–9 only.
            Scott, 2026-08-20: "these fields should also be required." Slides 10 and
            11 carry none, so `domainFieldsComplete` is vacuously true there and
            those two steps behave exactly as they did before this brief.

            ⚠ THAT ASYMMETRY IS REAL AND IT IS FLAGGED, NOT HIDDEN: on slide 2 a
            visitor must type two numbers but may still walk past the maturity
            question itself. Gating maturity too would be a behaviour change on ten
            screens that the brief does not ask for, and "Not sure" already exists as
            the honest answer. Reported for Scott.
          */
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

        {/*
          ⚠ "NOT SURE" IS SUBORDINATE, NOT A FIFTH CARD — and it is kept against
          the deck, which drops it.

          `scoring.ts` depends on `null` to EXCLUDE a domain from the maturity
          average. Without this row all eight become mandatory and an honest "I
          don't know" has to be entered as a false answer — which then scores,
          and ranks, and ends up on the report as a recommendation. A domain
          nobody can describe is a real finding (usually "no owner"), and it is
          surfaced separately.

          Rendered as a plain text row so it reads as an escape hatch rather
          than as a fifth rung competing with the four.
        */}
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
            /*
              ⚠ THE LAST STEP FOR A SIGNED-IN VISITOR. Signed out, the email
              step follows (deck slide 13) and the label comes from STEP_LABELS
              via `shell()` — "Next: Where Do We Send It?". Signed in there is
              no step 13, so this submits, and it borrows the wording that step
              used rather than inventing a second final-button label.
            */
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

          {/*
            THE ADDRESS IS CONFIRMED, NOT REQUESTED. This is what replaces step
            13 for someone who is signed in — one line stating where the receipt
            goes, instead of a screen asking for an address the app already
            holds. It is not editable on purpose: the API stores the session's
            address regardless of what the browser posts, so an input here could
            only ever be a field that quietly ignores what you type.
          */}
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
            /*
              ⚠ STILL REQUIRED, AND SIGNED-OUT ONLY. Moving email to the end is
              a FUNNEL change, not a validation change: it is the delivery
              address for the magic link, and `/api/assessment` rejects a submit
              without it. The API contract is untouched.

              It is still the CAPTURE — the lead — which is why it was not
              removed when the report stopped being delivered by email. What
              changed is what it is FOR: a receipt and a bookmark sent after the
              fact, rather than the door the report sits behind. A signed-in
              visitor never reaches this step; see `stepsFor`.
            */
            continueLabel: "See My Results",
            onContinue: () => continueStep("contact", submit),
          })}
        >
          {error && <Notice>{error}</Notice>}
          {/*
            ⚠ EMAIL IS THE ONLY REQUIRED FIELD ON THIS SCREEN, AND THAT IS A CHOICE I
            AM STATING SO IT CAN BE ARGUED WITH (E039). The brief asked which of the
            deck's other four I made required and why.

            Answer: none of them. Email is the only one the report NEEDS — it is the
            delivery address for the link and `/api/assessment` rejects a submit
            without it. First/last name improve a greeting, mobile is a second channel
            nobody has asked to use yet, and time zone is already answered by the
            browser. This is the last screen before the payoff, so every additional
            required field here is paid for in completions, and none of these four buys
            anything the report cannot do without. Each is marked "(optional)" so the
            visitor can see that rather than infer it.

            If Scott wants any of them enforced, the change is one line each in
            `REQUIRED_BASICS` plus the matching `z` field — and `check:assessment`
            asserts the two agree, so it cannot be done on one side only.
          */}
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
              /*
                BRACES, NOT A BARE ATTRIBUTE STRING -- and that is the fix, not
                a style choice. This shipped as hint="...We don\\u2019t sell it..."
                and the page rendered those six characters literally: a JSX
                attribute string is NOT a JS string literal, so \\uXXXX is never
                interpreted there. Inside {} it is an ordinary string literal and
                the escape resolves to the apostrophe. Wording is unchanged.
              */
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
                  {/*
                    ⚠ THE EMPTY OPTION STAYS even though this is prefilled — the same
                    reasoning as the state select. And the browser's own zone is added
                    to the list when it is not one of the named ones, so a prefilled
                    value can never be a <select> showing something it does not hold.
                  */}
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
          {/*
            ⚠ NO PHOTO CONTROL, DELIBERATELY. Slide 13 offers an optional "Add
            Your Photo". There is no `Assessment` column to put it in, and the
            brief is explicit that adding one is out of scope — so wiring it
            would be more than a no-op and a control that discards its input is
            worse than an absent one. Flagged in the report; not built.
          */}
        </WizardShell>
      );
  }
}
