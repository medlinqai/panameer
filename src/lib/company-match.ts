import { prisma } from "@/lib/prisma";
import { websiteDomain, tinDigits } from "@/lib/company-fields";
import { isWorkDomain } from "@/lib/tos";
import { neverMatchDomains } from "@/lib/platform-settings";

// Same website domain, same tax ID digits or same email domain = same company (Scott 2026-10-05).
export type CompanyMatch = { kind: "website" | "email" | "tin"; companyId: string; companyName: string };

/** Another company that these values point at, or null. Rows saved before the normalized columns are
 *  normalized here, so nothing has to be back-written to live companies. */
export async function findCompanyMatch(
  selfId: string | null,
  values: { website?: string | null; ein?: string | null; emailDomain?: string | null }
): Promise<CompanyMatch | null> {
  const domain = websiteDomain(values.website);
  const email = values.emailDomain ? websiteDomain(values.emailDomain) : null;
  const tin = tinDigits(values.ein);
  const domains = [domain, email].filter((d): d is string => !!d && isWorkDomain(d));
  if (domains.length === 0 && !tin) return null;
  const rows = await prisma.company.findMany({
    where: {
      ...(selfId ? { id: { not: selfId } } : {}),
      OR: [
        ...(domains.length ? [{ website_domain: { in: domains } }, { email_domain: { in: domains } }, { website: { not: null }, website_domain: null }] : []),
        ...(tin ? [{ tin_digits: tin }, { tin: { not: null }, tin_digits: null }] : []),
      ],
    },
    select: { id: true, name: true, website: true, website_domain: true, email_domain: true, tin: true, tin_digits: true },
    take: 500,
  });
  // Scott 10-15: a company's stored email domain on the never-match list (e.g. panameer.com, every test account) never matches.
  const never = new Set((await neverMatchDomains()).map((d) => d.toLowerCase()));
  for (const r of rows) {
    const rDomain = r.website_domain ?? websiteDomain(r.website);
    const rEmail = r.email_domain && !never.has(r.email_domain.toLowerCase()) ? r.email_domain : null;
    if (domain && (rDomain === domain || rEmail === domain)) return { kind: "website", companyId: r.id, companyName: r.name };
    if (email && (rDomain === email || rEmail === email)) return { kind: "email", companyId: r.id, companyName: r.name };
  }
  if (tin) {
    const t = rows.find((r) => (r.tin_digits ?? tinDigits(r.tin)) === tin);
    if (t) return { kind: "tin", companyId: t.id, companyName: t.name };
  }
  return null;
}

/** Pairs of companies sharing a website domain, email domain or tax ID — for Panameer admins, view only. */
export async function possibleDuplicates() {
  const rows = await prisma.company.findMany({
    select: { id: true, p_account_id: true, name: true, website: true, website_domain: true, email_domain: true, tin: true, tin_digits: true, duplicate_note: true },
    take: 5000,
  });
  const groups = new Map<string, { key: string; kind: string; ids: { id: string; account: string; name: string; note: string | null }[] }>();
  const add = (kind: string, value: string | null, r: (typeof rows)[number]) => {
    if (!value) return;
    const key = `${kind}:${value}`;
    const g = groups.get(key) ?? { key: value, kind, ids: [] };
    if (!g.ids.some((x) => x.id === r.id)) g.ids.push({ id: r.id, account: r.p_account_id, name: r.name, note: r.duplicate_note });
    groups.set(key, g);
  };
  for (const r of rows) {
    const d = r.website_domain ?? websiteDomain(r.website);
    add("domain", d && isWorkDomain(d) ? d : null, r);
    if (r.email_domain && r.email_domain !== d) add("domain", r.email_domain, r);
    add("tax ID", r.tin_digits ?? tinDigits(r.tin), r);
  }
  return [...groups.values()].filter((g) => g.ids.length > 1);
}
