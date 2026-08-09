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
  async redirects() {
    return [{ source: "/for-buyers", destination: "/", permanent: true }];
  },
};

export default nextConfig;
