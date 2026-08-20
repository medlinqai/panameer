import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCompanyBinding } from "@/lib/company";
import { DOLLAR_WEIGHTS, type Scored } from "@/lib/assessment/scoring";

/**
 * THE PER-DOMAIN RESULT — writing it, and reading it back
 * (brief_assessment_instance_model WS1 + WS2).
 *
 * One place, because the same three rules have to hold in three callers: the
 * public submit route, the backfill script, and `/assess/claim`. Two of them are
 * things `check:assessment-instance` fails the build over.
 */

/**
 * A transaction handle or the client itself.
 *
 * ⚠ THE CALLERS THAT WRITE ARE REQUIRED TO PASS A `tx`. The type allows the bare
 * client because `resolveCapabilityDomainIds` reads, and the read is fine outside
 * a transaction — but `check:assessment-instance` asserts that every
 * `assessmentDomainResult` write in the repo is on a `tx` handle, so this type
 * being permissive does not make the rule optional.
 */
export type Db = PrismaClient | Prisma.TransactionClient;

/**
 * WHICH COMPANY, IF ANY, THIS USER'S ASSESSMENT BELONGS TO.
 *
 * ── ⚠ `getCompanyBinding`, NEVER `Person.company_id` ─────────────────────────
 *
 * `Person.company_id` is the signup placeholder — every new Person gets one
 * whether or not that org is real to them — and treating it as a company binding
 * is `P1-J1.2-E003` exactly. `check:assessment-instance` fails the build if this
 * file, the submit route or the claim page reads it.
 *
 * ── ⚠ APPROVED ONLY, AND THAT IS A NARROWING OF THE BRIEF ────────────────────
 *
 * `getCompanyBinding` returns the best membership it can find and will happily
 * hand back a PENDING or a REJECTED one — it exists to drive the *company* page,
 * where "your request was rejected" is a thing that needs saying. Attribution is
 * a different question. Writing `company_id` from a REJECTED membership would
 * file an assessment under a company that explicitly refused this person, and
 * from a PENDING one would file it under a company that has not yet agreed.
 * Both are wrong in the direction that matters, so only APPROVED counts and
 * anything else leaves the column null. Flagged in the report.
 *
 * Returns null freely. ⚠ A CLAIMER WITH NO BINDING STILL CLAIMS — this must
 * never be the reason a claim fails.
 */
export async function resolveAssessmentCompanyId(userId: string): Promise<string | null> {
  try {
    const binding = await getCompanyBinding({ userId });
    if (!binding) return null;
    if (binding.status !== "APPROVED") return null;
    return binding.company.id;
  } catch (e) {
    /*
      ⚠ SWALLOWED ON PURPOSE, AND ONLY HERE. This runs inside the submit route
      and inside the claim page. Attribution is a nice-to-have; the submission
      and the account are not. A failure to resolve a company must never cost
      somebody their assessment or their sign-in.
    */
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

/**
 * The `Scored` object → the rows to store. Pure; no recomputation anywhere.
 *
 * ⚠ TAKES WHAT `scoreAssessment()` ALREADY RETURNED. The brief is explicit: the
 * rows are written from the same `Scored` the submission was scored with, in the
 * same transaction. Calling `scoreAssessment` a second time here would be a
 * second chance to disagree with the number that was stored.
 */
export function domainRowsFor(
  scored: Scored,
  cdIds: Map<string, string>,
  backfilled = false
): DomainRowInput[] {
  return scored.domains.map((d) => ({
    domain_key: d.key,
    capability_domain_id: cdIds.get(d.key) ?? null,
    rung: d.rung,
    /*
      ⚠ BOTH ENDS. Every dollar figure on the report is a range because every
      input is a band; storing one end would force the report to recompute the
      other, which is the exact thing this table exists to prevent.
    */
    opportunity_low_cents: BigInt(d.opportunity[0]),
    opportunity_high_cents: BigInt(d.opportunity[1]),
    rank: d.rank,
    /*
      The weight IN FORCE AT SUBMIT, in basis points. 0 for the two enabler
      domains — `data_ai_governance` and `change_ai_adoption` are assessed and
      recover $0 by design, and `DOLLAR_WEIGHTS` has no entry for either. That is
      a declared hole (UNWEIGHTED_DOMAINS), not a missing weight to invent.
    */
    weight_bps: Math.round((DOLLAR_WEIGHTS[d.key] ?? 0) * 10_000),
    backfilled,
  }));
}

/**
 * Write the domain rows for one assessment.
 *
 * ⚠ `tx` IS NOT OPTIONAL IN PRACTICE. The submission and its ten domain rows are
 * one fact: a half-scored assessment — a report with three of ten domains — is
 * worse than a submission the visitor retries. `check:assessment-instance`
 * asserts every call site passes a transaction handle.
 *
 * `createMany` rather than ten creates: one round trip, and the unique
 * constraint on (assessment_id, domain_key) means a duplicate is a real error
 * rather than something to skip.
 */
export async function writeDomainResults(
  tx: Db,
  assessmentId: string,
  scored: Scored,
  opts: { backfilled?: boolean } = {}
): Promise<number> {
  const cdIds = await resolveCapabilityDomainIds(tx, scored.domains.map((d) => d.key));
  const rows = domainRowsFor(scored, cdIds, opts.backfilled ?? false);
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
  backfilled: boolean;
};

/** Every assessment this company has, newest first — Scott's actual requirement. */
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
