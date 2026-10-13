import { prisma } from "@/lib/prisma";
import { codeForName } from "@/lib/country";

// RV-E004: Payout Requirements by country — read only when money leaves Panameer (providerPayReady / payout send).
export type PayoutRule = { country_code: string; needs_tax_id: boolean; needs_tax_form: boolean; tax_form_label: string | null; needs_payout_account: boolean };
export const DEFAULT_RULES: PayoutRule[] = [
  { country_code: "US", needs_tax_id: true, needs_tax_form: true, tax_form_label: "W-9", needs_payout_account: true },
  { country_code: "*", needs_tax_id: false, needs_tax_form: false, tax_form_label: null, needs_payout_account: true },
];

/** All rules — the saved rows, or the R1 defaults when none are saved yet. */
export async function payoutRules(): Promise<PayoutRule[]> {
  const rows = await prisma.payoutRequirement.findMany({ orderBy: { country_code: "asc" } });
  return rows.length ? rows : DEFAULT_RULES;
}

export function companyCountryCode(c: { country_code: string | null; country: string | null }): string | null {
  if (c.country_code) return c.country_code.toUpperCase();
  if (!c.country?.trim()) return "US";
  return codeForName(c.country) ?? (/^(us|usa|united states( of america)?)$/i.test(c.country.trim()) ? "US" : null);
}

export async function payoutRuleFor(countryCode: string | null): Promise<PayoutRule> {
  const rules = await payoutRules();
  return rules.find((r) => r.country_code === countryCode) ?? rules.find((r) => r.country_code === "*") ?? DEFAULT_RULES[1];
}

/** What this company still needs before a payout, per its country's rule. */
export async function payoutChecklist(companyId: string) {
  const c = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true, tin: true, country: true, country_code: true, tax_form_uploaded_at: true, _count: { select: { payoutMethods: true } } } });
  if (!c) return null;
  const rule = await payoutRuleFor(companyCountryCode(c));
  const items = [
    ...(rule.needs_payout_account ? [{ item: "Payout account", done: c._count.payoutMethods > 0, href: "/company/legal#payout" }] : []),
    ...(rule.needs_tax_id ? [{ item: "Tax ID", done: !!c.tin?.trim(), href: "/company/legal?edit=legal#legal-tax" }] : []),
    ...(rule.needs_tax_form ? [{ item: rule.tax_form_label || "Tax form", done: !!c.tax_form_uploaded_at, href: "/company/legal#legal-tax" }] : []),
  ];
  return { company: c.name, rule, items, ready: items.every((i) => i.done) };
}
