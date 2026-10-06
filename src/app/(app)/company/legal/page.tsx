import { notFound, redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";
import { getCompanyBinding } from "@/lib/company";
import { loadCompanyView } from "@/lib/company-view";
import { LegalTaxRead } from "@/components/company/CompanyOverview";
import { CompanyDetailsEditor, LEGAL_FIELDS } from "@/components/company/CompanyDetailsEditor";
import { AcceptCompanyTos } from "@/components/company/AcceptCompanyTos";

export const dynamic = "force-dynamic";
export const metadata = { title: "Legal, Tax & Banking · Panameer" };

// Company → Legal, Tax & Banking: admins only (404 for everyone else). Never shown to buyers.
export default async function CompanyLegalPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fcompany%2Flegal");
  const binding = await getCompanyBinding(viewer);
  if (!binding || binding.status !== "APPROVED" || !binding.isAdmin) notFound();
  const c = await loadCompanyView(binding.company.id);
  if (!c) notFound();
  const { edit } = await searchParams;
  return (
    <div className="pm-white-page mx-auto w-full max-w-[1010px] pb-14" data-company-legal>
      <h1 className="text-[30px] font-extrabold leading-tight">How {c.name} Gets Paid</h1>
      <p className="mt-1.5 text-[14px] text-ink-2">Three things Panameer needs before it can pay for work.</p>
      <p data-private-note className="mt-3 inline-block border-l-2 border-ink py-1 pl-3 text-[13px] font-semibold">
        🔒 Private. Seen by Panameer and {c.name}&apos;s admins only.
      </p>
      <LegalTaxRead
        c={c}
        acceptTerms={!c.tos.current ? <AcceptCompanyTos companyId={c.id} /> : undefined}
        editor={
          edit === "legal" ? (
            <CompanyDetailsEditor
              fields={LEGAL_FIELDS}
              doneHref="/company/legal#legal-tax"
              einHint={c.ein ? `On file: ${"•••••" + c.ein.replace(/\D/g, "").slice(-4)}. Leave blank to keep it.` : "Masked after saving. Shown only to Panameer, never to buyers."}
              initial={{
                name: c.name, legalName: c.legalName, taxType: c.taxTypeCode, country: c.country, stateOfFiling: c.stateOfFiling,
                ein: null, industryId: c.industryId, website: c.website, description: c.description,
              }}
            />
          ) : undefined
        }
      />
    </div>
  );
}
