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
  | { ok: false; reason: string; message: string };

async function runPass<T>(
  name: string,
  system: string,
  schema: Record<string, unknown>,
  text: string,
  parse: (v: unknown) => T | null,
  maxOutputTokens = 8_000
): Promise<PassOutcome<T>> {
  const call = await callExtractionModel({
    system,
    schema,
    schemaName: `resume_${name}`,
    text,
    maxOutputTokens,
  });
  if (!call.ok) return { ok: false, reason: call.reason, message: call.message };
  const value = parse(call.value);
  if (value === null)
    return { ok: false, reason: "shape", message: `${name}: the model's output did not match the expected shape` };
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
export function inventoryPass(text: string): Promise<PassOutcome<InventoryItem[]>> {
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
    12_000
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
export function employersPass(text: string, inventory: InventoryItem[]) {
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
            name: { type: ["string", "null"] },
            roleTitle: { type: ["string", "null"] },
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
  }, 12_000);
}

export function projectsPass(text: string, engagements: InventoryItem[] = []) {
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
  }, 12_000);
}

/** ⚠ ON ITS OWN PASS BECAUSE IT WAS THE WORST HIT — 0 of 5 (`E399`). */
export function certificationsPass(text: string) {
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
  }, 8_000);
}

export function skillsPass(text: string) {
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
  }, 8_000);
}

export function profilePass(text: string) {
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
  }, 8_000);
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
  /** ⚠ Passes that failed. The others still landed. */
  failedPasses: string[];
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
  failedPasses: string[];
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
    warnings.push(
      p === "certifications"
        ? "We couldn't read your certifications — everything else imported. Add them manually or try again."
        : `We couldn't read the ${p} section — everything else imported.`
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
  | { ok: false; reason: "no_key" | "error"; message: string };

/**
 * ⚠ EVERY PASS IS INDEPENDENT AND PARTIAL SUCCESS IS THE NORMAL OUTCOME. Only a
 * failed INVENTORY is fatal — without it there is no contract to measure against,
 * and an unmeasured import is the state this brief exists to end.
 */
export async function aiExtractResumeMultiPass(text: string): Promise<MultiPassOutcome> {
  const started = Date.now();
  const passes: { name: string; ok: boolean; ms: number; costUsd: number | null }[] = [];
  const failed: string[] = [];
  let inTok = 0, outTok = 0, cachedTok = 0, reasoningTok = 0, cost = 0, anyCost = false;
  let model = "", provider: ProviderName = "openai", tier: ParserTier = "economy";
  let finishReason: string | null = null;

  const tally = (name: string, r: PassOutcome<unknown>) => {
    if (r.ok) {
      passes.push({ name, ok: true, ms: r.ms, costUsd: r.usage.costUsd });
      inTok += r.usage.inputTokens; outTok += r.usage.outputTokens;
      cachedTok += r.usage.cachedInputTokens; reasoningTok += r.usage.reasoningTokens;
      if (r.usage.costUsd != null) { cost += r.usage.costUsd; anyCost = true; }
      model = r.model; provider = r.provider; tier = r.tier;
      /* ⚠ ANY pass reporting a truncation is the one worth surfacing. */
      if (r.usage.finishReason && r.usage.finishReason !== "stop" && r.usage.finishReason !== "end_turn")
        finishReason = r.usage.finishReason;
      else finishReason = finishReason ?? r.usage.finishReason;
    } else {
      passes.push({ name, ok: false, ms: 0, costUsd: null });
      failed.push(name);
    }
  };

  const inv = await inventoryPass(text);
  tally("inventory", inv);
  if (!inv.ok) {
    return { ok: false, reason: inv.reason === "no_key" ? "no_key" : "error", message: inv.message };
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
  const employers = inv.value.filter((i) => i.kind !== "engagement");
  const engagements = inv.value.filter((i) => i.kind === "engagement");

  const [emp, proj, certs, skills, prof] = await Promise.all([
    employersPass(text, employers.length ? employers : inv.value),
    projectsPass(text, engagements),
    certificationsPass(text),
    skillsPass(text),
    profilePass(text),
  ]);
  tally("employers", emp);
  tally("projects", proj);
  tally("certifications", certs);
  tally("skills", skills);
  tally("profile", prof);

  const data: AiResume = {
    headline: prof.ok ? prof.value.headline ?? null : null,
    overview: prof.ok ? prof.value.overview ?? null : null,
    employers: emp.ok ? emp.value : [],
    projects: proj.ok ? proj.value : [],
    education: prof.ok ? prof.value.education : [],
    skills: skills.ok ? skills.value.skills : [],
    languages: skills.ok ? skills.value.languages : [],
    certifications: certs.ok ? certs.value : [],
  };

  const recall = recallReport({
    /* ⚠ THE CONTRACT IS THE EMPLOYER SUBSET. Comparing employers returned against
       every heading in the document would report a shortfall on every CV that has
       more projects than jobs — which is most of them. */
    headings: (employers.length ? employers : inv.value).length,
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
