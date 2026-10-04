import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { LegalDocNav } from "@/components/legal/LegalDocNav";

export function LegalPlaceholder({
  title,
  version,
  audience,
  self,
}: {
  title: string;
  version: string;
  audience: string;
  /** Slug for the document list's current-page highlight. */
  self?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white font-body text-ink">
      {}
      <MarketingHeader />

      {}
      <div className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-10 px-6 py-12 lg:flex-row lg:gap-12">
        <aside className="order-2 w-full shrink-0 border-t border-line pt-8 lg:order-1 lg:w-[248px] lg:border-0 lg:pt-0">
          <LegalDocNav current={self} />
        </aside>

        <main className="order-1 min-w-0 max-w-3xl flex-1 lg:order-2">
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
    </div>
  );
}
