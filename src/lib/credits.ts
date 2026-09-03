/**
 * ⚠⚠ COMMUNITY CREDITS — PARKED 2026-09-03 (`P1-ALL-E375`, brief amendment A2).
 * ⚠⚠ THIS WHOLE FILE IS COMMENTED OUT. IT IS NOT DELETED AND MUST NOT BE.
 *
 * ── WHO DECIDED, AND IN WHAT WORDS ─────────────────────────────────────────
 *
 * SCOTT, 2026-09-03: *"just comment it out. we can come back to it if we want,
 * but it is just too much rn. we NEED to move faster. that has no real value."*
 *
 * ⚠ THE OBJECTION IS TO THE STANDING FRIDAY COMMITMENT, NOT TO THE CURRENCY:
 * *"no one wants to hold sessions every friday...unless that is all they do."*
 *
 * ── WHY IT WAS PARKED: THREE UNBUILT THINGS WERE STACKED ───────────────────
 *
 *   1. NO LEDGER — there is no `CreditAccount` / `CreditLedgerEntry`. The
 *      function below returns a hardcoded zero, which is why it could be
 *      honest but never useful.
 *   2. NO SCHEDULING — the page itself admitted it: *"Mentors publish their
 *      Friday sessions here once scheduling is switched on."*
 *   3. NO MENTOR ASKING FOR IT — nobody wants the weekly commitment.
 *
 * A currency that cannot be earned, spent, or scheduled against is three
 * features away from working. That is the whole reason.
 *
 * ── ⚠ PARKED DELIBERATELY, NOT ABANDONED ──────────────────────────────────
 *
 * ⚠ THE SEAM BELOW WAS THE GOOD PART AND IT IS PRESERVED VERBATIM. It was
 * built so PHASE 3 could put a real ledger behind `getCreditsSummary` without
 * a single UI change. If Credits come back, UNCOMMENT THIS FILE FIRST and the
 * call sites named below will type-check against the original signature.
 *
 * ⚠ IT RETURNED AN HONEST ZERO, NOT A FABRICATED BALANCE, and the reasoning is
 * worth keeping: a fake "1,250 Credits" is *"the same trap My Stats avoided by
 * rendering a dash rather than '$0 earned'"*.
 *
 * ── ⚠⚠ EVERY CALL SITE WENT QUIET IN THE SAME COMMIT, BY NECESSITY ─────────
 *
 * Commenting out a lib that is still imported BREAKS THE BUILD, so the callers
 * came out together rather than piecemeal. All six, each with its own dated
 * note pointing back here:
 *   · `src/app/(app)/community/page.tsx`      — the Credits card + earn/spend
 *                                               table, and Upcoming Group Sessions
 *   · `src/lib/community.ts`                  — `CREDIT_EARN_ACTIONS` / `_SPEND_`
 *   · `src/components/casing/AppHeader.tsx`   — the header chip's seam + render
 *   · `src/components/casing/CreditsPill.tsx` — the chip itself (whole file)
 *   · `src/components/home/AttentionStrip.tsx`— ⚠ the DASHBOARD Credits tile
 *   · `src/app/(app)/dashboard/page.tsx`      — the dashboard's fetch + prop
 *
 * ⚠ THE DASHBOARD TILE AND ITS FETCH WERE NOT IN THE INSTRUCTION'S LIST — they
 * were found by following the imports, and they are reported at `E375`. The
 * instruction was *"every import and call site that reaches them"*, and these
 * reach them.
 *
 * ⚠ NO ASSERTION WAS WEAKENED TO DO THIS. `scripts/` and `e2e/` were searched
 * for Credits assertions before anything was touched; there are none. The
 * `credit` hits in `scripts/` are legal-document source text and the
 * "credit check" trust claims, which are a different subject entirely.
 *
 * ⚠ FLAGGED, NOT ACTED ON: the LEGAL DOCUMENTS STILL SELL COMMUNITY CREDITS as
 * a purchasable membership inclusion (`legal_supplements_panameer.md` §3000-3009,
 * `user_agreement_panameer.md:469-471`). Parking the UI does not change the ToS,
 * and editing legal copy is nobody's call here. Reported at `E375`.
 */

/* ⚠⚠ COMMENTED OUT 2026-09-03 — see the block above. DO NOT DELETE.
   ⚠ LINE COMMENTS BELOW, NOT A BLOCK WRAPPER: the original body carries a
   nested block comment of its own (the PHASE 3 replacement plan), and a block
   wrapper terminates early on it. Measured — TS1109 + TS1161 on the first
   attempt, then TS1443 when this very note quoted the delimiter literally. */
// /**
//  * Community Credits — the earned currency (brief_MASTER_rails_and_community).
//  *
//  * PHASE 1 IS THE SHAPE, NOT THE LEDGER. The pill in the header has to read a
//  * balance from somewhere, and the somewhere has to be a single seam so PHASE 3
//  * can put the real `CreditAccount` / `CreditLedgerEntry` behind it without any
//  * UI changing. That seam is `getCreditsSummary` — one function, one return
//  * type. Phase 3 replaces its body and nothing above it moves.
//  *
//  * WHY ZERO AND NOT A DEMO BALANCE. The brief allows "0/0 or a seeded demo
//  * balance clearly marked". Zero is the honest one: there is no ledger, so
//  * nobody has earned anything, and a fabricated "1,250 Credits" on a walk-through
//  * is a number Scott would have to remember is fake every time he sees it — the
//  * same trap My Stats avoided by rendering a dash rather than "$0 earned".
//  *
//  * The difference here is that zero is genuinely TRUE rather than unmeasured: no
//  * Credits exist yet, so no one has any. `pending` says which of those two
//  * things the number means, so the pill can label itself honestly and Phase 3
//  * can drop the label by flipping one boolean.
//  */
//
// export type CreditsSummary = {
//   /** Spendable balance. */
//   balance: number;
//   /** Positive entries in the trailing seven days. */
//   earnedThisWeek: number;
//   /**
//    * True while the ledger does not exist. The pill uses it to say so; PHASE 3
//    * returns false and the same component stops explaining itself.
//    */
//   pending: boolean;
// };
//
// /** What every Credits surface reads. One seam, replaced whole in PHASE 3. */
// export async function getCreditsSummary(
//   personId: string | null
// ): Promise<CreditsSummary> {
//   // Unused until PHASE 3 reads the ledger with it. Named and typed now so every
//   // caller is already written against the real signature.
//   void personId;
//   /*
//     PHASE 3 replaces this body with:
//       - balance          = CreditAccount.balance for this person
//       - earnedThisWeek   = sum of positive CreditLedgerEntry.delta, last 7 days
//       - pending          = false
//     The signature already takes the personId it will need, so callers are
//     written against the real shape today and none of them change.
//   */
//   return { balance: 0, earnedThisWeek: 0, pending: true };
// }
//
// /** `1250` → `1,250`. The pill shows a number people compare week to week. */
// export function formatCredits(n: number): string {
//   return n.toLocaleString("en-US");
// }
//
