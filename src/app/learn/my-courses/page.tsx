import { redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";

/**
 * `/learn/my-courses` — REDIRECTED TO `/learn/paths?tab=mine` (`P1-J3-E362` WS-3).
 *
 * ⚠⚠ IT WAS STILL A `ComingSoon` WHILE THE THING IT PROMISED ALREADY WORKED.
 * `/learn/paths` accepts `?tab=mine` and `LearnHome` already renders that tab —
 * so this route was showing *"coming soon"* for a feature that shipped.
 *
 * ⚠ SUPERSEDED, quoted: *"The rail's submenu names this view, so it has to LAND
 * somewhere. A 404 from your own menu reads as a broken product; a titled empty
 * state reads as one that hasn't got there yet, which is the truth."* ⚠ THAT
 * REASONING WAS CORRECT WHEN THE TAB DID NOT EXIST. It does now, so the honest
 * landing place is the tab itself.
 *
 * ⚠ A REDIRECT, NOT A DELETE — the URL may be linked.
 *
 * ── ⚠⚠ THE `guardPage` STAYS, AND DROPPING IT WAS A REAL REGRESSION ──────────
 *
 * The first draft of this file redirected without guarding, on the reasoning that
 * the destination gates anyway. ⚠ `check:app-shell`'s PUBLIC ALLOWLIST caught it:
 * *"1 route(s) are REACHABLE SIGNED OUT and belong to no category and no gate."*
 * It was right — a page is GATED BY DEFAULT, and "the place it sends you gates"
 * is a property of another file that could change without this one knowing.
 * ⚠ SO THE GUARD RUNS FIRST AND THE REDIRECT SECOND. This route's own gate is
 * unchanged from the `ComingSoon` it replaces, which is why its absence from
 * `public-routes.ts` is still correct.
 */
export default async function Page() {
  await guardPage("authenticated");
  redirect("/learn/paths?tab=mine");
}
