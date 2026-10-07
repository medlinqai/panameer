import { parseEngagementTables, engagementsToProjects, roleNameFromText } from "@/lib/resume/engagements";
import { cleanParsedResume, catalogKey, sourceOffsets } from "@/lib/resume/cleanup";
import { applyResumeFixes } from "@/lib/resume/fixes";
import { addTerms } from "@/lib/terms";
import { buildCompanyList, normCompany, notACompany } from "@/lib/resume/company-list";
import { OFFERABLE, OFFERABLE_BASE, activeCatalogId } from "@/lib/catalog";
import { jobKey } from "@/lib/resume/job-key";
import { readTimeRemaining, READ_BUDGET_MS } from "@/lib/resume/budget";
import { splitCertificationName } from "@/lib/resume/certification-names";
import { prisma } from "@/lib/prisma";
import { extractText, ExtractError } from "@/lib/resume/extract";
import { parseResume, type ParsedResume } from "@/lib/resume/parse";
import { recomputeCompleteness } from "@/lib/onboarding";
import { recomputeProviderRollup, SELF_ADDED_WEIGHT } from "@/lib/provider-rollup";
import { uploadResumeFile, deleteResumeFile } from "@/lib/storage";
import { buildVocabulary, extractJobSkills } from "./job-skills";
import { matchSkills, suggestableSkills } from "@/lib/resume/match";
import { assessParse } from "@/lib/resume/confidence";
import { aiToParsedResume, PROMPT_VERSION } from "@/lib/resume/ai-extract";
import {
  aiExtractResumeMultiPass,
  type RecallReport,
} from "@/lib/resume/ai-passes";
import { parserConfigProblem, redactSecrets, resolveProvider } from "@/lib/resume/ai-provider";
import type { ParserTier, ProviderName } from "@/lib/resume/ai-provider";
import type { PassTiming } from "@/lib/resume/ai-passes";
import type { Prisma } from "@prisma/client";

export type ImportPath = {
  reader: "ai" | "heuristic";
  tier?: ParserTier;
  provider?: ProviderName;
  model?: string;
  /** Present only on `heuristic`: why the model didn't produce this parse. */
  reason?: string;
  configProblem?: string | null;
  employersFromHeuristic?: boolean;
};

