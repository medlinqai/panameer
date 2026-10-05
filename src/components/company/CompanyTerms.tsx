import { prisma } from "@/lib/prisma";
import type { CompanyBinding } from "@/lib/company";
import { COMPANY_TOS_VERSION } from "@/lib/tos";
import { AcceptCompanyTos } from "@/components/company/AcceptCompanyTos";
import { LegalLink } from "@/components/legal/LegalLink";
import { CompanySection, KV } from "@/components/company/CompanySection";

const day = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

// Company Terms of Service: accepted by / on / version + Read them, or accept when not current.
export async function CompanyTerms({ binding }: { binding: NonNullable<CompanyBinding> }) {
  const c = binding.company;
  const by = c.company_tos_accepted_by
    ? await prisma.person.findUnique({ where: { id: c.company_tos_accepted_by }, select: { first_name: true, last_name: true } })
    : null;
  return (
    <CompanySection id="terms" title="Company Terms of Service">
      {binding.tosCurrent ? (
        <KV
          rows={[
            { k: "Accepted by", v: by ? `${by.first_name ?? ""} ${by.last_name ?? ""}`.trim() : null, add: "Not recorded" },
            { k: "On", v: c.company_tos_accepted_at ? day(c.company_tos_accepted_at) : null, add: "Not recorded" },
            {
              k: "Version",
              v: (
                <>
                  {c.company_tos_version} ·{" "}
                  <LegalLink href="/company-terms" className="font-semibold text-magenta-dark underline">
                    Read them
                  </LegalLink>
                </>
              ),
            },
          ]}
        />
      ) : (
        <div className="mt-2.5 text-[14px] text-ink-2">
          <p>
            {c.company_tos_accepted_at
              ? `This company accepted version ${c.company_tos_version}. The current version is ${COMPANY_TOS_VERSION}, so it needs accepting again.`
              : "This company hasn't accepted the company terms yet. Until it does, it can't transact on Panameer."}{" "}
            <LegalLink href="/company-terms" className="font-semibold text-magenta-dark underline">
              Read them
            </LegalLink>
            .
          </p>
          {binding.isAdmin ? <AcceptCompanyTos companyId={c.id} /> : <p className="mt-3 text-[13px]">Only a company admin can accept them.</p>}
        </div>
      )}
    </CompanySection>
  );
}
