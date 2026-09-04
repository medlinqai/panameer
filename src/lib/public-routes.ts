import { ROUTE_ACCESS } from "@/lib/route-access";

/**
 * ⚠⚠ THE PUBLIC ALLOWLIST — THE ONE PLACE THAT SAYS WHAT A LOGGED-OUT VISITOR
 * MAY SEE. Everything else is gated.
 *
 * ── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
 *
 * SCOTT, 2026-08-26 (`decisions-01.md`, newest at top): *"all of the pages on
 * the menu are 'public', as are the login and onboarding pages...most everything
 * else must require the user to be logged in. Logged in users can see public
 * pages...but logged out users ONLY see public pages."*
 *
 * ⚠⚠ THE POINT IS THE DEFAULT, NOT THE LIST. Before this file, a page was public
 * by ACCIDENT — by not living under `(app)` and not being named in `proxy.ts`.
 * Nothing failed if someone forgot. Public is now ENUMERATED: a new page is
 * GATED until somebody deliberately adds it here with a category.
 *
 * ⚠ THIS FILE CHANGED NO ROUTE'S ACCESS when it was written (`P1-ALL-E025`). It
 * writes down what was already true and makes drift fail a gate. If you are
 * editing it to make a test pass, stop and ask whether the ROUTE is wrong.
 *
 * ── HOW IT IS ENFORCED — THREE POINTS, ONE TRUTH ─────────────────────────────
 *
 *  1. `src/proxy.ts`      the edge. Its `matcher` is a STATIC LITERAL (Next reads
 *                         it at build time and CANNOT evaluate an import), so it
 *                         is ASSERTED against `ROUTE_ACCESS` rather than derived.
 *  2. `src/lib/route-access.ts`  what each GATED prefix requires. This file
 *                         imports it, below, so "public" and "gated" are checked
 *                         against each other and cannot both claim a route.
 *  3. `e2e-shell/app-shell.spec.ts` — "THE PUBLIC ALLOWLIST" block. Walks EVERY
 *                         `page.tsx` under `src/app` and fails, by name, on any
 *                         route that is neither allowlisted nor gated.
 *
 * ⚠ NOTHING IN THE APP IMPORTS THIS FILE AT RUNTIME. It is deliberately inert:
 * the assertion is a build/test-time gate, not a fourth access layer. Wiring it
 * into `proxy.ts` would make a disagreement between list and reality CHANGE
 * ACCESS instead of failing loudly, which is the opposite of the point.
 *
 * ── ROUTES ARE WRITTEN AS FILESYSTEM ROUTES ──────────────────────────────────
 *
 * `/verify/[credentialId]`, not `/verify/abc123`. Route groups do not appear —
 * `(app)` is a folder, never a URL segment. That is exactly the string the
 * assertion derives from each `page.tsx` path, so the two cannot drift apart by
 * formatting.
 */

/** Scott's five categories. The category is HOW the next page gets classified. */
export type PublicCategory = 1 | 2 | 3 | 4 | 5;

export const CATEGORY_NAMES: Record<PublicCategory, string> = {
  1: "MENU + ROOT",
  2: "AUTH DOORS",
  3: "LEGAL",
  4: "TOKEN-ADDRESSED",
  5: "FRONT DOORS",
};

export type PublicRoute = {
  /** Filesystem route, dynamic segments in brackets. */
  route: string;
  category: PublicCategory;
  /** True when everything BELOW this path is public too. */
  subtree?: true;
  /** Set when Scott has not confirmed this entry. Not a licence to change it. */
  status?: "OPEN";
};

