import { Hero } from "@/components/marketing/Hero";
import { WhyPanameerPrimer } from "@/components/marketing/WhyPanameerPrimer";
import { Announcement } from "@/components/marketing/Announcement";
import { ForkChooser } from "@/components/marketing/ForkChooser";
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
 * E073 — AND WHY PANAMEER LEFT TOO. It was the last section here that tried to
 * argue rather than route, and the argument cannot be made neutrally: a buyer's
 * reason to be here is not a provider's, and the version that serves both is
 * the version that lands with neither. It still renders on both fork pages,
 * where it can pick a side.
 *
 * WHAT IS LEFT is the shortest honest version of this page: what this is
 * (hero), and which door is yours (the chooser). Two sections. Everything else
 * on the site is downstream of that choice, so making it is the whole job.
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
      <WhyPanameerPrimer />
      <ForkChooser />
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
