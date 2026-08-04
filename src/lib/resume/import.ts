import { prisma } from "@/lib/prisma";
import { extractText, ExtractError } from "@/lib/resume/extract";
import { parseResume, type ParsedResume } from "@/lib/resume/parse";
import { recomputeCompleteness } from "@/lib/onboarding";
import { uploadResumeFile } from "@/lib/storage";
import { matchSkills, suggestableSkills } from "@/lib/resume/match";
import { assessParse } from "@/lib/resume/confidence";
import type { Prisma } from "@prisma/client";

/**
 * Apply a résumé import to a provider profile (brief_P / E012; LinkedIn path
 * removed in PJv2 WS2 / E069).
 *
 * Owner scope is the CALLER's job — this takes an already-resolved profile id,
 * exactly like `applyProviderSection`. Every attempt is recorded as a
 * `ProfileImport` row (including failures) so the review page can surface what
 * didn't come through (E019) and so a parse can be re-run without re-uploading.
 *
 * Import NEVER destroys typed data: it fills empty fields and appends history
 * the user doesn't already have. A user who imports after typing a bio keeps
 * their bio.
 */

export type ImportResult = {
  importId: string;
  status: "PARSED" | "FAILED";
  applied: {
    headline: boolean;
    overview: boolean;
    experiences: number;
    education: number;
    /** WS4 — matched against the seeded vocabulary, not asked of the model. */
    specializations: number;
    skillsMatched: number;
    skillsMatchedNames: string[];
    skillsUnmatched: string[];
    /** WS-B — the unmatched terms worth offering as confirm-to-add. */
    skillSuggestions: string[];
    languages: number;
  };
  gaps: string[];
  /**
   * WS0/WS3 — how much to trust this parse, and why. Drives the review's
   * "we had trouble reading this" panel. Absent on a FAILED import.
   */
  confidence?: { score: "high" | "low"; reasons: string[] };
  error?: string;
};

export async function importProfileDocument({
  profileId,
  source,
  fileName,
  mimeType,
  bytes,
}: {
  profileId: string;
  source: "RESUME";
  fileName: string;
  mimeType: string;
  bytes: Buffer;
}): Promise<ImportResult> {
  // 1. Text out of the document.
  let text: string;
  try {
    text = await extractText(bytes, mimeType, fileName);
  } catch (e) {
    const message =
      e instanceof ExtractError ? e.message : "We couldn't read that file.";
    const row = await prisma.profileImport.create({
      data: {
        provider_profile_id: profileId,
        source,
        status: "FAILED",
        file_name: fileName,
        mime_type: mimeType,
        size_bytes: bytes.byteLength,
        error: message,
        gaps: [message],
      },
    });
    return {
      importId: row.id,
      status: "FAILED",
      applied: emptyApplied(),
      gaps: [message],
      error: message,
    };
  }

  // 2. Text → structure.
  const parsed = parseResume(text);

  // 3. Structure → profile, non-destructively.
  const applied = await applyParsedResume(profileId, parsed, source);

  const gaps = [...parsed.gaps];
  /*
    WS-B — the unmatched count is NOT a gap any more, because we can now do
    something about it. "34 skills aren't in the Panameer catalog and were not
    added" reported a problem, named no fix, and read as an accusation that the
    provider's CV was wrong. The review offers those terms as a tick-list
    (`skillSuggestions`) instead: the same information, as an action.

    A gap IS still emitted for the remainder — the terms the plausibility filter
    dropped — because silently discarding part of someone's document and saying
    nothing is the failure mode this whole track exists to end. Phrased as what
    happened, not as something they must fix.
  */
  const discarded = applied.skillsUnmatched.length - applied.skillSuggestions.length;
  if (discarded > 0) {
    gaps.push(
      `${discarded} line${discarded === 1 ? "" : "s"} from your skills section didn't look like skills, so ${
        discarded === 1 ? "it was" : "they were"
      } left out.`
    );
  }
  if (applied.experiences === 0 && applied.education === 0) {
    gaps.push(
      "No work history or education could be imported from this file — please add them manually."
    );
  }

  // Keep the source document (private bucket) so a parse can be re-run or
  // audited without asking the user to upload again. A storage failure must
  // NOT fail an import whose parse already succeeded — the profile data is the
  // valuable part, the file is a convenience.
  let storagePath: string | null = null;
  try {
    storagePath = await uploadResumeFile(profileId, {
      name: fileName,
      type: mimeType,
      bytes: bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength
      ) as ArrayBuffer,
    });
  } catch (e) {
    console.error("[resume] could not store the source file (non-fatal):", e);
  }

  const row = await prisma.profileImport.create({
    data: {
      provider_profile_id: profileId,
      source,
      status: "PARSED",
      file_name: fileName,
      mime_type: mimeType,
      size_bytes: bytes.byteLength,
      storage_path: storagePath,
      raw_text: text.slice(0, 100_000),
      parsed: parsed as unknown as Prisma.InputJsonValue,
      gaps,
    },
  });

  await recomputeCompleteness(profileId);

  /*
    WS0/WS4 — score the parse and LOG WHICH PATH FIRED. The escalation rate is
    the number that decides whether to flip this tier to AI-primary later, and it
    cannot be recovered after the fact, so it is recorded at the moment of truth.
  */
  const confidence = assessParse(text, parsed);
  console.info(
    `[resume] path=heuristic confidence=${confidence.score} ` +
      `roles=${parsed.experiences.length} dated=${confidence.signals.datedEntries} ` +
      `ranges=${confidence.signals.dateRangesInText} unplaced=${confidence.signals.unplacedRatio} ` +
      `import=${row.id}` +
      (confidence.score === "low" ? ` reasons="${confidence.reasons.join(" | ")}"` : "")
  );

  return { importId: row.id, status: "PARSED", applied, gaps, confidence };
}

