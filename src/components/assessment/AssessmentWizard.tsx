"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WizardShell } from "@/components/onboarding/WizardShell";
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

/** The step's own name beside the counter — the pattern brief_S/E024 set. */
const STEP_LABELS: Record<Step, string> = {
  basics: "Your business",
  process: "Pick a process",
  money: "Your numbers",
  maturity: "How you work today",
  aimode: "AI mode",
};

type Basics = {
  companyName: string;
  industry: string;
  state: string;
  entityType: string;
  revenueBand: string;
  ebitdaBand: string;
  platform: string;
  email: string;
};

export function AssessmentWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("basics");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [basics, setBasics] = useState<Basics>({
    companyName: "",
    industry: "",
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
  }) => ({
    ...opts,
    step: STEPS.indexOf(step) + 1,
    totalSteps: STEPS.length,
    stepLabel: STEP_LABELS[step],
    canBack: STEPS.indexOf(step) > 0,
    onBack: back,
    busy,
  });

  const answeredDomains = P2P_DOMAINS.filter((d) => d.key in maturity).length;

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
            title: "Start your AI maturity discussion",
            subtitle:
              "First, a few basics about your business. Ninety seconds. This is what lets us size the opportunity in real dollars — and figure out how much of it the tax code can fund.",
            continueDisabled:
              !basics.companyName.trim() ||
              !basics.email.trim() ||
              !basics.revenueBand ||
              !basics.platform,
            onContinue: next,
          })}
        >
          {error && <Notice>{error}</Notice>}

          <div className="space-y-5">
            <Field label="Company name">
              <TextInput
                value={basics.companyName}
                onChange={(e) => set("companyName", e.target.value)}
                placeholder="Meridian Dental Group"
              />
            </Field>

            <Field label="Your email" hint="Your report link is delivered here.">
              <TextInput
                type="email"
                value={basics.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="you@company.com"
              />
            </Field>

            <Field label="Industry">
              <TextInput
                value={basics.industry}
                onChange={(e) => set("industry", e.target.value)}
                placeholder="Dental services"
              />
            </Field>

            {/*
              STATE AND ENTITY TOGETHER, in one field group and with one hint —
              the prototype is explicit that the two set the tax picture jointly
              and that neither alone answers the question. Splitting them across
              the form would invite someone to answer one and skip the other.
            */}
            <Field
              label="Where do you file?"
              hint="State + entity set the tax picture — the two together, not just the state."
            >
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={basics.state}
                  onChange={(e) => set("state", e.target.value)}
                  aria-label="State"
                  className="rounded-[12px] border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none focus:border-magenta"
                >
                  <option value="">State…</option>
                  {STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
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

            <Field label="Last year's revenue">
              <div className="flex flex-wrap gap-2">
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

            <Field
              label="Roughly, your profit (EBITDA) last year"
              hint="Optional — a band is fine. It's how we estimate the funding, and you can skip it."
            >
              <div className="flex flex-wrap gap-2">
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

            <Field label="What runs your business today?">
              <div className="space-y-3">
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
            title: "Where do you want to find value first?",
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
          <p className="mt-5 text-[14.5px] text-ink-2">
            Not sure? Start where the money moves — usually{" "}
            <span className="font-bold text-ink">Procurement</span> or{" "}
            <span className="font-bold text-ink">Billing</span>.
          </p>
        </WizardShell>
      );

    // ---- 2a — THE MONEY INPUTS ----------------------------------------------
    case "money":
      return (
        <WizardShell
          {...shell({
            title: "A few numbers first",
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
            title: "Now, how you do it today",
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
            title: "One last question",
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
