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

/**
 * THIRTEEN STEPS, AND EIGHT OF THEM ARE GENERATED.
 *
 * Scott walked the old five-step version and filed ten errors, nine with one
 * cause: all eight capability domains were asked on ONE screen — 48 chips, no
 * hierarchy, a ladder drawn as an unordered cloud. The deck
 * (`4. Project Documents/AI Maturity Assessment.pptx`) answers it with one
 * screen per domain, and that is what this is.
 *
 * ⚠ THE DOMAIN STEPS ARE DERIVED FROM `P2P_DOMAINS`, NOT LISTED. Adding a ninth
 * domain to the bank adds a ninth step, renumbers the counter and renames the
 * "Next: …" button with no edit here. Listing them twice is how a bank and a
 * wizard come to disagree about how many questions there are.
 */
const domainStepId = (key: string) => `cd_${key}` as const;

const STEPS = [
  "basics",
  "money",
  "process",
  ...P2P_DOMAINS.map((d) => domainStepId(d.key)),
  "aimode",
  "contact",
] as const;
type Step = (typeof STEPS)[number];

/** The domain a `cd_*` step is asking about, or null for the other five. */
const domainForStep = (step: Step) =>
  P2P_DOMAINS.find((d) => domainStepId(d.key) === step) ?? null;

/**
 * The step's own name beside the counter — the pattern brief_S/E024 set.
 *
 * TITLE CASE AT THE SOURCE, not just via CSS. The stepper uppercases these, so
 * the casing is invisible there — but WS-5 reuses the SAME strings inside the
 * Continue label ("Next: Pick a Process"), where it very much shows.
 */
const STEP_LABELS: Record<Step, string> = {
  basics: "Company Details",
  money: "Financial Details",
  process: "Pick a Process",
  /*
    Built from the bank so the label, the counter and the "Next: …" button all
    read the same name. The deck titles these "Capability Domain: <Name>"; the
    stepper shows the bare name because the counter beside it already says what
    kind of thing it is, and "Next: Capability Domain: Contract Management"
    reads as a stutter.
  */
  ...Object.fromEntries(P2P_DOMAINS.map((d) => [domainStepId(d.key), d.name])),
  aimode: "One Last Question",
  contact: "Where Do We Send It?",
} as Record<Step, string>;

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
/**
 * ⚠ THIS LIST IS THE CLIENT MIRROR OF THE `z` SCHEMA in
 * `src/app/api/assessment/route.ts`, and `check:assessment` asserts the two name
 * EXACTLY the same fields. It stays whole even though the fields are now spread
 * across two steps — a shorter list here would mean the client happily submits
 * something the API rejects, which is the drift the test exists to catch.
 *
 * `on` says WHICH STEP asks for the field, so each step can gate its own subset.
 * Email moved to the last step (deck slide 13, "where do we send the link?") —
 * a funnel change, not a validation change. It is still required and the API
 * contract is untouched.
 */
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
    /*
      ⚠ E017 — `.marketing-surface` on every step. `/assess` was the only public
      pre-account page without it (`/learn`, `/explore`, `/assess/r/[token]` and
      `/assess/scope` all have it), which is why dark mode painted `text-ink`
      figures onto a dark card. It goes on the frame rather than on a wrapper so
      the `body > flex-1` chain that E020 depends on stays intact.
    */
    frameClassName: "marketing-surface",
    step: STEPS.indexOf(step) + 1,
    totalSteps: STEPS.length,
    stepLabel: STEP_LABELS[step],
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
    // ---- 1 — COMPANY DETAILS ------------------------------------------------
    case "basics":
      return (
        <WizardShell
          {...shell({
            title: "Company Details",
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
            /* Deck slide 2's own title. */
            title: "Financial Details",
            subtitle: "Bands are fine — this is what turns a generic list into your dollars.",
            continueDisabled: !spendBand || !costLeverBand || !headcountBand,
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
            NEVER BLOCKING. Every domain is skippable — `next()` with nothing
            chosen simply leaves the key absent, which scores exactly like "Not
            sure": excluded from the average rather than counted as the worst
            rung. Gating eight steps would turn a free diagnostic into an exam.
          */
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
          I&rsquo;m not sure
        </button>
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
              This no longer submits — the email step follows it now (deck slide
              13). The label comes from STEP_LABELS via `shell()` like every
              other step, so it reads "Next: Where Do We Send It?".
            */
            onContinue: next,
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

    // ---- 13 — WHERE DO WE SEND IT? -----------------------------------------
    case "contact":
      return (
        <WizardShell
          {...shell({
            title: "We\u2019re Working on Your Dashboard",
            subtitle: "Where do we send the link?",
            /*
              ⚠ STILL REQUIRED. Moving email to the end is a FUNNEL change, not
              a validation change: it is the delivery address for the magic
              link, and `/api/assessment` rejects a submit without it. The API
              contract is untouched.
            */
            continueLabel: "See My Results",
            onContinue: () => continueStep("contact", submit),
          })}
        >
          {error && <Notice>{error}</Notice>}
          <div className="max-w-xl" data-field="email">
            <Field
              label="Your email"
              hint="Your report link is delivered here. We don\u2019t sell it or add you to a list."
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