export const PUBLIC_ROUTES: PublicRoute[] = [
  /*
    ── 1. MENU + ROOT ─────────────────────────────────────────────────────────
    The six nav items plus `/`. Public because a marketing page a visitor cannot
    open is not a marketing page. `MARKETING_NAV` in `components/marketing/brand.tsx`
    is the same six, and the standing rule is that a public page's URL IS its
    menu name (`decisions-01.md` 2026-08-25).

    ⚠ `/` is ALSO in `proxy.ts`'s matcher — the ONE deliberate overlap in this
    file. The proxy runs on `/` to do the HOST SPLIT (marketing domain → public;
    app domain → /login), not to gate it. See `isMarketingHost`.
    ⚠ `/work` IS THE PUBLIC BUYER PAGE. The provider feed is `/find-work` and it
    is GATED. They swapped on 2026-08-26 (`P1-ALL-E017`); do not put them back.
  */
  { route: "/", category: 1 },
  { route: "/learn", category: 1 },
  { route: "/optimize", category: 1 },
  { route: "/talent", category: 1 },
  { route: "/work", category: 1 },
  { route: "/shop", category: 1 },
  { route: "/integrate", category: 1 },
  /*
    ⚠ `/capability-domains` (`P1-J0-E352`) — the `/optimize` hero's second button
    points here. It renders `CapabilityFramework` and nothing else: no form, no
    session read, no data. Category 1 like the six above.
    ⚠ IT IS LISTED BECAUSE A NEW `page.tsx` IS OTHERWISE "PUBLIC BY ACCIDENT" — the
    app-shell suite asserts every page is explicitly allowlisted or gated, and the
    default is DENY. Adding the route without this entry fails that guard, which is
    the guard working.
  */
  { route: "/capability-domains", category: 1 },
  /*
    ⚠ `/ai-method` (`P1-J0-E356`) — AIM, the five-stage method wheel, at its own
    address. Reached from the footer's `The AI Method (aka AIM)` row, which is the
    only anchor in that video band. Renders `MethodologyRing` and nothing else: no
    form, no session read, no data. Category 1, like the seven above.
    ⚠ LISTED BECAUSE A NEW `page.tsx` IS OTHERWISE "PUBLIC BY ACCIDENT" — the
    app-shell suite asserts every page is explicitly allowlisted or gated and the
    default is DENY. `E352` learned this when `/capability-domains` failed that guard.
  */
  { route: "/ai-method", category: 1 },
  /*
    ⚠ `/service-products` (`P1-J0-E358`) — `ErpPackages` at its own address, MOVED
    off `/shop`. Reached from `/shop`'s second hero button. Renders that one section
    and nothing else: no form, no session read, no data. Category 1 like the eight
    above.
    ⚠ NOT OPTIONAL. The default is DENY and the app-shell suite asserts every page is
    explicitly allowlisted or gated — `E352` learned that when `/capability-domains`
    failed the guard.
  */
  { route: "/service-products", category: 1 },
  /*
    ⚠ `/erp-integration` (`P1-J0-E359`) — `ErpIntegration` at its own address, MOVED
    off `/integrate`. Reached from that page's hero button AND from HOME section 6.
    Renders one section and nothing else: no form, no session read, no data.
    Category 1, like the nine above.
    ⚠ NOT OPTIONAL. The default is DENY and the app-shell suite asserts every page is
    explicitly allowlisted or gated — `E352` learned that when `/capability-domains`
    failed the guard.
  */
  { route: "/erp-integration", category: 1 },

  /*
    ── 2. AUTH DOORS ──────────────────────────────────────────────────────────
    You cannot require a login to reach the login. `/join/*` is the whole
    onboarding funnel and is a SUBTREE because the funnel adds steps.

    ⚠ THREE `/join` PAGES SELF-GUARD AND THAT IS CORRECT, NOT A CONTRADICTION:
    `/join/provider/start`, `/join/requester/start` and `/join/requester/ready`
    redirect to `/login` when there is no session. The funnel's FRONT is public;
    its later steps happen after the account exists. Being in this allowlist
    means "the edge does not gate it", not "it has no session of its own".
  */
  { route: "/login", category: 2 },
  { route: "/join", category: 2, subtree: true },

  /*
    ── 3. LEGAL ───────────────────────────────────────────────────────────────
    Terms a visitor must accept, and cannot read behind a login, are not terms.
    Same for the policy set a prospective buyer's counsel reads before signing.
  */
  { route: "/terms", category: 3 },
  { route: "/user-agreement", category: 3 },
  { route: "/privacy", category: 3 },
  { route: "/legal", category: 3 },
  { route: "/legal/[slug]", category: 3 },
  { route: "/policies/[slug]", category: 3 },
  { route: "/company-terms", category: 3 },
  /*
    ⚠⚠ `/unsubscribe` IS PUBLIC AND IT IS THE ONE ROUTE THAT MUST NEVER BE
    GATED (`P1-ALL-E386`).

    It sits under LEGAL for the same reason `/terms` does: an obligation a
    recipient cannot discharge without logging in is not honoured. And it goes
    further than terms — an unsubscribe has to work for an address WITH NO
    ACCOUNT AT ALL, which no capability check can ever be satisfied by.

    ⚠ THE DEFAULT IS DENY, so this entry is what makes the page reachable. Before
    `E386` the footer pointed at `/settings/notifications`, gated behind
    `canProvideServices` — a buyer was bounced, a signed-out recipient was
    bounced, and `E371` had already made those emails live.

    ⚠ `check:unsubscribe` ASSERTS BOTH DIRECTIONS: that this entry exists, and
    that no `ROUTE_ACCESS` rule gates the path. A capability gate on it must FAIL
    the build.
  */
  { route: "/unsubscribe", category: 3 },
  /*
    ⚠ `/trust` (`P1-ALL-E035`) — the plain-language version of Terms of Use
    section 5. It is CATEGORY 3 for the same reason the documents are: a claim
    about what we verify that a prospective buyer cannot read without an account
    is not a claim, it is a secret. ⚠ THE DEFAULT IS DENY, so without this line
    the page would 302 to /login and the footer link would be a dead end.
  */
  { route: "/trust", category: 3 },

  /*
    ── 4. TOKEN-ADDRESSED ─────────────────────────────────────────────────────
    ⚠⚠ THIS IS THE CATEGORY PEOPLE BREAK. READ THIS BEFORE TOUCHING ANY OF IT.

    EVERY URL HERE IS HANDED TO SOMEONE WHO HAS NO ACCOUNT. That is not a gap in
    the gate — it is the feature:

      · A certificate's public verify URL is THE ENTIRE POINT OF CERTIFYING. A
        recruiter checking a credential does not have a Panameer login and never
        will. Gate `/verify/[credentialId]` and the certificate means nothing.
      · An invite the invitee cannot open IS NOT AN INVITE.
      · `/validate/[token]` and `/recommend/[token]` are the same shape: we mail
        a stranger a link precisely because they are outside the account system.
      · `/verify-email` is how a brand-new address proves itself — before there
        is a session to check.
      · `/assess/r/[token]` + `/deck` are the assessment report and its slides.

    ⚠ THE TOKEN IS THE ACCESS CONTROL. A uuid mailed to the address the person
    typed, which they are also expected to FORWARD. `route-access.ts` records the
    same reasoning for `/assess/r/*`. A login wall here does not add security; it
    deletes the feature and the recipient simply never comes back.
    ⚠ THE CORRECT HARDENING IS SHORTER-LIVED / SINGLE-USE TOKENS, NEVER A GATE.
  */
  { route: "/verify/[credentialId]", category: 4 },
  { route: "/invite/accept", category: 4 },
  { route: "/validate/[token]", category: 4 },
  { route: "/recommend/[token]", category: 4 },
  { route: "/verify-email", category: 4 },
  { route: "/assess/claim/[token]", category: 4 },
  { route: "/assess/r/[token]", category: 4 },
  { route: "/assess/r/[token]/deck", category: 4 },

  /*
    ── 5. FRONT DOORS ─────────────────────────────────────────────────────────
    Not on the menu, still the top of a funnel.

    `/assess`   the free maturity assessment. Asking for an account BEFORE giving
                someone the reason to want one is the one thing this funnel
                cannot do. `route-access.ts` says the same in its own words.

    `/explore`  ⚠⚠ PUBLIC PROFILE BROWSE, AND IT WORKS. `ORIENTATION §10.2`
                records chat concluding that no public profile browse existed —
                THAT CONCLUSION WAS WRONG and it nearly got this route "tidied".
                Measured signed out on 2026-08-26: 200, four expert cards render
                (first names only) plus "19 more experts match — see them all
                with a free account". The partial-reveal IS the funnel.
                ⚠ DO NOT TIDY IT. DO NOT GATE IT. Read §10.2 first.

    `/why-panameer` the positioning page. Shares `MarketingHero` with `/`.

    `/work-marketplace` ⚠ STATUS: OPEN. Public today and a pre-swap survivor
                nobody has walked. It is an honest stub ("not built") behind the
                public header, footer-linked only. ⚠ SCOTT HAS NOT CONFIRMED IT
                SHOULD STAY PUBLIC — it is listed so it is not silently gated,
                and flagged so it is not silently blessed. ⚠ IT IS A DIFFERENT
                ROUTE FROM `/work`; do not merge them.
  */
  { route: "/assess", category: 5 },
  { route: "/explore", category: 5 },
  { route: "/why-panameer", category: 5 },
  { route: "/work-marketplace", category: 5, status: "OPEN" },

  /*
    ── ⚠⚠ LEARN'S BROWSE SURFACE — CLASSIFIED 2026-08-26 (`P1-J3-E035`) ───────

    SCOTT, 2026-08-26: *"NO. you HAVE to be logged into take free lessons. PERIOD."*
    ⚠⚠ HIS RULE IS ABOUT **TAKING** A LESSON, NOT BROWSING ONE. `/learn/[slug]/[lessonId]`
    — the PLAYER — is now gated with `guardPage("authenticated")`. These three
    DESCRIBE what is inside; they do not play it, and browsing is the funnel that
    makes somebody want an account in the first place.

    ⚠⚠ `/learn/courses` IS THE ONE THAT MUST NOT BE GATED. `/learn`'s public hero
    links STRAIGHT AT IT — `Browse the Catalog` — so a gate there turns the public
    hero's second CTA into a login wall. It was also shipped deliberately by
    `brief_walk_fixes` WS8 to REPLACE a "coming soon", so gating it would undo that
    same week. ⚠ DO NOT GATE IT, and do not read the `/learn` prefix as a licence
    to sweep the whole subtree.

    ⚠ `/learn/[slug]` and `/learn/[slug]/course/[courseSlug]` are session-AWARE and
    never redirect: they render for a visitor and personalise for a member.

    ⚠ THREE `/learn` ROUTES ARE GATED AND ARE DELIBERATELY ABSENT FROM THIS LIST:
    `/learn/[slug]/[lessonId]` and `/learn/my-courses` (both `guardPage`), and
    `/learn/paths` (session redirect). ⚠ THE PREFIX DECIDES NOTHING HERE — check
    the page.
  */
  { route: "/learn/courses", category: 5 },
  /*
    ⚠⚠ `/learn/paths` IS PUBLIC AS OF `P1-J3-E364` WS-8, and this entry is what
    makes it so — the default is DENY.
    ⚠ SUPERSEDED, quoted: the note above used to list it among *"THREE `/learn`
    ROUTES [that] ARE GATED AND ARE DELIBERATELY ABSENT FROM THIS LIST"*, on
    `E036`'s reasoning that a signed-out visitor should meet a login. That
    contradicted `E316`, which kept `/learn/courses` public precisely so the
    public hero CTA reached a real catalog — the same catalog, from the same
    `getLearnHome(null)` call. `E364` resolved it in favour of the public one.
    ⚠ `/learn/my-courses` STAYS ABSENT: it redirects to `?tab=mine`, a personal
    view, and still calls `guardPage` itself.
  */
  { route: "/learn/paths", category: 5 },
  { route: "/learn/[slug]", category: 5 },
  { route: "/learn/[slug]/course/[courseSlug]", category: 5 },
];

