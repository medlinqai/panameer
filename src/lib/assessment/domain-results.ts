import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCompanyBinding } from "@/lib/company";
import { DOLLAR_WEIGHTS, type Scored } from "@/lib/assessment/scoring";
import {
  storedFieldsFor,
  type DomainFieldAnswers,
} from "@/lib/assessment/domain-fields";

export type Db = PrismaClient | Prisma.TransactionClient;

export async function resolveAssessmentCompanyId(userId: string): Promise<string | null> {
  try {
    const binding = await getCompanyBinding({ userId });
    if (!binding) return null;
    if (binding.status !== "APPROVED") return null;
    return binding.company.id;
  } catch (e) {
    console.error("[assessment] company binding lookup failed; leaving company_id null", e);
    return null;
  }
}

/** `domain_key` → `CapabilityDomain.id`, for the keys we can resolve. */
export async function resolveCapabilityDomainIds(
  db: Db,
  keys: string[]
): Promise<Map<string, string>> {
  const unique = [...new Set(keys.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const rows = await db.capabilityDomain.findMany({
    where: { key: { in: unique } },
    select: { id: true, key: true },
  });
  return new Map(rows.filter((r) => r.key).map((r) => [r.key as string, r.id]));
}

export type DomainRowInput = Omit<Prisma.AssessmentDomainResultCreateManyInput, "assessment_id">;

export function domainRowsFor(
  scored: Scored,
  cdIds: Map<string, string>,
  backfilled = false,
  domainFields?: DomainFieldAnswers
): DomainRowInput[] {
  return scored.domains.map((d) => ({
    domain_key: d.key,
    capability_domain_id: cdIds.get(d.key) ?? null,
    rung: d.rung,
    opportunity_low_cents: BigInt(d.opportunity[0]),
    opportunity_high_cents: BigInt(d.opportunity[1]),
    rank: d.rank,
    weight_bps: Math.round((DOLLAR_WEIGHTS[d.key] ?? 0) * 10_000),
    fields: storedFieldsFor(d.key, domainFields) ?? Prisma.DbNull,
    backfilled,
  }));
}

export async function writeDomainResults(
  tx: Db,
  assessmentId: string,
  scored: Scored,
  opts: { backfilled?: boolean; domainFields?: DomainFieldAnswers } = {}
): Promise<number> {
  const cdIds = await resolveCapabilityDomainIds(tx, scored.domains.map((d) => d.key));
  const rows = domainRowsFor(scored, cdIds, opts.backfilled ?? false, opts.domainFields);
  if (rows.length === 0) return 0;
  const res = await tx.assessmentDomainResult.createMany({
    data: rows.map((r) => ({ ...r, assessment_id: assessmentId })),
  });
  return res.count;
}

// ---------------------------------------------------------------------------
// Reading them back
// ---------------------------------------------------------------------------

export type StoredDomainRow = {
  domain_key: string;
  capability_domain_id: string | null;
  rung: number | null;
  opportunity_low_cents: bigint | null;
  opportunity_high_cents: bigint | null;
  rank: number | null;
  weight_bps: number | null;
  fields: unknown;
  backfilled: boolean;
};

export async function getCompanyAssessments(companyId: string) {
  return prisma.assessment.findMany({
    where: { company_id: companyId },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      created_at: true,
      process: true,
      score_pct: true,
      company_name: true,
      share_token: true,
      _count: { select: { domainResults: true } },
    },
  });
}
