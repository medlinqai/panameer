import type { Metadata } from "next";
import { Hero } from "@/components/marketing/Hero";
import { Announcement } from "@/components/marketing/Announcement";
import { WhyPanameer } from "@/components/marketing/WhyPanameer";
import { LearnFree } from "@/components/marketing/LearnFree";
import { CreatorBand } from "@/components/marketing/CreatorBand";
import { AudienceCta } from "@/components/marketing/AudienceCta";
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
      <Hero audience="provider" />
      <WhyPanameer audience="provider" />
      <LearnFree />
      <CreatorBand />
      <AudienceCta audience="provider" />
      {/*
        E069 — THE RIBBON PARKS ABOVE THE FOOTER. It has now been at the top of
        the stack, then directly under the hero, and neither worked: at the top
        it was the third full-width strip before any content, and under the hero
        a solid magenta band immediately after the pitch read as heavier than
        the pitch. Down here it is a closing note rather than an interruption,
        which is the right weight for a claim about an economy that does not run
        yet. Explicitly temporary — final placement is a later call.
      */}
      <Announcement />
    </MarketingShell>
  );
}
