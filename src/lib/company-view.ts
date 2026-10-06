import { prisma } from "@/lib/prisma";
import { TAX_LABELS } from "@/lib/tax-types";
import { COMPANY_TOS_VERSION } from "@/lib/tos";

// My Company read model. `forBuyer` drops the EIN/TIN and anything internal — the buyer-safe view.
export type CompanyView = Awaited<ReturnType<typeof loadCompanyView>>;

export const READINESS_FIELDS = [
  ["name", "Company name"],
  ["legalName", "Legal name"],
  ["taxType", "Business type"],
  ["country", "Country"],
  ["stateOfFiling", "State of filing"],
  ["ein", "EIN / Tax registration"],
  ["industry", "Industry"],
  ["website", "Website"],
  ["logoUrl", "Logo"],
  ["description", "Description"],
] as const;
export type ReadinessKey = (typeof READINESS_FIELDS)[number][0];

/** Company Readiness: filled fields of the ten above × 10, and the first empty one. */
export function companyReadiness(c: Partial<Record<ReadinessKey, string | null>>) {
  const empty = READINESS_FIELDS.filter(([k]) => !c[k]?.toString().trim());
  return { score: (READINESS_FIELDS.length - empty.length) * 10, left: empty.length, first: empty[0] ?? null };
}

/** "Before {Company} can be paid": Who Gets Paid · Legal & Tax (state + tax ID) · Payout Account. */
export function payReadiness(x: { payee: string | null; state: string | null; tin: string | null; payouts: number; taxForm?: boolean }) {
  const steps = [
    { key: "payee", done: !!x.payee },
    { key: "legal", done: !!x.tin?.trim() && !!x.taxForm },
    { key: "payout", done: x.payouts > 0 },
  ];
  const missing = [!x.tin?.trim() && "tax ID", !x.taxForm && "the W-9 / W-8BEN-E", x.payouts === 0 && "a payout account"].filter(Boolean) as string[];
  return { steps, left: steps.filter((s) => !s.done).length, missing };
}

export async function loadCompanyView(companyId: string, opts: { forBuyer?: boolean } = {}) {
  const c = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true, name: true, legal_name: true, tax_type: true, tin: true, country: true, state_of_filing: true,
      website: true, email_domain: true, logo_url: true, brand_hue: true, theme_recipe: true, description: true,
      industry_id: true, show_on_profiles: true, created_at: true,
      entity_validation_status: true, entity_validated_at: true, entity_validation_source_url: true, entity_status_detail: true,
      company_tos_accepted_at: true, company_tos_version: true, company_tos_accepted_by: true, payee_type: true, tax_form_kind: true, tax_form_uploaded_at: true,
      _count: { select: { memberships: { where: { status: "APPROVED" } }, payoutMethods: true } },
    },
  });
  if (!c) return null;
  const tosBy = c.company_tos_accepted_by
    ? await prisma.person.findUnique({ where: { id: c.company_tos_accepted_by }, select: { first_name: true, last_name: true } })
    : null;
  const industry = c.industry_id
    ? await prisma.specialization.findUnique({ where: { id: c.industry_id }, select: { name: true } })
    : null;
  const fields = {
    name: c.name,
    legalName: c.legal_name,
    taxType: c.tax_type ? TAX_LABELS[c.tax_type] : null,
    country: c.country,
    stateOfFiling: c.state_of_filing,
    ein: opts.forBuyer ? null : c.tin,
    industry: industry?.name ?? null,
    website: c.website,
    logoUrl: c.logo_url,
    description: c.description,
  };
  return {
    id: c.id,
    ...fields,
    taxTypeCode: c.tax_type,
    industryId: c.industry_id,
    emailDomain: c.email_domain,
    brandHue: c.brand_hue,
    themeRecipe: c.theme_recipe,
    showOnProfiles: c.show_on_profiles,
    since: c.created_at,
    members: c._count.memberships,
    verification: {
      status: c.entity_validation_status,
      checkedAt: c.entity_validated_at,
      source: c.entity_validation_source_url,
      detail: c.entity_status_detail,
    },
    tos: {
      acceptedAt: c.company_tos_accepted_at,
      version: c.company_tos_version,
      by: tosBy ? `${tosBy.first_name ?? ""} ${tosBy.last_name ?? ""}`.trim() || null : null,
      current: c.company_tos_version === COMPANY_TOS_VERSION && !!c.company_tos_accepted_at,
    },
    // Readiness is the company's own measure; a buyer never sees it.
    readiness: opts.forBuyer ? null : companyReadiness({ ...fields, ein: c.tin }),
    payeeType: opts.forBuyer ? null : (c.payee_type ?? "COMPANY"),
    taxForm: opts.forBuyer ? null : { kind: c.tax_form_kind, uploadedAt: c.tax_form_uploaded_at },
    payoutAccounts: opts.forBuyer ? 0 : c._count.payoutMethods,
    payReady: opts.forBuyer ? null : payReadiness({ payee: c.payee_type ?? "COMPANY", state: c.state_of_filing, tin: c.tin, payouts: c._count.payoutMethods, taxForm: !!c.tax_form_uploaded_at }),
  };
}
