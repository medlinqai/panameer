import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import Link from "next/link";
import { notFound } from "next/navigation";
import { POLICIES, findPolicy } from "@/lib/policies";

export function generateStaticParams() {
  return POLICIES.map((p) => ({ slug: p.slug }));
}

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const policy = findPolicy(slug);
  if (!policy) notFound();

  return (
    <>
      {}
      <MarketingHeader />
    <main className="min-h-screen bg-white px-6 py-12 font-body text-ink">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-[32px] font-bold tracking-[-0.6px]">
          {policy.title}
        </h1>
        <p className="mt-4 text-[16.5px] leading-relaxed text-ink-2">
          {policy.summary}
        </p>

        <div className="mt-8 rounded-brand border border-dashed border-line p-5">
          <p className="text-[14.5px] font-bold">This document is being written.</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">
            The full text is with Panameer&apos;s counsel and will be published
            here before transactions go live. Until then, the summary above is
            what the policy will cover, and the terms you agreed to at sign-up
            remain the binding agreement.
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-[14px] font-semibold">
            <Link href="/terms" className="text-magenta hover:underline">
              Terms of Use
            </Link>
            <Link href="/user-agreement" className="text-magenta hover:underline">
              User Agreement
            </Link>
            <Link href="/privacy" className="text-magenta hover:underline">
              Privacy Policy
            </Link>
            <Link href="/support/bug" className="text-magenta hover:underline">
              Report a problem
            </Link>
          </div>
        </div>
      </div>
    </main>
    </>
  );
}
