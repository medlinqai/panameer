import { redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";
import type { Viewer } from "@/lib/access";

/**
 * ── ⚠⚠⚠ THE ONE MAP: AN APP ROUTE → THE PUBLIC PAGE THAT USED TO LIVE THERE ──
 *
 * `P2-ALL-E698` WS-D. ⚠⚠ **SCOTT, 2026-09-28:** *"NEVER let a public page steal the
 * best URL."* Three public pages gave up their names so the application could take
 * them, and the names the application took are exactly the ones people already
 * had in their history, their bookmarks and their notes.
 *
 * ⚠⚠⚠ **SO AN ANONYMOUS VISITOR TO ONE OF THESE APP ROUTES IS SENT TO ITS PUBLIC
 * PAGE, NOT TO THE LOGIN SCREEN.** A stranger who types `/learn` wanted to read
 * about the courses; a login wall answers a question they did not ask.
 *
 * ── ⚠⚠ WHY THIS IS NOT THE PATTERN SCOTT REJECTED ────────────────────────────
 *
 * ⚠ He rejected *"changing the content based on if logged in"* — *"confusing when
 * someone reports an error with /learn."* ⚠⚠⚠ **THIS IS THE OPPOSITE SHAPE: NOTHING
 * RENDERS TWO WAYS AT ONE ADDRESS.** Each URL is one page. An anonymous visitor is
 * *moved* to a different URL, and the address bar then shows them the name of the
 * thing they are actually looking at — which is precisely what makes a bug report
 * unambiguous.
 *
 * ── ⚠⚠ WHY A MAP HERE AND NOT A CHECK IN EACH PAGE (`E585`) ──────────────────
 *
 * ⚠ One concept in N places is kept in step by hand and eventually is not. The
 * pairing is the concept; each page supplies only its own key.
 *
 * ── ⚠⚠⚠ AND WHY NOT `proxy.ts`, WHICH LOOKS LIKE THE RIGHT PLACE ─────────────
 *
 * ⚠ It would intercept before the page renders, which is better. ⚠⚠ **BUT THE EDGE
 * RUNS ONLY ON `config.matcher`, AND THAT LITERAL IS PAIRED WITH `ROUTE_ACCESS` BY
 * AN ASSERTION THAT FAILS IF THEY DISAGREE IN EITHER DIRECTION** — so adding
 * `/learn` there means adding a `ROUTE_ACCESS` prefix entry too, and
 * `requirementForPath` is PREFIX-matched. ⚠⚠⚠ **THAT WOULD GATE `/learn/courses`,
 * `/learn/paths`, `/learn/[slug]` AND `/learn/[slug]/course/[courseSlug]`, WHICH
 * ARE PUBLIC ON PURPOSE** — `public-routes.ts` says so in its own words: *"do not
 * read the `/learn` prefix as a licence."* ⚠ A capability lost silently is worse
 * than a redirect that costs one hop (rule 5), so the rule lives at the page.
 */
export const PUBLIC_TWIN = {
  /** ⚠ Was the public Shop until `P2-ALL-E698` WS-A. */
  "/shop": "/marketplace",
  /** ⚠ Was Learn's public front door until `P2-ALL-E698` WS-C. */
  "/learn": "/training",
} as const satisfies Record<string, string>;

export type TwinnedRoute = keyof typeof PUBLIC_TWIN;

/*
  ⚠⚠⚠ `/service-products` IS DELIBERATELY ABSENT, AND ITS ABSENCE IS THE ACCURATE
  STATEMENT. The public page moved to `/pre-defined-services` (WS-B commit 1), so
  the name is FREE — but nothing claimed it: `(app)/packages` was the only app
  catalogue page and `/shop` took it, correctly, because Shop is the menu word.
  ⚠⚠ A KEY HERE FOR A ROUTE WITH NO PAGE WOULD BE A CLAIM ABOUT A SURFACE THAT DOES
  NOT EXIST (ruling 92). It goes in when a page does.
*/

/**
 * Resolve the viewer for an app route that has a public twin.
 *
 * ⚠⚠ **USE THIS INSTEAD OF `guardPage("authenticated")` ON THESE ROUTES ONLY.**
 * `guardPage` sends an anonymous visitor to `/login`, which is right for a surface
 * that has never been public and wrong for one whose URL was a marketing page
 * yesterday.
 */
export async function memberOrPublicTwin(route: TwinnedRoute): Promise<Viewer> {
  const viewer = await getSessionViewer();
  if (!viewer) redirect(PUBLIC_TWIN[route]);
  return viewer;
}
