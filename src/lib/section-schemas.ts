import { z } from "zod";
import { LEGACY_SECTIONS, PROVIDER_STEPS, type ProfileSection } from "@/lib/onboarding";

/**
 * Payload shapes for `/api/settings/profile/section` (E121).
 *
 * ── THE BUG THIS EXISTS TO PREVENT ────────────────────────────────────────
 * Six of these writers REPLACE a whole collection: they delete every row for
 * the profile and recreate from the payload. That is the right semantic for
 * "here is the new list" — but every one of them read its list as
 *
 *     const list = Array.isArray(data.experiences) ? data.experiences : [];
 *
 * so a payload with a MISSING or MISSPELLED key was indistinguishable from
 * "the new list is empty". During Walk6 a POST carrying `employers` (rather
 * than `experiences`) deleted all four employers and returned 200. Nothing in
 * the request was rejected, and nothing in the response said anything had gone.
 *
 * The fix is to make that distinction expressible. For a destructive section the
 * collection key is REQUIRED: send it empty and you have deliberately cleared
 * the section; omit it and the request is refused before a transaction opens.
 * `.strict()` then rejects unknown keys, so a misspelling is a 400 naming the
 * offending field instead of a silent wipe.
 *
 * ── SCOPE ─────────────────────────────────────────────────────────────────
 * Each schema describes ONLY its own section. A bio update carries `overview`
 * and nothing else, so it cannot reach employers even if a caller attaches
 * them — `.strict()` refuses the request rather than quietly ignoring the extra
 * field, because "ignored" is how a caller comes to believe a write happened.
 */

const trimmed = z.string().trim();
/** Dates arrive as `YYYY-MM-DD` strings or empty. Parsed downstream. */
const dateish = z.string().trim().nullable().optional();

/**
 * Marks a collection whose section REPLACES it wholesale. Required, so an
 * absent key can never be read as an empty list.
 */
const replaces = <T extends z.ZodTypeAny>(item: T) =>
  z.array(item, {
    error: (issue) =>
      issue.input === undefined
        ? "This section replaces its whole list, so the list must be supplied. Send an empty array to clear it deliberately."
        : undefined,
  });

const experienceItem = z
  .object({
    employer: trimmed.optional(),
    roleTitle: trimmed.optional(),
    description: z.string().nullable().optional(),
    startDate: dateish,
    endDate: dateish,
    projects: z
      .array(
        z.object({
          name: trimmed.optional(),
          description: z.string().nullable().optional(),
        })
      )
      .optional(),
  })
  .strict();

const educationItem = z
  .object({
    id: z.string().optional(),
    institution: trimmed.optional(),
    degree: z.string().nullable().optional(),
    field: z.string().nullable().optional(),
    startYear: z.union([z.number(), z.string(), z.null()]).optional(),
    endYear: z.union([z.number(), z.string(), z.null()]).optional(),
  })
  .strict();

const languageItem = z
  .object({
    id: z.string().optional(),
    name: trimmed.optional(),
    level: z.string().nullable().optional(),
    proficiency: z.string().nullable().optional(),
  })
  .strict();

const certificationItem = z
  .object({
    id: z.string().optional(),
    name: trimmed.optional(),
    issuer: z.string().nullable().optional(),
    year: z.union([z.number(), z.string(), z.null()]).optional(),
    issuedOn: dateish,
    expiresOn: dateish,
    credentialId: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    attachmentPath: z.string().nullable().optional(),
    attachmentName: z.string().nullable().optional(),
  })
  .strict();

const addressShape = z
  .object({
    line1: z.string().nullable().optional(),
    line2: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    postalCode: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
  })
  .strict();

/**
 * One schema per section. Anything not listed cannot be written through this
 * endpoint at all — an unknown section is a 400 rather than a pass-through.
 */
