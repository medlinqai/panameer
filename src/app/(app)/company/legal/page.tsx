import { notFound, redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";
import { getCompanyBinding } from "@/lib/company";
import { loadCompanyView } from "@/lib/company-view";
import { LegalTaxRead } from "@/components/company/CompanyOverview";
import { CompanyDetailsEditor, LEGAL_FIELDS } from "@/components/company/CompanyDetailsEditor";
import { AcceptCompanyTos } from "@/components/company/AcceptCompanyTos";
import { CompanySection } from "@/components/company/CompanySection";
import { PayeeChoice } from "@/components/company/PayeeChoice";
import { CompanyPayouts } from "@/components/company/CompanyPayouts";
import { companyPayouts } from "@/lib/company-pay";

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
  const payouts = await companyPayouts(c.id);
  const sole = c.payeeType === "SOLE_PROPRIETOR";
  const taxLabel = sole ? "SSN or ITIN" : "EIN";
  const r = c.payReady!;
  const legalNeeds = [!c.stateOfFiling && "state", !c.ein && (sole ? "SSN/ITIN" : "EIN")].filter(Boolean).join(" + ");
  const strip = [
    { n: "1 · WHO GETS PAID", v: sole ? "One person ✓" : "This company ✓", done: r.steps[0].done, href: "#who-gets-paid" },
    { n: "2 · LEGAL & TAX", v: legalNeeds ? `Needs ${legalNeeds}` : "Done ✓", done: r.steps[1].done, href: "#legal-tax" },
    { n: "3 · PAYOUT ACCOUNT", v: payouts.length ? "Added ✓" : "Not added", done: r.steps[2].done, href: "#payout" },
  ];
  return (
    <div className="pm-white-page mx-auto w-full max-w-[1010px] pb-14" data-company-legal>
      <h1 className="text-[30px] font-extrabold leading-tight">How {c.name} Gets Paid</h1>
      <p className="mt-1.5 text-[14px] text-ink-2">Three things Panameer needs before it can pay for work.</p>
      <p data-private-note className="mt-3 inline-block border-l-2 border-ink py-1 pl-3 text-[13px] font-semibold">
        🔒 Private. Seen by Panameer and {c.name}&apos;s admins only.
      </p>
      <ol data-pay-strip className="mt-6 grid gap-2 sm:grid-cols-3">
        {strip.map((x) => (
          <li key={x.n}>
            <a href={x.href} data-step-done={x.done} className={"block border p-3 " + (x.done ? "border-line" : "border-ink")}>
              <span className="block text-[11px] font-bold tracking-[0.08em] text-ink-2">{x.n}</span>
              <span className={"text-[14px] font-semibold " + (x.done ? "text-[#1f8a5b]" : "text-[#b26b00]")}>{x.v}</span>
            </a>
          </li>
        ))}
      </ol>
      <CompanySection id="who-gets-paid" title="1 · Who Gets Paid">
        <PayeeChoice value={sole ? "SOLE_PROPRIETOR" : "COMPANY"} members={c.members} />
      </CompanySection>
      <LegalTaxRead
        c={c}
        taxLabel={taxLabel}
        acceptTerms={!c.tos.current ? <AcceptCompanyTos companyId={c.id} /> : undefined}
        editor={
          edit === "legal" ? (
            <CompanyDetailsEditor
              fields={LEGAL_FIELDS}
              doneHref="/company/legal#legal-tax"
              einLabel={sole ? "SSN or ITIN" : "EIN"}
              einHint={c.ein ? `On file: ${"•••••" + c.ein.replace(/\D/g, "").slice(-4)}. Leave blank to keep it.` : "Masked after saving. Shown only to Panameer, never to buyers."}
              initial={{
                name: c.name, legalName: c.legalName, taxType: c.taxTypeCode, country: c.country, stateOfFiling: c.stateOfFiling,
                ein: null, industryId: c.industryId, website: c.website, description: c.description,
              }}
            />
          ) : undefined
        }
      />
      <CompanySection id="payout" title="3 · Payout Account">
        <CompanyPayouts
          methods={payouts.map((m) => ({ id: m.id, kind: m.kind, label: m.label, last4: m.last4, country: m.country, isDefault: m.is_default }))}
          canAdd={c.ein ? null : `Add ${sole ? "the SSN or ITIN" : "the EIN"} in Legal & Tax first.`}
        />
      </CompanySection>
    </div>
  );
}
