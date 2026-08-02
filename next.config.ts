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
};

export default nextConfig;
