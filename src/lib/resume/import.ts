import { prisma } from "@/lib/prisma";
import { extractText, ExtractError } from "@/lib/resume/extract";
import { parseResume, type ParsedResume } from "@/lib/resume/parse";
import { recomputeCompleteness } from "@/lib/onboarding";
import { recomputeProviderRollup } from "@/lib/provider-rollup";
import { uploadResumeFile } from "@/lib/storage";
import { buildVocabulary, extractJobSkills } from "./job-skills";
import { matchSkills, suggestableSkills } from "@/lib/resume/match";
import { assessParse } from "@/lib/resume/confidence";
import { aiExtractResume, aiToParsedResume } from "@/lib/resume/ai-extract";
import { parserConfigProblem, resolveProvider } from "@/lib/resume/ai-provider";
import type { ParserTier, ProviderName } from "@/lib/resume/ai-provider";
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

/**
 * WHICH READER ACTUALLY RAN (E184).
 *
 * Returned to the client and written to the server log on every import. A
 * heuristic fallback carries the REASON it fell back: "the AI is off today" and
 * "the AI errored on this document" produce identical output and want completely
 * different responses, and telling them apart used to mean reading the server's
 * stdout — if anyone thought to look, which for a whole walk nobody did.
 */
export type ImportPath = {
  reader: "ai" | "heuristic";
  tier?: ParserTier;
  provider?: ProviderName;
  model?: string;
  /** Present only on `heuristic`: why the model didn't produce this parse. */
  reason?: string;
  /** A half-set or absent RESUME_PARSER_* config, in one sentence. */
  configProblem?: string | null;
};

export type ImportResult = {
  importId: string;
  status: "PARSED" | "FAILED";
  applied: {
    headline: boolean;
    overview: boolean;
    experiences: number;
    /* `E294` — projects written with an `employer_id` resolved. */
    projectsAttached: number;
    /* `E294` — projects written with `employer_id` null, awaiting placement. */
    projectsUnattached: number;
    education: number;
    /** WS4 — matched against the seeded vocabulary, not asked of the model. */
    specializations: number;
    skillsMatched: number;
    skillsMatchedNames: string[];
    skillsUnmatched: string[];
    /** WS-B — the unmatched terms worth offering as confirm-to-add. */
    skillSuggestions: string[];
    languages: number;
    /** WS-3 — catalog skills attached to individual jobs, not to the profile. */
    jobSkills: number;
    /** WS-3 — jobs that named shared modules with no suite anchor (WS-4 asks). */
    needsSuite: number;
  };
  gaps: string[];
  /**
   * WS0/WS3 — how much to trust this parse, and why. Drives the review's
   * "we had trouble reading this" panel. Absent on a FAILED import.
   */
  confidence?: { score: "high" | "low"; reasons: string[] };
  /** E184 — the reader that produced this parse, named. */
  path?: ImportPath;
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

  // 2. Text → structure. The model reads it when one is configured (E184).
  const read = await readDocument(text);
  const parsed = read.parsed;

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
      // WS-G provenance, now written on the FIRST parse rather than only when
      // somebody pressed the re-read button. Null on a heuristic parse, which
      // is what "no model produced this" has always meant on these columns.
      ai_model: read.usage?.model ?? null,
      ai_provider: read.usage?.provider ?? null,
      ai_input_tokens: read.usage?.inputTokens ?? null,
      ai_output_tokens: read.usage?.outputTokens ?? null,
      ai_cost_usd: read.usage?.costUsd ?? null,
      ai_latency_ms: read.usage?.ms ?? null,
    },
  });

  await recomputeCompleteness(profileId);
  /*
    The import just created every job and its skills, so the weighted rollup is
    empty until this runs (WS-2/WS-3). Without it a freshly imported provider
    matches nothing at all — the jobs are there, the derived index is not.
  */
  await recomputeProviderRollup(profileId);

  /*
    WS0/WS4 — score the parse and LOG WHICH READER FIRED.

    E184: the log line used to be hardcoded to `path=heuristic`, which was
    accurate and, precisely because it never varied, unreadable as a signal. It
    now names the reader, the tier and the model, so grepping the dev server for
    `[resume] path=` answers "did the AI run?" in one line.
  */
  const confidence = assessParse(text, parsed, {
    source: read.path.reader === "ai" ? "ai" : "heuristic",
  });
  console.info(
    `[resume] path=${describePath(read.path)} confidence=${confidence.score} ` +
      `employers=${parsed.experiences.length} dated=${confidence.signals.datedEntries} ` +
      `ranges=${confidence.signals.dateRangesInText} unplaced=${confidence.signals.unplacedRatio} ` +
      `import=${row.id}` +
      (confidence.score === "low" ? ` reasons="${confidence.reasons.join(" | ")}"` : "")
  );

  return {
    importId: row.id,
    status: "PARSED",
    applied,
    gaps,
    confidence,
    path: read.path,
  };
}

