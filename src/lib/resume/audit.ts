import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { ParsedResume } from "./parse";

/**
 * THE CORRECTION SIGNAL (brief_j14 WS-G).
 *
 * Every review-save records what the model produced next to what the person
 * actually kept. That comparison is the only honest answer to "is the cheap
 * model good enough" — a question this codebase currently answers by opinion.
 *
 * CAPTURE ONLY. No fine-tuning, no few-shot injection, no online learning; the
 * brief is explicit that those are later, and a store that quietly started
 * feeding itself back into the prompt would be a much bigger decision than a
 * logging change.
 *
 * NEVER THROWS. A failure to write telemetry must not fail somebody's profile
 * save — the record is worth having, not worth losing work over.
 */

export type FieldTally = { kept: number; changed: number };

const norm = (v: unknown) =>
  typeof v === "string" ? v.toLowerCase().replace(/\s+/g, " ").trim() : v ?? null;

/**
 * Compare two lists by a key field: how many entries survived unchanged?
 *
 * Deliberately generous about ORDER and strict about VALUE — a person
 * re-ordering their employers hasn't corrected the parser, but a person
 * retyping an employer's name has.
 */
function tally<T extends Record<string, unknown>>(
  parsed: T[],
  final: T[],
  keys: (keyof T)[]
): FieldTally {
  let kept = 0;
  let changed = 0;
  const pool = [...final];
  for (const p of parsed) {
    const idx = pool.findIndex((f) => keys.every((k) => norm(f[k]) === norm(p[k])));
    if (idx >= 0) {
      kept += 1;
      pool.splice(idx, 1);
    } else {
      changed += 1;
    }
  }
  // Entries the person ADDED are corrections too — the parser missed them.
  changed += pool.length;
  return { kept, changed };
}

export type ParseAuditInput = {
  providerProfileId: string;
  resumeText: string;
  model: string;
  provider: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  costUsd?: number | null;
  latencyMs?: number | null;
  parsed: ParsedResume;
  final: ParsedResume;
  /** ⚠ Read off `ProfileImport.ai_prompt_version`, captured at PARSE time. */
  promptVersion?: string | null;
};

/** Field-level comparison of a parse against what was saved. */
export function diffParse(parsed: ParsedResume, final: ParsedResume) {
  const changed: Record<string, FieldTally> = {
    employers: tally(
      parsed.experiences as unknown as Record<string, unknown>[],
      final.experiences as unknown as Record<string, unknown>[],
      ["employer", "roleTitle"]
    ),
    education: tally(
      parsed.education as unknown as Record<string, unknown>[],
      final.education as unknown as Record<string, unknown>[],
      ["institution", "degree"]
    ),
    skills: tally(
      parsed.skills.map((s) => ({ name: s })),
      final.skills.map((s) => ({ name: s })),
      ["name"]
    ),
    headline: {
      kept: norm(parsed.headline) === norm(final.headline) ? 1 : 0,
      changed: norm(parsed.headline) === norm(final.headline) ? 0 : 1,
    },
  };

  const kept = Object.values(changed).reduce((n, t) => n + t.kept, 0);
  const total = Object.values(changed).reduce((n, t) => n + t.kept + t.changed, 0);
  return { changed, accuracy: total > 0 ? kept / total : null };
}

/**
 * ── ⚠⚠ WHAT THE RUN BUILT, COUNTED FROM THE MODEL'S OWN OUTPUT (`E487`) ─────
 *
 * ⚠ NOT `kept + changed`. That looks like the same number and is not: the diff
 * compares FOUR field types, and it does not exist at all until a human
 * reviews. A run nobody has looked at still built things.
 * ⚠ ONE TAXONOMY, READ TWICE — these are the same object types the completeness
 * checklist reads on the provider's side. Two lists that drift is how "27
 * objects" and "7 of 10" start disagreeing on the same screen.
 */
