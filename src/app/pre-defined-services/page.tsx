import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { ErpPackages } from "@/components/marketing-home/ErpPackages";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import "@/components/marketing-home/home.css";

export const metadata: Metadata = {
  title: "Pre-Defined Services — Panameer",
  description:
    "Pre-built AI agents for Oracle applications — reports and dashboards, " +
    "price alerts, document validation, and extending your apps.",
};

export default function ServiceProductsPage() {
  return (
    <>
      {}
      <MarketingHeader />
      <div className="pm-home pm-solo">
        <ErpPackages />
      </div>
      {}
      <MarketingFooter />
    </>
  );
}