export type ImportResult = {
  importId: string;
  status: "PARSED" | "FAILED";
  applied: {
    headline: boolean;
    overview: boolean;
    experiences: number;
    projectsAttached: number;
    projectsUnattached: number;
    education: number;
    certifications: number;
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
  confidence?: { score: "high" | "low"; reasons: string[] };
  path?: ImportPath;
  error?: string;
};

export async function purgeSupersededResumes(
  profileId: string,
  keepId: string
): Promise<{ rows: number; objects: number; objectsFailed: number }> {
  const stale = await prisma.profileImport.findMany({
    where: {
      provider_profile_id: profileId,
      id: { not: keepId },
      OR: [{ raw_text: { not: null } }, { storage_path: { not: null } }],
    },
    select: { id: true, storage_path: true },
  });
  if (stale.length === 0) return { rows: 0, objects: 0, objectsFailed: 0 };

  let objects = 0;
  let objectsFailed = 0;
  for (const row of stale) {
    if (!row.storage_path) continue;
    if (await deleteResumeFile(row.storage_path)) objects += 1;
    else objectsFailed += 1;
  }

  const { count } = await prisma.profileImport.updateMany({
    where: { id: { in: stale.map((r) => r.id) } },
    data: { raw_text: null, storage_path: null },
  });

  console.info(
    `[resume] superseded ${count} earlier import${count === 1 ? "" : "s"}: ` +
      `raw_text nulled, ${objects} bucket object${objects === 1 ? "" : "s"} removed` +
      (objectsFailed ? `, ⚠ ${objectsFailed} could not be removed` : "")
  );
  return { rows: count, objects, objectsFailed };
}

export async function importProfileDocument({
  profileId,
  source,
  fileName,
  mimeType,
  bytes,
  startedAt = null,
  apply = true,
  reuse = null,
}: {
  profileId: string;
  source: "RESUME";
  fileName: string;
  mimeType: string;
  bytes: Buffer;
  // WHEN THE REQUEST BEGAN WS-2)
  startedAt?: number | null;
  /** STORE AND PARSE, WRITE NOTHING item 2) */
  apply?: boolean;
  /** "Read my résumé again": the stored text and file, no new upload. */
  reuse?: { text: string; storagePath: string | null } | null;
}): Promise<ImportResult> {
  // 1. Text out of the document.
  let text: string;
  try {
    text = reuse ? reuse.text : await extractText(bytes, mimeType, fileName);
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
  const read = await readDocument(text, startedAt);
  const parsed = read.parsed;
  // Engagement line + labelled table CVs are read deterministically: one project per engagement.
  const engagements = parseEngagementTables(text);
  if (engagements.length) {
    // The engagement clients are projects, not jobs; employers the AI read for them, or for headings, go.
    const clients = new Set(engagements.map((e) => normCompany(e.client)));
    parsed.experiences = parsed.experiences.filter((x) => x.employer && !clients.has(normCompany(x.employer)) && !notACompany(x.employer));
    parsed.projects = engagementsToProjects(engagements);
    parsed.skills = [...new Set([...parsed.skills, ...engagements.flatMap((e) => e.skills)])];
  }
  const catalog = new Set((await prisma.skill.findMany({ where: OFFERABLE, select: { name: true } })).map((x) => catalogKey(x.name)));
  cleanParsedResume(parsed, text, catalog);
  const companies = buildCompanyList(engagements, read.inventory ?? [], parsed);

  // 3. Structure → profile, non-destructively.
  // THE ONE BRANCH THAT DECIDES WHETHER ANYTHING IS WRITTEN item 2).
  const applied = apply
    ? await applyParsedResume(profileId, parsed, source)
    : emptyApplied();
  // Terms the catalog didn't match as skills: specializations link, the rest become keywords.
  if (apply && applied.skillsUnmatched.length) await addTerms(profileId, applied.skillsUnmatched);
  // The member's review fixes survive any re-read.
  if (apply) await applyResumeFixes(profileId);
  const offsets = sourceOffsets(text, [
    ...companies.map((c) => ({ kind: "company", name: c.name })),
    ...parsed.experiences.map((e) => ({ kind: "company", name: e.employer ?? "" })),
    ...parsed.projects.map((p) => ({ kind: "project", name: p.name })),
    ...[...parsed.skills, ...(parsed.droppedSkills ?? [])].map((n) => ({ kind: "skill", name: n })),
    ...parsed.certifications.map((c) => ({ kind: "cert", name: c.name })),
    ...parsed.education.map((e) => ({ kind: "edu", name: e.institution })),
  ]);

  const gaps = [...parsed.gaps];
  // THE IMPORT NOW SAYS WHEN IT CAME UP SHORT WS-3).
  // The AI's recall sentences count headings the company list replaces; for engagement CVs they are wrong.
  if (read.recall) gaps.push(...read.recall.warnings.filter((w) => !/company names in your document/.test(w) && !(engagements.length && /in your document/.test(w))));
  if (companies.length) gaps.push(`We found ${companies.length} ${companies.length === 1 ? "company" : "companies"}. Sort them below.`);
  // THE FAILURE HAS TO SAY SOMETHING WS-3)
  if (read.path.reader === "heuristic" && read.path.reason === "deadline") {
    gaps.push(
      "Your document took longer to read than we allow for one upload, so we used our " +
        "faster reader and it will have found less. Everything below was still saved — " +
        "try uploading again, or fill in anything missing by hand.",
    );
  }
  // WS-B — the unmatched count is NOT a gap any more, because we can now do
  // THESE TWO SENTENCES DESCRIBE WRITES, SO THEY ARE SILENT WHEN THERE WERE NONE
  const discarded = apply
    ? applied.skillsUnmatched.length - applied.skillSuggestions.length
    : 0;
  if (discarded > 0) {
    gaps.push(
      `${discarded} line${discarded === 1 ? "" : "s"} from your skills section didn't look like skills, so ${
        discarded === 1 ? "it was" : "they were"
      } left out.`,
    );
  }
  if (apply && applied.experiences === 0 && applied.education === 0 && parsed.projects.length === 0) {
    gaps.push(
      "No work history or education could be imported from this file — please add them manually.",
    );
  }

  // Keep the source document (private bucket) so a parse can be re-run or
  let storagePath: string | null = reuse ? reuse.storagePath : null;
  if (!reuse) try {
    storagePath = await uploadResumeFile(profileId, {
      name: fileName,
      type: mimeType,
      bytes: bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
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
      company_list: companies as unknown as Prisma.InputJsonValue,
      source_offsets: offsets as unknown as Prisma.InputJsonValue,
      gaps,
      // WS-G provenance, now written on the FIRST parse rather than only when
      ai_prompt_version: read.path.reader === "ai" ? PROMPT_VERSION : null,
      ai_model: read.usage?.model ?? null,
      ai_provider: read.usage?.provider ?? null,
      ai_input_tokens: read.usage?.inputTokens ?? null,
      ai_output_tokens: read.usage?.outputTokens ?? null,
      ai_cost_usd: read.usage?.costUsd ?? null,
      ai_latency_ms: read.usage?.ms ?? null,
      // WS-1 — WHAT THE CALL DID, NOT WHAT A PERSON CHANGED.
      ai_finish_reason: read.usage?.finishReason ?? null,
      ai_reasoning_tokens: read.usage?.reasoningTokens ?? null,
      ai_input_chars: read.usage?.inputChars ?? null,
      // — MEASUREMENT BEFORE REPAIR. Until this line a failed
      error: read.failure ?? null,
      /* `P2-J1.4-E546` — the measured read. See the schema comment. */
      read_ms: read.timing?.readMs ?? null,
      read_passes: read.timing
        ? (read.timing.passes as unknown as Prisma.InputJsonValue)
        : undefined,
    },
  });

  // THE NEW RÉSUMÉ SUPERSEDES THE OLD WS-7)
  await purgeSupersededResumes(profileId, row.id);

  // BOTH RECOMPUTES ARE SKIPPED IN STORE-ONLY MODE item 2), AND THE
  if (apply) {
  await recomputeCompleteness(profileId);
  // The import just created every job and its skills, so the weighted rollup is
  await recomputeProviderRollup(profileId);
  }

  // WS0/WS4 — score the parse and LOG WHICH READER FIRED.
  const confidence = assessParse(text, parsed, {
    source: read.path.reader === "ai" ? "ai" : "heuristic",
  });
  console.info(
    `[resume] path=${describePath(read.path)} confidence=${confidence.score} ` +
      `employers=${parsed.experiences.length} dated=${confidence.signals.datedEntries} ` +
      `ranges=${confidence.signals.dateRangesInText} unplaced=${confidence.signals.unplacedRatio} ` +
      `import=${row.id}` +
      (confidence.score === "low"
        ? ` reasons="${confidence.reasons.join(" | ")}"`
        : ""),
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

/** Read the document with the model, falling back to the rules (E184). */
export async function readDocument(
  text: string,
  /* The containing request's clock (`P1-A1.4-E415`). Null off-route. */
  startedAt: number | null
): Promise<{
  parsed: ParsedResume;
  path: ImportPath;
  /** `P1-A1.4-E399` WS-3 — what the inventory promised vs what arrived. */
  recall?: RecallReport;
  inventory?: { heading: string; dateRange?: string | null; kind?: string }[];
  /** WHY THE MODEL DID NOT PRODUCE THIS PARSE . Present only */
  failure?: string;
  /** HOW LONG THE READ TOOK — total and per call, on */
  timing?: { readMs: number; passes: PassTiming[] };
  usage?: {
    provider: ProviderName;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number | null;
    ms: number;
    /* `P1-A1.4-E399` WS-1 — the three that make a short import diagnosable. */
    finishReason: string | null;
    reasoningTokens: number;
    inputChars: number;
  };
}> {
  const heuristic = parseResume(text);
  const configProblem = parserConfigProblem();

  if (!resolveProvider()) {
    return {
      parsed: heuristic,
      path: {
        reader: "heuristic",
        reason: "no model configured",
        configProblem,
      },
      // — its own tag, so "not configured" can never be counted as an
      failure: "[ai:no_model] no model configured",
    };
  }

  // ENUMERATE FIRST, THEN EXTRACT WS-2)
  const readStarted = Date.now();
  const outcome = await aiExtractResumeMultiPass(text, startedAt);
  // HOW LONG THE READ TOOK, SAID OUT LOUD WS-3). Until this
  console.info(
    `[resume] read=${Date.now() - readStarted}ms budget=${
      startedAt === null ? "none" : `${Math.max(0, readTimeRemaining(startedAt))}ms left of ${READ_BUDGET_MS}ms`
    } ok=${outcome.ok}`
  );
  if (!outcome.ok) {
    console.error(
      `[resume] the model call failed (${outcome.reason}): ${outcome.message}`,
    );
    return {
      parsed: heuristic,
      path: { reader: "heuristic", reason: outcome.reason, configProblem },
      // — `[ai:<reason>] <message>`. `message` is kept because
      // REDACTED AGAIN HERE, not only at the HTTP branch: a thrown exception's
      failure: redactSecrets(`[ai:${outcome.reason}] ${outcome.message}`).slice(0, 1000),
      timing: { readMs: Date.now() - readStarted, passes: outcome.passes },
    };
  }

  const parsed = aiToParsedResume(outcome.data);
  const signals = assessParse(text, parsed, { source: "ai" }).signals;

  // THE FALLBACK IS PER-SECTION NOW WS-1)
  // A consultant CV can list only dated client projects; that's not a failed employer read.
  const datedProjects = parsed.projects.filter((p) => p.startDate).length;
  const employersFailed =
    parsed.experiences.length === 0 && signals.dateRangesInText >= 3 && datedProjects < signals.dateRangesInText / 2;
  if (employersFailed) {
    console.error(
      `[resume] the model returned no work history from a document with ${signals.dateRangesInText} date ranges — falling back to the heuristic for EMPLOYERS ONLY; the other sections keep the model's answer`,
    );
  }

  const merged = employersFailed
    ? { ...parsed, experiences: heuristic.experiences }
    : parsed;

  return {
    parsed: merged,
    path: {
      reader: "ai",
      tier: outcome.tier,
      provider: outcome.provider,
      model: outcome.model,
      configProblem,
      employersFromHeuristic: employersFailed,
    },
    recall: outcome.recall,
    inventory: outcome.inventory,
    timing: {
      readMs: Date.now() - readStarted,
      passes: outcome.passes.map((p) => ({
        name: p.name,
        ok: p.ok,
        ms: p.ms,
        ...((p as { reason?: string }).reason ? { reason: (p as { reason?: string }).reason } : {}),
      })),
    },
    usage: {
      provider: outcome.provider,
      model: outcome.model,
      inputTokens: outcome.usage.inputTokens,
      outputTokens: outcome.usage.outputTokens,
      costUsd: outcome.usage.costUsd,
      ms: outcome.ms,
      finishReason: outcome.usage.finishReason,
      reasoningTokens: outcome.usage.reasoningTokens,
      inputChars: outcome.inputChars,
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
    certifications: 0,
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

export async function applyParsedResume(
  profileId: string,
  parsed: ParsedResume,
  source: "RESUME",
): Promise<ImportResult["applied"]> {
  const applied = emptyApplied();

  const profile = await prisma.providerProfile.findUnique({
    where: { id: profileId },
    include: {
      employers: { select: { name: true, role_title: true } },
      education: { select: { institution: true } },
      languages: { select: { name: true } },
      skills: { select: { skill_id: true } },
      certifications: { select: { name: true } },
      person: { select: { id: true, user_id: true, title: true } },
    },
  });
  if (!profile) return applied;

  // --- Headline + bio: fill only when empty (never overwrite typed text) ---
  const data: Prisma.ProviderProfileUpdateInput = {};
  const personData: Prisma.PersonUpdateInput = {};
  if (!(profile.person.title ?? "").trim() && parsed.headline) {
    personData.title = parsed.headline.slice(0, 200);
    applied.headline = true;
  }
  if (!profile.overview?.trim() && parsed.overview) {
    data.overview = parsed.overview.slice(0, 4500);
    applied.overview = true;
  }
  if (!profile.profile_method) {
    // source. The enum keeps LINKEDIN for rows imported before this.
    data.profile_method = "RESUME";
  }
  // Experience level inferred from the career span (brief_Q). Only ever fills a
  if (Object.keys(data).length > 0) {
    await prisma.providerProfile.update({ where: { id: profileId }, data });
  }
  /* The title write, owner-scoped through the profile's own person. */
  if (Object.keys(personData).length > 0) {
    await prisma.person.update({ where: { id: profile.person.id }, data: personData });
  }

  // --- Work history: append EMPLOYERS we don't already hold -----------------
  // populates it directly instead of the retired flat WorkExperience table.
  // The "Your Employers" step then shows these as cards to confirm and enrich.
  const haveRole = new Set(
    profile.employers.map((w) => jobKey(w.name, w.role_title)),
  );

  const catalogId = await activeCatalogId();
  const inActiveCatalog = catalogId ? { catalog_id: catalogId } : {};

  const vocabRows = await prisma.skill.findMany({
    where: {
      is_custom: false,
      ...OFFERABLE,
      ...inActiveCatalog,
      roleType: {
        name: { in: ["Application-Specific", "Technology-Specific"] },
      },
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
    (await prisma.roleType.findMany({ select: { id: true, name: true } })).map(
      (r) => [r.name, r.id],
    ),
  );

  const employerIdByName = new Map<string, string>();

  for (const [i, e] of parsed.experiences.entries()) {
    const key = jobKey(e.employer, e.roleTitle);
    if (haveRole.has(key)) continue;
    haveRole.add(key);

    const block = [e.roleTitle, e.description].filter(Boolean).join("\n");
    const found = extractJobSkills(block, vocab);

    const employer = await prisma.employer.create({
      data: {
        provider_profile_id: profileId,
        name: e.employer ? e.employer.slice(0, 200) : null,
        role_title: e.roleTitle.slice(0, 200),
        description: e.description?.slice(0, 4000) ?? null,
        start_date: e.startDate ? new Date(e.startDate) : null,
        end_date: e.endDate ? new Date(e.endDate) : null,
        is_current: Boolean(e.startDate) && e.isCurrent === true,
        sort_order: i * 10,
        software_suite: found.suite,
        job_role_type_id: found.role
          ? (roleIdByName.get(found.role) ?? null)
          : null,
        skills: {
          create: found.skillIds.map((skill_id) => ({ skill_id })),
        },
      },
      select: { id: true },
    });
    if (e.employer) employerIdByName.set(e.employer, employer.id);
    applied.experiences++;
    applied.jobSkills += found.skillIds.length;
    if (found.needsSuite) applied.needsSuite++;
  }

  for (const [i, pr] of parsed.projects.entries()) {
    const employerId = pr.employerName
      ? (employerIdByName.get(pr.employerName) ?? null)
      : null;
    const description =
      [
        pr.description,
        pr.software.length ? `Software: ${pr.software.join(", ")}` : null,
      ]
        .filter(Boolean)
        .join("\n") || null;
    await prisma.project.create({
      data: {
        provider_profile_id: profileId,
        employer_id: employerId,
        name: (pr.name || "Untitled project").slice(0, 200),
        description: description?.slice(0, 4000) ?? null,
        client_name: (pr.client ?? "").slice(0, 200),
        role_type_id: pr.roleText ? (roleIdByName.get(roleNameFromText(pr.roleText) ?? "") ?? null) : null,
        start_date: pr.startDate ? new Date(pr.startDate) : null,
        end_date: pr.endDate ? new Date(pr.endDate) : null,
        is_current: Boolean(pr.startDate) && pr.isCurrent === true,
        sort_order: i * 10,
      },
    });
    if (employerId) applied.projectsAttached++;
    else applied.projectsUnattached++;
  }

  // THE ACCEPTANCE TEST, ASSERTED WHERE IT CAN ACTUALLY FAIL. 's test is
  if (
    applied.projectsAttached + applied.projectsUnattached !==
    parsed.projects.length
  ) {
    throw new Error(
      `resume import lost projects: parsed ${parsed.projects.length}, ` +
        `attached ${applied.projectsAttached}, unattached ${applied.projectsUnattached}`,
    );
  }

  // --- Education -----------------------------------------------------------
  const haveSchool = new Set(
    profile.education.map((x) => x.institution.toLowerCase()),
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

  // CERTIFICATIONS, WHICH USED TO REACH HERE AND DIE WS-4)
  const ownerUserId = profile.person?.user_id ?? null;
  if (ownerUserId) {
    const haveCert = new Set(
      profile.certifications.map((c) => c.name.trim().toLowerCase()),
    );
    for (const c of parsed.certifications) {
      // ONE ROW PER CREDENTIAL WS-3a)
      for (const name of splitCertificationName(c.name ?? "")) {
        if (!name) continue;
        if (haveCert.has(name.toLowerCase())) continue;
        haveCert.add(name.toLowerCase());
        const issued = c.issuedOn ? new Date(c.issuedOn) : null;
        const expires = c.expiresOn ? new Date(c.expiresOn) : null;
        await prisma.certification.create({
          data: {
            user_id: ownerUserId,
            provider_profile_id: profileId,
            name: name.slice(0, 200),
            issuer: c.issuer?.slice(0, 200) ?? null,
            // quote, taken from the issue date when there is one.
            year:
              issued && !Number.isNaN(issued.getTime())
                ? issued.getFullYear()
                : null,
            issued_on:
              issued && !Number.isNaN(issued.getTime()) ? issued : null,
            expires_on:
              expires && !Number.isNaN(expires.getTime()) ? expires : null,
            // SELF_REPORTED — it came off the provider's own CV. Panameer has not
            issued_from: "SELF_REPORTED",
          },
        });
        applied.certifications++;
      }
    }
  }

  // Skills: only ones that exist in the seeded catalog -------------------
  // A CERTIFICATION IMPLIES A SKILL WS-B)
  const certTerms = (parsed.certifications ?? [])
    .map((c) => String((c as { name?: string }).name ?? "").trim())
    .filter(Boolean);

  if (parsed.skills.length > 0 || certTerms.length > 0) {
    const catalog = await prisma.skill.findMany({
      // — never match a parsed skill onto a retired row.
      where: { ...OFFERABLE, ...inActiveCatalog },
      // six ROLE-SPANNING names resolve to whichever row Postgres returned
      select: { id: true, name: true, role_type_id: true },
    });
    // DEDUPED BEFORE MATCHING — A WALK CAUGHT THIS TOO. `PPM (Certified)` and
    const seenTerm = new Set<string>();
    const terms = [...parsed.skills, ...certTerms].filter((t) => {
      const k = t.trim().toLowerCase();
      if (!k || seenTerm.has(k)) return false;
      seenTerm.add(k);
      return true;
    });
    const { matched, unmatched } = matchSkills(terms, catalog);

    // AN UNMATCHED CERTIFICATE TITLE IS NOT A SUGGESTED SKILL. "Oracle Fusion
    const norm = (x: string) => x.trim().toLowerCase();
    const fromSkills = new Set(parsed.skills.map(norm));
    const certOnly = new Set(certTerms.map(norm).filter((t) => !fromSkills.has(t)));
    const skillUnmatched = unmatched.filter((u) => !certOnly.has(norm(u)));

    applied.skillsUnmatched = skillUnmatched;
    applied.skillSuggestions = suggestableSkills(skillUnmatched);
    applied.skillsMatchedNames = matched.map((m) => m.name);

    const have = new Set(profile.skills.map((s) => s.skill_id));
    const toAdd = matched.filter((m) => !have.has(m.id));
    if (toAdd.length > 0) {
      // SELF_ADDED, OR THE NEXT LINE DELETES THEM WS-2)
      await prisma.providerSkill.createMany({
        data: toAdd.map((m) => ({
          provider_profile_id: profileId,
          skill_id: m.id,
          source: "SELF_ADDED" as const,
          weight: SELF_ADDED_WEIGHT,
        })),
        skipDuplicates: true,
      });
      applied.skillsMatched = toAdd.length;
    }
  }

  // Specializations (WS4) ---------------------------------------------
  if (parsed.skills.length > 0) {
    const vocabulary = await prisma.specialization.findMany({
      // — same rule on the specialization vocabulary.
      where: { ...OFFERABLE_BASE, ...inActiveCatalog },
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
      ).map((r) => r.specialization_id),
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
