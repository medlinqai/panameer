import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
    E154 — "Can't read PDFs".

    PDF extraction was written and worked in bare Node, but every upload failed
    inside the app and collapsed to the generic "try the .docx" message, which
    is the same thing a genuinely unreadable file says. The cause was this file
    being empty: without `serverExternalPackages`, Next BUNDLES pdf-parse and
    the pdfjs-dist it wraps, and pdfjs' worker plus its dynamic requires do not
    survive bundling.

    Leaving them external keeps them as ordinary node_modules requires at
    runtime, which is the arrangement they were tested under.
  */
  serverExternalPackages: ["pdf-parse"],

  /*
    /for-buyers IS `/` NOW (brief_home_rebuild_08_09).

    The buyer page moved to the root and the old route was deleted. It has been
    linked from the header, the footer and three walks' worth of notes, so it
    redirects rather than 404s — permanently (308), which is also what tells a
    crawler the root has absorbed it instead of leaving two URLs competing for
    the same content.

    Done here rather than as a page that calls redirect(): this is a routing
    fact, it costs no render, and it leaves no file for someone to mistake for
    a page.
  */
  /*
    ⚠ MENU LABEL == PAGE ROUTE (E029), WHICH MEANT TWO RENAMES.

    Same reasoning as /for-buyers above: the old paths are linked from the
    footer, the Learn categories anchor and several walks' worth of notes, and
    they may be indexed — so they redirect rather than 404, permanently (308),
    which also tells a crawler the new path has absorbed the old one instead of
    leaving two URLs competing for the same page.

    ⚠ EXACT PATHS, NOT `/:path*`. "/services" is deliberately not a wildcard:
    `/services/offers` is a DIFFERENT, authenticated route living under
    `src/app/(app)/services/offers/`, and a wildcard here would have swallowed it
    and redirected a provider's own offers page to the public marketing stub.

    The hash survives on its own — a fragment is never sent to the server, so the
    browser re-applies it to the redirect target. `/for-providers#learn` lands on
    `/find-work#learn`. Verified in a browser, not assumed.
  */
  async redirects() {
    /*
      ── ⚠⚠⚠ THE HOME PAGE IS THE TRACKER UNTIL R1 (`P2-ALL-E787`) ───────────

      ⚠ **SCOTT, 2026-10-03:** the status page becomes the front door until the
      public beta. ⚠⚠ **IT IS BEHIND AN ENVIRONMENT SWITCH** so it can be turned
      off without a code change — `HOME_SHOWS_STATUS=1` in Vercel Production,
      then a **REDEPLOY**, because `redirects()` is evaluated when the server
      starts and not per request.

      ⚠⚠ **THE SWITCH IS READ HERE, INSIDE `redirects()`, AND THAT IS DELIBERATE
      AND TESTABLE.** A node harness calls this function twice with the variable
      toggled and asserts the rule appears and disappears — no second server, no
      second port. ⚠ Read at module scope it would be baked before any test could
      change it.

      ⚠ **307, NOT 308.** `permanent: false` — this is "until R1", and a browser
      that cached a permanent redirect would keep sending people to the tracker
      after the marketplace opened. ⚠⚠ That is not a detail: a 308 is a promise
      you cannot take back from a cache you do not control.

      ⚠⚠⚠ **`app.panameer.com` IS NOT IN THE HOST CONDITION.** `E780` included it
      for `/status`, and including it here would redirect the APP's root — the
      signed-in dashboard door — to a public marketing page. ⚠ Nor does it match
      localhost or a Vercel preview, so a developer's `/` and every preview build
      are untouched.

      ⚠⚠ **THE ALTERNATION IS GROUPED, AND `E780` IS WHY.** Next compiles
      `has.value` as `new RegExp("^" + value + "$")`
      (`prepare-destination.js:45`), and alternation binds loosest — so an
      UNGROUPED `www\.panameer\.com|panameer\.com` anchors only one end and
      matches `panameer.com.evil.net`. The non-capturing group fixes both ends to
      the whole alternation.
    */
    const homeShowsStatus = process.env.HOME_SHOWS_STATUS === "1";
    return [
      // R1: Teams and recruiter-only pages are off (data kept).
      // Connect (2026-10-08): every Connect page moved under /connect/; old links forward (308).
      { source: "/community/teams/:path*", destination: "/connect/community", permanent: true },
      { source: "/community/teams", destination: "/connect/community", permanent: true },
      { source: "/community/grow", destination: "/connect/leaders", permanent: true },
      { source: "/community/forums/:path*", destination: "/connect/groups/:path*", permanent: true },
      { source: "/community/colleagues/:path*", destination: "/connect/connections/:path*", permanent: true },
      { source: "/community/colleagues", destination: "/connect/connections", permanent: true },
      { source: "/community", destination: "/connect/community", permanent: true },
      { source: "/community/:path*", destination: "/connect/:path*", permanent: true },
      { source: "/recommendations", destination: "/connect/recommendations", permanent: true },
      { source: "/invite-colleague", destination: "/connect/invite", permanent: true },
      { source: "/recommendations/:path*", destination: "/connect/recommendations/:path*", permanent: true },
      { source: "/coordinator/:path*", destination: "/dashboard", permanent: true },
      // C-E003: Colleagues became Connections.

      // C-E002: status.panameer.com serves only the status page; everything else 308s to the app.
      {
        source: "/:path((?!status(?:/|$)|api/status/|api/auth/|_next/|brand/|favicon|.*\\.[a-z0-9]+$).+)",
        has: [{ type: "host" as const, value: "status.panameer.com" }],
        destination: "https://app.panameer.com/:path",
        permanent: true,
      },
      ...(homeShowsStatus
        ? [
            {
              source: "/",
              has: [{ type: "host" as const, value: "(?:www\\.)?panameer\\.com" }],
              destination: "https://status.panameer.com/",
              permanent: false,
            },
          ]
        : []),
      { source: "/for-buyers", destination: "/", permanent: true },
      /*
        ⚠⚠ REPOINTED BY THE ROUTE SWAP (`P1-ALL-E017`). This said `/find-work`, which
        WAS the public marketing page. After the swap `/find-work` is the SIGNED-IN
        provider feed, so a legacy `/for-providers` link would have 308'd to a route
        that immediately 307s to `/login`. ⚠ THE PUBLIC PAGE IS `/work` NOW.
      */
      { source: "/for-providers", destination: "/work", permanent: true },
      /*
        ⚠⚠ FIXED 2026-08-26 (`P1-ALL-E023`). The destination is `/shop`.
          SUPERSEDED: this read `destination: "/buy-services"`, and `/buy-services`
          was renamed to `/shop` by `P1-ALL-E017`, so `/services` 308'd to a 404.
        ⚠ A 308 IS CACHED BY BROWSERS AND CRAWLERS, which made it worse than a bare
        404 — a client that saw it once kept sending people there without asking the
        server again. ⚠ STILL NOT A WILDCARD, for the reason above: `(app)/services/offers`
        is a different authenticated route and `/:path*` here would swallow it.
      */
      /*
        ⚠⚠⚠ REPOINTED TO `/marketplace` (`P2-ALL-E698`). `/shop` IS AN APPLICATION
        ROUTE NOW, so leaving this would 308 an ANONYMOUS visitor straight into a
        guarded route — a redirect whose destination refuses its own traffic.
        ⚠ SUPERSEDED, quoted not deleted (`E164`):
        //   { source: "/services", destination: "/shop", permanent: true },
      */
      { source: "/services", destination: "/marketplace", permanent: true },
      /*
        ⚠⚠⚠ `/service-products` 404ed BETWEEN `E698` AND HERE, AND THAT WAS REPORTED
        RATHER THAN HIDDEN. `E698` WS-B freed the name — its brief assumed an app
        catalogue page that does not exist — and nothing claimed it.
        ⚠ **308 TO `/shop`, WHICH IS WHERE A BUYER BROWSES TODAY.** The URL is in
        history, in notes and in anything already shared, and a 404 on a route that
        worked yesterday reads as a regression rather than a restructure.
        ⚠⚠ **WHETHER A DISTINCT BUYER-FACING BROWSE PAGE EARNS THIS NAME IS `A1`'s TO
        DECIDE, NOT THIS REDIRECT'S** (Scott, 2026-09-28). ⚠ When one exists, this line
        comes out in the commit that adds it.
        ⚠ `permanent: true` (308), the house pattern for a moved route — and note it is
        CACHED, so reversing it later is not instant for anyone who followed it once.
      */
      { source: "/service-products", destination: "/shop", permanent: true },
      /*
        ── ⚠⚠⚠ `/community/forums` → `/community/groups` (`P2-A3-E619` WS-C) ──

        ⚠ SCOTT, RULING 1: *"The word is Groups everywhere."* The words came off
        the screen first; this moves the URL to match, so a member who reads
        `Groups` and looks at the address bar sees the same word.

        ⚠⚠ IT IS A WILDCARD HERE, AND THAT IS SAFE — UNLIKE `/services` ABOVE.
        The whole subtree moved: `/community/forums`, `/community/forums/<slug>`
        and `/community/forums/thread/<id>` are the only routes that ever lived
        under it, and **all three moved together**. ⚠ Nothing authenticated was
        left behind for `:path*` to swallow, which is the exact hazard the
        `/services` note warns about.

        ⚠⚠⚠ THE API TREE IS UNTOUCHED AND MUST STAY THAT WAY. `/api/community/
        forums` is a different surface with its own callers; renaming a page
        route does not rename an endpoint, and a redirect here never sees it —
        `source` is matched against the request path, and `/api/...` does not
        start with `/community/`.

        ⚠ `permanent: true` (308), matching the house pattern for a moved route
        (`/finances` → `/payments`, `/settings/packages` → `/my-services`).
        ⚠⚠ A 308 IS CACHED, so this line is effectively permanent — which is
        correct for a rename Scott has ruled, and is why it is a rename rather
        than a copy.
      */
      // `/community/forums` now forwards straight to /connect/groups (see the Connect block above).
      /*
        ── ⚠⚠⚠ `/stats` → `/usage` (`P2-A1.1-E730` WS-A) ──────────────────────

        ⚠ SCOTT, 2026-09-30: the page is called **Usage**. ⚠⚠ THE TAB ROW HAS SAID
        `Usage` SINCE `E603` AND THE ROUTE AND THE BROWSER TITLE STILL SAID `Stats` —
        three names for one page, which is `E533`'s rule (a verb in the menu, a noun
        in the URL) failing on the noun.

        ⚠⚠ IT IS A WILDCARD AND THAT IS SAFE HERE, FOR THE REASON THE `/services` NOTE
        ABOVE GIVES: `src/app/(app)/stats/` held **exactly one file**, `page.tsx`, and
        it moved. ⚠ There is no `/stats/<anything>` route left behind for `:path*` to
        swallow, and nothing authenticated sits under the name.
        ⚠ The QUERY STRING survives a 308 on its own — `/stats?trend=network&period=90d`
        lands on `/usage?trend=network&period=90d`, which matters because
        `StatisticsCards`' trend links carry both params.

        ⚠⚠ `permanent: true` (308), the house pattern for a moved route, and **CACHED** —
        so this is effectively irreversible for anyone who follows it once. Correct for
        a rename Scott has ruled.
        ⚠ `route-access.ts` and `proxy.ts`'s matcher MOVED WITH IT, in this same commit.
        The proxy spec parses that literal and fails if the two disagree in either
        direction, so they cannot be split.
      */
      // Account areas (Scott 2026-10-05): old company + settings URLs land on their new tab.
      { source: "/company/settings", destination: "/company", permanent: true },
      { source: "/company/teams", destination: "/company/people", permanent: true },
      { source: "/company/terms", destination: "/company/legal#legal-tax", permanent: false },
      { source: "/settings", destination: "/settings/notifications", permanent: true },
      { source: "/settings/company", destination: "/company", permanent: true },
      { source: "/settings/tax", destination: "/settings/withdrawals/w9", permanent: true },
      { source: "/settings/preferences", destination: "/settings/contact", permanent: true },
      { source: "/settings/accounts", destination: "/settings/contact", permanent: true },
      { source: "/settings/connect", destination: "/settings/security", permanent: true },
      { source: "/settings/id-badge", destination: "/settings/identity", permanent: true },
      { source: "/stats/:path*", destination: "/usage/:path*", permanent: true },
      { source: "/stats", destination: "/usage", permanent: true },

      /*
        ── ⚠⚠⚠ ONE PLACE TO GO: `/status` LIVES ON THE STATUS HOST (`P2-ALL-E780`) ──

        ⚠ **SCOTT:** *"one place to go."* `panameer.com/status`,
        `www.panameer.com/status` and `app.panameer.com/status` all send the
        visitor to `https://status.panameer.com/`.

        ⚠⚠ **IT IS HERE AND NOT IN `src/proxy.ts`, DELIBERATELY.** `/status` is not
        in the proxy's `matcher` (measured: zero entries contain it), so the edge
        never runs on it. Adding it would mean editing that **static literal** —
        which `e2e-shell/app-shell.spec.ts` ("THE PUBLIC ALLOWLIST") parses out of
        the source and cross-checks against `ROUTE_ACCESS` in both directions.
        A `next.config` redirect leaves the matcher and that assertion untouched.

        ⚠⚠⚠ **IT CANNOT LOOP WITH THE STATUS-HOST REWRITE, FOR TWO INDEPENDENT
        REASONS.** `next.config` redirects run BEFORE the proxy and are evaluated
        on the INCOMING url, so the proxy's internal
        `rewrite(new URL("/status" + search, request.url))` never re-enters them —
        **and** the host condition below excludes `status.panameer.com` anyway.
        ⚠ Either one alone would be enough; both are true.

        ── ⚠⚠⚠ THE PATTERN IS GROUPED, AND THE UNGROUPED FORM WAS WRONG ──────────

        ⚠⚠ **NEXT COMPILES THIS AS `new RegExp(`^${value}$`)`** — read out of
        `next/dist/shared/lib/router/utils/prepare-destination.js`, not assumed.
        ⚠⚠⚠ **ALTERNATION BINDS LOOSEST, SO AN UNGROUPED VALUE ANCHORS ONLY ONE
        END OF EACH BRANCH.** The brief proposed
        `(www\\.)?panameer\\.com|app\\.panameer\\.com`, which compiles to
        `^(www\.)?panameer\.com` OR `app\.panameer\.com$` — i.e. *"starts with
        panameer.com"* or *"ends with app.panameer.com"*.
        ⚠ **MEASURED: that form matches `panameer.com.evil.net` AND
        `evil-app.panameer.com`.** The grouped form below matches neither, and both
        forms correctly exclude `status.panameer.com`, `localhost`,
        `status.localhost` and `*.vercel.app`.
        ⚠ SUPERSEDED, quoted not deleted (`E164`) — the brief's value:
        //   value: "(www\\.)?panameer\\.com|app\\.panameer\\.com"

        ⚠ **Next strips the port before matching** (`host.split(":", 1)[0]`), so a
        dev host with a port is compared as the bare hostname and still excluded.

        ⚠⚠ **TEMPORARY (307), NOT 308** (Scott): every other redirect in this file
        is permanent, and a browser caches a 308 hard. This one may still change.
        ⚠ **`/api/status` IS UNAFFECTED** — `source` is an exact path match:
        `/status` ✓, `/api/status` ✗, `/status/x` ✗, `/statuses` ✗.
        ⚠ **The query is carried through by Next automatically** — measured on the
        existing `/stats` rule: `/stats?follow=1&x=2` → `/usage?follow=1&x=2`.
        That is what keeps `?follow=1` alive across the hop.
      */
      {
        source: "/status",
        has: [
          {
            type: "host",
            value: "(?:(?:www\\.)?panameer\\.com|app\\.panameer\\.com)",
          },
        ],
        destination: "https://status.panameer.com/",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
