import Link from "next/link";
import { Logo } from "@/components/Logo";
import { PUBLIC_NAV } from "@/lib/nav";
import { getSessionViewer } from "@/lib/session";

/**
 * The PUBLIC shell: a top nav, no sidebar (brief_learn_v1 WS3, design doc §6).
 *
 * Front-door shape. A visitor has one thing to do — look around and decide
 * whether to sign up — and a left rail on a marketing page reads like an app
 * they haven't joined.
 *
 * A signed-in visitor gets a way back into the app instead of "Log In / Get
 * Started": Learn is public, so people arrive here with a session and dropping
 * them at a signed-out header would look like they'd been logged out.
 */
export async function PublicTopNav() {
  const viewer = await getSessionViewer();

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-8 px-6 py-5">
        <Logo priority />
        <nav className="ml-auto flex items-center gap-7 text-[15px] font-semibold">
          {PUBLIC_NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-magenta">
              {item.label}
            </Link>
          ))}
          {viewer ? (
            <Link
              href="/dashboard"
              className="rounded-full bg-magenta px-5 py-2.5 font-bold text-white transition-colors hover:bg-magenta-dark"
            >
              Go to Panameer
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-ink-2 transition-colors hover:text-magenta">
                Log In
              </Link>
              <Link
                href="/join"
                className="rounded-full bg-magenta px-5 py-2.5 font-bold text-white transition-colors hover:bg-magenta-dark"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
