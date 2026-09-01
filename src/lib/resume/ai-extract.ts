import { z } from "zod";
import {
  callExtractionModel,
  resolveProvider,
  type ModelUsage,
  type ParserTier,
  type ProviderName,
} from "./ai-provider";
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
 * IT IS NOW THE PRIMARY READER (E184), which is a reversal worth stating.
 * It used to be a second tier: the heuristic scored first and this ran only when
 * that score was low AND the provider clicked "Let AI take a pass". The result
 * was that the only caller was a button no screen in the journey rendered any
 * more, so every real upload was read by the heuristic while the UI credited the
 * work to AI. `importProfileDocument` calls this on upload now; the heuristic is
 * what catches a failed or unconfigured call, not the other way round.
 *
 * ⚠ DATA FLOW, flagged for Scott per the brief: running this sends the résumé's
 * TEXT — a named individual's employment history, education and contact details —
 * to the model provider. That is a real disclosure of personal data to a
 * third-party processor. The gate is now the UPLOAD itself rather than a second
 * click, so the dropzone says plainly that AI reads the document; the privacy
 * notice and any DPA are still a decision above this code.
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

/**
 * A list of short terms — accepting the shapes a model actually returns.
 *
 * SAME LESSON AS `maybe`, one field over. The schema asks for `["Payables",
 * "Sourcing"]`; gpt-5-nano periodically answers `[{"name": "Payables"}, …]`,
 * which is a defensible reading of "list of skills" and completely unusable to
 * a `z.array(z.string())`. One such element rejected the ENTIRE extraction:
 * Scott's résumé came back with eight employers, two degrees and forty skills,
 * and the whole thing was thrown away over the shape of `skills[0]`.
 *
 * `strict: false` is what makes this possible — the json_schema is a request,
 * not a contract, and every OpenAI-compatible vendor honours it a little
 * differently. Given a choice between arguing shape with the model and reading
 * what it sent, read what it sent: an object with an obvious label field IS the
 * skill, and dropping the extraction over its wrapper serves nobody.
 *
 * Anything genuinely unreadable is dropped from the list rather than failing the
 * parse, for the same reason.
 */
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
  software: looseStringArray,
  skills: looseStringArray,
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

/*
  THE SYSTEM PROMPT IS THE CACHED PREFIX (WS-A).

  It is byte-identical on every call — résumé text is the only thing that varies
  — which is the shape both vendors' prompt caches reward.

  ⚠ THE RDS TAXONOMY IS DELIBERATELY NOT IN HERE, and that is a deviation from
  the brief worth stating plainly. The brief says to prompt-cache the
  Role→Domain→Skill taxonomy "so only résumé text is fresh input". The taxonomy
  was never in this prompt: skills come back as free text and are matched against
  the seeded catalog afterwards, deterministically, by `match.ts`. Injecting
  ~400 skill names would ADD input tokens to every call — cache reads are cheaper
  than fresh input, not free — to replace a matcher that costs nothing and is
  unit-tested. That trades against the goal of this workstream. Flagged rather
  than done; if the intent was better skill recall, that is a measurable
  experiment on its own.

  THE BUCKETING RULES ARE E164. Accomplishment bullets were landing in
  `education`, so the separation between buckets is now stated explicitly rather
  than left to inference.
*/
const SYSTEM = `You extract structured data from résumés for a services marketplace.

Rules:
- Transcribe, never invent. If a field is not in the document, return null or an empty list. Do not infer dates, employers or titles that are not written down.
- Tables are content. Many résumés put each project in a table of label/value rows (Summary, Description, Role-Type, Software, Skills Used) — read those as projects.
- A project belongs to the employer or client it sits under, when the document makes that clear.
- Dates: return YYYY-MM-DD. When only a month and year are given use the first of the month; when only a year is given use January 1st. "Present"/"Current" means endDate null and isCurrent true.
- Trailing summary lines like "Additional experience as an X at Y and Z at W" name real employers. Return each as its own entry with null dates.
- Keep descriptions close to the author's wording; do not embellish.

The four buckets are distinct. Put each item in exactly one:
- employers: paid positions at an organisation.
- education: FORMAL STUDY ONLY — a school, college or university the person attended for a qualification. \`institution\` must be the name of that school. An achievement, a responsibility, a project, a training course, a certification or a bullet point describing work is NEVER an education entry. If a line has no named school, it does not belong in education.
- certifications: named credentials awarded by a body (e.g. "Oracle Cloud Procurement Certified Implementation Professional"), with the issuer when stated.
- skills: short capability terms only — tools, modules, methods. Not sentences, not achievements.
Descriptions: at most 2 short sentences each. Prefer omitting a description to padding one.`;

