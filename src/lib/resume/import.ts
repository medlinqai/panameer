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
}: {
  profileId: string;
  source: "RESUME";
  fileName: string;
  mimeType: string;
  bytes: Buffer;
  /*
    ── ⚠⚠ WHEN THE REQUEST BEGAN (`P1-A1.4-E415` WS-2) ───────────────────────

    ⚠ THE ROUTE PASSES `Date.now()` FROM ITS FIRST LINE, so every model call
    below can ask how much of the route's 60 seconds is actually left rather
    than assuming it has them all. ⚠ DEFAULTS TO `null` — `dev:reset-resume`,
    the re-read endpoint and the measurement harnesses have no route around
    them and correctly keep the per-call ceiling as their only limit.
  */
  startedAt?: number | null;
  /**
   * ── ⚠⚠⚠ STORE AND PARSE, WRITE NOTHING (`P2-A3-E721` item 2) ──────────────
   *
   * ⚠ **SCOTT: *"Résumé upload must preview before it applies… Add a store-and-parse-only
   * mode (no writes), so the upload branch runs upload → preview → ticked diff → save like
   * the on-file branch."***
   *
   * ⚠⚠⚠ **IT DEFAULTS TO `true`, AND THAT DEFAULT IS THE PROOF THE WIZARD IS UNCHANGED.**
   * The onboarding wizard calls this route through `ResumeUploadModal` and `ResumeDropzone`
   * and passes NOTHING new, so it takes this branch exactly as before — byte for byte, same
   * writes, same `applied` counts, same `state`. **The new behaviour is reachable only by a
   * caller that asks for it in as many words.**
   *
   * ⚠⚠ **WHAT `false` SKIPS, AND WHY EACH ONE:**
   * · **`applyParsedResume`** — every profile write there is (employers, projects, education,
   *   certifications, skills, specializations, languages, the headline and the overview).
   * · **`recomputeCompleteness`** — it writes `ProviderProfile`, and nothing changed to
   *   recompute from.
   * · ⚠⚠⚠ **`recomputeProviderRollup`, AND THIS ONE IS NOT A TIDY-UP — IT IS THE WHOLE
   *   SAFETY ARGUMENT.** `E553` measured that a rollup run **deletes every `source: DERIVED`
   *   row for the profile and recreates only those a dated, skill-linked job can rebuild**,
   *   and that **297 rows across 51 profiles have no such job** — 139 of them unrecoverable.
   *   **A "preview" that fired the rollup would destroy data before showing anybody a diff**,
   *   which is the exact opposite of what this mode exists for.
   *
   * ⚠⚠ **WHAT `false` STILL DOES, DELIBERATELY:** it stores the document in the bucket and
   * writes the `ProfileImport` row with `raw_text` and `parsed`. **Those are not profile data
   * — they are the document — and the preview flow reads both back** (`resume-ai` finds the
   * newest row with `raw_text`; `resume-ai/apply` requires `parsed` non-null). ⚠⚠⚠ **A
   * store-only run that skipped them would produce a preview of nothing.**
   * ⚠ `purgeSupersededResumes` also still runs: it is document RETENTION — one live document
   * per profile — not a profile write, and leaving two live `raw_text` rows would make "the
   * newest document" ambiguous for the very preview this mode feeds.
   */
  apply?: boolean;
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
  const read = await readDocument(text, startedAt);
  const parsed = read.parsed;

  // 3. Structure → profile, non-destructively.
  /*
    ⚠⚠⚠ THE ONE BRANCH THAT DECIDES WHETHER ANYTHING IS WRITTEN (`P2-A3-E721` item 2).
    ⚠ `emptyApplied()` IS THE HONEST ANSWER IN STORE-ONLY MODE, not a placeholder: every
    counter in `applied` is incremented by a write inside `applyParsedResume`, and no write
    happened, so every one of them is genuinely zero.
    ⚠⚠ `applyParsedResume`'s SIGNATURE IS UNTOUCHED — `check:rerun` asserts it byte-exact,
    and three other callers pass it positionally.
  */
  const applied = apply
    ? await applyParsedResume(profileId, parsed, source)
    : emptyApplied();

  const gaps = [...parsed.gaps];
  /*
    ⚠⚠ THE IMPORT NOW SAYS WHEN IT CAME UP SHORT (`P1-A1.4-E399` WS-3).

    **The deepest defect was not that the import was short — it is that NOTHING
    NOTICED.** The pipeline validated that the JSON parsed; nothing compared what
    came back against what is in the document, so 1-of-5 cleared every gate and a
    half-profile presented itself as finished.

    ⚠ THESE ARE WARNINGS, NOT A FAILURE. `gaps` is what the review screen already
    renders, so the person sees "we found 14 date ranges and imported 9" beside
    their data, while the import still lands. A hard stop mid-signup loses them.
  */
  if (read.recall) gaps.push(...read.recall.warnings);
  /*
    ── ⚠⚠ THE FAILURE HAS TO SAY SOMETHING (`P1-A1.4-E415` WS-3) ─────────────

    SCOTT, 2026-09-11: *"it stopped and told me it did not work."* ⚠ HE LEARNED
    NOTHING — not whether his file was too big, not whether the reader had
    broken, not whether anything had been saved.

    ⚠⚠ AND THE GOOD MESSAGE ALREADY EXISTED WHERE HE COULD NEVER SEE IT.
    `ai-provider.ts` has said *"The reader took longer than Ns and was stopped.
    Nothing was changed"* since `E184` — but on Vercel a function that overruns
    `maxDuration` is KILLED BY THE PLATFORM, and code that has been killed
    cannot return a message. ⚠ The only way the app can speak is to finish
    FIRST, which is what `budget.ts` now guarantees.

    ⚠ SO WHEN THE CLOCK IS WHAT STOPPED THE READ, THE PERSON IS TOLD. It lands
    in `gaps`, which the review screen already renders beside their data — the
    import still completes on the heuristic parse, so this is an explanation
    standing next to a result, not an error page instead of one.

    ⚠ `NOTHING WAS CHANGED` IS NOT SAID HERE, BECAUSE IT WOULD BE FALSE: the
    heuristic parse DID land. The honest sentence is that the fast reader ran
    and the careful one did not.
  */
  if (read.path.reader === "heuristic" && read.path.reason === "deadline") {
    gaps.push(
      "Your document took longer to read than we allow for one upload, so we used our " +
        "faster reader and it will have found less. Everything below was still saved — " +
        "try uploading again, or fill in anything missing by hand.",
    );
  }
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
  /*
    ── ⚠⚠⚠ THESE TWO SENTENCES DESCRIBE WRITES, SO THEY ARE SILENT WHEN THERE WERE NONE ──

    ⚠ Both are derived from `applied`, which is all zeros in store-only mode (`E721` item 2).
    ⚠⚠⚠ **WITHOUT THIS GUARD THE SECOND ONE WOULD FIRE ON *EVERY* STORE-ONLY RUN** —
    `applied.experiences === 0 && applied.education === 0` is true by construction — and the
    provider would be told *"No work history or education could be imported from this file"*
    about a file that read perfectly and is sitting in front of them in a diff.
    ⚠⚠ **A GAP SENTENCE IS A STATEMENT ABOUT WHAT HAPPENED. In this mode nothing happened
    yet, so the honest number of such sentences is zero.**
  */
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
  if (apply && applied.experiences === 0 && applied.education === 0) {
    gaps.push(
      "No work history or education could be imported from this file — please add them manually.",
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
      gaps,
      // WS-G provenance, now written on the FIRST parse rather than only when
      // somebody pressed the re-read button. Null on a heuristic parse, which
      // is what "no model produced this" has always meant on these columns.
      /* ⚠ CAPTURED AT PARSE TIME (`P1-A1.5-E487`) — the audit is written later,
         at review-save, and a prompt edited in between would otherwise be
         recorded against a run it never touched. */
      /*
        ⚠⚠ NULL WHEN NO PROMPT RAN (`P2-J1.4-E519`). ⚠ SUPERSEDED, quoted not
        deleted (`E164`): `ai_prompt_version: PROMPT_VERSION,` — written
        unconditionally, so the Thomas fallback row (2026-09-14) claims prompt
        `2026-09-13.a` ran when the model never answered, and a health card
        grouped by prompt would count a FAILURE as a PROMPT RUN. The schema
        already says "Null for heuristic parses"; the code now agrees.
        ⚠ A PARTIAL fallback (`employersFromHeuristic`) keeps it — the reader
        is `ai` there and the prompt DID run.
      */
      ai_prompt_version: read.path.reader === "ai" ? PROMPT_VERSION : null,
      ai_model: read.usage?.model ?? null,
      ai_provider: read.usage?.provider ?? null,
      ai_input_tokens: read.usage?.inputTokens ?? null,
      ai_output_tokens: read.usage?.outputTokens ?? null,
      ai_cost_usd: read.usage?.costUsd ?? null,
      ai_latency_ms: read.usage?.ms ?? null,
      /*
        ⚠⚠ `P1-A1.4-E399` WS-1 — WHAT THE CALL DID, NOT WHAT A PERSON CHANGED.
        Until these three, a model that STOPPED and a model that SUMMARISED left
        identical evidence: a short profile and no error. `ai_finish_reason` is
        the one that tells them apart — `length` means it ran out, `stop` means it
        decided it was finished, and `E399`'s parse reported `stop`.
        ⚠ THE RAW RESPONSE IS DELIBERATELY NOT HERE. It is the CV itself and
        `raw_text` has no retention rule to inherit — see the schema comment.
      */
      ai_finish_reason: read.usage?.finishReason ?? null,
      ai_reasoning_tokens: read.usage?.reasoningTokens ?? null,
      ai_input_chars: read.usage?.inputChars ?? null,
      /*
        ⚠⚠ `P2-J1.4-E519` — MEASUREMENT BEFORE REPAIR. Until this line a failed
        AI read left NO TRACE: every `ai_*` column null, `error` null, and the
        reason only in `console.error`. So nobody could count AI failures, and
        nobody could tell whether a capacity fix (`E546`) worked.
        ⚠ SAFE ON A `PARSED` ROW: nothing renders `error` except for `FAILED`
        extractions, and the value here is a tagged diagnostic, not copy.
        ⚠ Count them with `error LIKE '[ai:%'`; `[ai:no_model]` is NOT a failure.
      */
      error: read.failure ?? null,
      /* ⚠ `P2-J1.4-E546` — the measured read. See the schema comment. */
      read_ms: read.timing?.readMs ?? null,
      read_passes: read.timing
        ? (read.timing.passes as unknown as Prisma.InputJsonValue)
        : undefined,
    },
  });

  /*
    ── ⚠⚠ THE NEW RÉSUMÉ SUPERSEDES THE OLD (`P1-A1.4-E413` WS-7) ─────────────

    SCOTT, 2026-09-10: *"keep for the life of the account OR if a new resume is
    uploaded."* ⚠ `E404`'s stop is released and this is the second half of his
    sentence; the first half — life of the account — is already enforced by
    `ProfileImport`'s cascade from `ProviderProfile` and needed no code.

    ⚠⚠ ITS POSITION IN THIS FUNCTION IS THE CORRECTNESS ARGUMENT, NOT A STYLE
    CHOICE. Everything that can fail has already happened: the text extracted,
    the model answered, the new file reached the bucket, and the new row exists
    with `status: "PARSED"`. ⚠ ONLY THEN is the previous document destroyed.
    ⚠ THE FAILURE PATHS RETURN BEFORE THIS LINE — the `ExtractError` branch
    creates a `FAILED` row and returns at the top of the function, so a résumé
    the reader cannot open purges nothing at all. ⚠ MEASURED REASON: `E410`
    WS-3 puts a `shape` failure on 2 of 5 runs over one document, and a retry
    reproduces it as often as it clears it. A delete-then-parse order would cost
    somebody their only copy on a coin flip.

    ⚠ IT NEVER THROWS. A cleanup that fails must not fail the import that
    triggered it — the person has their new résumé either way, and a stranded
    object is a smaller problem than a refused upload.
  */
  await purgeSupersededResumes(profileId, row.id);

  /*
    ⚠⚠⚠ BOTH RECOMPUTES ARE SKIPPED IN STORE-ONLY MODE (`P2-A3-E721` item 2), AND THE
    ROLLUP IS THE LOAD-BEARING ONE. ⚠ `E553`: a rollup run DELETES every `source: DERIVED`
    row for the profile and recreates only those a dated, skill-linked job can rebuild —
    **297 rows across 51 profiles have no such job, and 139 of those are unrecoverable.**
    ⚠⚠ **A PREVIEW THAT DESTROYED SKILLS BEFORE SHOWING A DIFF WOULD BE WORSE THAN THE
    APPLY-ON-UPLOAD BEHAVIOUR IT REPLACES.**
    ⚠ Completeness is skipped for the plainer reason that nothing was written to recompute
    from; running it would be a `ProviderProfile` update with no cause.
    ⚠ `purgeSupersededResumes` ABOVE IS NOT SKIPPED — see the `apply` docblock.
  */
  if (apply) {
  await recomputeCompleteness(profileId);
  /*
    The import just created every job and its skills, so the weighted rollup is
    empty until this runs (WS-2/WS-3). Without it a freshly imported provider
    matches nothing at all — the jobs are there, the derived index is not.
  */
  await recomputeProviderRollup(profileId);
  }

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
async function readDocument(
  text: string,
  /* ⚠ The containing request's clock (`P1-A1.4-E415`). Null off-route. */
  startedAt: number | null
): Promise<{
  parsed: ParsedResume;
  path: ImportPath;
  /** ⚠ `P1-A1.4-E399` WS-3 — what the inventory promised vs what arrived. */
  recall?: RecallReport;
  /**
   * ⚠⚠ WHY THE MODEL DID NOT PRODUCE THIS PARSE (`P2-J1.4-E519`). Present only
   * when the WHOLE read fell back. Written to `ProfileImport.error` and nowhere
   * a provider sees — ⚠ it is deliberately NOT on `ImportPath`, which is sent to
   * the browser, because `message` can carry a raw exception string.
   */
  failure?: string;
  /**
   * ⚠⚠ HOW LONG THE READ TOOK (`P2-J1.4-E546`) — total and per call, on
   * success AND on failure. Written to `ProfileImport.read_ms`/`read_passes`
   * and nowhere else; ⚠ NOT on `ImportPath` or `ImportResult`, both of which
   * the route sends to the browser.
   */
  timing?: { readMs: number; passes: PassTiming[] };
  usage?: {
    provider: ProviderName;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number | null;
    ms: number;
    /* ⚠ `P1-A1.4-E399` WS-1 — the three that make a short import diagnosable. */
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
      /* ⚠ `E519` — its own tag, so "not configured" can never be counted as an
         AI failure. That confusion is exactly what made the 2026-09-17 count a
         proxy: 3 of 4 fallbacks could have been either. */
      failure: "[ai:no_model] no model configured",
    };
  }

  /*
    ── ⚠⚠ ENUMERATE FIRST, THEN EXTRACT (`P1-A1.4-E399` WS-2) ──────────────────

    ⚠ SUPERSEDED, QUOTED NOT DELETED: this line read `await aiExtractResume(text)`
    — ONE call asking a cheap model to emit five employers, fourteen projects,
    five certifications, forty skills, an overview and education from 11,000
    characters in a single answer. `E399` measured what that returns: **1 of 5
    employers, 9 of 14 projects, 0 of 5 certifications** — and proved it was not
    truncation, because `EDUCATION` is the LAST section and it came through.
    **The model read everything and returned a subset.**

    ⚠ `aiExtractResume` IS KEPT, NOT DELETED. It is the before-half of the
    measurement `check:resume-recall` reports, and deleting it would remove the
    only baseline the change can be judged against.
  */
  const readStarted = Date.now();
  const outcome = await aiExtractResumeMultiPass(text, startedAt);
  /*
    ⚠⚠ HOW LONG THE READ TOOK, SAID OUT LOUD (`P1-A1.4-E415` WS-3). Until this
    line the only record of a slow read was `ai_latency_ms` on a row that a
    killed function never got to write — so the one number that would have
    explained Scott's failure existed nowhere a person could reach it.
  */
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
      /* ⚠ `E519` — `[ai:<reason>] <message>`. ⚠ `message` is kept because
         `error` still covers several machinery failures (HTTP status, empty
         body, network) that only the text tells apart.
         ⚠ SUPERSEDED, quoted not deleted (`E164`): *"a per-call TIMEOUT arrives
         as `error`, the same word as a crash"* — `E546` now reports it as
         `deadline`, so a timeout is `[ai:deadline]`. */
      /* ⚠ REDACTED AGAIN HERE, not only at the HTTP branch: a thrown exception's
         own `message` reaches this line unfiltered. */
      failure: redactSecrets(`[ai:${outcome.reason}] ${outcome.message}`).slice(0, 1000),
      timing: { readMs: Date.now() - readStarted, passes: outcome.passes },
    };
  }

  const parsed = aiToParsedResume(outcome.data);
  const signals = assessParse(text, parsed, { source: "ai" }).signals;

  /*
    ── ⚠⚠ THE FALLBACK IS PER-SECTION NOW (`P1-A1.4-E407` WS-1) ───────────────

    ⚠ SUPERSEDED, quoted not deleted — the whole-result discard this replaces:

        if (parsed.experiences.length === 0 && signals.dateRangesInText >= 3) {
          console.error(`[resume] the model returned no work history …`);
          return { parsed: heuristic, path: { reader: "heuristic",
            reason: "the model returned no work history", configProblem } };
        }

    ⚠⚠ IT THREW AWAY `parsed` ENTIRELY — NOT JUST THE EMPLOYERS. Projects,
    certifications, skills, education, headline and overview all went with it,
    and the heuristic's versions were shown instead. Everything Scott reviewed
    came from pattern-matching, INCLUDING the parts the model got right.

    ⚠ AND IT CONTRADICTED THE DESIGN IT SAT ON. `E399` split extraction into five
    INDEPENDENT passes precisely so that no one call holds the whole document —
    `ai-passes.ts` degrades per pass already (`projects: proj.ok ? proj.value :
    []`). This single guard re-coupled all five at the last step.

    ⚠ THE GUARD ITSELF IS SOUND AND IS KEPT. A document with date ranges and no
    work history IS a failed employers extraction. What changes is the BLAST
    RADIUS: the heuristic supplies `experiences` only, and every other section
    stays as the model read it.
  */
  const employersFailed =
    parsed.experiences.length === 0 && signals.dateRangesInText >= 3;
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
  // blank — the field is nullable precisely so "not asked yet" is detectable
  // (brief_P pitfall), and a user's own answer always wins.
  // WS7 — experience_level is gone; years are derived from the imported
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
        start_date: pr.startDate ? new Date(pr.startDate) : null,
        end_date: pr.endDate ? new Date(pr.endDate) : null,
        /* ⚠ `E549` — same rule as the employer write above. SUPERSEDED, quoted:
           `is_current: Boolean(pr.startDate) && !pr.endDate,` */
        is_current: Boolean(pr.startDate) && pr.isCurrent === true,
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

  /*
    ── ⚠⚠ CERTIFICATIONS, WHICH USED TO REACH HERE AND DIE (`P1-A1.4-E399` WS-4) ──

    `import.ts` contained ZERO references to `certifications` before this block:
    the schema defined them, the prompt asked for them, Zod validated them, and
    `aiToParsedResume` had nowhere to put them. Scott's five Oracle certificates
    would not have appeared even if the model had read every word of the document.

    ⚠ MIRRORS EDUCATION DELIBERATELY — case-insensitive de-dupe on the name,
    never an overwrite, and the counter goes up only when a row is actually
    written. A re-read must not duplicate what a provider already has.
    ⚠ `user_id` IS THE OWNER AND IS REQUIRED. Skipped entirely rather than guessed
    at if the profile somehow has no person behind it.
  */
  const ownerUserId = profile.person?.user_id ?? null;
  if (ownerUserId) {
    const haveCert = new Set(
      profile.certifications.map((c) => c.name.trim().toLowerCase()),
    );
    for (const c of parsed.certifications) {
      /*
        ── ⚠⚠ ONE ROW PER CREDENTIAL (`P1-A1.4-E412` WS-3a) ──────────────────

        ⚠ MEASURED FIRST, PER THE BRIEF: `certificationsPass` returns Scott's
        five Oracle credentials as five entries on 2 runs in 5 and as ONE
        comma-joined entry on 2 runs in 5, from the identical document. The
        prompt already says *"If there are five, return five"*; the model is not
        being disobedient, the CV's own line is a single comma-joined sentence.
        Full measurement and the rule's reasoning: `certification-names.ts`.

        ⚠ SO THE WRITE PATH SPLITS, and it is deliberately timid — a serial
        `…, and X` is required, so a comma inside one real name never divides
        it. ⚠ `splitCertificationName` CANNOT LOSE A CREDENTIAL: a name it
        declines to split comes back whole.

        ⚠ THE DE-DUPE MOVED INSIDE THE LOOP and now runs per PART. Re-importing
        after a run that already produced five rows must add nothing, and
        checking the joined string against a list of split names would have
        missed every one of them.
      */
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
            /* ⚠ `year` mirrors education's convention: the year a reader would
             quote, taken from the issue date when there is one. */
            year:
              issued && !Number.isNaN(issued.getTime())
                ? issued.getFullYear()
                : null,
            issued_on:
              issued && !Number.isNaN(issued.getTime()) ? issued : null,
            expires_on:
              expires && !Number.isNaN(expires.getTime()) ? expires : null,
            /* ⚠ SELF_REPORTED — it came off the provider's own CV. Panameer has not
             verified it, and `issued_from` is what keeps that distinction. */
            issued_from: "SELF_REPORTED",
          },
        });
        applied.certifications++;
      }
    }
  }

  // --- Skills: only ones that exist in the seeded catalog -------------------
  // A résumé's free-text skills are not the taxonomy. Matching against the
  // catalog keeps the marketplace searchable; anything unmatched is reported
  // as a gap rather than silently invented as a new Skill row.
  /*
    ── ⚠⚠ A CERTIFICATION IMPLIES A SKILL (`P2-J1.4-E509` WS-B) ───────────────

    > **SCOTT:** *"if you have a certification you definitely have a skill."*

    ⚠ HE IS RIGHT, AND THE EVIDENCE WAS ON HIS OWN SCREEN: three certifications
    parsed PERFECTLY and contributed NOTHING to skills. The certifications
    section is the most reliable thing on that page and it was the one signal
    the matcher never read.

    ⚠⚠ THE SAME `matchSkills`, NOT A SECOND MATCHER. One rule, one place — `E444`
    and the two-catalog bug are both what happens when there are two. The titles
    are simply appended to the terms already being matched.

    ⚠⚠ NO EXPANSION, NO INFERENCE BEYOND THE WORDS IN THE TITLE. A certificate
    implies the skill it NAMES and nothing adjacent: *Projects Certified* does
    not make somebody a Grants expert. Because this is the ordinary matcher over
    the ordinary catalog, that restraint is structural rather than a rule anyone
    has to remember.

    ⚠ MEASURED ON THE FIXTURE, and the result is honest rather than flattering:
      "Oracle Fusion Projects Certified Implementation Specialist" → `Projects` ✓
      "Oracle Fusion Apps"  → no match
      "PPM (Certified)"     → no match
    ⚠⚠ THE TWO MISSES ARE A CATALOG FINDING, NOT A MATCHER FINDING. `PPM` is a
    DOMAIN (`Project Portfolio Mgmt (PPM)`) with zero skill rows carrying the
    string, and `Oracle Fusion` is the DOMAIN `Oracle Fusion Cloud`. Both name
    domains, and the matcher only ever matches SKILLS. Nothing to fix here.
  */
  const certTerms = (parsed.certifications ?? [])
    .map((c) => String((c as { name?: string }).name ?? "").trim())
    .filter(Boolean);

  if (parsed.skills.length > 0 || certTerms.length > 0) {
    const catalog = await prisma.skill.findMany({
      /* ⚠ `E481` — never match a parsed skill onto a retired row.
         ⚠⚠ `E514` — AND NEVER OUT OF THE LEGACY CATALOG. `OFFERABLE` is
         `{ status: "ACTIVE" }` AND NOTHING ELSE: it carries no catalog scope, so
         this matched against BOTH `PANAMEER_V1` and the legacy `ERP` rows. A
         skill matched out of `ERP` is written to `ProviderSkill` below and then
         appears in NO picker, because every picker is catalog-scoped — the
         provider holds a skill they cannot see, edit or remove.
         ⚠ 148 such rows across 23 profiles already exist; they are inventoried
         in this brief and deliberately NOT repaired here. */
      where: { ...OFFERABLE, ...inActiveCatalog },
      /* ⚠⚠ `role_type_id` IS THE ROLE ANCHOR'S INPUT (`E515`). Without it the
         six ROLE-SPANNING names resolve to whichever row Postgres returned
         last, and `E509`'s role prune then deletes every skill outside that
         role. ⚠ IT IS NOT DISPLAY DATA; do not "tidy" it out because nothing
         renders it.
         ⚠ NO `pillar_id` — THE DOMAIN ANCHOR WAS BUILT, MEASURED AND REVERTED.
         It cost 21 of 126 matched terms and 32% of distinct skills to resolve a
         fact the résumé does not contain. See `matchSkills`' own note and
         `E545`. ⚠ `E543` widens this same select again, for `aliases`. */
      select: { id: true, name: true, role_type_id: true },
    });
    /*
      ⚠⚠ DEDUPED BEFORE MATCHING — A WALK CAUGHT THIS TOO. `PPM (Certified)` and
      `Oracle Fusion Apps` appear in BOTH the skills section and the
      certifications section of the fixture, so passing the two lists
      concatenated fed the matcher the same term twice and `unmatched` came back
      with duplicate rows (19 → 21). ⚠ `suggestableSkills` happens to dedupe, so
      the queue looked fine while `applied.skillsUnmatched` — the provider's own
      gap list — did not.
    */
    const seenTerm = new Set<string>();
    const terms = [...parsed.skills, ...certTerms].filter((t) => {
      const k = t.trim().toLowerCase();
      if (!k || seenTerm.has(k)) return false;
      seenTerm.add(k);
      return true;
    });
    const { matched, unmatched } = matchSkills(terms, catalog);

    /*
      ⚠ AN UNMATCHED CERTIFICATE TITLE IS NOT A SUGGESTED SKILL. "Oracle Fusion
      Projects Certified Implementation Specialist" is a credential, and offering
      it to the admin as a candidate skill row would pollute `E482`'s queue with
      sentences. ⚠⚠ SO THE GAP LIST AND THE SUGGESTIONS STAY SCOPED TO THE
      SKILLS SECTION — only the MATCHING half sees the certificates.

      ⚠⚠ CERT-**ONLY**, NOT EVERY CERT TERM — A WALK CAUGHT THIS. On the fixture
      `PPM (Certified)` appears in BOTH the skills section AND the certificates
      section, so filtering on "is a certificate title" silently removed a term
      the provider really did list as a skill: suggestions fell 18 → 17 and the
      gap list lost a row it had earned. ⚠ SUBTRACTING THE SKILLS SECTION FIRST
      is what makes this additive-only, which is the whole contract of WS-B.
    */
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
      /*
        ── ⚠⚠ SELF_ADDED, OR THE NEXT LINE DELETES THEM (`P1-A1.4-E416` WS-2) ──

        ⚠ SUPERSEDED, quoted not deleted — these rows carried NO `source`:

            data: toAdd.map((m) => ({
              provider_profile_id: profileId,
              skill_id: m.id,
            })),

        ⚠⚠ `ProviderSkill.source` DEFAULTS TO `DERIVED`, and
        `importProfileDocument` calls `recomputeProviderRollup` a few lines
        after this one — which deletes **every** `DERIVED` row and rebuilds only
        the ones a job with a `software_suite` can account for. ⚠ SO THE IMPORT
        WROTE THE PROVIDER'S SKILLS AND DESTROYED THEM IN THE SAME REQUEST.

        ⚠ MEASURED BEFORE THE FIX (`E416` WS-1): `test22@panameer.com` had FIVE
        parsed imports reporting 40, 41, 58, 77 and 90 skills and **zero**
        `provider_skills` rows. Proven live by writing one row in exactly the
        old shape and calling exactly what the import calls next — 1 row in, 0
        rows out. ⚠ Four profiles in the database were in that state.

        ⚠⚠ AND IT BLOCKED THE WALK. Step 4/8 renders chips from these rows, so a
        provider whose résumé supplied skills arrived with none and could not
        pass the at-least-one rule. SCOTT: *"it says it got skills, so i don't
        have any to add. BUT yes, it should show the ones i added."*

        ── ⚠ WHY `SELF_ADDED` AND NOT A ROLLUP CHANGE ──────────────────────────

        ⚠ SCOTT'S DECISION, 2026-09-11: write them `SELF_ADDED`, and **do not
        touch the rollup — its deletion is correct and the escape hatch depends
        on it.** `DERIVED` means "a job proves this"; nothing here is proved by
        a job, so `DERIVED` was never the honest value. A résumé is a CLAIM THE
        PROVIDER MADE, which is precisely what `SELF_ADDED` means — and it is
        the same pair the skills STEP already writes (`onboarding.ts:1759`).

        ⚠ `SELF_ADDED_WEIGHT` TRAVELS WITH IT, for the reason that constant's
        own comment gives: left at the `0` default these rows are hidden by
        `getOnboardingState`'s rollup filter (`weight > 0 || source ===
        "SELF_ADDED"`) and misreport depth. One constant, already tuned, in one
        place.

        ⚠⚠ THE ROLLUP STILL OUTRANKS THEM, AND THAT IS KEPT ON PURPOSE. Its
        delete also clears `SELF_ADDED` rows whose skill a job later derives —
        *"a skill that gains a job stops being self-added because the job is now
        the better evidence."* An imported skill that turns out to be backed by
        real work is upgraded to `DERIVED`, not duplicated.
      */
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
      /* ⚠ `E481` — same rule on the specialization vocabulary.
         ⚠⚠ `E514` — and the same catalog scope. `Specialization` is
         `@@unique([catalog_id, name])`, so the legacy catalog can hold a
         same-named twin; matching unscoped could attach the `ERP` one to a
         profile. ⚠ The brief measured `ERP` as holding ONE specialization. */
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
