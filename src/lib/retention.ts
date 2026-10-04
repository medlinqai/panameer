
/** What a retention rule can be applied to. */
export type RetainedKind = "RESUME_RAW_TEXT" | "TAX_FORM";

export const RESUME_RETENTION_DAYS: number | null = null;

export const TAX_FORM_RETENTION_DAYS: number | null = null;

export const RETENTION_DAYS: Record<RetainedKind, number | null> = {
  RESUME_RAW_TEXT: RESUME_RETENTION_DAYS,
  TAX_FORM: TAX_FORM_RETENTION_DAYS,
};

/** Thrown when something tries to delete against a window nobody set. */
export class RetentionUndecidedError extends Error {
  constructor(kind: RetainedKind) {
    super(
      `No retention window is set for ${kind}. A purge cannot run against an undecided rule — ` +
        `see lib/retention.ts. Scott names the résumé window; the tax-record period is his accountant's.`
    );
    this.name = "RetentionUndecidedError";
  }
}

export function retentionCutoff(kind: RetainedKind, now = new Date()): Date {
  const days = RETENTION_DAYS[kind];
  if (days === null) throw new RetentionUndecidedError(kind);
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

/** `true` once somebody has actually decided. Safe to call; never throws. */
export function retentionDecided(kind: RetainedKind): boolean {
  return RETENTION_DAYS[kind] !== null;
}

export const SUPERSEDED_RESUME_PAYLOAD = {
  /** Nulled on the row. */
  columns: ["raw_text"] as const,
  /** Deleted from the private bucket. */
  objects: ["storage_path"] as const,
  /** Kept, with the reasons above. */
  kept: ["parsed", "gaps", "status", "ai_model", "ai_cost_usd", "file_name"] as const,
};

export const PURGE_ONLY_AFTER_SUCCESS = true;
