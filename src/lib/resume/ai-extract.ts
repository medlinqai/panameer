import { z } from "zod";
import {
  callExtractionModel,
  resolveProvider,
  type ModelUsage,
  type ParserTier,
  type ProviderName,
} from "./ai-provider";
import { isCurrentWord, parseMonthYear, type ParsedResume } from "./parse";

const maybe = <T extends z.ZodTypeAny>(schema: T) =>
  schema.nullable().optional().default(null);

const looseStringArray = z
  .array(z.unknown())
  .optional()
  .default([])
  .transform((items) =>
    items
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const o = item as Record<string, unknown>;
          for (const k of ["name", "skill", "label", "title", "value", "text"]) {
            if (typeof o[k] === "string") return o[k] as string;
          }
        }
        return null;
      })
      .filter((s): s is string => Boolean(s?.trim()))
      .map((s) => s.trim())
  );

/** What we ask the model for — mirrors what the review step already consumes. */
const aiEmployer = z.object({
  name: maybe(z.string()),
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
  software: looseStringArray,
  skills: looseStringArray,
  description: maybe(z.string()),
  startDate: maybe(z.string()),
  endDate: maybe(z.string()),
  employer: maybe(z.string()),
  isCurrent: maybe(z.boolean()),
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
  skills: looseStringArray,
  languages: looseStringArray,
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
          name: {
            type: ["string", "null"],
            description:
              "The employing company, or null if the résumé names none — do not substitute a job title. A self-employed or contracting line often names no company at all; null is the correct answer there.",
          },
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

export const PROMPT_VERSION = "2026-09-17.a";

const SYSTEM = `You extract structured data from résumés for a services marketplace.

Rules:
- Transcribe, never invent. If a field is not in the document, return null or an empty list. Do not infer dates, employers or titles that are not written down.
- Tables are content. Many résumés put each project in a table of label/value rows (Summary, Description, Role-Type, Software, Skills Used) — read those as projects.
- A project belongs to the employer or client it sits under, when the document makes that clear.
- Dates: return YYYY-MM-DD. When only a month and year are given use the first of the month; when only a year is given use January 1st. "Present"/"Current" means endDate null and isCurrent true.
- Trailing summary lines like "Additional experience as an X at Y and Z at W" name real employers. Return each as its own entry with null dates.
- Keep descriptions close to the author's wording; do not embellish.

The four buckets are distinct. Put each item in exactly one:
- employers: paid positions at an organization.
- education: FORMAL STUDY ONLY — a school, college or university the person attended for a qualification. \`institution\` must be the name of that school. An achievement, a responsibility, a project, a training course, a certification or a bullet point describing work is NEVER an education entry. If a line has no named school, it does not belong in education.
- certifications: named credentials awarded by a body (e.g. "Oracle Cloud Procurement Certified Implementation Professional"), with the issuer when stated.
- skills: short capability terms only — tools, modules, methods. Not sentences, not achievements.
Descriptions: at most 2 short sentences each. Prefer omitting a description to padding one.`;

export type AiExtractOutcome =
  | {
      ok: true;
      data: AiResume;
      model: string;
      provider: ProviderName;
      tier: ParserTier;
      inputChars: number;
      ms: number;
      /** Real token counts + $/parse when prices are configured (WS-A). */
      usage: ModelUsage;
    }
  | { ok: false; reason: "no_key" | "error" | "refusal"; message: string };

/** Is the AI tier available at all? Drives whether WS3 offers the button. */
export function aiExtractionAvailable(): boolean {
  return resolveProvider() !== null;
}

function declaredKeyCount(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  const raw = value as Record<string, unknown>;
  return ["employers", "projects", "education", "skills", "headline", "overview"].filter(
    (k) => k in raw
  ).length;
}

export async function aiExtractResume(text: string): Promise<AiExtractOutcome> {
  const ask = () =>
    callExtractionModel({
      system: SYSTEM,
      schema: TOOL_SCHEMA as unknown as Record<string, unknown>,
      schemaName: "record_resume",
      text,
    });

  let call = await ask();

  if (call.ok && declaredKeyCount(call.value) === 0) {
    console.warn("[resume] model returned no schema keys — retrying once");
    call = await ask();
  }

  if (!call.ok) {
    return {
      ok: false,
      reason:
        call.reason === "no_key" || call.reason === "refusal" ? call.reason : "error",
      message: call.message,
    };
  }

  if (declaredKeyCount(call.value) === 0) {
    return {
      ok: false,
      reason: "error",
      message:
        "The reader didn't return anything usable for this document. Nothing was changed — try again, or add your work history manually.",
    };
  }

  // Validate rather than trust. A model that returns a slightly different shape
  // must not put half-built objects into someone's profile.
  const parsed = AI_RESUME_SCHEMA.safeParse(call.value);
  if (!parsed.success) {
    // NAME THE FIELD. "expected string, received undefined" without a path is a
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
    model: call.model,
    provider: call.provider,
    tier: call.tier,
    inputChars: text.length,
    ms: call.ms,
    usage: call.usage,
  };
}

/** AI output → the shape the rest of the import already speaks. */
// A DEGREE IS NOT A SCHOOL (WS7a, post-processing).
const DEGREE_LEAD =
  /^(bachelors?|masters?|associates?|doctor(ate)?|ph\.?d|b\.?s\.?c?|b\.?a|m\.?s\.?c?|m\.?b\.?a|m\.?a|b\.?eng|m\.?eng|b\.?tech|diploma|certificate)\b/i;

/** Does this string NAME a school? The one test the institution field exists for. */
const NAMES_A_SCHOOL =
  /\b(universi\w*|college|institute|instituto|school|academy|polytechnic|seminary|hochschule|iit|iim|nit)\b/i;

/** Qualification words that are not degree-LEADS — "Post Graduate Program". */
const QUALIFICATION = /\b(degree|diploma|certificat\w*|program(me)?|course)\b/i;

/** SCRUB THE INSTITUTION STRING, then decide whether what is left is a school. */
export function scrubInstitution(raw: string): {
  institution: string;
  salvage: string | null;
} {
  let t = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!t) return { institution: "", salvage: null };

  // "Attended University of South Florida - Tampa" -> the university. Two live
  // rows; the verb is the résumé's, not part of anyone's name.
  t = t.replace(/^(attended|studied at|graduated from|graduate of)\s+/i, "").trim();

  // Drop a trailing bullet-separated fragment when it is a GRADE, not a campus.
  const parts = t.split(/\s*[•·|]\s*/);
  if (parts.length > 1) {
    const kept = parts.filter(
      (seg, i) => i === 0 || !/\b(gpa|cgpa|grade|honou?rs)\b|\d+\.\d+/i.test(seg)
    );
    t = kept.join(" • ").trim();
  }
  // The same debris without a bullet: "…University, 3.72 GPA" / "…(3.9 GPA)".
  t = t
    .replace(/[,(\-–]\s*\d+(\.\d+)?\s*(\/\s*\d+(\.\d+)?)?\s*(gpa|cgpa)\s*\)?\s*$/i, "")
    .replace(/\s*[,(\-–]?\s*(gpa|cgpa)[:\s]*\d+(\.\d+)?\s*\)?\s*$/i, "")
    .trim();

  // Only when the TAIL names a school, which is the whole guard: "University at
  const at = t.split(/\s+\bat\b\s+/i);
  if (at.length > 1) {
    const tail = at[at.length - 1].trim();
    if (NAMES_A_SCHOOL.test(tail)) t = tail;
  }

  t = t.replace(/^[\s,;:•·|\-–]+|[\s,;:•·|\-–]+$/g, "").trim();
  if (!t) return { institution: "", salvage: null };

  return NAMES_A_SCHOOL.test(t)
    ? { institution: t, salvage: null }
    : { institution: "", salvage: t };
}

/** Where does text evicted from the institution slot go? */
function refileSalvage(
  salvage: string,
  row: { degree: string | null; field: string | null; description: string | null }
): { degree: string | null; field: string | null; description: string | null } {
  const same = (v: string | null) =>
    !!v && v.trim().toLowerCase() === salvage.toLowerCase();
  if (same(row.degree) || same(row.field)) return row;

  if ((DEGREE_LEAD.test(salvage) || QUALIFICATION.test(salvage)) && !row.degree) {
    return { ...row, degree: salvage };
  }
  if (!row.description) return { ...row, description: salvage };
  return row;
}

export function fixEducationRow(e: {
  institution: string;
  degree?: string | null;
  field?: string | null;
  startYear?: number | string | null;
  endYear?: number | string | null;
}) {
  // The scrub decides. A school whose NAME begins with a degree word —
  const { institution, salvage } = scrubInstitution(e.institution ?? "");

  const refiled = refileSalvage(salvage ?? "", {
    degree: e.degree?.trim() || null,
    field: e.field?.trim() || null,
    description: null,
  });

  return {
    institution,
    degree: salvage ? refiled.degree : e.degree?.trim() || null,
    field: salvage ? refiled.field : e.field?.trim() || null,
    startYear: e.startYear != null ? Number(e.startYear) || null : null,
    endYear: e.endYear != null ? Number(e.endYear) || null : null,
    description: salvage ? refiled.description : null,
  };
}

/** IS THIS ROW ACTUALLY A SCHOOL? (E164, deterministic half.) */
export function isPlausibleEducationRow(e: {
  institution: string;
  degree?: string | null;
  field?: string | null;
  startYear?: number | null;
  endYear?: number | null;
}): boolean {
  const inst = (e.institution ?? "").trim();
  const text = inst || (e.degree ?? "").trim();
  if (!text) return false;

  const SCHOOL =
    /\b(university|universit(y|é|à|ät)|college|institute|instituto|school|academy|polytechnic|seminary|gymnasium|hochschule|iit|iim|nit)\b/i;
  if (SCHOOL.test(text)) return true;

  // A qualification with a year is a real record even when the school is absent
  // — fixEducationRow produces exactly that shape.
  if ((e.startYear ?? e.endYear) != null) return true;

  // Sentence-shaped: long, or carrying the verbs a bullet has and a school name
  // does not.
  const words = text.split(/\s+/).length;
  const BULLET_VERB =
    /\b(led|managed|implemented|designed|delivered|responsible|supported|developed|built|improved|reduced|increased|coordinated|migrated|configured|trained)\b/i;
  if (words > 8 || BULLET_VERB.test(text)) return false;

  return true;
}

/** A DATE STRING AS A RÉSUMÉ ACTUALLY WRITES IT */
export function isoDate(v: string | null | undefined): string | null {
  if (!v) return null;
  const t = v.trim();
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/.exec(t);
  if (m) return `${m[1]}-${m[2] ?? "01"}-${m[3] ?? "01"}`;
  return parseMonthYear(t);
}

/** AN END DATE HAS THREE STATES, NOT TWO */
export function readEndDate(
  v: string | null | undefined,
  modelSaysCurrent: boolean | null | undefined
): { endDate: string | null; isCurrent: boolean; endUnreadable: boolean } {
  const t = (v ?? "").trim();
  if (!t) return { endDate: null, isCurrent: modelSaysCurrent === true, endUnreadable: false };
  if (isCurrentWord(t)) return { endDate: null, isCurrent: true, endUnreadable: false };
  const d = isoDate(t);
  if (d) return { endDate: d, isCurrent: false, endUnreadable: false };
  return { endDate: null, isCurrent: false, endUnreadable: true };
}

export function aiToParsedResume(ai: AiResume): ParsedResume {
  const iso = isoDate;

  const experiences = ai.employers.map((e) => ({
    // typed and the whole point is that the absence is now recordable.
    employer: e.name ?? null,
    roleTitle: e.roleTitle ?? "",
    description: e.description ?? null,
    startDate: iso(e.startDate),
    /* `E549` — end date, current flag and unreadable flag decided together. */
    ...readEndDate(e.endDate, e.isCurrent),
  }));

  // NOTHING IS DISCARDED. TWO OUTCOMES, NEVER A THIRD

  // MATCHING, AND IT DELIBERATELY ERRS TOWARD "NOT SURE".
  const LEGAL_SUFFIX =
    /\b(inc|llc|ltd|limited|corp|corporation|co|plc|gmbh|sa|nv|bv|pty|llp|lp)\b/g;
  const normEmployer = (v: string) =>
    v
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(LEGAL_SUFFIX, " ")
      .replace(/\s+/g, " ")
      .trim();

  const employerKeys = experiences.map((e) => ({
    name: e.employer,
    // A NULL EMPLOYER GETS AN EMPTY KEY , which never matches a
    key: e.employer ? normEmployer(e.employer) : "",
  }));

  const matchEmployer = (raw: string | null | undefined): string | null => {
    const k = raw ? normEmployer(raw) : "";
    if (!k) return null;
    const exact = employerKeys.filter((e) => e.key === k);
    if (exact.length === 1) return exact[0].name;
    if (exact.length > 1) return null; // two employers normalise alike — ambiguous
    /* One contains the other ("oracle" vs "oracle consulting"). Both sides are
       length-guarded so a short fragment cannot swallow an unrelated employer. */
    const partial = employerKeys.filter(
      (e) =>
        e.key.length >= 4 &&
        k.length >= 4 &&
        (e.key.startsWith(k) || k.startsWith(e.key))
    );
    return partial.length === 1 ? partial[0].name : null;
  };

  const projects = ai.projects.map((p) => ({
    name: p.name,
    description: p.description ?? null,
    startDate: iso(p.startDate),
    ...readEndDate(p.endDate, p.isCurrent),
    client: p.client ?? null,
    software: p.software ?? [],
    /* `p.employer` is the model's answer to "delivered under whom"; `p.client` is
       the second-best signal when it did not say. Same tolerant match for both. */
    employerName: matchEmployer(p.employer) ?? matchEmployer(p.client),
  }));

  // THE EQUATION, ASSERTED AT THE BOUNDARY. 's acceptance test is
  if (projects.length !== ai.projects.length) {
    throw new Error(
      `resume mapper lost projects: extracted ${ai.projects.length}, mapped ${projects.length}`
    );
  }

  // CERTIFICATIONS WERE EXTRACTED AND THROWN AWAY WS-4)
  const certifications = ai.certifications.map((c) => ({
    name: c.name,
    issuer: c.issuer ?? null,
    issuedOn: iso(c.issuedOn ?? null),
    expiresOn: iso(c.expiresOn ?? null),
  }));

  return {
    headline: ai.headline ?? null,
    overview: ai.overview ?? null,
    certifications,
    // Derived from the work history downstream (WS6/E068), exactly as the
    // heuristic path leaves them — the model is not asked to grade seniority.
    experienceLevel: null,
    experienceYears: null,
    experiences,
    projects,
    // E164 — repair the row, then keep it only if it is plausibly a school.
    education: ai.education.map(fixEducationRow).filter(isPlausibleEducationRow),
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
