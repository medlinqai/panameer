import { z } from "zod";
import { env } from "@/lib/env";
import type { ParsedResume } from "./parse";

/**
 * LLM résumé extraction (brief_resume_parser_ai WS2 / E128).
 *
 * SERVER ONLY. The key is read through `env` and never reaches the browser.
 *
 * WHY THIS EXISTS. The heuristic parser has to guess a document's structure from
 * its punctuation, and real résumés vary faster than rules can be written for
 * them: Eddie's used an unrecognised heading and two-line jobs, Marelise's puts
 * ten projects in tables of label/value rows. Both extract to clean text and both
 * defeated the rules. A model reads the layout instead of pattern-matching it.
 *
 * IT IS THE SECOND TIER, not the default. WS0 scores the free parse first and
 * this only runs when that score is low and the provider asks for it — so a
 * résumé the heuristic handles costs nothing, and nobody's document is sent
 * anywhere without them choosing it.
 *
 * ⚠ DATA FLOW, flagged for Scott per the brief: running this sends the résumé's
 * TEXT — a named individual's employment history, education and contact details —
 * to the Anthropic API. That is a real disclosure of personal data to a
 * third-party processor. It is gated on an explicit user action (WS3) rather
 * than happening on upload, which is the mitigation available at this layer, but
 * the privacy notice and any DPA are a decision above this code.
 */

/**
 * An OPTIONAL field: absent, null and present are all acceptable, and all
 * normalise to null.
 *
 * `.nullable()` alone was the bug. It accepts an explicit `null` but NOT a
 * missing key — and a model with nothing to say about a field omits it rather
 * than inventing a null, which is the correct behaviour. Eddie's fifth employer
 * (Morgan Stanley, from his trailing "Additional experience" line) has no
 * location stated anywhere, so the model left `location` out and a completely
 * correct extraction of seven employers was thrown away over one absent string.
 *
 * Rejecting good data because an optional field is missing is the worst trade
 * available here: the fallback is the heuristic result, which for Marelise is
 * nothing at all.
 */
const maybe = <T extends z.ZodTypeAny>(schema: T) =>
  schema.nullable().optional().default(null);

/** What we ask the model for — mirrors what the review step already consumes. */
const aiEmployer = z.object({
  // The only genuinely required field: an employer with no name is not an entry.
  name: z.string(),
  roleTitle: maybe(z.string()),
  location: maybe(z.string()),
  startDate: maybe(z.string()),
  endDate: maybe(z.string()),
  isCurrent: maybe(z.boolean()),
  description: maybe(z.string()),
});

const aiProject = z.object({
  name: z.string(),
  client: maybe(z.string()),
  roleType: maybe(z.string()),
  software: z.array(z.string()).optional().default([]),
  skills: z.array(z.string()).optional().default([]),
  description: maybe(z.string()),
  startDate: maybe(z.string()),
  endDate: maybe(z.string()),
  employer: maybe(z.string()),
});

const aiEducation = z.object({
  institution: z.string(),
  degree: maybe(z.string()),
  field: maybe(z.string()),
  startYear: maybe(z.union([z.number(), z.string()])),
  endYear: maybe(z.union([z.number(), z.string()])),
});

const aiCertification = z.object({
  name: z.string(),
  issuer: maybe(z.string()),
  issuedOn: maybe(z.string()),
  expiresOn: maybe(z.string()),
});

export const AI_RESUME_SCHEMA = z.object({
  headline: maybe(z.string()),
  overview: maybe(z.string()),
  employers: z.array(aiEmployer).optional().default([]),
  projects: z.array(aiProject).optional().default([]),
  education: z.array(aiEducation).optional().default([]),
  skills: z.array(z.string()).optional().default([]),
  languages: z.array(z.string()).optional().default([]),
  certifications: z.array(aiCertification).optional().default([]),
});

export type AiResume = z.infer<typeof AI_RESUME_SCHEMA>;