export function countBuilt(parsed: ParsedResume): Record<string, number> {
  const n = (a: unknown[] | null | undefined) => (Array.isArray(a) ? a.length : 0);
  const built: Record<string, number> = {
    employers: n(parsed.experiences),
    projects: n(
      (parsed.experiences ?? []).flatMap(
        (e) => (e as { projects?: unknown[] }).projects ?? []
      )
    ),
    education: n(parsed.education),
    certifications: n(parsed.certifications),
    skills: n(parsed.skills),
    languages: n(parsed.languages),
    /* ⚠ SCALARS COUNT AS ONE OR ZERO — "did the model produce a headline" is a
       real object in Scott's count and omitting it would undercount every run. */
    headline: parsed.headline ? 1 : 0,
    overview: (parsed as { overview?: string | null }).overview ? 1 : 0,
  };
  return built;
}

/** Write one audit row. Silent on failure by design. */
export async function recordParseAudit(input: ParseAuditInput): Promise<void> {
  try {
    const { changed, accuracy } = diffParse(input.parsed, input.final);
    /* ⚠ COMPUTED HERE, STORED AS A COLUMN — never re-derived at read time. */
    const built = countBuilt(input.parsed);
    const builtTotal = Object.values(built).reduce((a, b) => a + b, 0);
    await prisma.resumeParseAudit.create({
      data: {
        provider_profile_id: input.providerProfileId,
        resume_hash: createHash("sha256").update(input.resumeText).digest("hex"),
        model: input.model,
        provider: input.provider,
        input_tokens: input.inputTokens ?? null,
        output_tokens: input.outputTokens ?? null,
        cost_usd: input.costUsd ?? null,
        latency_ms: input.latencyMs ?? null,
        parsed: input.parsed as unknown as object,
        final: input.final as unknown as object,
        changed: changed as unknown as object,
        accuracy,
        built: built as unknown as object,
        built_total: builtTotal,
        /* ⚠ THE DENOMINATOR — yield is meaningless without it. */
        source_chars: input.resumeText.length,
        /* ⚠ FROM THE RUN, not from whatever the constant says at save time. */
        prompt_version: input.promptVersion ?? null,
      },
    });
  } catch (e) {
    console.error("[resume] parse audit write failed (non-fatal):", e);
  }
}

