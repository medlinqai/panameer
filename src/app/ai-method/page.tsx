import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MethodologyRing } from "@/components/marketing-home/MethodologyRing";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import "@/components/marketing-home/home.css";

export const metadata: Metadata = {
  title: "AIM — The AI Method — Panameer",
  description:
    "Define, Design, Develop, Decide, Deploy — the five-stage AI Method " +
    "behind Panameer's continuous transformation cycle.",
};

export default function AiMethodPage() {
  return (
    <>
      {}
      <MarketingHeader />
      <div className="pm-home pm-solo">
        <MethodologyRing />
      </div>
      {}
      <MarketingFooter />
    </>
  );
}
