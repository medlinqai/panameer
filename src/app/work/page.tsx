import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { WorkHero } from "@/components/marketing/WorkHero";
import { WorkSpine } from "@/components/marketing/WorkSpine";

export const metadata: Metadata = {
  title: "Sell Your Expertise Direct — Panameer",
  description:
    "Find consistent work and break the hourly ceiling. Sell consultations, " +
    "courses, service products and engagements under your own name — contracts, " +
    "compliance and settlement carried by the platform.",
};

export default function SellerPage() {
  return (
    <MarketingShell>
      <WorkHero />
      {}
      <WorkSpine />
      {}
      {}
    </MarketingShell>
  );
}
