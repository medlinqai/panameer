import { notFound } from "next/navigation";
import { LegalPage } from "@/components/legal/LegalPage";
import { SupplementNotice } from "@/components/legal/SupplementNotice";
import { USER_TOS_VERSION } from "@/lib/tos";
import { LEGAL_UPDATED } from "@/content/legal/meta";
import { SUPPLEMENTS } from "@/content/legal/supplements";
import { SUPPLEMENT_META } from "@/content/legal/supplement-meta";

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
