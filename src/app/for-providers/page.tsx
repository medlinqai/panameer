import type { Metadata } from "next";
import { Hero } from "@/components/marketing/Hero";
import { Announcement } from "@/components/marketing/Announcement";
import { WhyPanameer } from "@/components/marketing/WhyPanameer";
import { LearnFree } from "@/components/marketing/LearnFree";
import { CreatorBand } from "@/components/marketing/CreatorBand";
import { MarketingShell } from "@/components/marketing/MarketingShell";

/**
 * `/for-providers` — the earning side of the fork (WS-E).
 *
 * The arc a consultant travels, in order: what this is for you and why AI is
 * not the end of you (hero + the Bionic hook), the four beats as your career
 * rather than a buyer's purchase (Why Panameer, provider journey), the free
 * training that starts it (Learn), and the second thing you can sell once you
 * are good at the first (Creator band).
 *
 * THE RIBBON IS HERE AND NOT ON /for-buyers. Community Credits are earned by
 * building a profile, selling services and answering work — every one of those
 * is a provider verb.
 */
export const metadata: Metadata = {
  title: "Get Hired for Enterprise Systems and AI Work — Panameer",
  description:
    "Learn the applications free, earn certifications, build a profile buyers " +
    "can find, and get paid for the Enterprise Systems and AI work you do best.",
};

export default function ForProvidersPage() {
  return (
    <MarketingShell audience="provider">
      <Announcement />
      <Hero audience="provider" />
      <WhyPanameer audience="provider" />
      <LearnFree />
      <CreatorBand />
    </MarketingShell>
  );
}