/**
 * ⚠⚠ NOT AN ALLOWLIST. THE OPPOSITE — THE QUARANTINE.
 *
 * Every route here is REACHABLE SIGNED OUT TODAY and belongs to NO category.
 * `brief_public_route_allowlist` is explicit: *"any route currently reachable
 * signed out that is in NO category — do not gate it, name it. That list is
 * Scott's next decision."* So they are named, unchanged, and NOT blessed.
 *
 * ⚠ WHY THIS LIST EXISTS AT ALL: without it the new assertion fails on `main`,
 * and the only ways to make it green are to gate these routes (changes access —
 * forbidden) or to file them under a category (decides for Scott — forbidden).
 * Quarantine is the third option: the gate stays green, nothing moves, and the
 * open decision is visible in the file instead of buried in a report.
 *
 * ⚠⚠ THIS LIST MUST ONLY EVER SHRINK. The assertion fails if a route is added to
 * it without appearing here deliberately, AND fails if an entry here no longer
 * exists on disk — so it cannot quietly rot into a second allowlist.
 * ⚠ DO NOT ADD A NEW PAGE HERE. Give a new page a category, or gate it.
 */
export const UNCLASSIFIED_PENDING_DECISION: {
  route: string;
  note: string;
}[] = [
  {
    route: "/assess/scope",
    note: "Phase-2 stub. Renders <ComingSoon> with no session read at all. Sits under /assess (category 5) but the brief's list stops at /assess itself.",
  },
  {
    route: "/assess/submitted",
    note: "The post-submit thank-you. No session read. Reached straight after the wizard, before the magic link creates the account.",
  },
];