/** The JSON Schema handed to the model as a tool, so output shape is enforced. */
const TOOL_SCHEMA = {
  type: "object" as const,
  properties: {
    headline: { type: ["string", "null"], description: "Their professional title." },
    overview: { type: ["string", "null"], description: "A short professional summary, in their own words." },
    employers: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "The employing company." },
          roleTitle: { type: ["string", "null"] },
          location: { type: ["string", "null"] },
          startDate: { type: ["string", "null"], description: "YYYY-MM-DD, or YYYY-MM-01 when only a month is given." },
          endDate: { type: ["string", "null"], description: "Null if current." },
          isCurrent: { type: ["boolean", "null"] },
          description: { type: ["string", "null"] },
        },
        required: ["name"],
      },
    },
    projects: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          client: { type: ["string", "null"] },
          roleType: { type: ["string", "null"] },
          software: { type: "array", items: { type: "string" } },
          skills: { type: "array", items: { type: "string" } },
          description: { type: ["string", "null"] },
          startDate: { type: ["string", "null"] },
          endDate: { type: ["string", "null"] },
          employer: { type: ["string", "null"], description: "The employer this was delivered under, if stated." },
        },
        required: ["name"],
      },
    },
    education: {
      type: "array",
      items: {
        type: "object",
        properties: {
          institution: { type: "string" },
          degree: { type: ["string", "null"] },
          field: { type: ["string", "null"] },
          startYear: { type: ["number", "string", "null"] },
          endYear: { type: ["number", "string", "null"] },
        },
        required: ["institution"],
      },
    },
    skills: { type: "array", items: { type: "string" } },
    languages: { type: "array", items: { type: "string" } },
    certifications: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          issuer: { type: ["string", "null"] },
          issuedOn: { type: ["string", "null"] },
          expiresOn: { type: ["string", "null"] },
        },
        required: ["name"],
      },
    },
  },
  required: ["employers", "projects", "education", "skills"],
};

const SYSTEM = `You extract structured data from résumés for a services marketplace.

Rules:
- Transcribe, never invent. If a field is not in the document, return null or an empty list. Do not infer dates, employers or titles that are not written down.
- Tables are content. Many résumés put each project in a table of label/value rows (Summary, Description, Role-Type, Software, Skills Used) — read those as projects.
- A project belongs to the employer or client it sits under, when the document makes that clear.
- Dates: return YYYY-MM-DD. When only a month and year are given use the first of the month; when only a year is given use January 1st. "Present"/"Current" means endDate null and isCurrent true.
- Trailing summary lines like "Additional experience as an X at Y and Z at W" name real employers. Return each as its own entry with null dates.
- Keep descriptions close to the author's wording; do not embellish.`;

export type AiExtractOutcome =
  | { ok: true; data: AiResume; model: string; inputChars: number; ms: number }
  | { ok: false; reason: "no_key" | "error"; message: string };

/** Is the AI tier available at all? Drives whether WS3 offers the button. */
export function aiExtractionAvailable(): boolean {
  return Boolean(env.ANTHROPIC_API_KEY);
}

/**
 * Send document text to the model and return validated, structured data.
 *
 * NEVER THROWS. A missing key, a network failure, a refusal or a malformed
 * response all come back as `{ ok: false }`, because the caller's fallback is
 * the heuristic result the provider already has. An import that dies because an
 * optional enrichment failed would be strictly worse than not offering it.
 */
