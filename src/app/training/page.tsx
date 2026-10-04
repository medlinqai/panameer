import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { LearnPublic } from "@/components/learn/LearnPublic";

export const metadata: Metadata = {
  title: "Training — Panameer",
  description:
    "Free Oracle Cloud courses: procurement, finance, supply chain and HR, taught by the people who implement them.",
};

export default function TrainingPage() {
  return (
    <MarketingShell>
      <LearnPublic />
    </MarketingShell>
  );
}
