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
- employers: paid positions at an organisation.
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

/**
 * ── ⚠⚠ A DATE STRING AS A RÉSUMÉ ACTUALLY WRITES IT (`P2-J1.4-E549`) ────────
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — the whole of the old `iso()`:
 *     if (!v) return null;
 *     const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/.exec(v.trim());
 *     if (!m) return null;
 * ⚠⚠ IT ACCEPTED ONLY A LEADING YEAR. The per-call passes carry no date format,
 * so the model returns the document faithfully — `"09/2024"`, `"May 2023"`,
 * `"Current"` — and every one became null. Measured 2026-09-17: **38 employers and
 * 185 projects** carry a document date that this threw away.
 * ⚠ SCOTT: *"THE FIX IS iso(), NOT THE PROMPT… A parser must handle real-world
 * date strings whatever the prompt says."* So the year-first form is kept and
 * the pattern-matcher's own `parseMonthYear` handles the rest.
 */
export function isoDate(v: string | null | undefined): string | null {
  if (!v) return null;
  const t = v.trim();
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/.exec(t);
  if (m) return `${m[1]}-${m[2] ?? "01"}-${m[3] ?? "01"}`;
  return parseMonthYear(t);
}

/**
 * ── ⚠⚠ AN END DATE HAS THREE STATES, NOT TWO (`P2-J1.4-E549`) ─────────────
 *
 * ⚠⚠ SCOTT, 2026-09-17: *"TEXT WE COULD NOT READ IS EVIDENCE THE JOB ENDED, NOT
 * EVIDENCE IT IS CURRENT. An unparseable end string is the OPPOSITE of an absent
 * one. A parse failure must NEVER silently extend a job to today."*
 *
 *   · a current word ("Present", "Current"…)  → no date, CURRENT
 *   · a readable date                          → that date, not current
 *   · present but UNREADABLE                   → no date, NOT current, unreadable
 *   · absent                                   → no date; current ONLY if the
 *                                                model said so (`isCurrent`)
 * ⚠ AFFIRMATIVE ONLY. An absent end with `isCurrent` false or null is not a
 * current role — it is an end nobody wrote down, and it earns no months.
 */
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
    /* ⚠ `null` FLOWS THROUGH AS `null` (`P1-J1.4-E373`) — it is not coerced to
       "" here, because an empty string is indistinguishable from a name nobody
       typed and the whole point is that the absence is now recordable. */
    employer: e.name ?? null,
    roleTitle: e.roleTitle ?? "",
    description: e.description ?? null,
    startDate: iso(e.startDate),
    /* ⚠ `E549` — end date, current flag and unreadable flag decided together. */
    ...readEndDate(e.endDate, e.isCurrent),
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
    /* ⚠ A NULL EMPLOYER GETS AN EMPTY KEY (`P1-J1.4-E373`), which never matches a
       real one — so unnamed lines are never merged with each other or with a
       named employer. Two contractors are not the same company. */
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

  /*
    ── ⚠⚠ CERTIFICATIONS WERE EXTRACTED AND THROWN AWAY (`P1-A1.4-E399` WS-4) ───

    `AI_RESUME_SCHEMA` has carried `certifications` since it was written, the
    prompt asks for them and Zod validates them — and this mapper never returned
    them, because `ParsedResume` had no field to put them in. So five Oracle
    certifications were parsed correctly and dropped one line before they would
    have been saved. ⚠ The model was never the problem here.
  */
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
