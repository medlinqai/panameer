import { callTimeoutMs, MIN_CALL_MS } from "@/lib/resume/budget";
import { z } from "zod";
import {
  callExtractionModel,
  type ModelUsage,
  type ParserTier,
  type ProviderName,
} from "@/lib/resume/ai-provider";
import { AI_RESUME_SCHEMA, type AiResume } from "@/lib/resume/ai-extract";

/**
 * ENUMERATE FIRST, THEN EXTRACT (`P1-A1.4-E399` WS-2).
 *
 * ── ⚠⚠ WHY THE ONE-CALL VERSION FAILS, AND IT IS NOT A BUG ──────────────────
 *
 * `E399` measured a parse that returned **1 employer of 5, 9 projects of 14 and
 * 0 of 5 certifications** — and proved it was not truncation: `EDUCATION` is the
 * LAST section of the document and it came through. **A model that stopped early
 * cannot return the last section.** It read the whole thing and returned a
 * SUBSET.
 *
 * That is ordinary small-model behaviour. One call asking `gpt-5-nano` to hold
 * 11,000 characters in view and emit five employers, fourteen projects, five
 * certifications, forty skills, an overview and education is the hardest possible
 * framing of the task, and it fails by **sampling** — returning representative
 * items rather than all of them. The JSON is well-formed, schema-valid and
 * silently short. ⚠ THE MODEL IS NOT CHANGING (Scott: *"we use the cheaper
 * model...no one is going to pay frontier model pricing"*), so the framing has to.
 *
 * ── ⚠⚠ PASS 1 IS AN INVENTORY, NOT AN EXTRACTION ────────────────────────────
 *
 * It asks for one thing only: **every employer or engagement heading, verbatim,
 * with its date range, in document order.** No descriptions, no nesting, no
 * judgement. That is a high-recall, low-output task a cheap model is good at.
 *
 * ⚠⚠ AND ITS COUNT BECOMES THE CONTRACT. Once fourteen headings are on that
 * list, a later pass returning nine is a **DETECTED FAILURE, not a result** —
 * which is the thing that was missing entirely. See `recallReport`.
 *
 * ⚠ A FAILED PASS MUST NOT LOSE THE OTHERS. Every pass is independent and
 * reported on its own; a certifications pass that errors does not cost the
 * employers. Partial success is the normal outcome, never a discard.
 */

/* ═══════════════════════════════════════════════════════════════════════════
   THE PASSES
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * ⚠⚠ `kind` IS WHAT THE FIRST VERSION GOT WRONG, AND IT COST 24 FAKE EMPLOYERS.
 *
 * The inventory pass listed all 29 headings in Scott's CV correctly — that is the
 * recall it exists for. But every one was then handed to the employers pass, so a
 * document with FIVE employers and twenty-four client engagements under them
 * imported as **29 employers**. ⚠ THE INVENTORY WAS RIGHT AND THE ROUTING WAS
 * WRONG: over-counting is the same defect as under-counting wearing a different
 * face, and it is worse for the provider, who has to delete twenty-four rows.
 *
 * ⚠ SO THE CLASSIFICATION HAPPENS IN PASS 1, where the model is already looking
 * at the heading in document context, and NOT by a regex over the heading text —
 * "(via Elire)" and an em-dash are conventions of one CV, not a rule.
 */
const inventoryItem = z.object({
  heading: z.string(),
  dateRange: z.string().nullable().optional().default(null),
  kind: z.enum(["employer", "engagement"]).optional().default("employer"),
});
const INVENTORY = z.object({ items: z.array(inventoryItem).optional().default([]) });

