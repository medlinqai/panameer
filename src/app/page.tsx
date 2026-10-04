import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { HomeSections } from "@/components/marketing-home/HomeSections";
import { LogoRibbon } from "@/components/marketing-home/LogoRibbon";
import { Testimonials } from "@/components/marketing-home/Testimonials";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import "@/components/marketing-home/home.css";

export const metadata: Metadata = {
  title: "Optimize Your Business with AI — Panameer",
  description:
    "Discover exactly where AI can move the needle in your business — our free " +
    "maturity assessment benchmarks your current capabilities and shows you " +
    "where to focus first.",
};

export default function Home() {
  return (
    <>
      {}
      <MarketingHeader />
      <div className="pm-home">
        {}

        {}

        {}

        {}
        {}
        <HomeSections />
        {}
        {}

        {}
        {}
        {}
        <LogoRibbon />
        {}
        <Testimonials />
      </div>
      {}
      <MarketingFooter />
    </>
  );
}
