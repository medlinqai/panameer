import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";

/**
 * Public Learn chrome (brief_learn_v1 WS2).
 *
 * A TOP nav, no left rail — per design doc §6 the public shell is the front-door
 * shape and the left role-nav belongs to signed-in pages. WS3 builds the real
 * two-shell system app-wide; this is the minimum that makes /learn look like a
 * public page rather than an orphan, and WS3 replaces it rather than adding a
 * second definition beside it.
 */
export default function LearnLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white font-body text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-8 px-6 py-5">
          {/* `Logo` links to "/" itself — wrapping it in another Link nests an
              <a> inside an <a>, which the browser silently un-nests and React
              then reports as a hydration mismatch on every Learn page. */}
          <Logo priority />
          <nav className="ml-auto flex items-center gap-7 text-[15px] font-semibold">
            <Link href="/learn" className="text-magenta">
              Learn
            </Link>
            <Link href="/login" className="text-ink-2 transition-colors hover:text-magenta">
              Log In
            </Link>
            <Link
              href="/join"
              className="rounded-full bg-magenta px-5 py-2.5 font-bold text-white transition-colors hover:bg-magenta-dark"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-6 py-6 text-[13.5px] text-ink-2">
          Panameer Learn — free courses on Oracle Cloud and the work around it.
        </div>
      </footer>
    </div>
  );
}