/*
  ⚠⚠ FOUR ENTRIES LEFT THIS LIST ON 2026-08-26 (`P1-J3-E035`) AND IT MAY ONLY EVER
  SHRINK. Recorded here rather than deleted, so the list's history is readable:

    /learn/[slug]/[lessonId]              -> GATED. `guardPage("authenticated")`
                                             added; Scott: *"you HAVE to be logged
                                             in to take free lessons. PERIOD."*
    /learn/courses                        -> PUBLIC, category 5
    /learn/[slug]                         -> PUBLIC, category 5
    /learn/[slug]/course/[courseSlug]     -> PUBLIC, category 5

  ⚠ THE TWO THAT REMAIN ARE THE ASSESSMENT PAIR, AND THEY STAY UNTOUCHED BECAUSE
  SCOTT PARKED ASSESSMENTS. They are still public, still uncategorised, still his
  decision.
*/

/** Every gated prefix, straight from the map the proxy and guards both consume. */
export const GATED_PREFIXES: string[] = ROUTE_ACCESS.map((e) => e.prefix);

/** Does `route` match an allowlist entry (exact, or inside a subtree)? */
export function isPublicRoute(route: string): boolean {
  return PUBLIC_ROUTES.some((p) =>
    p.subtree ? route === p.route || route.startsWith(p.route + "/") : route === p.route
  );
}

/** The category for an allowlisted route, or null. */
export function publicCategory(route: string): PublicCategory | null {
  const hit = PUBLIC_ROUTES.find((p) =>
    p.subtree ? route === p.route || route.startsWith(p.route + "/") : route === p.route
  );
  return hit ? hit.category : null;
}

/** Is `route` covered by a prefix in `ROUTE_ACCESS` (i.e. gated at the edge)? */
export function isGatedPrefix(route: string): boolean {
  return GATED_PREFIXES.some((p) => route === p || route.startsWith(p + "/"));
}
