import { Hero } from "@/components/marketing/Hero";
import { Announcement } from "@/components/marketing/Announcement";
import { ForkChooser } from "@/components/marketing/ForkChooser";
import { WhyPanameer } from "@/components/marketing/WhyPanameer";
import { MarketingShell } from "@/components/marketing/MarketingShell";

/**
 * The combined landing (E051, WS-C).
 *
 * Only reachable on the marketing hosts (panameer.com / www) — every other host
 * redirects `/` into the app. See `src/proxy.ts`.
 *
 * ITS JOB IS TO ORIENT AND FORK, and it is short because that is a small job.
 * What used to be here was eight sections trying to sell a two-sided
 * marketplace in one scroll: Learn, Packages, Providers, How It Works,
 * Punchout, Pricing. Each was written for one audience and read as noise to the
 * other, and a buyer scrolling for pricing had to pass a Learn catalogue and a
 * Creator recruit to reach it. Those sections did not get worse — they moved to
 * the page where their reader is (/for-buyers, /for-providers).
 *
 * WHAT IS LEFT is the sequence a stranger needs: what this is (hero), why here
 * (Why Panameer), and which door is yours (the chooser). The ribbon rides above
 * all three.
 *
 * E047 — THE PROVIDERS DOMAIN GRID IS CUT ENTIRELY, not moved. Eight
 * application names in boxes was a coverage claim with nothing behind it: the
 * tiles were labels, not links, because there is no per-application browse to
 * send anyone to. On a page whose whole job is now to fork, a section that
 * neither forks nor leads anywhere is the first thing that should go.
 */
export default function Home() {
  return (
    <MarketingShell audience="neutral">
      {/*
        No `audience` — the combined landing is the one page where the hero's
        own hire/work toggle still drives the subhead, because it is the one
        page where the reader has not chosen.
      */}
      <Hero />
      {/*
        E069 — THE RIBBON SITS BELOW THE HERO NOW. Above it, the page opened on
        three stacked full-width strips — dev banner, Focus strip, magenta
        ribbon — before a visitor reached a single word of the actual page.
        Three notices in a row is not emphasis, it is a queue. Below the hero it
        is the first thing after the pitch, which is where a claim about the
        community economy actually lands.
      */}
      <Announcement />
      <WhyPanameer />
      <ForkChooser />
    </MarketingShell>
  );
}
