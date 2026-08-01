import type { ReactNode } from "react";
import { PublicTopNav } from "@/components/PublicTopNav";
import { MeProvider } from "@/components/MeProvider";
import { SideRail } from "@/components/SideRail";
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
export default async function LearnLayout({ children }: { children: ReactNode }) {
  const viewer = await getSessionViewer();

  if (viewer) {
    return (
      <MeProvider>
        <SideRail>{children}</SideRail>
      </MeProvider>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white font-body text-ink">
      <PublicTopNav />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-6 py-6 text-[13.5px] text-ink-2">
          Panameer Learn — free courses on Oracle Cloud and the work around it.
        </div>
      </footer>
    </div>
  );
}
