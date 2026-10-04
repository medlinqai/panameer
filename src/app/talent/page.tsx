import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { TalentHero } from "@/components/marketing/TalentHero";
import { TalentSpine } from "@/components/marketing/TalentSpine";

export const metadata: Metadata = {
  title: "Hire Pre-Vetted Oracle & Enterprise Experts, Direct — Panameer",
  description:
    "Search real, rated experts by the system they actually run. Engage for " +
    "two hours or six months — one contract, one payment, no employment risk " +
    "— and punch out for services straight from your ERP.",
};

export default function HireTalentPage() {
  return (
    <MarketingShell>
      <TalentHero />
      {}
      <TalentSpine />
      {}
      {}
      {}
    </MarketingShell>
  );
}