const INVENTORY_SCHEMA = {
  type: "object" as const,
  properties: {
    items: {
      type: "array",
      description:
        "EVERY employer, company, client or engagement heading in the document, in the order they appear. One entry per heading. Do not merge, do not summarise, do not skip any.",
      items: {
        type: "object",
        properties: {
          heading: {
            type: "string",
            description: "The heading exactly as written in the document, verbatim.",
          },
          dateRange: {
            type: ["string", "null"],
            description: "The date range printed beside it, verbatim, or null.",
          },
          kind: {
            type: "string",
            enum: ["employer", "engagement"],
            description:
              "employer = a company that employed them, or their own firm. engagement = a client project or assignment DELIVERED UNDER one of those employers, including anything under an 'Additional', 'Selected' or 'Other' section.",
          },
        },
        required: ["heading", "dateRange", "kind"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
};

/**
 * ⚠ THE INVENTORY PROMPT SAYS "LIST", NEVER "EXTRACT" OR "SUMMARISE".
 *
 * The failing single call used a prompt that reads as *understand this document*.
 * This one reads as *copy these lines out*, which is a transcription task rather
 * than a comprehension task — and transcription is what a cheap model does well.
 * ⚠⚠ THE WORD "EVERY" AND THE BAN ON SUMMARISING ARE BOTH LOAD-BEARING: the
 * observed failure was the model deciding on its own that a representative sample
 * was a helpful answer.
 */
const INVENTORY_SYSTEM = `You are transcribing, not summarising.

List EVERY employer, company, client or engagement heading that appears in this
document, in document order, exactly as written.

RULES:
- Copy each heading VERBATIM. Do not tidy, expand or shorten it.
- Include EVERY one. If there are fourteen, return fourteen. Never return a
  representative sample.
- Include headings under "Additional", "Other", "Selected" or similar sections.
- One entry per heading, even if two headings name the same company.
- Do not return descriptions, achievements, bullet points or role titles.
- If a date range is printed beside a heading, copy it verbatim; otherwise null.

Then mark each one:
- "employer" — a company that EMPLOYED them, or a firm they founded or own.
- "engagement" — a client project or assignment they DELIVERED WHILE AT one of
  those employers. Anything listed under "Additional", "Selected Projects",
  "Other Engagements" or similar is an engagement, not an employer. A client name
  reached "via" a consultancy is an engagement of that consultancy.

Most résumés have FAR MORE engagements than employers. A thirty-year career with
five employers and twenty-five client projects is normal and correct.`;

export type InventoryItem = z.infer<typeof inventoryItem>;

export type PassOutcome<T> =
  | { ok: true; value: T; usage: ModelUsage; ms: number; model: string; provider: ProviderName; tier: ParserTier }
  /*
    ⚠⚠ USAGE TRAVELS ON THE FAILURE PATH TOO (`P1-A1.4-E409` WS-1c).

    A `shape` failure happens AFTER a successful model call, so `finishReason`,
    `outputTokens` and `reasoningTokens` all exist at that moment — and were
    being thrown away. ⚠ That is why `runPass` "collapses three different
    failures into one `{ok:false}`": a provider error, a truncation and a schema
    mismatch were indistinguishable from the outside, and the only way to tell
    them apart was to guess. Nothing can be chunked responsibly until the
    measurement says truncation is or is not the cause.
  */
  | { ok: false; reason: string; message: string; usage?: ModelUsage };

async function runPass<T>(
  name: string,
  system: string,
  schema: Record<string, unknown>,
  text: string,
  parse: (v: unknown) => T | null,
  maxOutputTokens = 8_000,
  /*
    ── ⚠ WHEN THE CONTAINING REQUEST BEGAN (`P1-A1.4-E415` WS-2) ─────────────
    ⚠ `null` MEANS "no route around me" — a script, a gate or the re-read
    button, where the per-call ceiling is the only limit that applies. The
    import route always supplies it.
  */
  startedAt: number | null = null
): Promise<PassOutcome<T>> {
  /*
    ⚠⚠ DON'T START A CALL THERE IS NO TIME FOR. A model call granted three
    seconds will spend them and fail, which reaches the same answer as not
    calling — but later, and for money. ⚠ AND IT REPORTS A DIFFERENT, TRUER
    REASON: `deadline` says the route ran out of room, where `error` would have
    blamed the model for a decision the clock made.
  */
  const budget = callTimeoutMs(startedAt);
  if (startedAt !== null && budget < MIN_CALL_MS) {
    return {
      ok: false,
      reason: "deadline",
      message: `${name}: not enough of the request's time was left to read this document`,
    };
  }
  const call = await callExtractionModel({
    system,
    schema,
    schemaName: `resume_${name}`,
    text,
    maxOutputTokens,
    /* ⚠ `E415` — the smaller of this pass's ceiling and what the route has left. */
    timeoutMs: budget,
    /*
      ── ⚠⚠ CONSTRAINED DECODING FOR THE SIX PASSES (`P1-A1.4-E414` WS-1) ─────

      ⚠ ONE SITE, SIX SCHEMAS. `runPass` is the only funnel every multi-pass
      schema goes through — `resume_inventory`, `resume_employers`,
      `resume_projects`, `resume_certifications`, `resume_skills` and
      `resume_profile` — so opting in here opts in exactly those and cannot
      reach anything else. ⚠ `record_resume` calls `callExtractionModel`
      DIRECTLY from `ai-extract.ts` and the job importer from
      `work-request/job-import.ts`; neither passes the flag, so both keep the
      default of `false`. That is structural, not a convention.

      ⚠ WHY IT WAS SAFE HERE AND NOWHERE ELSE. `sub()` below builds every one of
      these schemas with `additionalProperties: false` and every property named
      in `required`, with optionality as `type: ["string","null"]` — which is
      exactly strict mode's contract. `record_resume` does not: `E413`'s audit
      counted ten blockers on it. ⚠ `check:strict-schema` §3 re-derives this
      from the REQUEST BODIES rather than trusting the claim, so a field added
      to one of these schemas without a `required` entry fails a gate instead of
      a live call.

      ── ⚠ MEASURED, BOTH SIDES, SAME DOCUMENTS (`E414` WS-3) ──────────────

      60 pass calls each side — 5 rounds x 6 passes x 2 documents:

          shape failures   13/60 (21.7%)  ->  0/60 (0.0%)
            projects 6->0 · certifications 4->0 · inventory 2->0 · employers 1->0
          finishReason     `stop` on all 60, BOTH sides

      ⚠⚠ `stop` ON EVERY CALL IS THE POINT. The model was always answering
      completely and always within budget; it was simply free to answer in
      another shape. Nothing about capacity or truncation changed here.

      ⚠⚠ AND ONE RESULT CONTRADICTS THE EXPECTATION — output tokens rose
      **+18.8%** (115,349 -> 137,007), concentrated in the two passes with the
      most nullable fields:

          employers  2590 -> 3738 mean output tokens  (+1148)
          projects   2555 -> 3497                     (+942)
          inventory / certifications / skills / profile   ~flat

      ⚠ THAT IS INHERENT TO STRICT, NOT A REGRESSION: every property must appear
      in `required`, so the model now emits `"client": null, "employer": null`
      where it previously omitted them. ⚠ COSTED AT THE PUBLISHED `gpt-5-nano`
      RATE, the output side of a full parse goes **$0.00461 -> $0.00548**, about
      **+$0.0009 per parse.** ⚠ The brief expected zero difference; it is not
      zero, it is small and explainable, and it is recorded here rather than
      left to surprise somebody reading a bill.

      ⚠ NO WARMUP WAS MEASURABLE. Structured outputs are documented to carry a
      one-time schema-processing cost on first use. First-call deltas came back
      MIXED IN SIGN on both sides and well inside the run-to-run spread (the
      `projects` pass alone ranged 4,192–31,865ms), so at this sample size there
      is no warmup signal above the noise. Reported as not-detected rather than
      as absent.

      ── ⚠⚠ WHAT THIS DOES **NOT** FIX (`E414` WS-5) ────────────────────────

      ⚠⚠ STRICT CONSTRAINS SHAPE, NOT CONTENT. **29, 30 and 51 sections on the
      same document were every one of them SCHEMA-VALID** (`E410` WS-2, measured
      again by `E413`). Constrained decoding would not have prevented a single
      one of those, and a green shape-failure rate must not be read as a fixed
      parser.

      ⚠⚠ AND `E414`'s OWN AFTER-RUN PROVES IT, WITH STRICT ON: the long CV
      returned **30, 29, 52, 29, 31** sections across five rounds and the short
      one **30, 50, 32, 32, 29**. Zero shape failures, and a 29-to-52 spread on
      one unchanged document. ⚠ THE PARSER IS WELL-FORMED NOW; IT IS NOT
      CORRECT.

      ⚠ SEGMENTATION INSTABILITY REMAINS OPEN AND IS SCOTT'S DECISION. After
      this brief it is the only parser defect left standing.

      ⚠ AND THE LINK `E413` FOUND, RECORDED HERE BECAUSE THIS IS WHERE SOMEBODY
      WILL COME LOOKING: the extra section in the high run is *"Oracle Cloud
      Content & AI-Native Application Developer"* — the SAME row that sits in
      the database as the duplicate-description employer (`E413` WS-3 candidate
      B, whose `role_title` is the empty string). ⚠ They are one defect wearing
      two names. Not fixed here.
    */
    strict: true,
  });
  if (!call.ok) return { ok: false, reason: call.reason, message: call.message };
  const value = parse(call.value);
  if (value === null)
    return {
      ok: false,
      reason: "shape",
      message: `${name}: the model's output did not match the expected shape`,
      /* ⚠ THE CALL SUCCEEDED — only the PARSE failed, so the spend is real and
         knowable. Reporting it is what distinguishes "the model ran out of room"
         from "the model answered in the wrong shape". */
      usage: call.usage,
    };
  return {
    ok: true,
    value,
    usage: call.usage,
    ms: call.ms,
    model: call.model,
    provider: call.provider,
    tier: call.tier,
  };
}

/** ⚠ PASS 1. The contract every later pass is measured against. */
export function inventoryPass(
  text: string,
  /* ⚠ `startedAt` — the containing request's clock (`E415`). Null off-route. */
  startedAt: number | null = null
): Promise<PassOutcome<InventoryItem[]>> {
  return runPass(
    "inventory",
    INVENTORY_SYSTEM,
    INVENTORY_SCHEMA as unknown as Record<string, unknown>,
    text,
    (v) => {
      const r = INVENTORY.safeParse(v);
      return r.success ? r.data.items : null;
    },
    /*
      ⚠⚠ 12k, AND THE FIRST VALUE HERE WAS 4k AND IT FAILED — MEASURED, NOT
      GUESSED. `[resume] truncated: completion=4000 reasoning=4000 budget=4000`:
      the model spent the ENTIRE budget reasoning and emitted nothing.
      `ai-provider.ts` documents exactly this — **on a reasoning model
      `max_completion_tokens` is a budget for THINKING, not for output** — and the
      inventory is the one pass that must never fail, because it is the contract
      every other pass is measured against and a failure here drops the import to
      the heuristic parse.
    */
    12_000,
    startedAt
  );
}

/* ─── The scoped detail passes ─────────────────────────────────────────────
   ⚠ EACH ASKS FOR ONE SECTION OF THE SCHEMA. The whole point is that no single
   call is asked to hold the entire document's structure in view at once. */

const partial = <K extends keyof AiResume>(keys: K[]) =>
  AI_RESUME_SCHEMA.pick(Object.fromEntries(keys.map((k) => [k, true])) as never);

function sub(properties: Record<string, unknown>, required: string[]) {
  return { type: "object" as const, properties, required, additionalProperties: false };
}

/**
 * ⚠⚠ THE EMPLOYER PASS IS TOLD WHAT IT MUST RETURN. The inventory is handed back
 * to the model as a checklist, so "return one of five" stops being an option it
 * can take silently — and when it does anyway, `recallReport` sees it.
 */
export function employersPass(
  text: string,
  inventory: InventoryItem[],
  /* ⚠ `startedAt` — the containing request's clock (`E415`). Null off-route. */
  startedAt: number | null = null
) {
  const list = inventory.map((i, n) => `${n + 1}. ${i.heading}${i.dateRange ? ` (${i.dateRange})` : ""}`).join("\n");
  const system = `You are transcribing a résumé's work history.

This document contains EXACTLY these ${inventory.length} employer/engagement headings,
already identified:

${list}

Return ONE entry for EACH of the ${inventory.length} headings above, in the same order.
Do not merge them. Do not omit any. Do not add any that are not listed.
For each, fill in the role title, dates and description from the document.
If the document says nothing about a field, use null — never invent one.`;
  const schema = sub(
    {
      employers: {
        type: "array",
        description: `Exactly ${inventory.length} entries, one per listed heading, in order.`,
        items: sub(
          {
            /*
              ── ⚠⚠ THE DESCRIPTIONS ARE BACK (`P1-A1.4-E407` WS-3) ────────────

              ⚠ `E399` SPLIT THE PROMPT INTO PASSES AND DROPPED THEM. The
              superseded single-pass schema (`ai-extract.ts`) carries
              `P1-J1.4-E373`'s instruction, and E373's own comment says why it is
              load-bearing: *"Making the Zod field nullable without telling the
              model changes nothing: the model answers the DESCRIPTION, not the
              schema."* These two fields went BARE when the passes were written.

              ⚠⚠ CARRIED BACK EVEN THOUGH THE AI PATH IS NOT WHAT SWAPPED SCOTT'S
              ROWS — the heuristic did that (`parse.ts`, fixed in this brief).
              This is the same defect latent on the other path, waiting for the
              AI to be the one answering. Measured: the AI's own orientation is
              currently CORRECT (`employer:"StratERP Inc."`), which is exactly
              when it is cheap to protect.
            */
            name: {
              type: ["string", "null"],
              description:
                "The employing company, or null if the résumé names none — do not substitute a job title. A self-employed or contracting line often names no company at all; null is the correct answer there.",
            },
            roleTitle: {
              type: ["string", "null"],
              description:
                "The person's job title at that company — not the company name, and not a client or project name.",
            },
            description: { type: ["string", "null"] },
            startDate: { type: ["string", "null"] },
            endDate: { type: ["string", "null"] },
          },
          ["name", "roleTitle", "description", "startDate", "endDate"]
        ),
      },
    },
    ["employers"]
  );
  return runPass("employers", system, schema as unknown as Record<string, unknown>, text, (v) => {
    const r = partial(["employers"]).safeParse(v);
    return r.success ? r.data.employers : null;
  }, 12_000, startedAt);
}

export function projectsPass(
  text: string,
  engagements: InventoryItem[] = [],
  /* ⚠ `startedAt` — the containing request's clock (`E415`). Null off-route. */
  startedAt: number | null = null
) {
  /* ⚠ THE ENGAGEMENTS FROM PASS 1 ARE HANDED BACK AS A CHECKLIST, the same way
     the employers pass gets its own — so the count is a contract here too. */
  const list = engagements.length
    ? `\n\nThese ${engagements.length} client engagements were already identified in this document:\n` +
      engagements.map((i, n) => `${n + 1}. ${i.heading}`).join("\n") +
      `\n\nReturn one entry for EACH of them, plus any other project the document describes.`
    : "";
  const system = `You are transcribing, not summarising.

List EVERY project, engagement or client deliverable described in this document.
Never return a representative sample. Copy names verbatim.
Where a project sits under an employer or client, say which.
If the document says nothing about a field, use null — never invent one.${list}`;
  const schema = sub(
    {
      projects: {
        type: "array",
        description: "Every project in the document, in order. Not a sample.",
        items: sub(
          {
            name: { type: "string" },
            description: { type: ["string", "null"] },
            employer: { type: ["string", "null"] },
            client: { type: ["string", "null"] },
            startDate: { type: ["string", "null"] },
            endDate: { type: ["string", "null"] },
            software: { type: "array", items: { type: "string" } },
          },
          ["name", "description", "employer", "client", "startDate", "endDate", "software"]
        ),
      },
    },
    ["projects"]
  );
  return runPass("projects", system, schema as unknown as Record<string, unknown>, text, (v) => {
    const r = partial(["projects"]).safeParse(v);
    return r.success ? r.data.projects : null;
  }, 12_000, startedAt);
}

/** ⚠ ON ITS OWN PASS BECAUSE IT WAS THE WORST HIT — 0 of 5 (`E399`). */
export function certificationsPass(text: string, startedAt: number | null = null) {
  const system = `You are transcribing, not summarising.

List EVERY certification, credential, licence or accreditation named in this
document — including any under a heading like "CERTIFICATIONS", "ORACLE CLOUD
CERTIFICATIONS", "CREDENTIALS" or "LICENCES".
If there are five, return five. Copy each name verbatim.
If the document says nothing about a field, use null — never invent one.`;
  const schema = sub(
    {
      certifications: {
        type: "array",
        description: "Every certification in the document. Not a sample.",
        items: sub(
          {
            name: { type: "string" },
            issuer: { type: ["string", "null"] },
            issuedOn: { type: ["string", "null"] },
            expiresOn: { type: ["string", "null"] },
          },
          ["name", "issuer", "issuedOn", "expiresOn"]
        ),
      },
    },
    ["certifications"]
  );
  return runPass("certifications", system, schema as unknown as Record<string, unknown>, text, (v) => {
    const r = partial(["certifications"]).safeParse(v);
    return r.success ? r.data.certifications : null;
    /* ⚠ Same reasoning-budget trap as the inventory — see `inventoryPass`. */
  }, 8_000, startedAt);
}

export function skillsPass(text: string, startedAt: number | null = null) {
  const system = `You are transcribing, not summarising.

List EVERY distinct technical skill, tool, platform, module and language named in
this document, including everything under a "CORE COMPETENCIES", "SKILLS" or
"TECHNICAL" heading. Copy each verbatim. Do not group or summarise them.
Put human languages in "languages" and everything else in "skills".`;
  const schema = sub(
    {
      skills: { type: "array", items: { type: "string" } },
      languages: { type: "array", items: { type: "string" } },
    },
    ["skills", "languages"]
  );
  return runPass("skills", system, schema as unknown as Record<string, unknown>, text, (v) => {
    const r = partial(["skills", "languages"]).safeParse(v);
    return r.success ? { skills: r.data.skills, languages: r.data.languages } : null;
  }, 8_000, startedAt);
}

export function profilePass(text: string, startedAt: number | null = null) {
  const system = `Read this résumé and return three things:
- headline: their professional title, as the document presents it.
- overview: their professional summary, IN THEIR OWN WORDS from the document. If
  the document has a summary or profile paragraph, copy it. Do not write a new one.
- education: EVERY school, degree or qualification listed.
If the document says nothing about a field, use null — never invent one.`;
  const schema = sub(
    {
      headline: { type: ["string", "null"] },
      overview: { type: ["string", "null"] },
      education: {
        type: "array",
        items: sub(
          {
            institution: { type: "string" },
            degree: { type: ["string", "null"] },
            field: { type: ["string", "null"] },
            startYear: { type: ["string", "number", "null"] },
            endYear: { type: ["string", "number", "null"] },
          },
          ["institution", "degree", "field", "startYear", "endYear"]
        ),
      },
    },
    ["headline", "overview", "education"]
  );
  return runPass("profile", system, schema as unknown as Record<string, unknown>, text, (v) => {
    const r = partial(["headline", "overview", "education"]).safeParse(v);
    return r.success ? r.data : null;
  }, 8_000, startedAt);
}

/* ═══════════════════════════════════════════════════════════════════════════
   THE ORCHESTRATOR — AND ⚠⚠ THE THING THAT NOTICES (WS-3)
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * ⚠⚠ COUNTABLE FEATURES OF THE SOURCE, INDEPENDENT OF THE MODEL.
 *
 * The inventory is itself a model output, so trusting it alone would be marking
 * the model's homework with the model's own pen. Date ranges are countable from
 * the raw text with a regex, which is why they are the second opinion.
 */
export function countDateRanges(text: string): number {
  const RANGE =
    /\b(?:(?:19|20)\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(?:19|20)\d{2})\s*(?:–|—|-|to|through)\s*(?:present|current|(?:19|20)\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(?:19|20)\d{2})/gi;
  return (text.match(RANGE) ?? []).length;
}

export type RecallReport = {
  /** Pass 1's count — the contract. */
  headingsFound: number;
  /** What the employer pass actually returned. */
  employersReturned: number;
  projectsReturned: number;
  certificationsReturned: number;
  /** Countable from the raw text, no model involved. */
  dateRangesInSource: number;
  /*
    ⚠ Passes that failed, AND WHY (`P1-A1.4-E415` WS-3). ⚠ SUPERSEDED, quoted:
    `failedPasses: string[]` — the name alone. ⚠⚠ "We couldn't read the projects
    section" is true whether the model errored or the REQUEST RAN OUT OF TIME,
    and those are different problems with different next steps: one is worth
    retrying immediately, the other will happen again on the same document.
  */
  failedPasses: { name: string; reason: string }[];
  /** ⚠⚠ True when the contract was not met — a DETECTED failure, not a result. */
  shortfall: boolean;
  /** Plain sentences for the review screen. Empty when nothing is wrong. */
  warnings: string[];
};

/**
 * ⚠⚠ THE DEEPEST DEFECT `E399` FOUND WAS NOT THAT THE IMPORT WAS SHORT — IT IS
 * THAT NOTHING NOTICED. The pipeline validated that the JSON parsed; nothing ever
 * compared what came back against what is in the document, so 1-of-5 cleared
 * every gate and presented a half-profile as finished.
 *
 * ⚠ THIS DOES NOT FAIL THE IMPORT. The provider is mid-signup and a hard stop
 * loses them; a short import plus an honest warning is strictly better.
 * ⚠⚠ AND IT DOES NOT AUTO-RETRY. A second call costs money and may return the
 * same thing — that is the person's decision, offered as a button.
 */
export function recallReport(input: {
  headings: number;
  employers: number;
  projects: number;
  certifications: number;
  dateRanges: number;
  failedPasses: { name: string; reason: string }[];
  /** Every heading pass 1 saw, employers and engagements together. */
  headingsTotal?: number;
}): RecallReport {
  const warnings: string[] = [];
  if (input.headings > 0 && input.employers < input.headings) {
    warnings.push(
      `We found ${input.headings} employers in your document and imported ${input.employers} — check your work history.`
    );
  }
  /* ⚠ THE SECOND OPINION. A source with many more date ranges than imported
     entries is the signature of the sampling failure, even when the inventory
     itself came back short. */
  const imported = input.employers + input.projects;
  /* ⚠⚠ THE STRONGEST SIGNAL IS PASS 1'S OWN TOTAL, because it is measured on the
     document rather than inferred from a regex — date ranges only catch entries
     that carry one, and this CV prints only eight of them for 29 headings. */
  const total = input.headingsTotal ?? 0;
  if (total > 0 && imported < total) {
    warnings.push(
      `We found ${total} roles and projects in your document and imported ${imported} — check your work history.`
    );
  }
  if (input.dateRanges > imported + 2) {
    warnings.push(
      `We found ${input.dateRanges} date ranges in your document and imported ${imported} dated entries — some history may be missing.`
    );
  }
  for (const p of input.failedPasses) {
    /*
      ⚠⚠ THE CLOCK IS NAMED WHEN THE CLOCK IS THE CAUSE (`E415` WS-3). Scott's
      complaint was that the failure *"told me it did not work"* and nothing
      else. A section dropped because the upload ran out of time will be dropped
      again on the same document — saying so is the difference between "try
      again" and "try again and expect the same".
    */
    const outOfTime = p.reason === "deadline" || p.reason === "truncated";
    const why = outOfTime
      ? " — your document took longer to read than we allow for one upload"
      : "";
    warnings.push(
      p.name === "certifications"
        ? `We couldn't read your certifications${why}. Everything else imported — add them manually or try again.`
        : `We couldn't read the ${p.name} section${why}. Everything else imported.`
    );
  }
  return {
    headingsFound: input.headings,
    employersReturned: input.employers,
    projectsReturned: input.projects,
    certificationsReturned: input.certifications,
    dateRangesInSource: input.dateRanges,
    failedPasses: input.failedPasses,
    shortfall: warnings.length > 0,
    warnings,
  };
}

export type MultiPassOutcome =
  | {
      ok: true;
      data: AiResume;
      recall: RecallReport;
      model: string;
      provider: ProviderName;
      tier: ParserTier;
      inputChars: number;
      ms: number;
      usage: ModelUsage;
      /** ⚠ Per-pass wall time and cost, so the claim can be checked. */
      passes: { name: string; ok: boolean; ms: number; costUsd: number | null }[];
    }
  | { ok: false; reason: "no_key" | "error" | "refusal" | "deadline"; message: string };

/**
 * ⚠ EVERY PASS IS INDEPENDENT AND PARTIAL SUCCESS IS THE NORMAL OUTCOME. Only a
 * failed INVENTORY is fatal — without it there is no contract to measure against,
 * and an unmeasured import is the state this brief exists to end.
 */
export async function aiExtractResumeMultiPass(
  text: string,
  /*
    ⚠ THE CONTAINING REQUEST'S CLOCK (`P1-A1.4-E415` WS-2). Every pass below
    receives it, so each asks how much of the ROUTE is left rather than how much
    it would like. ⚠ `null` off-route — scripts and gates keep the per-call
    ceiling and nothing else.
  */
  startedAt: number | null = null
): Promise<MultiPassOutcome> {
  const started = Date.now();
  /*
    ⚠ `reason` AND `message` ARE CARRIED NOW (`P1-A1.4-E407` WS-2). They used to
    be dropped on the failure branch, so a provider error, a truncation and a
    SHAPE mismatch all arrived as one indistinguishable `{ok:false}` — and the
    next person to diagnose it would be guessing between a budget problem and a
    schema problem. Measured 2026-09-09: the failures are `shape`, on runs whose
    `finishReason` is `stop`, which rules truncation out entirely.
  */
  const passes: {
    name: string;
    ok: boolean;
    ms: number;
    costUsd: number | null;
    reason?: string;
    message?: string;
    /** ⚠ Present on a `shape` failure — the call ran, so the spend is knowable. */
    finishReason?: string | null;
    outputTokens?: number | null;
    reasoningTokens?: number | null;
  }[] = [];
  const failed: { name: string; reason: string }[] = [];
  let inTok = 0, outTok = 0, cachedTok = 0, reasoningTok = 0, cost = 0, anyCost = false;
  let model = "", provider: ProviderName = "openai", tier: ParserTier = "economy";
  let finishReason: string | null = null;

  const tally = (name: string, r: PassOutcome<unknown>) => {
    if (r.ok) {
      passes.push({
        name, ok: true, ms: r.ms, costUsd: r.usage.costUsd,
        finishReason: r.usage.finishReason,
        outputTokens: r.usage.outputTokens,
        reasoningTokens: r.usage.reasoningTokens,
      });
      inTok += r.usage.inputTokens; outTok += r.usage.outputTokens;
      cachedTok += r.usage.cachedInputTokens; reasoningTok += r.usage.reasoningTokens;
      if (r.usage.costUsd != null) { cost += r.usage.costUsd; anyCost = true; }
      model = r.model; provider = r.provider; tier = r.tier;
      /* ⚠ ANY pass reporting a truncation is the one worth surfacing. */
      if (r.usage.finishReason && r.usage.finishReason !== "stop" && r.usage.finishReason !== "end_turn")
        finishReason = r.usage.finishReason;
      else finishReason = finishReason ?? r.usage.finishReason;
    } else {
      passes.push({
        name, ok: false, ms: 0, costUsd: r.usage?.costUsd ?? null,
        reason: r.reason, message: r.message,
        finishReason: r.usage?.finishReason ?? null,
        outputTokens: r.usage?.outputTokens ?? null,
        reasoningTokens: r.usage?.reasoningTokens ?? null,
      });
      failed.push({ name, reason: r.reason });
    }
  };

  const inv = await inventoryPass(text, startedAt);
  tally("inventory", inv);
  if (!inv.ok) {
    /* ⚠ SUPERSEDED, quoted (`E414` WS-2): `inv.reason === "no_key" ? "no_key" : "error"`. */
    return {
      ok: false,
        /* ⚠ `deadline` joins them (`E415`): the route ran out of room, which is
         neither a model error nor a refusal, and `import.ts` records the string
         on `ImportPath.reason`. */
      reason:
        inv.reason === "no_key" || inv.reason === "refusal" || inv.reason === "deadline"
          ? inv.reason
          : "error",
      message: inv.message,
    };
  }

  /* ⚠ THE DETAIL PASSES RUN TOGETHER — they are independent, and running them in
     sequence would multiply the wall time a provider waits by four. */
  /*
    ⚠⚠ ROUTE BY `kind`. Handing all 29 headings to the employers pass is what
    produced 29 employers for a five-employer CV on the first measured run.
    ⚠ AN INVENTORY THAT CLASSIFIES NOTHING FALLS BACK TO "ALL EMPLOYERS", which is
    the old behaviour and is safe: over-listing employers is visible to the person
    reviewing, where dropping them silently is not.
  */
  /*
    ── ⚠⚠ `kind` IS A ROUTE HERE, AND MEASUREMENT SAYS IT SHOULD BE A DEFAULT ──
       (`P1-A1.4-E409` WS-1 — MEASURED 2026-09-10, NOT CHANGED. See the report.)

    ⚠ THIS SPLIT IS THE 29→7 DEFECT, AND IT IS **NOT** A CAPACITY PROBLEM.
    Measured on Scott's CV with the failure-path usage this brief added:

      inventory  ->  49 sections   (kind: 5 employer, 44 engagement)
      employersPass(pool=5)   ->  5 entries   finish=stop out=  930 / 12,000
      employersPass(pool=49)  -> 49 entries   finish=stop out=3,675 / 12,000

    ⚠⚠ THE PASS HONOURS ITS CHECKLIST EXACTLY — give it 5 and it returns 5; give
    it 49 and it returns 49, at THIRTY-ONE PERCENT of its token budget with
    `finishReason: stop`. Nothing truncates. **The units are not lost to
    capacity; they are never asked for**, because 44 of them are filtered out
    here and handed to `projectsPass`, which then returns 0 or fails on `shape`.

    ⚠ SO THE FIX IS THIS FILTER, NOT A FUNNEL AND NOT CHUNKING — but making the
    change means deciding what type the 44 become, and `E409` WS-2 reserves that
    default to Scott ("REPORT, do not choose"). ⚠⚠ CHANGING IT HERE WOULD CHOOSE
    IT SILENTLY, so it is measured, reported, and left alone.
  */
  /*
    ⚠ SUPERSEDED, quoted not deleted (`P1-A1.4-E410` WS-1) — the filter above
    described the defect and this is the line that fixed it:

        const employers = inv.value.filter((i) => i.kind !== "engagement");
        …
        employersPass(text, employers.length ? employers : inv.value),

    ⚠⚠ 44 OF 49 SECTIONS WERE HANDED TO `projectsPass` AND NEVER ARRIVED. The
    employers pass never saw them, so it could not have returned them; the
    projects pass returned 0 or failed `shape`. **The units were not lost to
    capacity — they were never asked for.**

    ⚠ SO EVERY SECTION GOES TO THE PASS THAT DEMONSTRABLY HONOURS ITS CHECKLIST.
    `E409` measured it: pool=5 → 5 entries, pool=49 → 49 entries, `finish=stop`
    at 31% of a 12,000-token budget. `kind` no longer decides WHETHER a section
    is extracted; it decides only WHAT THE ROW BECOMES, below.
  */
  const engagements = inv.value.filter((i) => i.kind === "engagement");

  const [emp, proj, certs, skills, prof] = await Promise.all([
    employersPass(text, inv.value, startedAt),
    projectsPass(text, engagements, startedAt),
    certificationsPass(text, startedAt),
    skillsPass(text, startedAt),
    profilePass(text, startedAt),
  ]);
  tally("employers", emp);
  tally("projects", proj);
  tally("certifications", certs);
  tally("skills", skills);
  tally("profile", prof);

  /*
    ── ⚠⚠ `kind` IS A DEFAULT, NOT A ROUTE (`P1-A1.4-E410` WS-1) ───────────────

    SCOTT: engagement sections become **Project** rows, employer sections become
    **Employer** rows, and no section is filtered out of extraction.

    ⚠ AND IT IS RIGHT ON THE MERITS, NOT ONLY THE ASYMMETRY: on Scott's CV the 44
    engagements are client work delivered under StratERP — Ceres, Kamehameha, WSP.
    StratERP is the employer; those are the work.

    ⚠ ALIGNMENT IS BY INDEX, WHICH IS THE PASS'S OWN CONTRACT — its schema says
    *"Exactly N entries, one per listed heading, in order."* ⚠⚠ AND IT IS CHECKED,
    NOT ASSUMED: if the model returns a different count the index no longer means
    the same section, so the split is ABANDONED and every entry stays an employer
    — the pre-`E410` shape. A mis-split would file real jobs as projects, which is
    worse than the row being the wrong type in a way the radio can fix.

    ⚠ NO PARENT IS INVENTED FROM PROXIMITY. A converted engagement carries
    `employer: null`; `import.ts` then writes it with `employer_id` null and
    surfaces it as `unplaced` (`P1-J1.4-E296`) for the person to place in one
    click. An engagement listed under StratERP in the document is not proof that
    it belongs to StratERP.
  */
  const aligned = emp.ok && emp.value.length === inv.value.length;
  const empRows = emp.ok ? emp.value : [];
  const sectionEmployers = aligned
    ? empRows.filter((_, i) => inv.value[i].kind !== "engagement")
    : empRows;
  const sectionProjects = aligned
    ? empRows
        .map((e, i) => ({ e, item: inv.value[i] }))
        .filter(({ item }) => item.kind === "engagement")
        .map(({ e }) => ({
          /* ⚠ THE ENGAGEMENT IS THE ROLE HALF OF THE HEADING and the client is
             the company half — `Ceres Insurance — Oracle Cloud Quick Install`
             parses as name="Ceres Insurance", roleTitle="…Quick Install". */
          name: e.roleTitle || e.name || "Untitled project",
          client: e.name ?? null,
          roleType: null,
          software: [] as string[],
          skills: [] as string[],
          description: e.description ?? null,
          startDate: e.startDate ?? null,
          endDate: e.endDate ?? null,
          employer: null,
        }))
    : [];
  if (emp.ok && !aligned) {
    console.error(
      `[resume] the employers pass returned ${emp.value.length} entries for ${inv.value.length} sections — index alignment abandoned, every entry kept as an employer`
    );
  }
  /* ⚠ DEDUPED BY NAME. `projectsPass` still runs and still finds sub-projects the
     inventory never listed; a section must not arrive twice because two passes
     both described it. Section rows win — they are the ones `kind` typed. */
  const seen = new Set(sectionProjects.map((p) => p.name.trim().toLowerCase()));
  const extraProjects = (proj.ok ? proj.value : []).filter(
    (p) => !seen.has((p.name ?? "").trim().toLowerCase())
  );

  const data: AiResume = {
    headline: prof.ok ? prof.value.headline ?? null : null,
    overview: prof.ok ? prof.value.overview ?? null : null,
    employers: sectionEmployers,
    projects: [...sectionProjects, ...extraProjects],
    education: prof.ok ? prof.value.education : [],
    skills: skills.ok ? skills.value.skills : [],
    languages: skills.ok ? skills.value.languages : [],
    certifications: certs.ok ? certs.value : [],
  };

  const recall = recallReport({
    /*
      ⚠ SUPERSEDED, quoted not deleted (`P1-A1.4-E410`):
          `headings: (employers.length ? employers : inv.value).length,`
      with the reason *"THE CONTRACT IS THE EMPLOYER SUBSET. Comparing employers
      returned against every heading in the document would report a shortfall on
      every CV that has more projects than jobs."*

      ⚠⚠ THAT SUBSET NO LONGER EXISTS. `E410` sends EVERY section to the
      extraction pass, so the contract is now the whole inventory — and the
      recall figure counts rows of BOTH kinds against it, which is the number
      Scott's *"we found 29 and imported 7"* line was trying to be.
    */
    headings: inv.value.length,
    /* ⚠ BOTH KINDS COUNT TOWARD THE SECTIONS FOUND — an engagement section that
       became a Project row was imported, not missed. */
    employers: data.employers.length,
    projects: data.projects.length,
    certifications: data.certifications.length,
    dateRanges: countDateRanges(text),
    failedPasses: failed,
    /* ⚠ The whole inventory is still the second opinion for TOTAL coverage. */
    headingsTotal: inv.value.length,
  });

  return {
    ok: true,
    data,
    recall,
    model,
    provider,
    tier,
    inputChars: text.length,
    ms: Date.now() - started,
    usage: {
      inputTokens: inTok,
      outputTokens: outTok,
      cachedInputTokens: cachedTok,
      costUsd: anyCost ? cost : null,
      finishReason,
      reasoningTokens: reasoningTok,
    },
    passes,
  };
}