function emptyApplied(): ImportResult["applied"] {
  return {
    headline: false,
    overview: false,
    experiences: 0,
    education: 0,
    specializations: 0,
    skillsMatched: 0,
    skillsMatchedNames: [],
    skillsUnmatched: [],
    skillSuggestions: [],
    languages: 0,
  };
}

/**
 * Write a parsed résumé onto a profile. Exported for the AI tier (WS3), which
 * applies its result through THIS function rather than a parallel writer — one
 * place decides how a parse becomes profile rows, so the two paths cannot drift
 * in what they do to someone's data.
 */
export async function applyParsedResume(
  profileId: string,
  parsed: ParsedResume,
  source: "RESUME"
): Promise<ImportResult["applied"]> {
  const applied = emptyApplied();

  const profile = await prisma.providerProfile.findUnique({
    where: { id: profileId },
    include: {
      employers: { select: { name: true, role_title: true } },
      education: { select: { institution: true } },
      languages: { select: { name: true } },
      skills: { select: { skill_id: true } },
    },
  });
  if (!profile) return applied;

  // --- Headline + bio: fill only when empty (never overwrite typed text) ---
  const data: Prisma.ProviderProfileUpdateInput = {};
  if (!profile.headline.trim() && parsed.headline) {
    data.headline = parsed.headline.slice(0, 200);
    applied.headline = true;
  }
  if (!profile.overview?.trim() && parsed.overview) {
    data.overview = parsed.overview.slice(0, 4500);
    applied.overview = true;
  }
  if (!profile.profile_method) {
    // PJv2 WS2 (E069) — the LinkedIn import path is gone; RESUME is the only
    // source. The enum keeps LINKEDIN for rows imported before this.
    data.profile_method = "RESUME";
  }
  // Experience level inferred from the career span (brief_Q). Only ever fills a
  // blank — the field is nullable precisely so "not asked yet" is detectable
  // (brief_P pitfall), and a user's own answer always wins.
  // WS7 — experience_level is gone; years are derived from the imported
  // work history instead (E068).
  if (Object.keys(data).length > 0) {
    await prisma.providerProfile.update({ where: { id: profileId }, data });
  }

  // --- Work history: append EMPLOYERS we don't already hold -----------------
  // brief_U / E042: Employer is the single work-history model, so the import
  // populates it directly instead of the retired flat WorkExperience table.
  // The "Your Employers" step then shows these as cards to confirm and enrich.
  const haveRole = new Set(
    profile.employers.map((w) => `${w.name}|${w.role_title ?? ""}`.toLowerCase())
  );
  for (const [i, e] of parsed.experiences.entries()) {
    const key = `${e.employer}|${e.roleTitle}`.toLowerCase();
    if (haveRole.has(key)) continue;
    haveRole.add(key);
    await prisma.employer.create({
      data: {
        provider_profile_id: profileId,
        name: e.employer.slice(0, 200),
        role_title: e.roleTitle.slice(0, 200),
        description: e.description?.slice(0, 4000) ?? null,
        start_date: e.startDate ? new Date(e.startDate) : null,
        end_date: e.endDate ? new Date(e.endDate) : null,
        is_current: Boolean(e.startDate) && !e.endDate,
        sort_order: i * 10,
      },
    });
    applied.experiences++;
  }

  // --- Education -----------------------------------------------------------
  const haveSchool = new Set(
    profile.education.map((x) => x.institution.toLowerCase())
  );
  for (const ed of parsed.education) {
    if (haveSchool.has(ed.institution.toLowerCase())) continue;
    haveSchool.add(ed.institution.toLowerCase());
    await prisma.education.create({
      data: {
        provider_profile_id: profileId,
        institution: ed.institution.slice(0, 200),
        degree: ed.degree?.slice(0, 200) ?? null,
        field: ed.field?.slice(0, 200) ?? null,
        start_year: ed.startYear,
        end_year: ed.endYear,
        year: ed.endYear ?? ed.startYear,
        description: ed.description?.slice(0, 2000) ?? null,
      },
    });
    applied.education++;
  }

  // --- Skills: only ones that exist in the seeded catalog -------------------
  // A résumé's free-text skills are not the taxonomy. Matching against the
  // catalog keeps the marketplace searchable; anything unmatched is reported
  // as a gap rather than silently invented as a new Skill row.
  if (parsed.skills.length > 0) {
    const catalog = await prisma.skill.findMany({
      select: { id: true, name: true },
    });
    const { matched, unmatched } = matchSkills(parsed.skills, catalog);

    applied.skillsUnmatched = unmatched;
    applied.skillSuggestions = suggestableSkills(unmatched);
    applied.skillsMatchedNames = matched.map((m) => m.name);

    const have = new Set(profile.skills.map((s) => s.skill_id));
    const toAdd = matched.filter((m) => !have.has(m.id));
    if (toAdd.length > 0) {
      await prisma.providerSkill.createMany({
        data: toAdd.map((m) => ({
          provider_profile_id: profileId,
          skill_id: m.id,
        })),
        skipDuplicates: true,
      });
      applied.skillsMatched = toAdd.length;
    }
  }

  /* --- Specializations (WS4) ---------------------------------------------
     AI-PREFILLED WITHOUT TOUCHING THE PROMPT, and that is a deliberate choice.

     The brief asks AI to prefill Specializations onto the review page. The
     obvious route — a new field on the extraction schema — is a change to a
     prompt the guardrails call fragile, and it would ask the model to guess at
     a closed vocabulary it has never seen. The résumé's own skill and software
     terms are already extracted, and specializations ARE those terms (Oracle
     Cloud, SAP, Agile, Manufacturing). So they are matched deterministically
     against the seeded vocabulary — the same pattern `matchSkills` uses, free,
     testable, and with no prompt risk.

     NON-DESTRUCTIVE: only ever adds, and only what the profile doesn't have.
     What it can't match stays BLANK ON PURPOSE — those blanks are the hooks
     WS5 records for the re-engagement engine.
  */
  if (parsed.skills.length > 0) {
    const vocabulary = await prisma.specialization.findMany({
      select: { id: true, name: true },
    });
    const key = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, "");
    const byKey = new Map(vocabulary.map((v) => [key(v.name), v]));
    const existing = new Set(
      (
        await prisma.providerProfileSpecialization.findMany({
          where: { provider_profile_id: profileId },
          select: { specialization_id: true },
        })
      ).map((r) => r.specialization_id)
    );

    const hits = new Map<string, string>();
    for (const term of parsed.skills) {
      const v = byKey.get(key(term));
      if (v && !existing.has(v.id)) hits.set(v.id, v.name);
    }
    if (hits.size > 0) {
      await prisma.providerProfileSpecialization.createMany({
        data: [...hits.keys()].map((specialization_id) => ({
          provider_profile_id: profileId,
          specialization_id,
        })),
        skipDuplicates: true,
      });
      applied.specializations = hits.size;
    }
  }

  // --- Languages -----------------------------------------------------------
  const haveLang = new Set(profile.languages.map((l) => l.name.toLowerCase()));
  for (const name of parsed.languages) {
    if (haveLang.has(name.toLowerCase())) continue;
    haveLang.add(name.toLowerCase());
    await prisma.language.create({
      data: { provider_profile_id: profileId, name: name.slice(0, 60) },
    });
    applied.languages++;
  }

  return applied;
}
