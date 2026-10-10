import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { certificateView } from "@/lib/certificates";
import { certificateImageUrl, issuedLabel, verifyUrl } from "@/lib/certificate-links";
import { getSessionViewer } from "@/lib/session";
import { CertificateCard } from "@/components/certificates/CertificateCard";
import { CertificateActions } from "@/components/certificates/CertificateActions";

export const dynamic = "force-dynamic";

// L-E059: the drill-back from LinkedIn — the certificate card, OG image of the same design.
export async function generateMetadata({ params }: { params: Promise<{ credentialId: string }> }): Promise<Metadata> {
  const c = await certificateView((await params).credentialId);
  if (!c) return { title: "Credential · Panameer" };
  const title = `${c.holder} — ${c.title} · Panameer Certificate`;
  const description = `Verified by Panameer: ${c.holder} passed the ${c.title} certification test on ${issuedLabel(c.issuedOn)}.`;
  const image = { url: certificateImageUrl(c.credentialId), width: 1200, height: 630, alt: `${c.title} — Panameer Certificate` };
  return {
    title,
    description,
    openGraph: { title, description, url: verifyUrl(c.credentialId), siteName: "Panameer", type: "website", images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

const BTN = "inline-flex min-h-11 items-center justify-center border border-ink px-5 text-[14px] font-semibold hover:bg-surface-hover";
const BTN_K = "inline-flex min-h-11 items-center justify-center bg-ink px-5 text-[14px] font-semibold text-surface hover:bg-ink-hover";

export default async function VerifyPage({ params }: { params: Promise<{ credentialId: string }> }) {
  const { credentialId } = await params;
  // Panameer-issued only: a self-reported row is a claim the member typed in, and this page vouches for what it shows.
  const c = await certificateView(credentialId);
  if (!c) notFound();
  const viewer = await getSessionViewer();
  const owner = viewer?.userId === c.userId;

  return (
    <div className="flex min-h-screen flex-col bg-white font-body text-ink">
      <MarketingHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
          <p className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.12em] text-magenta-dark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/panameer-mark-32.png" alt="" className="h-5 w-5" /> Verified by Panameer
          </p>
          <div className="mt-3">
            <CertificateCard title={c.title} holder={c.holder} issuedOn={c.issuedOn} credentialId={c.credentialId} score={c.score} correct={c.correct} total={c.total} />
          </div>

          <div className="mt-5 flex items-center gap-3">
            {c.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.photoUrl} alt="" className="h-14 w-14 rounded-full border border-line object-cover" />
            )}
            <p className="text-[15px]">
              <b>{c.holder}</b> passed the <b>{c.title}</b> certification test on {issuedLabel(c.issuedOn)}.
              <span className="block font-mono text-[12.5px] text-ink-2">Credential {c.credentialId}</span>
            </p>
          </div>

          {owner && (
            <div className="mt-5" data-owner-actions>
              <CertificateActions title={c.title} credentialId={c.credentialId} issuedOn={c.issuedOn.toISOString()} profileHref="/profile#credentials" />
            </div>
          )}

          {c.path && (
            <section className="mt-8 border-t border-line pt-5">
              <h2 className="text-[18px] font-bold">What {c.title} Covers</h2>
              <p className="mt-1 text-[14px] text-ink-2">The {c.title} Learning Path includes the following courses:</p>
              <ol className="mt-2 grid gap-1 text-[14px] text-ink sm:grid-cols-1">
                {c.path.courses.map((t, i) => <li key={`${i}-${t}`}>{i + 1}. {t}</li>)}
              </ol>
              {c.path.teacher && <p className="mt-3 text-[14px]">Taught by <b>{c.path.teacher}</b></p>}
            </section>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            {c.path?.published && <Link href={`/learn/${c.path.slug}`} className={BTN}>See the Path</Link>}
            {c.profileId && <Link href={`/providers/${c.profileId}`} className={BTN}>View Profile</Link>}
            <Link href="/training" className={BTN_K}>Start Learning Free</Link>
          </div>

          <p className="mt-8 text-[13px] text-ink-2">Panameer issues this certificate after the member passes the path&apos;s certification test, and stands behind it.</p>
        </div>
      </main>
    </div>
  );
}