/*
  MEASURED, NOT ASSUMED (WS-A).

  A harder terseness pass — ≤200-character descriptions, no skill repeated
  inside a project, a 40-skill cap — was written and REVERTED on the evidence.
  Across three runs of the same four résumés, average OUTPUT was 3342 / 3312 /
  3554 tokens with and without it: the instruction changed cost by less than the
  run-to-run noise. The output on these documents is structural (many entries ×
  their fields), not padded prose, so squeezing prose buys nothing.

  Quality moved too — role titles scored 96%, 50% and 62% across those same
  runs — but that metric is exact-string overlap on free-text titles and swings
  by that much between IDENTICAL prompts, so it is noise, not a verdict. The
  revert stands on the cost measurement alone.

  `npm run eval:parser -- --only=eddie,marelise-eur,scott-new-full.docx,hcm-ram`
  reproduces it.
*/

export type AiExtractOutcome =
  | {
      ok: true;
      data: AiResume;
      model: string;
      provider: ProviderName;
      /** economy vs incumbent — E184's whole point is that this is visible. */
      tier: ParserTier;
      inputChars: number;
      ms: number;
      /** Real token counts + $/parse when prices are configured (WS-A). */
      usage: ModelUsage;
    }
  | { ok: false; reason: "no_key" | "error"; message: string };

/** Is the AI tier available at all? Drives whether WS3 offers the button. */
export function aiExtractionAvailable(): boolean {
  return resolveProvider() !== null;
}

/**
 * How many of the schema's own top-level keys the response actually declared.
 *
 * Zero means the model did not answer the question — see the EMPTY vs ABSENT
 * note at the call site. Lifted out of that check so the retry above can ask
 * the same question with the same definition; two copies of this rule drifting
 * apart is how "we read your résumé and it was blank" comes back.
 */
