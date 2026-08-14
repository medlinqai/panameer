"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WizardShell } from "@/components/onboarding/WizardShell";
import { ProofStats } from "@/components/marketing/ProofStats";
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

/**
 * THE ASSESSMENT QUESTIONNAIRE (WS-A).
 *
 * ── IT REUSES THE WIZARD. THAT IS THE HARD RULE ──────────────────────────────
 *
 * Every screen here is a `<WizardShell>` from `components/onboarding`, and the
 * options are the shared `OptionCard` / `Chip` / `Field` / `TextInput` /
 * `Notice` controls that onboarding and Create Work Request already use. There
 * is NO new question UI in this file — no bespoke radio, no local card, no
 * private stepper. The structure mirrors `CreateWorkRequest.tsx` deliberately,
 * down to the `shell()` helper that folds the stepper label, Back wiring and
 * busy state into one place, so the two wizards cannot drift apart visually.
 *
 * The reason is not tidiness. A prospect who fills this in and later signs up
 * walks straight into the onboarding wizard; if the assessment had its own
 * look, the moment of conversion would also be the moment the product changed
 * shape under them.
 *
 * ── WHAT IS *NOT* A WIZARD ───────────────────────────────────────────────────
 *
 * The report and the deck. They are output surfaces reached after submit, and
 * they render as dashboards, not as steps. Same rule from the other side: a
 * result presented in wizard chrome reads like another question.
 *
 * ── COPY ─────────────────────────────────────────────────────────────────────
 *
 * Verbatim from the `assessment_flow_copy` prototype, with the two locked
 * 2026-08-13 edits: the cost-lever question is percentage bands (was
 * Most/Some/Little) and the labor question is ONE combined headcount (was two
 * answers crammed into one field). Both live in `lib/assessment/bands.ts`.
 */

const STEPS = ["basics", "process", "money", "maturity", "aimode"] as const;
type Step = (typeof STEPS)[number];

/**
 * The step's own name beside the counter — the pattern brief_S/E024 set.
 *
 * TITLE CASE AT THE SOURCE, not just via CSS. The stepper uppercases these, so
 * the casing is invisible there — but WS-5 reuses the SAME strings inside the
 * Continue label ("Next: Pick a Process"), where it very much shows.
 */
const STEP_LABELS: Record<Step, string> = {
  basics: "Company Details",
  process: "Pick a Process",
  money: "Your Numbers",
  maturity: "How You Work Today",
  aimode: "AI Mode",
};

/**
 * WS-4 — the required set, in ONE place, so the client gate cannot drift from
 * the field list. It is mirrored by the `z` schema in
 * `src/app/api/assessment/route.ts`; the two are asserted against each other in
 * `check:assessment`.
 *
 * Only `industry` is optional now. State and entity type feed the per-geography
 * tax rate, and EBITDA is the multiplicand in `funding = EBITDA x TAX_RATE` —
 * skipping it produces a savings number with no funding number, which removes
 * the half of the report that makes the engagement affordable.
 */
/*
  ⚠ `aria-required` IS ON THE THREE REAL FORM CONTROLS ONLY — the two text
  inputs and the state <select>. The other four required fields are groups of
  toggle buttons, and per ARIA 1.2 `aria-required` is not supported on
  `role="group"`; putting it there would be markup that validates as noise and
  that assistive tech is free to ignore. Making them `role="radiogroup"` would
  be valid but means changing the SHARED `Chip` from `aria-pressed` toggle
  semantics to `role="radio"`, which would alter every multi-select that uses it.

  So the requirement is carried the way a sighted user gets it too: only the one
  optional field is marked "(optional)", and the gate names the missing field on
  click and moves focus to it. Flagged in the report rather than papered over.
*/
const REQUIRED_BASICS: { key: keyof Basics; label: string }[] = [
  { key: "companyName", label: "Company name" },
  { key: "email", label: "Your email" },
  { key: "state", label: "State of filing" },
  { key: "entityType", label: "Entity type" },
  { key: "revenueBand", label: "Last year's revenue" },
  { key: "ebitdaBand", label: "Roughly, your profit (EBITDA) last year" },
  { key: "platform", label: "What runs your business today" },
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
};

export type IndustryOption = { id: string; name: string };