export async function aiExtractResume(text: string): Promise<AiExtractOutcome> {
  const key = env.ANTHROPIC_API_KEY;
  if (!key) {
    return { ok: false, reason: "no_key", message: "AI extraction is not configured." };
  }

  const model = env.ANTHROPIC_RESUME_MODEL;
  const started = Date.now();
  try {
    // Imported lazily so the SDK never loads for a request that doesn't use it,
    // and so a missing/incompatible package can't break `next build`.
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: key });

    const response = await client.messages.create({
      model,
      max_tokens: 8000,
      system: SYSTEM,
      // A tool with a schema, rather than "reply in JSON" — the shape is then
      // the model's obligation instead of something we hope for and re-parse.
      tools: [
        {
          name: "record_resume",
          description: "Record the structured contents of this résumé.",
          input_schema: TOOL_SCHEMA as never,
        },
      ],
      tool_choice: { type: "tool", name: "record_resume" },
      messages: [
        {
          role: "user",
          content: `Extract this résumé.\n\n<resume>\n${text.slice(0, 120_000)}\n</resume>`,
        },
      ],
    });

    const block = response.content.find((c) => c.type === "tool_use");
    if (!block || block.type !== "tool_use") {
      return { ok: false, reason: "error", message: "The model returned no structured output." };
    }

    // Validate rather than trust. A model that returns a slightly different shape
    // must not put half-built objects into someone's profile.
    const parsed = AI_RESUME_SCHEMA.safeParse(block.input);
    if (!parsed.success) {
      // NAME THE FIELD. "expected string, received undefined" without a path
      // is a dead end — the same lesson E121 learned about unrecognised keys.
      const issue = parsed.error.issues[0];
      const where = issue?.path?.length ? ` at "${issue.path.join(".")}"` : "";
      return {
        ok: false,
        reason: "error",
        message: `The model's output didn't match the expected shape${where}: ${issue?.message ?? "unknown"}`,
      };
    }

    return {
      ok: true,
      data: parsed.data,
      model,
      inputChars: text.length,
      ms: Date.now() - started,
    };
  } catch (e) {
    console.error("[resume] AI extraction failed:", e);
    return {
      ok: false,
      reason: "error",
      message: e instanceof Error ? e.message : "AI extraction failed.",
    };
  }
}

/**
 * AI output → the shape the rest of the import already speaks.
 *
 * Keeping this conversion here means `import.ts`, the review step and the
 * fixture harness are unchanged by the AI tier — the two paths converge before
 * anything downstream can tell them apart. Projects are folded onto their
 * employer where one is named, and kept as standalone entries otherwise, which
 * is the same distinction the profile already draws (Solo Projects, E074).
 */
export function aiToParsedResume(ai: AiResume): ParsedResume {
  const iso = (v: string | null): string | null => {
    if (!v) return null;
    const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/.exec(v.trim());
    if (!m) return null;
    return `${m[1]}-${m[2] ?? "01"}-${m[3] ?? "01"}`;
  };

  const experiences = ai.employers.map((e) => ({
    employer: e.name,
    roleTitle: e.roleTitle ?? "",
    description: e.description ?? null,
    startDate: iso(e.startDate),
    endDate: iso(e.endDate),
  }));

  /*
    Projects the document did NOT attach to an employer still describe work, and
    dropping them would lose Marelise's entire history — her ten tables are
    projects, not jobs. They become entries in their own right, with the client
    as the employer when one is named, so the review shows them rather than
    silently discarding them.
  */
  for (const p of ai.projects) {
    const alreadyUnderEmployer =
      p.employer && experiences.some((e) => e.employer === p.employer);
    if (alreadyUnderEmployer) continue;
    experiences.push({
      employer: p.client ?? p.employer ?? p.name,
      roleTitle: p.roleType ?? "",
      description: [p.description, p.software.length ? `Software: ${p.software.join(", ")}` : null]
        .filter(Boolean)
        .join("\n") || null,
      startDate: iso(p.startDate),
      endDate: iso(p.endDate),
    });
  }

  return {
    headline: ai.headline ?? null,
    overview: ai.overview ?? null,
    // Derived from the work history downstream (WS6/E068), exactly as the
    // heuristic path leaves them — the model is not asked to grade seniority.
    experienceLevel: null,
    experienceYears: null,
    experiences,
    education: ai.education.map((e) => ({
      institution: e.institution,
      degree: e.degree ?? null,
      field: e.field ?? null,
      startYear: e.startYear != null ? Number(e.startYear) || null : null,
      endYear: e.endYear != null ? Number(e.endYear) || null : null,
      description: null,
    })),
    // Project software and skills are skills too — they are the most specific
    // thing the document says about what this person can actually do.
    skills: [
      ...new Set([
        ...ai.skills,
        ...ai.projects.flatMap((p) => [...p.software, ...p.skills]),
      ]),
    ].filter((s) => s.trim()),
    languages: ai.languages,
    gaps: [],
  };
}