function declaredKeyCount(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  const raw = value as Record<string, unknown>;
  return ["employers", "projects", "education", "skills", "headline", "overview"].filter(
    (k) => k in raw
  ).length;
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
  const ask = () =>
    callExtractionModel({
      system: SYSTEM,
      schema: TOOL_SCHEMA as unknown as Record<string, unknown>,
      schemaName: "record_resume",
      text,
    });

  let call = await ask();

  /*
    ONE RETRY, for the answer that isn't one (WS-4).

    `response_format` is sent with `strict: false`, which makes the schema a
    request rather than a contract — so the same document, sent twice, can come
    back parsed once and as a bare object with none of the expected keys the
    next time. Observed directly: Scott's résumé failed the route with "didn't
    return anything usable", and the identical text through the identical code
    path seconds later returned 1 employer, 14 projects and 34 skills.

    Retried ONLY for a response carrying no answer at all — not for a model that
    read the document and found nothing (that is a real answer, and the branch
    below is careful to tell the two apart), and not for a refusal or a network
    error, which repeating would not fix. One extra call at ~12s sits well
    inside the 55s deadline; a loop would not.

    The durable fix is `strict: true`, which would make the vendor enforce the
    shape instead of us hoping for it. That is a schema rewrite — strict mode
    requires every property listed in `required` and additionalProperties false
    throughout — on a schema shared with the Anthropic path and the job-posting
    importer, and this prompt is documented as change-only-with-a-harness-run.
    Out of scope for a bug fix; flagged in the report.
  */
  if (call.ok && declaredKeyCount(call.value) === 0) {
    console.warn("[resume] model returned no schema keys — retrying once");
    call = await ask();
  }

  if (!call.ok) {
    return {
      ok: false,
      reason: call.reason === "no_key" ? "no_key" : "error",
      message: call.message,
    };
  }

  /*
    EMPTY vs ABSENT (WS3, an E121-class bug), kept exactly as it was.

    `.default([])` fills a missing key with an empty array, so a response that
    arrived with EVERY key absent — truncated or abandoned — validated cleanly
    and was reported as "we read your résumé and it was blank". That is
    indistinguishable from the real thing and is the wrong answer in the one
    case where the user most needs to be told something went wrong.

    The distinction is available BEFORE defaults are applied: a model that
    genuinely found no work history still returns the keys with empty arrays in
    them. Omitting every key is not an answer, it is the absence of one.
  */
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
    // dead end — the same lesson E121 learned about unrecognised keys.
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

/**
 * AI output → the shape the rest of the import already speaks.
 *
 * Keeping this conversion here means `import.ts`, the review step and the
 * fixture harness are unchanged by the AI tier — the two paths converge before
 * anything downstream can tell them apart. Projects are folded onto their
 * employer where one is named, and kept as standalone entries otherwise, which
 * is the same distinction the profile already draws (Solo Projects, E074).
 */
/*
  A DEGREE IS NOT A SCHOOL (WS7a, post-processing).

  Live data holds education rows whose institution is "Bachelor of Arts in
  Accounting" or "Business Administration" — the model put the qualification in
  the school field and left the school out. The row then renders as if someone
  attended a university called "Bachelor of Arts in Accounting".

  Fixed HERE rather than in the prompt, deliberately. The brief warns the prompt
  is fragile and requires a before/after harness run for any change to it; a
  deterministic post-filter needs no such gamble, is unit-testable without
  spending a model call, and repairs rows the prompt fix could never reach —
  everything already imported.

  It only ever MOVES a value it is confident about, and never invents a school:
  a row left without an institution keeps its degree and field, which is a
  partial record rather than a wrong one.
*/
const DEGREE_LEAD =
  /^(bachelors?|masters?|associates?|doctor(ate)?|ph\.?d|b\.?s\.?c?|b\.?a|m\.?s\.?c?|m\.?b\.?a|m\.?a|b\.?eng|m\.?eng|b\.?tech|diploma|certificate)\b/i;

/** Does this string NAME a school? The one test the institution field exists for. */
const NAMES_A_SCHOOL =
  /\b(universi\w*|college|institute|instituto|school|academy|polytechnic|seminary|hochschule|iit|iim|nit)\b/i;

/** Qualification words that are not degree-LEADS — "Post Graduate Program". */
const QUALIFICATION = /\b(degree|diploma|certificat\w*|program(me)?|course)\b/i;

/**
 * SCRUB THE INSTITUTION STRING, then decide whether what is left is a school.
 *
 * WS-3 (2026-08-13). `fixEducationRow` already moved a degree out of the
 * institution slot, but it only fired when the string did NOT name a school —
 * so "San Diego State University  •  3.72 GPA" sailed through untouched and
 * printed, GPA and all, on a public card. Nine live rows look like that. The
 * scrub runs FIRST, so a school with debris attached becomes a clean school
 * instead of being waved past as "already fine".
 *
 * Every rule here is subtractive. Nothing is inferred, completed or guessed:
 * a school name only ever comes out of the string that went in.
 *
 * Returns the school when one survives, and otherwise returns the scrubbed text
 * as `salvage` with an EMPTY institution — the caller re-files it. Blank beats
 * wrong: a card with two pedigree items is missing a fact, a card that calls
 * "Bachelor of Arts in Accounting" a university states one.
 */
export function scrubInstitution(raw: string): {
  institution: string;
  salvage: string | null;
} {
  let t = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!t) return { institution: "", salvage: null };

  // "Attended University of South Florida - Tampa" -> the university. Two live
  // rows; the verb is the résumé's, not part of anyone's name.
  t = t.replace(/^(attended|studied at|graduated from|graduate of)\s+/i, "").trim();

  /*
    Drop a trailing bullet-separated fragment when it is a GRADE, not a campus.
    "San Diego State University  •  3.72 GPA" -> the university, but
    "Universidad Nacional • Bogotá" keeps its tail. The test is the fragment
    itself: a number-with-decimal, or the word GPA/CGPA/honours.
  */
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

  /*
    "Dual Enrollment During High School at Polk State College" -> the college.
    Only when the TAIL names a school, which is the whole guard: "University at
    Buffalo" splits to a tail of "Buffalo", which names nothing, so the split is
    rejected and the real name stands. (An earlier version ALSO required the
    head not to name a school — which rejected the Polk row, since "High School"
    names one. The tail test alone is both sufficient and correct.)
  */
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

/**
 * Where does text evicted from the institution slot go?
 *
 * NOTHING IS DELETED THAT IS NOT ALREADY RECORDED. A qualification becomes the
 * degree; anything that merely repeats the degree or field is dropped, because
 * it is a duplicate rather than a loss; everything else lands in `description`,
 * the row's free-text field, verbatim. That last branch is the honest place for
 * "Configure operating systems and administer cloud-based (SaaS) software" — a
 * résumé bullet that was never an education row and should not be silently
 * binned either.
 */
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
  /*
    The scrub decides. A school whose NAME begins with a degree word —
    "Bachelor College" — is still a school, and `scrubInstitution` keeps it for
    the same reason the old inline rule did: it tests whether the string names
    an institution, not whether it starts with a degree word. That case has its
    own unit test; the first version of this rule gutted it.
  */
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

/**
 * IS THIS ROW ACTUALLY A SCHOOL? (E164, deterministic half.)
 *
 * The walk found accomplishment bullets — "Led the P2P transformation across
 * three business units" — sitting in the education list, where they render as
 * institutions somebody attended. The prompt now separates the buckets
 * explicitly, but a prompt rule is a request and this is a guarantee: the same
 * argument `fixEducationRow` already makes for repairing degree-as-institution
 * rows, and it also repairs documents parsed before either change.
 *
 * DELIBERATELY CONSERVATIVE — it only rejects rows that are BOTH un-school-like
 * AND sentence-shaped. A short unrecognised institution ("IIM Bangalore",
 * "ENSAE") passes, because a dropped real school is a worse error than a stray
 * bullet the user can delete on the review page.
 */
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
    ── ⚠⚠ NOTHING IS DISCARDED. TWO OUTCOMES, NEVER A THIRD (`P1-J1.4-E294`) ────

    Scott, 2026-09-01: *"make the projects under the employers... IF you are not
    sure, make them separate AND allow the user an easy way to add them under an
    employer."*

    ⚠ SUPERSEDED, QUOTED NOT DELETED — the block that stood here, and the line
    that lost the data:

        const alreadyUnderEmployer =
          p.employer && experiences.some((e) => e.employer === p.employer);
        if (alreadyUnderEmployer) continue;          // <-- DISCARDED
        experiences.push({ employer: p.client ?? p.employer ?? p.name, ... });

    carrying the reasoning *"Projects the document did NOT attach to an employer
    still describe work, and dropping them would lose Marelise's entire history —
    her ten tables are projects, not jobs. They become entries in their own right,
    with the client as the employer when one is named, so the review shows them
    rather than silently discarding them."*

    ⚠⚠ THAT COMMENT WAS HALF RIGHT AND THE CODE DID THE OPPOSITE OF WHAT IT SAID.
    It protected the UNPLACEABLE projects by promoting them to fake employers —
    Scott's 28 "employers" — and it SILENTLY DELETED the placeable ones, which is
    the dangerous face: five clean employers, no projects anywhere, and a page
    that looks right while the data is gone.

    ⚠ BOTH FACES GO. Every project the model returns now reaches the caller,
    either attached or explicitly unattached. `continue` is deleted and no project
    is ever pushed into `experiences` again.
  */

  /*
    MATCHING, AND IT DELIBERATELY ERRS TOWARD "NOT SURE".

    A document will not spell an employer the same way twice — `Oracle` vs
    `Oracle Corporation`, a trailing `Inc.`, stray case and punctuation. The
    comparison is normalised: lower-cased, punctuation stripped, common legal
    suffixes removed, whitespace collapsed.

    ⚠ AND WHEN IN DOUBT IT DOES NOT MATCH. An UNATTACHED project is recoverable in
    one click (`E296`); a WRONGLY attached one is a lie the user has to spot first.
    An ambiguous key — one that matches two employers — resolves to null rather
    than picking a winner. That is recall-over-precision applied in the only
    direction that is safe here: never lose the row, never assert a link the
    document did not support.
  */
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
    key: normEmployer(e.employer),
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
    endDate: iso(p.endDate),
    client: p.client ?? null,
    software: p.software ?? [],
    /* `p.employer` is the model's answer to "delivered under whom"; `p.client` is
       the second-best signal when it did not say. Same tolerant match for both. */
    employerName: matchEmployer(p.employer) ?? matchEmployer(p.client),
  }));

  /*
    ⚠ THE EQUATION, ASSERTED AT THE BOUNDARY. `E294`'s acceptance test is
    extracted === attached + unattached. Checking it HERE — where the mapper hands
    off — makes "nothing is dropped" a property of the code rather than a claim in
    a commit message. It can only fire if someone reintroduces a filter.
  */
  if (projects.length !== ai.projects.length) {
    throw new Error(
      `resume mapper lost projects: extracted ${ai.projects.length}, mapped ${projects.length}`
    );
  }

  return {
    headline: ai.headline ?? null,
    overview: ai.overview ?? null,
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
