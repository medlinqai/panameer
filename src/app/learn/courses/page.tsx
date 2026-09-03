import { permanentRedirect } from "next/navigation";

/**
 * `/learn/courses` — REDIRECTED TO `/learn/paths` (`P1-J3-E364` WS-8).
 *
 * ── ⚠⚠ THE REDIRECT `E362` COULD NOT MAKE ────────────────────────────────────
 *
 * This route rendered `PathCard` — learning PATHS — under the heading "All
 * Courses", from the same `getLearnHome()` query `/learn/paths` uses. Two URLs,
 * one page, and one of them named after a thing it did not show.
 *
 * ⚠ `E362` IDENTIFIED THE DUPLICATE AND STOPPED, CORRECTLY. Redirecting here
 * would have sent a signed-out visitor to `/login`, because `/learn/paths`
 * redirected them — so the fix would have silently undone `P1-J0-E316`, whose
 * whole point was that this route MUST stay public: *"a gate there turns the
 * public hero's second CTA into a login wall."*
 *
 * ⚠⚠ `E364` WS-8 REMOVED THAT REDIRECT INSTEAD. `/learn/paths` now renders signed
 * out and is on the public allowlist, so this can finally point at it without
 * costing a visitor anything. **`E316` is closed by this file plus that one.**
 *
 * ── ⚠ `permanentRedirect`, i.e. 308, NOT 307 ─────────────────────────────────
 *
 * The URL is linked publicly and the move is permanent, so a 308 lets caches and
 * crawlers learn it. ⚠ THE ROUTE IS NOT DELETED — deleting it would 404 every
 * external link, which is the one thing a rename must not do.
 * ⚠ ITS `public-routes.ts` ENTRY STAYS: a redirect a visitor cannot reach is not
 * a redirect.
 */
export default function Page() {
  permanentRedirect("/learn/paths");
}