export const SECTION_SCHEMAS = {
  // --- destructive: the collection is REQUIRED ----------------------------
  experience: z.object({ experiences: replaces(experienceItem) }).strict(),
  education: z.object({ education: replaces(educationItem) }).strict(),
  languages: z.object({ languages: replaces(languageItem) }).strict(),
  certifications: z.object({ certifications: replaces(certificationItem) }).strict(),
  // Owns BOTH lists, so both are required — a body with only `education` would
  // otherwise clear every language while looking like a partial update.
  education_languages: z
    .object({
      education: replaces(educationItem),
      languages: replaces(languageItem),
    })
    .strict(),
  specializations: z
    .object({
      specializationIds: replaces(z.string()),
      customSpecializations: z.array(z.string()).optional(),
    })
    .strict(),
  skills: z
    .object({
      skillIds: replaces(z.string()),
      customSkills: z.array(z.string()).optional(),
      roleTypeId: z.string().nullable().optional(),
      pillarId: z.string().nullable().optional(),
    })
    .strict(),
  catalog: z
    .object({
      skillIds: replaces(z.string()),
      customSkills: z.array(z.string()).optional(),
      roleTypeId: z.string().nullable().optional(),
      pillarId: z.string().nullable().optional(),
    })
    .strict(),

  // --- scalar sections: they touch one field and nothing else -------------
  title: z.object({ headline: z.string() }).strict(),
  bio: z.object({ overview: z.string() }).strict(),
  photo: z.object({ photoUrl: z.string().nullable() }).strict(),
  region: z.object({ regionId: z.string() }).strict(),
  work_type: z.object({ workTypes: z.array(z.string()) }).strict(),
  work_method: z.object({ workMethod: z.string() }).strict(),
  tell_us: z.object({ profileMethod: z.string() }).strict(),
  category: z
    .object({
      roleTypeId: z.string().nullable().optional(),
      pillarId: z.string().nullable().optional(),
    })
    .strict(),
  rate: z
    .object({
      hourlyDollars: z.union([z.number(), z.string(), z.null()]).optional(),
      onsiteDollars: z.union([z.number(), z.string(), z.null()]).optional(),
      remoteDollars: z.union([z.number(), z.string(), z.null()]).optional(),
      minDollars: z.union([z.number(), z.string(), z.null()]).optional(),
      maxDollars: z.union([z.number(), z.string(), z.null()]).optional(),
      currency: z.string().optional(),
    })
    .strict(),
  finish: z
    .object({
      dateOfBirth: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      address: addressShape.nullable().optional(),
    })
    .strict(),
  /**
   * Work history is written through its own owner-scoped endpoint
   * (`/api/onboarding/provider/employers`), which does incremental
   * add/edit/delete rather than replace-all. Accepting it here as well would be
   * a second, blunter way to write the same rows — which is exactly how the
   * Walk6 wipe happened. Declared with no payload so the section is KNOWN and
   * explicitly refused, rather than falling through to a generic error.
   */
  employers: z.never(),
  picture: z.object({ photoUrl: z.string().nullable() }).strict(),
} satisfies Partial<Record<ProfileSection, z.ZodTypeAny>>;

export type ValidatedSection = keyof typeof SECTION_SCHEMAS;

/** Every section name the app knows about, for the "is this even a section" check. */
const ALL_SECTIONS = new Set<string>([...PROVIDER_STEPS, ...LEGACY_SECTIONS]);

export type SectionParseResult =
  | { ok: true; section: ValidatedSection; data: Record<string, unknown> }
  | { ok: false; status: number; error: string };

/**
 * Validate a `{ section, data }` body. Returns the parsed payload or the exact
 * refusal to send back — never a partially-understood object.
 */
export function parseSectionBody(body: unknown): SectionParseResult {
  if (!body || typeof body !== "object") {
    return { ok: false, status: 400, error: "Expected a JSON object body" };
  }
  const { section, data } = body as { section?: unknown; data?: unknown };

  if (typeof section !== "string" || !section) {
    return { ok: false, status: 400, error: "Missing section" };
  }
  if (!ALL_SECTIONS.has(section)) {
    return { ok: false, status: 400, error: `Unknown section "${section}"` };
  }
  const schema = SECTION_SCHEMAS[section as ValidatedSection];
  if (!schema) {
    return {
      ok: false,
      status: 400,
      error: `Section "${section}" cannot be written through this endpoint`,
    };
  }
  if (data === undefined || data === null) {
    return { ok: false, status: 400, error: `Missing data for section "${section}"` };
  }

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    /*
      UNRECOGNISED KEYS ARE REPORTED FIRST, deliberately.

      Zod lists a missing required field before an unknown one, so the Walk6
      payload reported "experiences must be supplied" and never mentioned
      `employers` — accurate, but it leaves the caller staring at a key they
      didn't send instead of the one they did. Naming the key that IS there is
      what turns this into a five-second diagnosis, so it leads.
    */
    const issues = parsed.error.issues;
    const unknown = issues.filter((i) => i.code === "unrecognized_keys");
    const unknownKeys = unknown.flatMap(
      (i) => (i as unknown as { keys?: string[] }).keys ?? []
    );
    if (unknownKeys.length > 0) {
      return {
        ok: false,
        status: 400,
        error:
          `Invalid payload for section "${section}": unrecognized ` +
          `${unknownKeys.length === 1 ? "key" : "keys"} ` +
          `${unknownKeys.map((k) => `"${k}"`).join(", ")}. ` +
          `Nothing was written.`,
      };
    }
    const first = issues[0];
    const path = first?.path?.join(".");
    return {
      ok: false,
      status: 400,
      error: `Invalid payload for section "${section}"${path ? ` at "${path}"` : ""}: ${first?.message ?? "unrecognized shape"} Nothing was written.`,
    };
  }

  return {
    ok: true,
    section: section as ValidatedSection,
    data: parsed.data as Record<string, unknown>,
  };
}
