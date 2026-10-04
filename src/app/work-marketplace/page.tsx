import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { ComingSoon } from "@/components/ComingSoon";

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
