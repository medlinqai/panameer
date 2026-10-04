import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { IntegrateHero } from "@/components/marketing/IntegrateHero";
import { IntegrateSpine } from "@/components/marketing/IntegrateSpine";

export const metadata: Metadata = {
  title: "Enterprise ERP Integration — Panameer",
  description:
    "Search, request, order and settle services from inside Oracle Cloud, SAP " +
    "and other systems of record — without leaving your ERP.",
};

export default function EnterprisePage() {
  return (
    <MarketingShell>
      {}
      <IntegrateHero />
      {}
      {}
      <IntegrateSpine />
      {}
      {}
    </MarketingShell>
  );
}
