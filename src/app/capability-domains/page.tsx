import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { CapabilityFramework } from "@/components/marketing-home/CapabilityFramework";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import "@/components/marketing-home/home.css";

export const metadata: Metadata = {
  title: "Optimize by Capability Domain — Panameer",
  description:
    "The ten capability domains behind the Panameer assessment, and the " +
    "Capability Domain Scorecard it produces.",
};

export default function CapabilityDomainsPage() {
  return (
    <>
      {}
      <MarketingHeader />
      <div className="pm-home pm-solo">
        <CapabilityFramework />
      </div>
      {}
      <MarketingFooter />
    </>
  );
}
