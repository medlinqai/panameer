import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";

export const dynamic = "force-dynamic";

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ credentialId: string }>;
}) {
  const { credentialId } = await params;

  const cert = await prisma.certification.findFirst({
    // issued_from is part of the lookup, not just a column: a SELF_REPORTED row
    // is a claim the provider typed in, and this page vouches for what it shows.
    where: { credential_id: credentialId, issued_from: "LEARN" },
    select: {
      name: true,
      issuer: true,
      issued_on: true,
      credential_id: true,
      learningPath: { select: { title: true, slug: true, status: true } },
      user: {
        select: {
          person: { select: { first_name: true, last_name: true, photo_url: true } },
        },
      },
      providerProfile: { select: { id: true } },
    },
  });
  if (!cert) notFound();

  const person = cert.user.person ?? null;
  const holder =
    `${person?.first_name ?? ""} ${person?.last_name ?? ""}`.trim() || "This member";

  return (
    <div className="flex min-h-screen flex-col bg-white font-body text-ink">
      <MarketingHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-xl px-6 py-14">
          <div className="rounded-brand border-2 border-emerald-500/40 bg-emerald-500/[0.05] p-8 text-center">
            <p className="text-[13px] font-bold uppercase tracking-wide text-emerald-700">
              ✓ Verified Credential
            </p>

            {person?.photo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={person.photo_url}
                alt=""
                className="mx-auto mt-5 h-20 w-20 rounded-full border border-line object-cover"
              />
            )}

            <h1 className="mt-4 font-display text-[26px] font-bold leading-tight">
              {holder}
            </h1>
            <p className="mt-1 text-[15px] text-ink-2">completed and passed</p>
            <p className="mt-2 font-display text-[21px] font-bold">{cert.name}</p>

            <p className="mt-4 text-[14px] text-ink-2">
              Issued by {cert.issuer ?? "Panameer Learn"}
              {cert.issued_on &&
                ` on ${cert.issued_on.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}`}
            </p>
            <p className="mt-1 font-mono text-[12.5px] text-ink-2">
              Credential {cert.credential_id}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {cert.learningPath && cert.learningPath.status === "PUBLISHED" && (
              <Link
                href={`/learn/${cert.learningPath.slug}`}
                className="border-[1.5px] border-line px-6 py-2.5 text-[14.5px] font-bold transition-colors hover:border-magenta hover:text-magenta"
              >
                See the Path
              </Link>
            )}
            {/* ONLY WHEN THERE IS A PROFILE TO VIEW (E019). A learner who is not */}
            {cert.providerProfile && (
              <Link
                href={`/providers/${cert.providerProfile.id}`}
                className="bg-magenta px-6 py-2.5 text-[14.5px] font-bold text-white transition-colors hover:bg-magenta-dark"
              >
                View Profile
              </Link>
            )}
          </div>

          <p className="mt-8 text-center text-[13.5px] text-ink-2">
            Panameer issues this credential and stands behind it. Courses are free —{" "}
            <Link href="/training" className="font-bold text-magenta hover:underline">
              start one
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
