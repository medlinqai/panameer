import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { ComingSoon } from "@/components/ComingSoon";

/**
 * /work-marketplace — the future work marketplace (nav model 2026-08-12).
 *
 * ⚠ AN HONEST STUB, ON PURPOSE. This is the future work marketplace — custom
 * scoped work — and it is not built. The route is real; what is behind it says
 * so plainly rather than showing an invented listing.
 *
 * ⚠⚠ IT IS NO LONGER THE `Work` NAV DESTINATION. `MARKETING_NAV`'s `Work` item
 * points at `/work`, which is a DIFFERENT ROUTE and a real public page. This one
 * is FOOTER-ONLY now, and `public-routes.ts` carries it as category 5 with
 * `STATUS: OPEN` — public today, unwalked, Scott has not confirmed it stays.
 *
 * ⚠⚠ SUPERSEDED 2026-08-26 (P1-ALL-E017 closed) — the dead claim, quoted:
 *   *"THE URL IS /work-marketplace, NOT /work. `/work` is the authed provider
 *    page inside `(app)` and does not move."*
 * ⚠ IT MOVED. `src/app/(app)/work/` NO LONGER EXISTS: the signed-in provider feed
 * is `/find-work` and `/work` is the PUBLIC BUYER page (`src/app/work/page.tsx`,
 * `○`, 200 signed out). The half of that note that still holds is the URL warning
 * — `/work-marketplace` IS STILL A DIFFERENT ROUTE FROM `/work` and must not be
 * merged into it — and the domain vocabulary (Work Request, Work Order, Work
 * Package) is still untouched.
 *
 * The alternative was pointing it at the Talent page, which already has its own
 * nav item. Two labels leading to one page teaches a visitor that the
 * nav is decorative.
 *
 * PUBLIC: marketing header only, no casing.
 */
export const metadata: Metadata = {
  title: "Work — Panameer",
  description:
    "Custom scoped work on Panameer — post the work and match with vetted experts.",
};

export default function WorkMarketplacePage() {
  return (
    <>
      <MarketingHeader />
      <main className="px-5 py-16 sm:px-8">
        <ComingSoon title="Work" />
      </main>
    </>
  );
}
