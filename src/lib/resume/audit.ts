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

/** Write one audit row. Silent on failure by design. */
export async function recordParseAudit(input: ParseAuditInput): Promise<void> {
  try {
    const { changed, accuracy } = diffParse(input.parsed, input.final);
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
