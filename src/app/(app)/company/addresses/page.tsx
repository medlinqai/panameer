import { notFound, redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";
import { getCompanyBinding } from "@/lib/company";
import { companyLocations, isSellerCompany } from "@/lib/locations";
import { prisma } from "@/lib/prisma";
import { CompanyAddresses } from "@/components/company/CompanyAddresses";

export const dynamic = "force-dynamic";
export const metadata = { title: "Addresses · Company · Panameer" };

// LS-E005: the company's addresses and what each is used for (Corporate · Bill To · Ship To · Remit To).
export default async function Page() {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fcompany%2Faddresses");
  const binding = await getCompanyBinding(viewer);
  if (!binding || binding.status !== "APPROVED") notFound();
  const [locs, seller, person] = await Promise.all([
    companyLocations(binding.company.id),
    isSellerCompany(binding.company.id),
    prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { requesterProfile: { select: { work_site_id: true } } } }),
  ]);
  const buyer = !!person?.requesterProfile || !seller;
  const work = locs.find((l) => l.siteId === person?.requesterProfile?.work_site_id)?.id ?? null;
  return (
    <div className="pm-white-page mx-auto w-full max-w-[1010px] pb-14">
      <h1 className="text-[28px] font-bold">Addresses</h1>
      <p className="mt-1 text-[14px] text-ink-2">
        {binding.isAdmin ? "Tick what each address is for. Orders bill to the Bill To address" : "Your company's addresses. Orders bill to the Bill To address"}
        {seller ? "; payments to the company go to the Remit To address." : "."}
      </p>
      <CompanyAddresses initial={locs} admin={binding.isAdmin} seller={seller} buyer={buyer} workAddressId={work} />
    </div>
  );
}