/** The numbers behind the admin health card (WS-H). */
export async function parserHealth() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [total, recent, agg, aggRecent, latest] = await Promise.all([
    prisma.resumeParseAudit.count(),
    prisma.resumeParseAudit.count({ where: { created_at: { gte: since } } }),
    prisma.resumeParseAudit.aggregate({
      _avg: { accuracy: true, cost_usd: true, latency_ms: true },
    }),
    prisma.resumeParseAudit.aggregate({
      where: { created_at: { gte: since } },
      _avg: { accuracy: true, cost_usd: true },
    }),
    prisma.resumeParseAudit.findFirst({
      orderBy: { created_at: "desc" },
      select: { model: true, provider: true, created_at: true },
    }),
  ]);

  return {
    total,
    last30d: recent,
    accuracy: agg._avg.accuracy,
    accuracy30d: aggRecent._avg.accuracy,
    costUsd: agg._avg.cost_usd ? Number(agg._avg.cost_usd) : null,
    costUsd30d: aggRecent._avg.cost_usd ? Number(aggRecent._avg.cost_usd) : null,
    latencyMs: agg._avg.latency_ms,
    model: latest?.model ?? null,
    provider: latest?.provider ?? null,
    lastAt: latest?.created_at ?? null,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   YIELD AND OBJECT COUNTS, BROKEN OUT BY MODEL + PROMPT (`P1-A1.5-E488`)
   ═══════════════════════════════════════════════════════════════════════════

   > **Scott:** *"it will allow me to know if my resume AI (or any AI) starts
   > underperforming."*

   ⚠⚠ A SINGLE BLENDED LINE CANNOT SHOW THAT A CHANGE MADE THINGS WORSE, which
   is the entire point of the card. Both series are cut by `model` +
   `prompt_version` so a regression has a shape: one variant's line falls while
   the others hold.

   ⚠⚠ YIELD AND ACCURACY ANSWER DIFFERENT QUESTIONS AND FAIL AT DIFFERENT TIMES:
     YIELD     objects ÷ source chars   available IMMEDIATELY   "it stopped finding things"
     ACCURACY  kept ÷ (kept + changed)  only AFTER a review     "it finds things but gets them wrong"
   ⚠ Accuracy only exists once a human reviews. Yield exists the moment the run
   finishes, and it is what falls first when a model degrades.
   ⚠⚠ AN UNREVIEWED RUN SHOWS YIELD AND NO ACCURACY. NEVER IMPUTE ONE — a null
   accuracy is information, and filling it with an average would erase exactly
   the rows a degrading model produces most of.
*/

export type VariantStats = {
  key: string;
  model: string;
  promptVersion: string;
  runs: number;
  /** ⚠ Runs with a usable denominator. Yield is averaged over THESE, not `runs`. */
  yieldRuns: number;
  /** Objects per 1,000 source characters. Null when nothing has a denominator. */
  yieldPer1k: number | null;
  /** ⚠ Runs a human has actually reviewed — the sample size behind `accuracy`. */
  reviewedRuns: number;
  accuracy: number | null;
  objects: number;
  byType: Record<string, number>;
  firstAt: Date;
  lastAt: Date;
};

/**
 * Every run, grouped by (model, prompt_version).
 *
 * ⚠ ONE QUERY AND GROUPED IN MEMORY. A few hundred audit rows is nothing, and a
 * `groupBy` cannot compute yield — the numerator and denominator live in
 * different columns and a row with a null denominator must be excluded from the
 * average rather than counted as zero.
 */
export async function parserVariants(): Promise<VariantStats[]> {
  const rows = await prisma.resumeParseAudit.findMany({
    select: {
      model: true,
      prompt_version: true,
      built: true,
      built_total: true,
      source_chars: true,
      accuracy: true,
      created_at: true,
    },
    orderBy: { created_at: "asc" },
  });

  const by = new Map<string, VariantStats>();
  for (const r of rows) {
    /* ⚠ A row written before `E487` has no prompt version and says so. It is
       NOT folded into the newest variant — that would blame a current prompt
       for a run it never touched. */
    const pv = r.prompt_version ?? "pre-versioning";
    const key = `${r.model} · ${pv}`;
    let v = by.get(key);
    if (!v) {
      v = {
        key,
        model: r.model,
        promptVersion: pv,
        runs: 0,
        yieldRuns: 0,
        yieldPer1k: null,
        reviewedRuns: 0,
        accuracy: null,
        objects: 0,
        byType: {},
        firstAt: r.created_at,
        lastAt: r.created_at,
      };
      by.set(key, v);
    }
    v.runs += 1;
    v.lastAt = r.created_at;
    v.objects += r.built_total ?? 0;
    for (const [k, n] of Object.entries((r.built ?? {}) as Record<string, number>)) {
      v.byType[k] = (v.byType[k] ?? 0) + (typeof n === "number" ? n : 0);
    }
    /* ⚠ YIELD NEEDS BOTH HALVES. A run with no `source_chars` (every
       pre-E487 row) contributes to neither the numerator nor the denominator. */
    if (r.source_chars && r.source_chars > 0 && r.built_total !== null) {
      v.yieldRuns += 1;
      v.yieldPer1k =
        ((v.yieldPer1k ?? 0) * (v.yieldRuns - 1) +
          (r.built_total / r.source_chars) * 1000) /
        v.yieldRuns;
    }
    /* ⚠⚠ ACCURACY IS AVERAGED OVER REVIEWED RUNS ONLY. */
    if (r.accuracy !== null) {
      v.reviewedRuns += 1;
      v.accuracy = ((v.accuracy ?? 0) * (v.reviewedRuns - 1) + r.accuracy) / v.reviewedRuns;
    }
  }

  return [...by.values()].sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
}

/* ═══════════════════════════════════════════════════════════════════════════
   RETENTION — OPTION 2 (`P1-A1.5-E490`)
   ═══════════════════════════════════════════════════════════════════════════

   > **Scott:** *"I want to store the rating, not the details of the parse and
   > build."*

   ⚠⚠ TODAY THE TABLE STORES THE WHOLE RÉSUMÉ TWICE PER RUN — `parsed` and
   `final`, both full JSON: employment history, education, names. That is the
   OPPOSITE of what he asked for, and it is personal data sitting in an audit
   table.

   ⚠ SCOTT CHOSE OPTION 2: the tallies are permanent, the blobs age out. So
   `accuracy`, `built`, `built_total`, `source_chars`, `prompt_version`, the cost
   and the latency all survive forever — every number the health card draws —
   while the content that made them is cleared after the window.

   ⚠⚠ IT KEEPS A RE-CHECK WINDOW, WHICH IS THE POINT OF 90 DAYS RATHER THAN 0.
   `accuracy` can be recomputed from `parsed` + `final` if the diff logic ever
   changes; after the window it cannot, and that is an accepted, stated cost.

   ⚠⚠ THIS IS NOT SCHEDULED, DELIBERATELY. There is no cron, no `vercel.json`
   entry and no caller — the brief says build the function and do not schedule
   it. ⚠ A retention job that starts deleting the moment it merges is not
   something to switch on in the same change that introduces it.
*/

/** Rows older than this keep their numbers and lose their content. */
export const AUDIT_BLOB_RETENTION_DAYS = 90;

export type RetentionReport = {
  cutoff: Date;
  /** Rows past the window that still hold blobs. */
  eligible: number;
  /** Bytes those blobs occupy, measured not estimated. */
  bytes: number;
  cleared: number;
  dryRun: boolean;
};

/**
 * Clear `parsed` / `final` on audit rows past the retention window.
 *
 * ⚠ DRY RUN BY DEFAULT. Call it with `{ apply: true }` to actually clear —
 * a function that deletes on its first accidental invocation is a bad function.
 * ⚠ THE TALLIES ARE NEVER TOUCHED. Only the two content columns are emptied,
 * and the ROW SURVIVES: deleting rows would take the ratings with them, which
 * is exactly what Scott asked to keep.
 */
export async function pruneAuditBlobs(
  opts: { apply?: boolean; days?: number } = {}
): Promise<RetentionReport> {
  const days = opts.days ?? AUDIT_BLOB_RETENTION_DAYS;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  /* ⚠ MEASURED IN THE DATABASE, not by pulling every blob into node to
     `JSON.stringify` it — that would load the very PII this job exists to
     remove into application memory to count it. */
  const sized = await prisma.$queryRawUnsafe<{ n: bigint; bytes: bigint }[]>(
    `select count(*)::bigint as n,
            coalesce(sum(pg_column_size(parsed) + pg_column_size(final)), 0)::bigint as bytes
       from resume_parse_audits
      where created_at < $1
        and (parsed::text <> 'null' or final::text <> 'null')`,
    cutoff
  );
  const eligible = Number(sized[0]?.n ?? 0);
  const bytes = Number(sized[0]?.bytes ?? 0);

  if (!opts.apply) return { cutoff, eligible, bytes, cleared: 0, dryRun: true };

  /* ⚠ `Prisma.JsonNull` writes a JSON null INTO the column; the columns are
     NOT NULL, so a database null would be rejected. The row and every tally on
     it stay exactly where they are. */
  const res = await prisma.resumeParseAudit.updateMany({
    where: { created_at: { lt: cutoff } },
    data: { parsed: Prisma.JsonNull, final: Prisma.JsonNull },
  });
  return { cutoff, eligible, bytes, cleared: res.count, dryRun: false };
}
