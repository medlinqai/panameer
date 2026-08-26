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
      { source: "/services", destination: "/shop", permanent: true },
    ];
  },
};

export default nextConfig;
