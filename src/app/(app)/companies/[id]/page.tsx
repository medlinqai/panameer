import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getCompanyBinding } from "@/lib/company";
import { loadCompanyView } from "@/lib/company-view";
import { CompanyShell } from "@/components/company/CompanyShell";
import { CompanyDetailsRead, CompanyVerification } from "@/components/company/CompanyOverview";
import { CompanySection, initials } from "@/components/company/CompanySection";
import { BuyerTrackRecord } from "@/components/company/BuyerTrackRecord";
import { buyerTrackRecord } from "@/lib/buyer-track-record";

export const dynamic = "force-dynamic";

// The buyer-safe company page: no EIN, no join requests, no Edit; People = members with a published profile.
// A member opening their own company lands on Company → Overview, unless previewing (?preview=buyer).
export default async function CompanyPublicPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ preview?: string }> }) {
  const viewer = await guardPage("authenticated");
  const { id } = await params;
  const { preview } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const own = await getCompanyBinding(viewer);
  const isOwn = own?.status === "APPROVED" && own.company.id === id;
  if (isOwn && preview !== "buyer") redirect("/company");
  const view = await loadCompanyView(id, { forBuyer: true });
  if (!view) notFound();
  const track = await buyerTrackRecord(id);
  const people = await prisma.companyMembership.findMany({
    where: { company_id: id, status: "APPROVED", person: { providerProfile: { onboarding_completed_at: { not: null } } } },
    orderBy: { created_at: "asc" },
    select: { id: true, person: { select: { first_name: true, last_name: true, title: true, providerProfile: { select: { id: true } } } } },
  });
  return (
    <>
      {isOwn && (
        <p data-buyer-preview className="mx-auto mb-4 w-full max-w-[1010px] border-l-2 border-magenta py-2 pl-3.5 text-[13.5px]">
          <b>This is how buyers see {view.name}.</b>{" "}
          <Link href="/company" className="font-semibold text-magenta-dark underline">Back to Company</Link>
        </p>
      )}
      <CompanyShell c={view} role="buyer">
        <CompanyDetailsRead c={view} role="buyer" />
        <CompanyVerification c={view} buyer />
        {track && <BuyerTrackRecord t={track} />}
        <CompanySection id="people" title="Team" count={people.length}>
          {people.length === 0 ? (
            <p className="mt-2.5 text-[14px] text-ink-2">No public profiles yet.</p>
          ) : (
            people.map((m) => (
              <Link key={m.id} href={`/providers/${m.person.providerProfile!.id}`} data-member className="grid grid-cols-[40px_1fr] items-center gap-3 border-b border-line/60 py-3 hover:bg-surface-hover">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#cfc9db] text-[13px] font-bold text-ink">{initials(m.person.first_name, m.person.last_name)}</span>
                <span className="min-w-0">
                  <b className="text-[14.5px]">{`${m.person.first_name ?? ""} ${m.person.last_name ?? ""}`.trim()}</b>
                  {m.person.title && <span className="block truncate text-[12.5px] text-ink-3">{m.person.title}</span>}
                </span>
              </Link>
            ))
          )}
        </CompanySection>
      </CompanyShell>
    </>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = /^[0-9a-f-]{36}$/i.test(id) ? await prisma.company.findUnique({ where: { id }, select: { name: true } }) : null;
  return { title: c ? `${c.name} · Panameer` : "Company · Panameer" };
}
