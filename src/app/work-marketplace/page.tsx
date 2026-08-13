import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { ComingSoon } from "@/components/ComingSoon";

/**
 * /work-marketplace — the public "Work" nav destination (nav model 2026-08-12).
 *
 * ⚠ AN HONEST STUB, ON PURPOSE. This is the future work marketplace — custom
 * scoped work — and it is not built. The nav item is real and the route is
 * real; what is behind it says so plainly rather than showing an invented
 * listing.
 *
 * ⚠ THE URL IS /work-marketplace, NOT /work. `/work` is the authed provider
 * page inside `(app)` and does not move, and the domain vocabulary (Work
 * Request, Work Order, Work Package) is untouched. "Work" here is a visible
 * NAV LABEL only.
 *
 * The alternative was pointing it at /hire-talent, which already has its own
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