/** The path as one grep-able token for the server log. */
function describePath(p: ImportPath): string {
  if (p.reader === "ai") return `${p.tier}:${p.model}`;
  return `heuristic(${p.reason ?? "unknown"})`;
}

/**
 * Read the document with the model, falling back to the rules (E184).
 *
 * ORDER OF PREFERENCE, and the reasoning behind it. The heuristic runs first
 * regardless — it is free, synchronous, and it is the thing the fallback needs
 * to already have in hand. The model then gets its turn, and its result wins
 * unless it is worse by a test we can actually apply.
 *
 * TWO WAYS THE MODEL LOSES:
 *   1. the call failed (no key, network, malformed output) — `ok:false`;
 *   2. it came back with NO work history from a document the rules can see date
 *      ranges all over. That is the E121-class failure the `/resume-ai` route
 *      already guards, reused here rather than reinvented: an empty answer from
 *      a document full of dates is not a person with no career.
 *
 * A model result that is merely THINNER than the heuristic's is still preferred.
 * The heuristic's extra entries are as often mis-split fragments as real jobs —
 * "1 role / Employer not detected" is exactly that failure — so entry count is
 * not a quality measure and is deliberately not used as one.
 */
async function readDocument(text: string): Promise<{
  parsed: ParsedResume;
  path: ImportPath;
  usage?: {
    provider: ProviderName;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number | null;
    ms: number;
  };
}> {
  const heuristic = parseResume(text);
  const configProblem = parserConfigProblem();

  if (!resolveProvider()) {
    return {
      parsed: heuristic,
      path: { reader: "heuristic", reason: "no model configured", configProblem },
    };
  }

  const outcome = await aiExtractResume(text);
  if (!outcome.ok) {
    console.error(`[resume] the model call failed (${outcome.reason}): ${outcome.message}`);
    return {
      parsed: heuristic,
      path: { reader: "heuristic", reason: outcome.reason, configProblem },
    };
  }

  const parsed = aiToParsedResume(outcome.data);
  const signals = assessParse(text, parsed, { source: "ai" }).signals;
  if (parsed.experiences.length === 0 && signals.dateRangesInText >= 3) {
    console.error(
      `[resume] the model returned no work history from a document with ${signals.dateRangesInText} date ranges — keeping the heuristic parse`
    );
    return {
      parsed: heuristic,
      path: { reader: "heuristic", reason: "the model returned no work history", configProblem },
    };
  }

  return {
    parsed,
    path: {
      reader: "ai",
      tier: outcome.tier,
      provider: outcome.provider,
      model: outcome.model,
      configProblem,
    },
    usage: {
      provider: outcome.provider,
      model: outcome.model,
      inputTokens: outcome.usage.inputTokens,
      outputTokens: outcome.usage.outputTokens,
      costUsd: outcome.usage.costUsd,
      ms: outcome.ms,
    },
  };
}

