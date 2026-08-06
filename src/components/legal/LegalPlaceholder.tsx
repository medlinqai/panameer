import Link from "next/link";
import { Logo } from "@/components/Logo";

/**
 * A legal document page that has no text yet (brief_company_model WS6).
 *
 * This WAS the only legal page component. `LegalPage` now renders real drafted
 * content, and the Company Terms have no drafted text — the brief loading the
 * user ToS and Privacy Policy says to leave the company agreement alone until
 * Scott provides its wording. So the honest empty state moved here rather than
 * being deleted, and the company page keeps saying exactly what it said before.
 *
 * NO INVENTED LEGAL TEXT. Terms are a commitment between Scott's company and
 * its users; drafting them is counsel's job, not this codebase's. When the real
 * document lands, drop it in and bump the version in `src/lib/tos.ts` — every
 * company is then asked to re-accept.
 */
export function LegalPlaceholder({
  title,
  version,
  audience,
}: {
  title: string;
  version: string;
  audience: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white font-body text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-3xl items-center px-6 py-5">
          <Logo priority />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <p className="text-[12.5px] font-bold uppercase tracking-wide text-ink-2">
          Version {version}
        </p>
        <h1 className="mt-1 font-display text-[32px] font-bold tracking-[-0.6px]">
          {title}
        </h1>

        <div className="mt-6 rounded-brand border-[1.5px] border-dashed border-line p-6">
          <p className="text-[16px] font-bold">
            This document isn&apos;t published yet.
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
            The {audience} are being drafted. Until they are published, the
            acceptance we record against version <b>{version}</b> is a
            placeholder marker, not agreement to specific terms — and when the
            real document lands, everyone is asked to accept it again.
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
            Questions in the meantime:{" "}
            <a
              href="mailto:hello@panameer.com"
              className="font-semibold text-magenta hover:underline"
            >
              hello@panameer.com
            </a>
            .
          </p>
        </div>

        <Link
          href="/"
          className="mt-8 inline-flex text-[14.5px] font-bold text-magenta hover:underline"
        >
          ← Back to Panameer
        </Link>
      </main>
    </div>
  );
}
