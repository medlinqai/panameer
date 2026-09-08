import type { Capability } from "@/lib/access";

/**
 * THE single source of truth mapping protected route prefixes → the capability
 * required to enter them (brief_J). Both enforcement layers consume this:
 *   - the edge proxy (`src/proxy.ts`), token-only, first line;
 *   - the server guards (`src/lib/guard.ts`), authoritative.
 *
 * ⚠⚠ "NOT LISTED HERE" NO LONGER MEANS "PUBLIC". Since 2026-08-26 (`P1-ALL-E025`)
 * public is an ENUMERATED ALLOWLIST in `src/lib/public-routes.ts`, and a route in
 * neither this map nor that allowlist nor a self-guard FAILS the assertion in
 * `e2e-shell/app-shell.spec.ts` by name. `public-routes.ts` IMPORTS `ROUTE_ACCESS`
 * from this file, so "public" and "gated" are checked against each other and
 * cannot both claim a route. This file stays the authority on WHAT is required;
 * that file is the authority on what needs nothing.
 *
 * In-flow routes are deliberately absent — a user mid-signup has no role yet:
 * `/join/*`, `/verify-email`, `/invite/accept`, `/login`. All are category 2 or 4
 * in `public-routes.ts`, where the reasoning now lives.
 *
 * ⚠ SUPERSEDED 2026-08-26 (`P1-ALL-E025`): this list used to end *"and public
 * marketplace reads (/providers/[id])"*. THAT IS NO LONGER TRUE — `/providers/[id]`
 * SELF-GUARDS: `if (!viewer) redirect('/login?callbackUrl=…')` at `page.tsx:68`,
 * added by `E049` so the profile costs an account. It is absent from this map
 * because the page gates itself, NOT because it is public. It is deliberately
 * NOT in the allowlist.
 *
 * ⚠ `/admin/*` LIVES OUTSIDE `(app)` AND IS GATED HERE + BY `src/app/admin/layout.tsx`
 * (`guardPage("canAdminister")`), not by its folder. That is why only a handful of
 * the ~30 admin pages carry their own guard and it still works. ⚠ DO NOT move
 * admin into `(app)` and do not add per-page self-guards.
 *
 * ⚠⚠ AND `(app)` IS NOT A GATE. `src/app/(app)/layout.tsx` supplies MeProvider +
 * AppShell and nothing else — no session check. Every route under it is gated by
 * this map, by `settings/layout.tsx`, or by its own `guardPage`. Never assume the
 * folder is doing it.
 */

/** A route needs either a specific capability or just any authenticated user. */
export type RouteRequirement = Capability | "authenticated";

