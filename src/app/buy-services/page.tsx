import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { ComingSoon } from "@/components/ComingSoon";

/**
 * /services — the public "Packages" nav destination (nav model 2026-08-12).
 *
 * ⚠ AN HONEST STUB. Packages are productized services — buy a fixed scope at a
 * fixed price — and the public catalogue is not built.
 *
 * WHY /services AND NOT /packages: `(app)/packages` already owns `/packages`.
 * A route group adds no URL segment, so a second `src/app/packages` would be a
 * duplicate route and fail the build — and that authed page is the provider's
 * own packages, a different thing from a public catalogue. Scott's call: the
 * public item is labelled "Packages" and lives at /services; the authed route
 * is untouched.
 *
 * PUBLIC: marketing header only, no casing.
 */
export const metadata: Metadata = {
  title: "Packages — Panameer",
  description:
    "Productized services on Panameer — a fixed scope, a fixed price, a named expert.",
};

export default function ServicesPage() {
  return (
    <>
      <MarketingHeader />
      <main className="px-5 py-16 sm:px-8">
        <ComingSoon title="Packages" />
      </main>
    </>
  );
}
