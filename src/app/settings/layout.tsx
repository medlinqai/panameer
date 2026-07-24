import Link from "next/link";
import Image from "next/image";
import { SettingsNav } from "@/components/settings/SettingsNav";

/**
 * Settings shell — a focused two-pane area (its own left sub-nav + content),
 * behind the proxy auth gate. Deliberately does NOT mount the global app
 * top-nav (a separate, later brief); it has only the Settings sub-nav.
 */
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white font-body text-ink">
      <header className="border-b border-line px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-4">
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

      <div className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="mb-6 text-[26px] font-extrabold tracking-[-0.5px]">
          Settings
        </h1>
        <div className="grid gap-8 md:grid-cols-[220px_1fr]">
          <aside className="md:sticky md:top-8 md:self-start">
            <SettingsNav />
          </aside>
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