/** Ordered list; the LONGEST matching prefix wins (most specific). */
/*
  ⚠ NOT LISTED HERE = PUBLIC. Two prefixes are public ON PURPOSE and are called
  out so a future auth audit reads them as decisions rather than holes — the
  same confusion that let /deliver-work sit unguarded behind a "not the real IA"
  comment:

    /assess      the free assessment. Asking for an account before giving the
                 reason to want one is the one thing this funnel cannot do.
    /assess/r/*  the report and deck. The share TOKEN is the access control —
                 a uuid mailed to the address the person typed — and it is also
                 what they forward. Same class as /verify/[credentialId] and
                 /validate/[token], which are public for the same reason.
*/
export const ROUTE_ACCESS: { prefix: string; requires: RouteRequirement }[] = [
  { prefix: "/admin", requires: "canAdminister" },
  { prefix: "/coordinator", requires: "canCoordinate" }, // readied for brief_I
  /*
    ── ⚠⚠ `authenticated` (`P2-J1.1-E046`, 2026-09-06). FIFTH INSTANCE OF THE
       CLASS THIS FILE ALREADY RECORDS FOUR TIMES ────────────────────────────

    ⚠ SUPERSEDED, quoted not deleted: `requires: "canProvideServices"` —
    "provider profile mgmt".

    SCOTT, walking as a requester, 2026-09-06: every settings page bounced him to
    `/dashboard?noaccess=1`. THE CONSEQUENCE WAS NOT NAV POLISH — a buyer could
    not change their password, their email, their 2FA, their notification
    preferences or their billing. That is an account a person cannot administer.

    SCOTT'S RULING: *"Regarding the pages not being there for requester...that is
    wrong. Some of these pages may not really fit, like withdraws, but we should
    add them and I will fix them as we go thru the build process."*
    ⚠ SO THE TREE OPENS WHOLE. A per-page split was proposed and OVERRULED: fit
    is discovered by using a page, and one nobody can open cannot be evaluated.

    ⚠⚠ AND THE GATE IS THREE LAYERS DEEP — this map, `settings/layout.tsx`, and
    each page's own `guardPage`. `/settings/notifications` PROVES IT: its page
    guard was widened to `authenticated` on 2026-09-01 so a buyer could reach
    their own preferences, and THAT FIX HAS BEEN DEAD EVER SINCE, because this
    line bounced them before the page was ever reached. Widening one layer alone
    changes nothing.
  */
  { prefix: "/settings", requires: "authenticated" },
  /*
    ── ⚠⚠ THREE SELLER-ONLY TABS INSIDE AN OTHERWISE OPEN TREE (`P2-J1.1-E050`) ─

    `E046` opened `/settings` whole on Scott's ruling that fit would be judged by
    USING the pages: *"some of these pages may not really fit, like withdraws,
    but we should add them and I will fix them as we go thru the build process."*
    THIS IS THAT FIXING — he walked it as a buyer and judged three.

    ⚠⚠ LONGEST PREFIX WINS, which is what makes this work: `/settings` stays
    `authenticated` and these three beat it for their own subtrees. Every other
    tab — Membership, Contact Info, Billing, Password & Security, Identity
    Verification, Notification Settings — and the root are UNTOUCHED.
    ⚠ `settings/layout.tsx` ALSO STAYS `authenticated`: it gates the whole tree,
    and narrowing it would re-break every other tab, which is the defect `E046`
    just fixed.

    ⚠⚠ HIDING THE TAB ALONE WOULD NOT HAVE BEEN THE FIX. A hidden tab over an
    OPEN route is one URL away from being reachable. Each of the three moves at
    ALL THREE LAYERS — here, its page's own `guardPage`, and its tab's
    `requires` in `settings-nav.ts` — and `check:nav-reachable` is what holds the
    first and third together.
    ⚠ NO PAGE OR COMPONENT IS DELETED. All three keep working for providers; this
    is a GATE change only.
  */
  { prefix: "/settings/packages", requires: "canProvideServices" },
  { prefix: "/settings/profile", requires: "canProvideServices" },
  { prefix: "/settings/withdrawals", requires: "canProvideServices" },
  /*
    /profile IS "MY OWN PROFILE", so it needs a login and nothing more (WS5).

    It said canProvideServices, which bounced the Panameer Admin to
    /dashboard?noaccess=1 — the account menu offered My Profile and the gate
    then refused it, so E004 (My Profile is a read-only dead end) looked fixed
    while being unreachable for the one person it was filed about. Found by
    walking the admin's own menu link.

    Safe to widen: the page resolves the record from the session and renders the
    employee profile when there is no provider profile behind it. Nobody else's
    profile is reachable through this route.
  */
  { prefix: "/profile", requires: "authenticated" },
  /*
    THE PERSONA-MENU PAGES (J2.4 WS-D/E/F). Provider surfaces, mapped here as
    well as guarded in the pages themselves — `guardPage` is the authoritative
    gate, this is the edge doing the cheap first pass, and a route the map does
    not know about is one the edge silently skips.

    ⚠⚠ NOW `authenticated` (`P2-J1.1-E040`/`E044`, 2026-09-06).

    ⚠ SUPERSEDED, QUOTED NOT DELETED — this paragraph read:
      *"NOT widened to `authenticated` the way /profile was: /profile has a
      genuine second rendering for a Panameer employee, whereas these three are
      about seller standing and have nothing to show someone who isn't one —
      which is also why the admin's persona menu omits them."*

    ⚠ THE REASONING WAS SOUND AND THE REMEDY WAS WRONG. "Nothing to show" is an
    argument for an EMPTY STATE, not for a redirect: all three are offered in the
    persona menu that a buyer sees, so the gate turned three visible menu items
    into three bounces to `/dashboard?noaccess=1`. Each now renders the same
    plain sentence `account-health` already used when there is no provider
    profile behind the page.
  */
  { prefix: "/stats", requires: "authenticated" },
  { prefix: "/account-health", requires: "authenticated" },
  { prefix: "/recommendations", requires: "authenticated" },
  { prefix: "/hire", requires: "canHireTalent" },
  /*
    ⚠ REGISTERED BY `P1-J4-E392`. The three pages under `/work-requests/[id]`
    (the detail, `/share` and `/invite`) all call `guardPage("canHireTalent")`
    already, so this does not change who gets in — it moves the FIRST refusal to
    the edge, where the other buyer surfaces refuse.

    ⚠⚠ AND IT MUST STAY IN LOCKSTEP WITH `proxy.ts`'s matcher literal.
    `e2e-shell/public-allowlist.spec.ts` parses that literal out of the source and
    fails in BOTH directions — a map entry with no matcher means the edge never
    runs, and a matcher entry with no map entry FAILS CLOSED and bounces everyone
    to `/dashboard?noaccess=1`.

    ⚠ `/create-work` IS DELIBERATELY NOT ADDED HERE. It self-guards and is
    classified that way today; registering it is a second, separate change with
    its own matcher entry, and this brief did not ask for it. REPORTED instead.
  */
  { prefix: "/work-requests", requires: "canHireTalent" },
  // FIND WORK IS A PROVIDER SURFACE — searching open job postings. This said
  // canHireTalent while nav.ts offered the same route to providers, so the rail
  // showed a provider "Find Work" and the gate then bounced them to
  // /dashboard?noaccess=1. Found by wiring the Home search box at it (E134) and
  // walking into the redirect. The nav was right; the gate was wrong.
  { prefix: "/find-work", requires: "canProvideServices" },
  /*
    /work/new is the BUYER's create-work-request, and longest-prefix-wins means
    it would otherwise inherit /work's provider gate — which the previous brief
    changed from canHireTalent to canProvideServices to unbreak Find Work.
    That silently broke the other side: the buyer onboarding flow ends by
    routing to /work/new, so a buyer who had just finished signing up was sent
    straight to /dashboard?noaccess=1.

    Two different jobs share the /work prefix: FIND work (provider) and POST
    work (buyer). This is the more specific of the two and has to say so.
  */
  { prefix: "/find-work/new", requires: "canHireTalent" },
  { prefix: "/reports", requires: "canHireTalent" },
  { prefix: "/search", requires: "authenticated" }, // rail stub (E134)
  /* ⚠ `/contracts` -> `/orders` (`P1-ALL-E380`). Gate unchanged. */
  /*
    ⚠ `authenticated` IS THE CORRECT GATE AND `P1-J4-E393` CONFIRMED IT RATHER
    THAN CHANGING IT. **BOTH RAILS POINT AT `/orders`** — `REQUESTER_NAV` with
    `requires: "canHireTalent"`, `PROVIDER_NAV` with none — so a capability gate
    on either side would refuse the other, which is the offered-then-refused
    class this map's own comments record five times.
    ⚠⚠ THE SCOPE IS PER-ORDER, NOT PER-ROLE. `lib/orders.ts` asks which side of
    THIS order the viewer is on, because one person can be the buyer on one order
    and the provider on another. A role gate cannot express that.
    ⚠ SUPERSEDED, quoted not deleted: this line read `// rail stub (E134)`. It is
    no longer a stub — `/orders` and `/orders/[id]` are built.
  */
  { prefix: "/orders", requires: "authenticated" },
  /*
    ⚠ REGISTERED BY `P1-J4-E394`. `/pay` is the BUYER's Payments surface and was
    gated ONLY by its own `guardPage` — layer three of three, with the edge never
    running on it. Its sibling `/finances` has been in this map since `E134`; the
    two are mirrored routes (`nav.ts`: *"the href is `/pay` on this side and
    `/finances` on the provider's"*) and only one of them was here.
    ⚠ `canHireTalent` MATCHES `REQUESTER_NAV`'s OWN `requires` on that item, which
    is what `check:nav-reachable` compares. The provider's mirror stays
    `authenticated`, because `PROVIDER_NAV` declares no capability on it.
    ⚠⚠ PAIRED WITH `proxy.ts` — the spec parses that literal and fails in BOTH
    directions if the two disagree.
  */
  { prefix: "/pay", requires: "canHireTalent" },
  /* ⚠ SUPERSEDED, quoted not deleted: this line read `// rail stub (E134)`. It is
     no longer a stub — `/finances/payment-requests` and its detail are built. */
  { prefix: "/finances", requires: "authenticated" },
  { prefix: "/messages", requires: "authenticated" }, // shared buyer ↔ provider
  /*
    WS1-B — the rail's Community and Sell-My-Services submenus land here.
    `/community` had no map entry at all, so the edge skipped it entirely and
    the pages were relying on their own `guardPage`. That is the authoritative
    gate either way, but a route the map doesn't know about is one the fast
    first line silently doesn't run on.
  */
  { prefix: "/community", requires: "authenticated" },
  /*
    ⚠ "/services/offers", NOT "/services".

    The prefix used to be bare "/services", which was correct while the only
    thing under it was the provider's own offers page. The public nav item then
    took /services (nav model 2026-08-12) — and a
    canProvideServices gate on the bare prefix bounced every logged-out visitor
    who clicked Packages straight to /login.

    Narrowed rather than removed: /services/offers is still seller-only.
  */
  { prefix: "/services/offers", requires: "canProvideServices" },
  { prefix: "/dashboard", requires: "authenticated" }, // role-aware content, not gated
];

