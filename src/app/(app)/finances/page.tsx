import { permanentRedirect } from "next/navigation";

/**
 * RETIRED ROUTE — `/finances` IS NOW `/payments` (`P1-ALL-E533` PART A).
 *
 * > **SCOTT, 2026-09-16:** *"Here are my thoughts on what the URL for each MAIN
 * > MENU option should be. Lets get this decided and changed so it is orderly."*
 *
 * ⚠ THE RULE: **a verb in the menu, a noun in the URL.** The rail item reads
 * `Payments` (and becomes `Get Paid` in Part B); the URL is the noun.
 *
 * ⚠⚠ KEPT AS A REDIRECT RATHER THAN DELETED, and `permanentRedirect` (308)
 * rather than `redirect` (307), because this address is in browser history, in
 * bookmarks, and in `attention.ts`'s links which may already be sitting in a
 * member's notifications. ⚠ A 404 on a URL that worked yesterday reads as a
 * regression rather than a restructure — the same call `RETIRED_ADMIN_ROUTES`
 * made for `/admin`.
 */
export default function RetiredFinancesRoute() {
  permanentRedirect("/payments");
}