function emptyApplied(): ImportResult["applied"] {
  return {
    headline: false,
    overview: false,
    experiences: 0,
    projectsAttached: 0,
    projectsUnattached: 0,
    education: 0,
    specializations: 0,
    skillsMatched: 0,
    skillsMatchedNames: [],
    skillsUnmatched: [],
    skillSuggestions: [],
    languages: 0,
    jobSkills: 0,
    needsSuite: 0,
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

  /*
    PER-JOB DERIVATION (WS-3), computed HERE rather than asked of the model.

    The prompt is documented as fragile — change only with a before/after
    harness run — and it did not need changing: the model already returns each
    employer with its title and description, and deciding which catalog rows
    that text names is a lookup against a controlled vocabulary, not a judgement
    call. Doing it deterministically means the same block always yields the same
    suite, the guards in job-skills.ts are testable without a live model, and
    the LOCKED prompt is untouched, so the parser harness measures exactly what
    it measured before.

    The vocabulary is loaded once for the whole résumé rather than per job — 566
    vendor rows, one query.
  */
  const vocabRows = await prisma.skill.findMany({
    where: {
      is_custom: false,
      roleType: { name: { in: ["Application-Specific", "Technology-Specific"] } },
    },
    select: {
      id: true,
      name: true,
      aliases: true,
      roleType: { select: { name: true } },
      pillar: { select: { name: true } },
    },
  });
  const vocab = buildVocabulary(vocabRows);
  const roleIdByName = new Map(
    (await prisma.roleType.findMany({ select: { id: true, name: true } })).map((r) => [
      r.name,
      r.id,
    ])
  );

  /* `E294` — name -> id for the employers created just below, so a project
     naming one can be hung off it. Keyed on the SAME string the mapper matched
     against, so the two agree by construction, not by a second normalisation. */
  const employerIdByName = new Map<string, string>();

  for (const [i, e] of parsed.experiences.entries()) {
    const key = `${e.employer}|${e.roleTitle}`.toLowerCase();
    if (haveRole.has(key)) continue;
    haveRole.add(key);

    /*
      The block is the title plus the description. The employer NAME is
      deliberately excluded: "Oracle Corporation" as an employer says who paid,
      not which product the work was on, and including it would anchor every
      job at Oracle to Fusion regardless of what it actually says.
    */
    const block = [e.roleTitle, e.description].filter(Boolean).join("\n");
    const found = extractJobSkills(block, vocab);

    const employer = await prisma.employer.create({
      data: {
        provider_profile_id: profileId,
        /* ⚠ NULL SURVIVES THE WRITE (`P1-J1.4-E373`). Coercing to "" here would
           re-create the defect the nullable column exists to fix. */
        name: e.employer ? e.employer.slice(0, 200) : null,
        role_title: e.roleTitle.slice(0, 200),
        description: e.description?.slice(0, 4000) ?? null,
        start_date: e.startDate ? new Date(e.startDate) : null,
        end_date: e.endDate ? new Date(e.endDate) : null,
        is_current: Boolean(e.startDate) && !e.endDate,
        sort_order: i * 10,
        software_suite: found.suite,
        job_role_type_id: found.role ? roleIdByName.get(found.role) ?? null : null,
        skills: {
          create: found.skillIds.map((skill_id) => ({ skill_id })),
        },
      },
      select: { id: true },
    });
    /* ⚠ AN UNNAMED EMPLOYER IS NOT KEYED (`P1-J1.4-E373`). The map exists so a
       project can find its employer BY NAME; a null has no name to find, and
       keying it under "" would attach every unnamed line's projects to whichever
       one was written last. */
    if (e.employer) employerIdByName.set(e.employer, employer.id);
    applied.experiences++;
    applied.jobSkills += found.skillIds.length;
    if (found.needsSuite) applied.needsSuite++;
  }

  /*
    ── ⚠⚠ PROJECTS BECOME `Project` ROWS (`P1-J1.4-E294`, 2026-09-01) ──────────
  
    ⚠ THIS IS THE PATH THAT HAS NEVER EXISTED. `git log --all -S employer_id --
    src/lib/resume` returns NO COMMITS ON ANY BRANCH: no parse has ever written a
    Project row, which is the only reason every per-employer `Projects` link on
    the profile has been inert. The affordance was built (`E075`); the data
    behind it never arrived.
  
    ⚠ TWO OUTCOMES, NEVER A THIRD. `employerName` non-null and known -> attached.
    Anything else -> written with `employer_id` null and surfaced for the user to
    place in one click (`E296`). NOTHING IS SKIPPED — there is deliberately no
    `continue` in this loop.
  
    ⚠ `client_name` IS NON-NULLABLE ON `Project`, so an unnamed client stores ""
    rather than refusing the row. A required column must never be the reason a
    transcribed project is lost — that is the whole rule this brief serves.
  
    ⚠ SOFTWARE IS APPENDED TO THE DESCRIPTION, not dropped. `Project` has no
    software column and this brief forbids a migration, so the text rides along
    where the user can still read it — the same shape the old mapper used when it
    flattened projects into experiences.
  */
  for (const [i, pr] of parsed.projects.entries()) {
    const employerId = pr.employerName
      ? employerIdByName.get(pr.employerName) ?? null
      : null;
    const description =
      [pr.description, pr.software.length ? `Software: ${pr.software.join(", ")}` : null]
        .filter(Boolean)
        .join("\n") || null;
    await prisma.project.create({
      data: {
        provider_profile_id: profileId,
        employer_id: employerId,
        name: (pr.name || "Untitled project").slice(0, 200),
        description: description?.slice(0, 4000) ?? null,
        client_name: (pr.client ?? "").slice(0, 200),
        start_date: pr.startDate ? new Date(pr.startDate) : null,
        end_date: pr.endDate ? new Date(pr.endDate) : null,
        is_current: Boolean(pr.startDate) && !pr.endDate,
        sort_order: i * 10,
      },
    });
    if (employerId) applied.projectsAttached++;
    else applied.projectsUnattached++;
  }
  
  /*
    ⚠ THE ACCEPTANCE TEST, ASSERTED WHERE IT CAN ACTUALLY FAIL. `E294`'s test is
    extracted === attached + unattached. The mapper already guards its own half;
    this guards the WRITE half, so a future `continue`, filter or early return in
    the loop above surfaces as a loud failure instead of quietly missing rows.
  */
  if (
    applied.projectsAttached + applied.projectsUnattached !==
    parsed.projects.length
  ) {
    throw new Error(
      `resume import lost projects: parsed ${parsed.projects.length}, ` +
        `attached ${applied.projectsAttached}, unattached ${applied.projectsUnattached}`
    );
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
