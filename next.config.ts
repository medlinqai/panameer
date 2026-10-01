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
    return [
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
      {
        source: "/community/forums/:path*",
        destination: "/community/groups/:path*",
        permanent: true,
      },
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
      { source: "/stats/:path*", destination: "/usage/:path*", permanent: true },
      { source: "/stats", destination: "/usage", permanent: true },
    ];
  },
};

export default nextConfig;
