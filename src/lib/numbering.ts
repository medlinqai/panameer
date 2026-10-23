import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureCompanyCode } from "@/lib/company-code";

// NB-E001: every transaction number = PREFIX-COMPANY-YY-######## (RQ-STRAT-26-00000001) — the BUYER company's code,
// the calendar year of creation (America/New_York), one sequence per prefix per buyer account that never resets.
export const PREFIX = { JOB: "JB", WORK_REQUEST: "RQ", WORK_ORDER: "OR", SETTLEMENT: "ST", PAYMENT: "PY", CHANGE_ORDER: "CO", ESTIMATE: "ES", AGREEMENT: "MS", SOURCING_EVENT: "SE" } as const;
export type NumberPrefix = (typeof PREFIX)[keyof typeof PREFIX];
// SQ-E002: Service Requisitions print RQ but keep counting on the WR sequence (no reset); old WR- numbers stay as issued.
// RO-E003: Orders print OR on the WO sequence (no reset); WO-… numbers already issued stay.
const SEQUENCE_KEY: Partial<Record<NumberPrefix, string>> = { RQ: "WR", OR: "WO" };
/** A requisition number in either form — RQ-… (from 2026-10-22) or WR-… (issued before). */
/** An order number in either form — OR-… (from 2026-10-23) or WO-… (issued before). */
export const ORDER_NUMBER = /^(OR|WO)-[A-Z0-9]+-\d{2}-\d{8}$/i;
export const REQUISITION_NUMBER = /^(RQ|WR)-[A-Z0-9]+-\d{2}-\d{8}$/i;

type Tx = Prisma.TransactionClient | typeof prisma;

/** The year in New York at `at`, two digits. */
export function yy(at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "2-digit" }).format(at);
}

export const formatNumber = (prefix: string, code: string, at: Date, seq: number) => `${prefix}-${code}-${yy(at)}-${String(seq).padStart(8, "0")}`;

/** The buyer company for a p_account — its first company (codes live on companies). */
async function companyFor(db: Tx, pAccountId: string) {
  return db.company.findFirst({ where: { p_account_id: pAccountId }, orderBy: { created_at: "asc" }, select: { id: true } });
}

/** Next number for this prefix and buyer. Pass `tx` to increment inside the same transaction as the insert. */
export async function nextNumber(prefix: NumberPrefix, buyer: { companyId?: string | null; pAccountId?: string | null }, opts: { tx?: Tx; at?: Date } = {}): Promise<string> {
  const db = opts.tx ?? prisma;
  let companyId = buyer.companyId ?? null;
  let pAccountId = buyer.pAccountId ?? null;
  if (!pAccountId && companyId) pAccountId = (await db.company.findUniqueOrThrow({ where: { id: companyId }, select: { p_account_id: true } })).p_account_id;
  if (!companyId && pAccountId) companyId = (await companyFor(db, pAccountId))?.id ?? null;
  if (!pAccountId || !companyId) throw new Error("A transaction number needs the buyer's company");
  const code = await ensureCompanyCode(companyId);
  // Atomic: the row is created at 1 or incremented — two inserts never share a number.
  const rows = await db.$queryRaw<{ last_value: number }[]>`
    INSERT INTO number_sequences (id, prefix, p_account_id, last_value, updated_at)
    VALUES (gen_random_uuid(), ${SEQUENCE_KEY[prefix] ?? prefix}, ${pAccountId}::uuid, 1, now())
    ON CONFLICT (prefix, p_account_id) DO UPDATE SET last_value = number_sequences.last_value + 1, updated_at = now()
    RETURNING last_value`;
  return formatNumber(prefix, code, opts.at ?? new Date(), Number(rows[0].last_value));
}
