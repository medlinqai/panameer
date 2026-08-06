import { notFound } from "next/navigation";
import { LegalPage } from "@/components/legal/LegalPage";
import { SupplementNotice } from "@/components/legal/SupplementNotice";
import { USER_TOS_VERSION } from "@/lib/tos";
import { LEGAL_UPDATED } from "@/content/legal/meta";
import { SUPPLEMENTS } from "@/content/legal/supplements";
import { SUPPLEMENT_META } from "@/content/legal/supplement-meta";

/**
 * One legal supplement (brief_legal_supplements WS-A).
 *
 * All 19 are prerendered — they are static text, they are linked from the
 * footer, and they are exactly the pages a search engine or a procurement
 * reviewer fetches cold.
 *
 * A STUB DOCUMENT DOES NOT RENDER ITS SOURCE TEXT. Two of the 19 have source
 * text that would be actively wrong on a Panameer page — another company's
 * logo rules, and an escrow entity that does not exist — so those pages show
 * the notice INSTEAD of the document, not above it.
 */
export function generateStaticParams() {
  return SUPPLEMENTS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const meta = SUPPLEMENT_META[(await params).slug];
  return { title: meta ? `${meta.title} — Panameer` : "Legal — Panameer" };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = SUPPLEMENTS.find((s) => s.slug === slug);
  const meta = SUPPLEMENT_META[slug];
  if (!doc || !meta) notFound();

  const isStub = meta.notice?.kind === "stub";

  return (
    <LegalPage
      title={meta.title}
      version={USER_TOS_VERSION}
      updated={LEGAL_UPDATED}
      doc={isStub ? [] : doc.nodes}
      self={slug}
      summary={meta.summary}
      notice={meta.notice ? <SupplementNotice notice={meta.notice} /> : undefined}
      backHref="/legal"
      backLabel="← All legal documents"
    />
  );
}
