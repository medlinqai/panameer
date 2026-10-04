import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { ErpIntegration } from "@/components/marketing-home/ErpIntegration";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import "@/components/marketing-home/home.css";

export const metadata: Metadata = {
  title: "ERP Integration — Panameer",
  description:
    "Integrate seamlessly with the click of a button — how Panameer reaches " +
    "your ERP for fulfillment and settlement, and what it costs.",
};

export default function ErpIntegrationPage() {
  return (
    <>
      {}
      <MarketingHeader />
      <div id="punchout" className="pm-home pm-solo scroll-mt-[71px]">
        <ErpIntegration className="erpx-band" />
      </div>
      {}
      <MarketingFooter />
    </>
  );
}
