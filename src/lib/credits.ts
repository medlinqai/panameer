/**
 * Community Credits — the earned currency (brief_MASTER_rails_and_community).
 *
 * PHASE 1 IS THE SHAPE, NOT THE LEDGER. The pill in the header has to read a
 * balance from somewhere, and the somewhere has to be a single seam so PHASE 3
 * can put the real `CreditAccount` / `CreditLedgerEntry` behind it without any
 * UI changing. That seam is `getCreditsSummary` — one function, one return
 * type. Phase 3 replaces its body and nothing above it moves.
 *
 * WHY ZERO AND NOT A DEMO BALANCE. The brief allows "0/0 or a seeded demo
 * balance clearly marked". Zero is the honest one: there is no ledger, so
 * nobody has earned anything, and a fabricated "1,250 Credits" on a walk-through
 * is a number Scott would have to remember is fake every time he sees it — the
 * same trap My Stats avoided by rendering a dash rather than "$0 earned".
 *
 * The difference here is that zero is genuinely TRUE rather than unmeasured: no
 * Credits exist yet, so no one has any. `pending` says which of those two
 * things the number means, so the pill can label itself honestly and Phase 3
 * can drop the label by flipping one boolean.
 */

export type CreditsSummary = {
  /** Spendable balance. */
  balance: number;
  /** Positive entries in the trailing seven days. */
  earnedThisWeek: number;
  /**
   * True while the ledger does not exist. The pill uses it to say so; PHASE 3
   * returns false and the same component stops explaining itself.
   */
  pending: boolean;
};

/** What every Credits surface reads. One seam, replaced whole in PHASE 3. */
export async function getCreditsSummary(
  personId: string | null
): Promise<CreditsSummary> {
  // Unused until PHASE 3 reads the ledger with it. Named and typed now so every
  // caller is already written against the real signature.
  void personId;
  /*
    PHASE 3 replaces this body with:
      - balance          = CreditAccount.balance for this person
      - earnedThisWeek   = sum of positive CreditLedgerEntry.delta, last 7 days
      - pending          = false
    The signature already takes the personId it will need, so callers are
    written against the real shape today and none of them change.
  */
  return { balance: 0, earnedThisWeek: 0, pending: true };
}

/** `1250` → `1,250`. The pill shows a number people compare week to week. */
export function formatCredits(n: number): string {
  return n.toLocaleString("en-US");
}
