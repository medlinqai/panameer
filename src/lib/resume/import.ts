import { prisma } from "@/lib/prisma";
import { extractText, ExtractError } from "@/lib/resume/extract";
import { parseResume, type ParsedResume } from "@/lib/resume/parse";
import { recomputeCompleteness } from "@/lib/onboarding";
import type { Prisma } from "@prisma/client";

/**
 * Apply a résumé / LinkedIn-PDF import to a provider profile (brief_P / E012).
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
    skillsMatched: number;
    skillsUnmatched: string[];
    languages: number;
  };
  gaps: string[];
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
  source: "RESUME" | "LINKEDIN_PDF";
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
  const applied = await applyParsed(profileId, parsed, source);

  const gaps = [...parsed.gaps];
  if (applied.skillsUnmatched.length > 0) {
    gaps.push(
      `${applied.skillsUnmatched.length} skill${
        applied.skillsUnmatched.length === 1 ? "" : "s"
      } on your document aren't in the Panameer catalog and were not added: ${applied.skillsUnmatched
        .slice(0, 8)
        .join(", ")}${applied.skillsUnmatched.length > 8 ? "…" : ""}.`
    );
  }
  if (applied.experiences === 0 && applied.education === 0) {
    gaps.push(
      "No work history or education could be imported from this file — please add them manually."
    );
  }

  const row = await prisma.profileImport.create({
    data: {
      provider_profile_id: profileId,
      source,
      status: "PARSED",
      file_name: fileName,
      mime_type: mimeType,
      size_bytes: bytes.byteLength,
      raw_text: text.slice(0, 100_000),
      parsed: parsed as unknown as Prisma.InputJsonValue,
      gaps,
    },
  });

  await recomputeCompleteness(profileId);

  return { importId: row.id, status: "PARSED", applied, gaps };
}

function emptyApplied(): ImportResult["applied"] {
  return {
    headline: false,
    overview: false,
    experiences: 0,
    education: 0,
    skillsMatched: 0,
    skillsUnmatched: [],
    languages: 0,
  };
}

async function applyParsed(
  profileId: string,
  parsed: ParsedResume,
  source: "RESUME" | "LINKEDIN_PDF"
): Promise<ImportResult["applied"]> {
  const applied = emptyApplied();

  const profile = await prisma.providerProfile.findUnique({
    where: { id: profileId },
    include: {
      workExperiences: { select: { employer: true, role_title: true } },
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
    data.profile_method = source === "LINKEDIN_PDF" ? "LINKEDIN" : "RESUME";
  }
  if (Object.keys(data).length > 0) {
    await prisma.providerProfile.update({ where: { id: profileId }, data });
  }

  // --- Work experience: append only rows we don't already hold -------------
  const haveRole = new Set(
    profile.workExperiences.map((w) =>
      `${w.employer}|${w.role_title}`.toLowerCase()
    )
  );
  for (const e of parsed.experiences) {
    const key = `${e.employer}|${e.roleTitle}`.toLowerCase();
    if (haveRole.has(key)) continue;
    haveRole.add(key);
    await prisma.workExperience.create({
      data: {
        provider_profile_id: profileId,
        employer: e.employer.slice(0, 200),
        role_title: e.roleTitle.slice(0, 200),
        description: e.description?.slice(0, 4000) ?? null,
        start_date: e.startDate ? new Date(e.startDate) : null,
        end_date: e.endDate ? new Date(e.endDate) : null,
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
    const matches = await prisma.skill.findMany({
      where: {
        OR: parsed.skills.map((name) => ({
          name: { equals: name, mode: "insensitive" as const },
        })),
      },
      select: { id: true, name: true },
    });
    const matchedNames = new Set(matches.map((m) => m.name.toLowerCase()));
    applied.skillsUnmatched = parsed.skills.filter(
      (s) => !matchedNames.has(s.toLowerCase())
    );

    const have = new Set(profile.skills.map((s) => s.skill_id));
    const toAdd = matches.filter((m) => !have.has(m.id));
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