export function AssessmentWizard({
  industries = [],
}: {
  /**
   * From the catalog, via the server component. NEVER a hardcoded list — an
   * admin edit at /admin/industries has to reach this dropdown, and a local
   * copy of the ten names is exactly how the two silently diverge.
   */
  industries?: IndustryOption[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("basics");
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
  });
  const [process, setProcess] = useState<string>("P2P");
  const [spendBand, setSpendBand] = useState("");
  const [costLeverBand, setCostLeverBand] = useState("");
  const [headcountBand, setHeadcountBand] = useState("");
  /** domainKey → rung (10-50) or null for "Not sure". Absent = unanswered. */
  const [maturity, setMaturity] = useState<Record<string, number | null>>({});
  const [aiMode, setAiMode] = useState("");

  const set = <K extends keyof Basics>(k: K, v: Basics[K]) =>
    setBasics((b) => ({ ...b, [k]: v }));

  const goTo = (s: Step) => {
    setError(null);
    setStep(s);
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

  /**
   * Mirrors CreateWorkRequest's `shell()` — the same folded props in the same
   * order, so the two wizards cannot drift.
   *
   * ONE DELIBERATE DIFFERENCE: this passes a NUMERIC `step`, which
   * CreateWorkRequest does not. WizardShell only renders its counter when
   * `step` is a number — `stepLabel` alone is inert, which is why the first
   * pass here showed a bare progress bar and no "2/5" despite setting a label.
   * A cold visitor who has not signed up for anything needs to see how much is
   * left far more than a logged-in requester does, so the counter is on.
   */
  const shell = (opts: {
    title: string;
    subtitle?: string;
    onContinue?: () => void;
    continueLabel?: string;
    continueDisabled?: boolean;
    wide?: boolean;
    aside?: React.ReactNode;
  }) => ({
    /*
      WS-5 — CONTINUE NAMES THE NEXT STEP, the way /join/provider already does
      (page.tsx:1276). Both wizards use this shell; only that one used the
      affordance, so /assess fell back to a bare "Continue". Derived from
      STEP_LABELS so a renamed step renames the button with it.

      The last step says "Get My Report" instead of "Next: …" — there is no
      next step, and naming what the visitor GETS beats naming a step number.
    */
    continueLabel:
      opts.continueLabel ??
      (STEPS.indexOf(step) === STEPS.length - 1
        ? "Get My Report"
        : `Next: ${STEP_LABELS[STEPS[STEPS.indexOf(step) + 1]]}`),
    ...opts,
    step: STEPS.indexOf(step) + 1,
    totalSteps: STEPS.length,
    stepLabel: STEP_LABELS[step],
    canBack: STEPS.indexOf(step) > 0,
    onBack: back,
    busy,
  });

  const answeredDomains = P2P_DOMAINS.filter((d) => d.key in maturity).length;

  /**
   * WS-4 — CONTINUE IS NEVER SILENTLY DISABLED.
   *
   * It used to grey out with nothing on screen saying which of eight fields was
   * missing, which is exactly what made Scott stop and ask. Now the button is
   * always live: clicking with something outstanding names the FIRST missing
   * field and moves focus to it, so the answer is one glance away instead of a
   * hunt.
   */
  const firstMissing = () =>
    REQUIRED_BASICS.find((f) => !String(basics[f.key] ?? "").trim()) ?? null;

  function continueBasics() {
    const missing = firstMissing();
    if (!missing) {
      setError(null);
      next();
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
    try {
      const r = await fetch("/api/assessment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...basics,
          process,
          answers: { maturity, spendBand, costLeverBand, headcountBand, aiMode },
        }),
      });
      const body = await r.json().catch(() => null);
      if (!r.ok) throw new Error(body?.error ?? "Could not submit your answers");
      router.push(`/assess/submitted?to=${encodeURIComponent(basics.email)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit your answers");
      setBusy(false);
    }
  }

  switch (step) {
    // ---- 0 — COMPANY BASICS -------------------------------------------------
    case "basics":
      return (
        <WizardShell
          {...shell({
            title: "Company Details",
            subtitle:
              "First, a few basics about your business. Ninety seconds. This is what lets us size the opportunity in real dollars — and figure out how much of it the tax code can fund.",
            /* Never disabled — see `continueBasics`. */
            onContinue: continueBasics,
            /* WS-9 — the same three-stat strip the home hero renders. */
            aside: <ProofStats variant="wizard" />,
          })}
        >
          {error && <Notice>{error}</Notice>}

          <div className="space-y-5">
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

            <div data-field="email">
              <Field label="Your email" hint="Your report link is delivered here.">
                <TextInput
                  aria-required="true"
                  type="email"
                  value={basics.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="you@company.com"
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
                title={p.active ? p.name : `${p.name} — coming soon`}
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
            title: "A Few Numbers First",
            subtitle: "Bands are fine — this is what turns a generic list into your dollars.",
            continueDisabled: !spendBand || !costLeverBand || !headcountBand,
            onContinue: next,
          })}
        >
          <div className="space-y-6">
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
    case "maturity":
      return (
        <WizardShell
          {...shell({
            title: "Now, How You Do It Today",
            subtitle:
              "One tap each. “Not sure” is a real answer — it usually means nobody owns it, which is worth knowing.",
            continueDisabled: answeredDomains === 0,
            continueLabel:
              answeredDomains < P2P_DOMAINS.length ? "Continue anyway" : "Continue",
            onContinue: next,
            wide: true,
          })}
        >
          <div className="space-y-7">
            {P2P_DOMAINS.map((d) => (
              <div key={d.key}>
                <p className="text-[15.5px] font-bold text-ink">
                  {d.question}{" "}
                  <span className="font-semibold text-ink-2">({d.formal})</span>
                  {d.costLever && (
                    <span
                      className="ml-2 rounded-full bg-magenta/10 px-2 py-0.5 text-[11.5px] font-bold text-magenta"
                      title="A cost lever — what you answer here moves the price you pay, not just the effort."
                    >
                      ★ cost lever
                    </span>
                  )}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {d.rungs.map((label, i) => (
                    <Chip
                      key={label}
                      selected={maturity[d.key] === MATURITY_RUNGS[i]}
                      onClick={() =>
                        setMaturity((m) => ({ ...m, [d.key]: MATURITY_RUNGS[i] }))
                      }
                    >
                      {label}
                    </Chip>
                  ))}
                  {/*
                    "Not sure" stores null, NOT the bottom rung. Scoring treats
                    the two completely differently — see scoring.ts.
                  */}
                  <Chip
                    selected={d.key in maturity && maturity[d.key] === null}
                    onClick={() => setMaturity((m) => ({ ...m, [d.key]: null }))}
                  >
                    Not sure
                  </Chip>
                </div>
              </div>
            ))}
          </div>
        </WizardShell>
      );

    // ---- 2c — AI MODE, ASKED ONCE ------------------------------------------
    case "aimode":
      return (
        <WizardShell
          {...shell({
            title: "One Last Question",
            subtitle: AI_MODE_QUESTION,
            continueDisabled: !aiMode,
            continueLabel: "See my results",
            onContinue: submit,
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
        </WizardShell>
      );
  }
}
