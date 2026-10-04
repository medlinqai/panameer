import { z } from "zod";
import { callExtractionModel } from "@/lib/resume/ai-provider";
import type { ModelUsage, ParserTier, ProviderName } from "@/lib/resume/ai-provider";

export const AI_JOB_SCHEMA = z.object({
  title: z.string().nullable(),
  description: z.string().nullable(),
  skills: z.array(z.string()),
  budgetType: z.enum(["HOURLY", "FIXED"]).nullable(),
  budgetMin: z.number().nullable(),
  budgetMax: z.number().nullable(),
  currency: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  locationCountry: z.string().nullable(),
  worksite: z.enum(["REMOTE", "ONSITE", "HYBRID"]).nullable(),
});
export type AiJob = z.infer<typeof AI_JOB_SCHEMA>;

const TOOL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "description",
    "skills",
    "budgetType",
    "budgetMin",
    "budgetMax",
    "currency",
    "startDate",
    "endDate",
    "locationCountry",
    "worksite",
  ],
  properties: {
    title: { type: ["string", "null"], description: "The role or engagement title." },
    description: {
      type: ["string", "null"],
      description:
        "What the work is, in the poster's own words. Keep the substance; drop boilerplate about the company, benefits, and equal-opportunity statements.",
    },
    skills: {
      type: "array",
      items: { type: "string" },
      description:
        "Named skills, tools and systems the work requires. Terms only, as written. Empty array if none are named.",
    },
    budgetType: {
      type: ["string", "null"],
      enum: ["HOURLY", "FIXED", null],
      description: "HOURLY for a rate, FIXED for a total. Null if the posting does not say.",
    },
    budgetMin: {
      type: ["number", "null"],
      description:
        "Lower bound in whole currency units, not cents. A single stated figure goes in BOTH min and max. Null unless the posting states money.",
    },
    budgetMax: { type: ["number", "null"], description: "Upper bound in whole currency units." },
    currency: { type: ["string", "null"], description: "ISO code, e.g. USD. Null if unstated." },
    startDate: {
      type: ["string", "null"],
      description:
        "YYYY-MM-DD, only if the posting names a real date. Never compute one from 'ASAP' or 'immediately'.",
    },
    endDate: { type: ["string", "null"], description: "YYYY-MM-DD, same rule as startDate." },
    locationCountry: {
      type: ["string", "null"],
      description: "Country as written, or 'Worldwide' if the posting says anywhere.",
    },
    worksite: {
      type: ["string", "null"],
      enum: ["REMOTE", "ONSITE", "HYBRID", null],
      description: "Null unless the posting is explicit.",
    },
  },
} as const;

const SYSTEM = `You convert a pasted job posting into a structured Work Request.

Return ONLY what the posting actually states.

Leave a field null when the posting does not state it. Do not infer, average,
estimate, or fill a gap with what is typical for the role. A null field costs
the user one keystroke; an invented one is a wrong Work Request they may post
without noticing.

Specific rules:
- Money: only from a stated figure or range. "Competitive", "DOE" and
  "negotiable" mean null. Convert "$60/hr" to budgetType HOURLY, min 60, max 60.
  A range "$60-80/hr" is min 60, max 80.
- Dates: only real dates. "ASAP", "immediately" and "Q3" are not dates.
- Skills: the terms the posting names. Do not expand an acronym into a list, do
  not add adjacent tools the poster did not mention.
- Description: keep what describes the work. Drop company marketing, benefits,
  application instructions and equal-opportunity boilerplate.`;

export type JobImportOutcome =
  | {
      ok: true;
      data: AiJob;
      model: string;
      provider: ProviderName;
      tier: ParserTier;
      ms: number;
      usage: ModelUsage;
    }
  | { ok: false; reason: "no_key" | "truncated" | "error" | "refusal" | "deadline"; message: string };

export const JOB_POSTING_TIMEOUT_MS = 22_000;

export async function aiExtractJobPosting(text: string): Promise<JobImportOutcome> {
  const call = await callExtractionModel({
    timeoutMs: JOB_POSTING_TIMEOUT_MS,
    system: SYSTEM,
    schema: TOOL_SCHEMA as unknown as Record<string, unknown>,
    schemaName: "record_work_request",
    text,
    instruction: "Convert this job posting into a Work Request.",
    tag: "posting",
    toolDescription: "Record the structured contents of this job posting.",
    maxOutputTokens: 8_000,
  });

  if (!call.ok) return call;

  const parsed = AI_JOB_SCHEMA.safeParse(call.value);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "error",
      message: "The model returned a shape we could not read.",
    };
  }

  return {
    ok: true,
    data: sanitize(parsed.data),
    model: call.model,
    provider: call.provider,
    tier: call.tier,
    ms: call.ms,
    usage: call.usage,
  };
}

function sanitize(d: AiJob): AiJob {
  const money = (n: number | null) => (n !== null && n > 0 && Number.isFinite(n) ? n : null);
  const date = (s: string | null) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);

  let min = money(d.budgetMin);
  let max = money(d.budgetMax);
  // A reversed range is a misread, not a preference.
  if (min !== null && max !== null && max < min) [min, max] = [max, min];

  const start = date(d.startDate);
  let end = date(d.endDate);
  if (start && end && end < start) end = null;

  return {
    ...d,
    title: d.title?.trim() || null,
    description: d.description?.trim() || null,
    skills: [...new Set(d.skills.map((s) => s.trim()).filter(Boolean))].slice(0, 40),
    budgetMin: min,
    budgetMax: max,
    // A type with no figures behind it tells the wizard nothing.
    budgetType: min === null && max === null ? null : d.budgetType,
    startDate: start,
    endDate: end,
    locationCountry: d.locationCountry?.trim() || null,
  };
}
