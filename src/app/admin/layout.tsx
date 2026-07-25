import Link from "next/link";
import Image from "next/image";
import { AdminNav } from "@/components/admin/AdminNav";
import { guardPage } from "@/lib/guard";

/**
 * Platform Console shell (brief_M) — a focused admin two-pane area with its OWN
 * left rail, NOT the buyer/provider app nav. AUTHORITATIVE server gate:
 * canAdminister (brief_J), the edge proxy being the fast first line. Fail closed.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await guardPage("canAdminister");
  return (
    <div className="min-h-screen bg-white font-body text-ink">
      <header className="border-b border-line px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <Link href="/" aria-label="Panameer home" className="flex items-center gap-3">
            <Image
              src="/brand/panameer-logo-transparent.png"
              alt="Panameer"
              width={786}
              height={111}
              priority
              className="h-8 w-auto"
            />
            <span className="hidden text-[14px] font-bold text-ink-2 sm:inline">
              Platform Console
            </span>
          </Link>
          <Link
            href="/dashboard"
            className="ml-auto text-[14px] font-bold text-ink-2 hover:text-magenta"
          >
            ← Back to App
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-8 md:grid-cols-[220px_1fr]">
          <aside className="md:sticky md:top-8 md:self-start">
            <AdminNav />
          </aside>
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
