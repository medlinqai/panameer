import type { CompanyView } from "@/lib/company-view";
import { CompanySection, KV } from "@/components/company/CompanySection";
import { EditLink, type CompanyRole } from "@/components/company/CompanyShell";

// Overview sections: Company Details + Verification. EIN only for the company's own members.
export function CompanyDetailsRead({ c, role }: { c: NonNullable<CompanyView>; role: CompanyRole }) {
  const buyer = role === "buyer";
  const rows = [
    { k: "Company name", v: c.name },
    { k: "Legal name", v: c.legalName },
    { k: "Business type", v: c.taxType },
    { k: "Country", v: c.country },
    { k: "State of filing", v: c.stateOfFiling },
    ...(buyer ? [] : [{ k: "EIN / Tax registration", v: c.ein, add: "Add EIN — shown only to Panameer, never to buyers" }]),
    { k: "Industry", v: c.industry },
    {
      k: "Website",
      v: c.website ? (
        <a href={/^https?:/.test(c.website) ? c.website : `https://${c.website}`} target="_blank" rel="noopener noreferrer" className="text-magenta-dark hover:underline">
          {c.website.replace(/^https?:\/\//, "")}
        </a>
      ) : null,
    },
    ...(buyer ? [] : [{ k: "Email domain", v: c.emailDomain, add: "Add email domain — people with it can ask to join" }]),
  ];
  return (
    <CompanySection id="details" title="Company Details" actions={role === "admin" ? <EditLink href="/company?edit=details#details" /> : undefined}>
      <KV rows={buyer ? rows.filter((r) => r.v) : rows} />
    </CompanySection>
  );
}

export function CompanyVerification({ c }: { c: NonNullable<CompanyView> }) {
  const v = c.verification;
  const ok = v.status === "in_good_standing";
  const LABEL: Record<string, string> = {
    in_good_standing: "In good standing",
    has_issues: "On record, with issues",
    standing_unknown: "Found; standing not published",
    not_found: "Not found in the registry",
  };
  const needs = [!c.stateOfFiling && "STATE", !c.ein && "EIN"].filter(Boolean).join(" + ");
  return (
    <CompanySection id="verification" title="Verification">
      <KV
        rows={[
          {
            k: "Business entity",
            v: (
              <>
                {v.status ? LABEL[v.status] ?? v.status : "Not checked yet"}
                {v.detail && ` — ${v.detail}`}
                {v.checkedAt && ` · ${v.checkedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`}
                {!v.status && needs && <span className="ml-2 inline-block border border-current px-[7px] align-[1px] text-[10.5px] font-bold tracking-[0.06em] text-[#b26b00]">NEEDS {needs}</span>}
                {ok && <span className="ml-2 inline-block border border-current px-[7px] align-[1px] text-[10.5px] font-bold tracking-[0.06em] text-[#1f8a5b]">VERIFIED</span>}
              </>
            ),
          },
          {
            k: "Source",
            v: v.source ? (
              <a href={v.source} target="_blank" rel="noopener noreferrer" className="text-magenta-dark hover:underline">
                State registry record
              </a>
            ) : (
              <span className="text-ink-2">Checked against the state registry once state of filing is added</span>
            ),
          },
        ]}
      />
    </CompanySection>
  );
}
