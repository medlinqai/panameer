import Link from "next/link";
import Image from "next/image";
import { guardPage } from "@/lib/guard";
import { CoordinatorConsole } from "@/components/coordinator/CoordinatorConsole";

/**
 * Minimal Service Coordinator surface (brief_I): an "Invite a Provider" action
 * + a "My Providers" roster. AUTHORITATIVE server gate via guardPage
 * (canCoordinate, brief_J) — non-coordinators are redirected. This is NOT the
 * full coordinator app/nav; just enough to launch invites and see results.
 */
export default async function CoordinatorPage() {
  await guardPage("canCoordinate");

  return (
    <div className="min-h-screen bg-white font-body text-ink">
      <header className="border-b border-line px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-4">
          <Link href="/" aria-label="Panameer home">
            <Image
              src="/brand/panameer-logo.png"
              alt="Panameer"
              width={786}
              height={111}
              priority
              className="h-8 w-auto"
            />
          </Link>
          <Link
            href="/dashboard"
            className="ml-auto text-[14px] font-bold text-ink-2 hover:text-magenta"
          >
            ← Back to dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="mb-1 text-[26px] font-extrabold tracking-[-0.5px]">
          Coordinator
        </h1>
        <p className="mb-6 text-ink-2">Build your team of service providers.</p>
        <CoordinatorConsole />
      </main>
    </div>
  );
}