/**
 * The required capability for a path, or null if the path is not a mapped
 * protected route. Longest-prefix-wins so `/settings/x` beats a shorter match.
 */
export function requirementForPath(pathname: string): RouteRequirement | null {
  let best: { prefix: string; requires: RouteRequirement } | null = null;
  for (const entry of ROUTE_ACCESS) {
    if (pathname === entry.prefix || pathname.startsWith(entry.prefix + "/")) {
      if (!best || entry.prefix.length > best.prefix.length) best = entry;
    }
  }
  return best ? best.requires : null;
}

/** The flag set both a JWT token and a Viewer can supply for a check. */
export type CapabilityFlags = {
  isSystemAdmin: boolean;
  isServiceBuyer: boolean;
  isServiceProvider: boolean;
  isServiceCoordinator: boolean;
  isSupport: boolean;
};

/**
 * Does a flag set satisfy a requirement? `authenticated` is true by definition
 * — the caller must have already established a token/session before calling.
 * Capabilities are literal (no admin auto-grant); see access.ts.
 */
export function meetsRequirement(
  flags: CapabilityFlags,
  req: RouteRequirement
): boolean {
  switch (req) {
    case "authenticated":
      return true;
    case "canAdminister":
      return flags.isSystemAdmin;
    case "canHireTalent":
      return flags.isServiceBuyer;
    case "canProvideServices":
      return flags.isServiceProvider;
    case "canCoordinate":
      return flags.isServiceCoordinator;
    case "canSupport":
      return flags.isSupport;
  }
}

/**
 * Proxy `matcher` patterns derived from the map, so the edge runs on exactly the
 * mapped prefixes and the two can't drift. NOTE: Next reads `config.matcher`
 * statically — keep the literal in proxy.ts in sync with this and the test in
 * that file's comment. Exposed here for reference/tests.
 */
export const PROTECTED_PREFIX_MATCHERS = ROUTE_ACCESS.map(
  (e) => `${e.prefix}/:path*`
);
