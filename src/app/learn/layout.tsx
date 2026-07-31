import type { ReactNode } from "react";
import { PublicTopNav } from "@/components/PublicTopNav";

/**
 * Learn's public chrome (brief_learn_v1 WS3).
 *
 * Replaces the minimal top bar WS2 shipped as a placeholder — that one had its
 * own hand-rolled nav markup, which is the drift this workstream exists to
 * prevent. Learn now renders the shared `PublicTopNav`, whose items come from
 * the single nav definition in `lib/nav.ts`.
 */
export default function LearnLayout({ children }: { children: ReactNode }) {
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
