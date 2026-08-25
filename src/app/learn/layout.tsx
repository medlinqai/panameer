import type { ReactNode } from "react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MeProvider } from "@/components/MeProvider";
import { AppShell } from "@/components/casing/AppShell";
import { getSessionViewer } from "@/lib/session";

/**
 * Learn's chrome — WHICHEVER SHELL FITS THE VIEWER (brief_learn_experience WS1).
 *
 * Learn is the one surface that is both a public front door and a signed-in app
 * area, and the design ref shows it inside the left rail. So the shell is chosen
 * here, at the layout, rather than by giving Learn two URLs: the same /learn
 * link then works from the marketing site and from the app rail, a visitor who
 * signs up mid-course lands back where they were, and no route has to redirect
 * anyone anywhere.
 *
 * The alternative — /learn public, /app/learn signed-in — would have been two
 * routes to keep in step, two sets of links to get right, and a course URL that
 * showed a stranger's chrome to whoever it was shared with.
 */
export default async function LearnLayout({
  children,
}: {
  children: ReactNode;
}) {
  const viewer = await getSessionViewer();

  if (viewer) {
    return (
      <MeProvider>
        <AppShell>{children}</AppShell>
      </MeProvider>
    );
  }

  return (
    /*
      WS-5 — `marketing-surface` on the PUBLIC branch. Two things come with it
      and both are wanted: the `text-wrap` defaults (balance on headings, pretty
      on prose) that the rest of the public site uses, and the pinned light
      palette. Scott's call is that /learn stays visible and reads as one
      product with the home; sharing the surface class is most of what makes
      that true without theming anything twice.

      The SIGNED-IN branch above keeps AppShell and the app's own theme — a
      logged-in learner is inside the product, not on the marketing site.
    */
    <div className="marketing-surface flex min-h-screen flex-col bg-white font-body text-ink">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      {/*
        ⚠ THE REAL FOOTER, NOT A STUB (E223). This was a one-line
        "Panameer Learn — free courses…" strip, which is fine under a catalog and wrong
        under a sales page: every other public page ends in the full footer and a visitor
        who scrolls to the bottom of a pitch expects the same destinations.

        ⚠ IMPORTED IN PLACE RATHER THAN MOVED. `HomeFooter`'s header comment claims
        `app/page.tsx` is its only importer and that was TRUE when checked — so it could
        have been lifted to `components/marketing/` under a neutral name. It was not,
        because moving it edits `/`, which is walked and stable, to gain nothing but a
        better filename. ONE footer, two callers. The name is now slightly wrong and that
        is the cheaper of the two errors.
      */}
      {/*
        ⚠ `HomeFooter` NOW BRINGS ITS OWN STYLESHEET AND ITS OWN `.pm-home` SCOPE
        (`P1-ALL-E013`) — this layout renders it plainly and correctly. Read that
        component's header before adding a fourth caller; the reason it is
        self-contained is that this page proved a caller can forget.
      */}
      <MarketingFooter />
    </div>
  );
}
