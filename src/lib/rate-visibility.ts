import { hasCapability, type Viewer } from "@/lib/access";

/**
 * ── ⚠⚠⚠ WHO MAY SEE A PROVIDER'S RATE — THE ONE RULE (`P2-A2-E618`) ──────
 *
 * ⚠⚠ SCOTT, RULING 9, 2026-09-24: **"Rates are HIDDEN from other providers.
 * Buyers see rates; providers do not see each other's. ONE RULE, EVERYWHERE —
 * this governs every surface a rate renders on."**
 *
 * | viewer | sees the rate |
 * |---|---|
 * | the owner | ✅ always — it is their own |
 * | a signed-in buyer (`canHireTalent`) | ✅ **a rate is what a buyer filters on** (`E581`) |
 * | a signed-in provider | ⛔ ruling 9 |
 * | signed out | ⛔ a null cannot hold a capability |
 *
 * ── ⚠⚠⚠ WHY THIS IS A FUNCTION AND NOT A COPIED CONDITION ───────────────
 *
 * ⚠ It was written inline in `provider-profile-view.ts` and **nowhere else**,
 * so `/explore` shipped 8 real rates — including Scott's own — to signed-out
 * visitors while the profile refused the same person the same number.
 * ⚠⚠⚠ AND THE SAME SHAPE CAUSED A LEAK THE SAME DAY: `lib/providers.ts`
 * carried its own `isOwner` and applied none of the redactions, so
 * `GET /api/providers/[id]` served a surname and a rate **unauthenticated**.
 * ⚠⚠ **ONE CONCEPT IN TWO PLACES IS FREE TO DRIFT** (`E585`), and this one
 * drifted twice in one file-tree. Ruling 29 says in terms: *"build it through
 * the ONE view model, never a second predicate."*
 *
 * ⚠ THE PREDICATE IS THE VIEWER'S CAPABILITY, NOT THEIR IDENTITY. A dual-role
 * member who both hires and provides is a BUYER when they are buying, and
 * refusing them the rate would be refusing them the marketplace.
 */
export function canSeeRate(opts: {
  isOwner: boolean;
  viewer: Viewer | null | undefined;
}): boolean {
  if (opts.isOwner) return true;
  /* ⚠ A SIGNED-OUT VISITOR IS NOT A BUYER. `viewer` is null then, and a null
     cannot hold a capability — so the rate is withheld, which is the safe
     direction for a public page. */
  return opts.viewer != null && hasCapability(opts.viewer, "canHireTalent");
}
