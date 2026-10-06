import { callTimeoutMs, MIN_CALL_MS } from "@/lib/resume/budget";
import { z } from "zod";
import {
  callExtractionModel,
  type ModelUsage,
  type ParserTier,
  type ProviderName,
} from "@/lib/resume/ai-provider";
import { AI_RESUME_SCHEMA, type AiResume } from "@/lib/resume/ai-extract";

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
  | { ok: false; reason: string; message: string; usage?: ModelUsage; ms?: number };

async function runPass<T>(
  name: string,
  system: string,
  schema: Record<string, unknown>,
  text: string,
  parse: (v: unknown) => T | null,
  maxOutputTokens = 8_000,
  startedAt: number | null = null
): Promise<PassOutcome<T>> {
  const budget = callTimeoutMs(startedAt);
  if (startedAt !== null && budget < MIN_CALL_MS) {
    return {
      ok: false,
      reason: "deadline",
      message: `${name}: not enough of the request's time was left to read this document`,
    };
  }
  const callStarted = Date.now();
  const call = await callExtractionModel({
    system,
    schema,
    schemaName: `resume_${name}`,
    text,
    maxOutputTokens,
    /* `E415` — the smaller of this pass's ceiling and what the route has left. */
    timeoutMs: budget,
    // CONSTRAINED DECODING FOR THE SIX PASSES WS-1)
    strict: true,
  });
  if (!call.ok)
    return { ok: false, reason: call.reason, message: call.message, ms: Date.now() - callStarted };
  const value = parse(call.value);
  if (value === null)
    return {
      ok: false,
      reason: "shape",
      message: `${name}: the model's output did not match the expected shape`,
      ms: Date.now() - callStarted,
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

export function inventoryPass(
  text: string,
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
    12_000,
    startedAt
  );
}

const partial = <K extends keyof AiResume>(keys: K[]) =>
  AI_RESUME_SCHEMA.pick(Object.fromEntries(keys.map((k) => [k, true])) as never);

function sub(properties: Record<string, unknown>, required: string[]) {
  return { type: "object" as const, properties, required, additionalProperties: false };
}

export function employersPass(
  text: string,
  inventory: InventoryItem[],
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
            // THE DESCRIPTIONS ARE BACK WS-3)
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
            // RESTORED , Scott authorised 2026-09-17) — exactly
            isCurrent: { type: ["boolean", "null"] },
          },
          ["name", "roleTitle", "description", "startDate", "endDate", "isCurrent"]
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
  /* `startedAt` — the containing request's clock (`E415`). Null off-route. */
  startedAt: number | null = null
) {
  // THE ENGAGEMENTS FROM PASS 1 ARE HANDED BACK AS A CHECKLIST, the same way
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

/** ON ITS OWN PASS BECAUSE IT WAS THE WORST HIT — 0 of 5 (`E399`). */
export function certificationsPass(text: string, startedAt: number | null = null) {
  const system = `You are transcribing, not summarising.

List EVERY certification, credential, license or accreditation named in this
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
    /* Same reasoning-budget trap as the inventory — see `inventoryPass`. */
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

// THE ORCHESTRATOR — AND THE THING THAT NOTICES (WS-3)

/** COUNTABLE FEATURES OF THE SOURCE, INDEPENDENT OF THE MODEL. */
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
  // Passes that failed, AND WHY WS-3).
  failedPasses: { name: string; reason: string }[];
  /** True when the contract was not met — a DETECTED failure, not a result. */
  shortfall: boolean;
  /** Plain sentences for the review screen. Empty when nothing is wrong. */
  warnings: string[];
};

/** THE DEEPEST DEFECT FOUND WAS NOT THAT THE IMPORT WAS SHORT — IT IS */
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
    // IT SAID "employers" ABOUT THINGS THAT ARE NOT EMPLOYERS
    // SCOTT, 2026-09-30: *"fix the preview's 'imported' copy."*
    const others = input.headings - input.employers;
    warnings.push(
      `We found ${input.headings} company names in your document and read ` +
        `${input.employers} as employers — the other ${others} look like project ` +
        `clients rather than jobs. Check your work history.`
    );
  }
  // THE SECOND OPINION. A source with many more date ranges than imported
  const imported = input.employers + input.projects;
  // THE STRONGEST SIGNAL IS PASS 1'S OWN TOTAL, because it is measured on the
  const total = input.headingsTotal ?? 0;
  if (total > 0 && imported < total) {
    warnings.push(
      // — same word, same reason as the warning above: in preview mode nothing
      `We found ${total} roles and projects in your document and read ${imported} — check your work history.`
    );
  }
  if (input.dateRanges > imported + 2) {
    warnings.push(
      `We found ${input.dateRanges} date ranges in your document and imported ${imported} dated entries — some history may be missing.`
    );
  }
  for (const p of input.failedPasses) {
    // THE CLOCK IS NAMED WHEN THE CLOCK IS THE CAUSE ( WS-3). Scott's
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
      /** Per-pass wall time and cost, so the claim can be checked. */
      passes: { name: string; ok: boolean; ms: number; costUsd: number | null }[];
      /** Pass 1's headings, kept so the review can list the companies found. */
      inventory: InventoryItem[];
    }
  | {
      ok: false;
      reason: "no_key" | "error" | "refusal" | "deadline";
      message: string;
      // — the time spent before failing, and the per-call
      ms: number;
      passes: PassTiming[];
    };

/** `P2-J1.4-E546` — one call's duration, as stored on `ProfileImport.read_passes`. */
export type PassTiming = { name: string; ok: boolean; ms: number; reason?: string };

/** EVERY PASS IS INDEPENDENT AND PARTIAL SUCCESS IS THE NORMAL OUTCOME. Only a */
export async function aiExtractResumeMultiPass(
  text: string,
  // THE CONTAINING REQUEST'S CLOCK WS-2). Every pass below
  startedAt: number | null = null
): Promise<MultiPassOutcome> {
  const started = Date.now();
  // be dropped on the failure branch, so a provider error, a truncation and a
  const passes: {
    name: string;
    ok: boolean;
    ms: number;
    costUsd: number | null;
    reason?: string;
    message?: string;
    /** Present on a `shape` failure — the call ran, so the spend is knowable. */
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
      /* ANY pass reporting a truncation is the one worth surfacing. */
      if (r.usage.finishReason && r.usage.finishReason !== "stop" && r.usage.finishReason !== "end_turn")
        finishReason = r.usage.finishReason;
      else finishReason = finishReason ?? r.usage.finishReason;
    } else {
      passes.push({
        name, ok: false, ms: r.ms ?? 0, costUsd: r.usage?.costUsd ?? null,
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
    /* SUPERSEDED, quoted (`E414` WS-2): `inv.reason === "no_key" ? "no_key" : "error"`. */
    return {
      ok: false,
        // neither a model error nor a refusal, and `import.ts` records the string
      reason:
        inv.reason === "no_key" || inv.reason === "refusal" || inv.reason === "deadline"
          ? inv.reason
          : "error",
      message: inv.message,
      ms: Date.now() - started,
      passes: passes.map((p) => ({ name: p.name, ok: p.ok, ms: p.ms, reason: p.reason })),
    };
  }

  // THE DETAIL PASSES RUN TOGETHER — they are independent, and running them in
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

  // SCOTT: engagement sections become Project rows, employer sections become
  // THE DETERMINISTIC RULE
  const empRows = emp.ok ? emp.value : [];
  const aligned = emp.ok && empRows.length === inv.value.length;

  /** Letters and digits only — punctuation and spacing differ between a heading */
  const normName = (x: string | null | undefined) =>
    (x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  const byName = new Map<string, "employer" | "engagement">();
  for (const item of inv.value) {
    const k = normName(item.heading);
    if (k) byName.set(k, item.kind === "engagement" ? "engagement" : "employer");
  }

  /** The route each row took, counted, so the log says WHY rather than only what. */
  const routed = { name: 0, fallback: 0 };

  const kindOf = (row: { name?: string | null }, i: number): "employer" | "engagement" => {
    if (aligned) return inv.value[i].kind === "engagement" ? "engagement" : "employer";
    const n = normName(row.name);
    if (n) {
      const exact = byName.get(n);
      if (exact) {
        routed.name++;
        return exact;
      }
      for (const [heading, kind] of byName) {
        if (heading.startsWith(n + " ")) {
          routed.name++;
          return kind;
        }
      }
    }
    routed.fallback++;
    return "employer";
  };

  const kinds = empRows.map((row, i) => kindOf(row, i));
  const sectionEmployers = empRows.filter((_, i) => kinds[i] !== "engagement");
  const sectionProjects = empRows
    .map((e, i) => ({ e, kind: kinds[i] }))
    .filter(({ kind }) => kind === "engagement")
    .map(({ e }) => ({
      // THE ENGAGEMENT IS THE ROLE HALF OF THE HEADING and the client is
      name: e.roleTitle || e.name || "Untitled project",
      client: e.name ?? null,
      roleType: null,
      software: [] as string[],
      skills: [] as string[],
      description: e.description ?? null,
      startDate: e.startDate ?? null,
      endDate: e.endDate ?? null,
      // — the employers pass read this section, so its current flag
      isCurrent: e.isCurrent ?? null,
      employer: null,
    }));

  if (emp.ok && !aligned) {
    console.error(
      `[resume] the employers pass returned ${empRows.length} entries for ${inv.value.length} sections — ` +
        `matched by NAME instead of index: ${routed.name} matched, ${routed.fallback} unmatched (kept as employers), ` +
        `-> ${sectionEmployers.length} employers / ${sectionProjects.length} projects`
    );
  }

  // DEDUPED BY NAME. `projectsPass` still runs and still finds sub-projects the
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
    // with the reason *"THE CONTRACT IS THE EMPLOYER SUBSET. Comparing employers
    headings: inv.value.length,
    // BOTH KINDS COUNT TOWARD THE SECTIONS FOUND — an engagement section that
    employers: data.employers.length,
    projects: data.projects.length,
    certifications: data.certifications.length,
    dateRanges: countDateRanges(text),
    failedPasses: failed,
    /* The whole inventory is still the second opinion for TOTAL coverage. */
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
    inventory: inv.value,
  };
}
