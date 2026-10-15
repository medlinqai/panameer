import { prisma } from "@/lib/prisma";
import { countryColumns } from "@/lib/country";
import { OnboardingError } from "@/lib/onboarding";

// LS-E001/E003: a company's addresses with what each is used for (Oracle site uses). One site per address.
export type Loc = {
  id?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  corporate: boolean;
  billTo: boolean;
  shipTo: boolean;
  remitTo: boolean;
};
export type SavedLoc = Loc & { id: string; siteId: string };

const SELECT = { id: true, site_id: true, line1: true, line2: true, city: true, state: true, postal_code: true, country: true, is_corporate: true, is_bill_to: true, is_ship_to: true, is_remit_to: true } as const;
type Row = { id: string; site_id: string; line1: string; line2: string | null; city: string | null; state: string | null; postal_code: string | null; country: string | null; is_corporate: boolean; is_bill_to: boolean; is_ship_to: boolean; is_remit_to: boolean };
const toLoc = (a: Row): SavedLoc => ({
  id: a.id, siteId: a.site_id, line1: a.line1, line2: a.line2, city: a.city, state: a.state, postalCode: a.postal_code, country: a.country,
  corporate: a.is_corporate, billTo: a.is_bill_to, shipTo: a.is_ship_to, remitTo: a.is_remit_to,
});

/** The company's addresses (non-empty), oldest first. */
export async function companyLocations(companyId: string): Promise<SavedLoc[]> {
  const rows = await prisma.address.findMany({ where: { site: { company_id: companyId }, line1: { not: "" } }, orderBy: { created_at: "asc" }, select: SELECT });
  return rows.map(toLoc);
}

/** The address an order bills to / a payout remits to (the first one ticked). */
export async function companyAddressFor(companyId: string, use: "bill" | "remit" | "corporate"): Promise<SavedLoc | null> {
  const flag = use === "bill" ? { is_bill_to: true } : use === "remit" ? { is_remit_to: true } : { is_corporate: true };
  const a = await prisma.address.findFirst({ where: { site: { company_id: companyId }, line1: { not: "" }, ...flag }, orderBy: { created_at: "asc" }, select: SELECT });
  return a ? toLoc(a) : null;
}

function addrData(l: Loc) {
  return {
    line1: l.line1?.trim() ?? "",
    line2: l.line2?.trim() || null,
    city: l.city?.trim() || null,
    state: l.state?.trim() || null,
    postal_code: l.postalCode?.trim() || null,
    ...countryColumns(l.country),
    is_corporate: !!l.corporate,
    is_bill_to: !!l.billTo,
    is_ship_to: !!l.shipTo,
    is_remit_to: !!l.remitTo,
  };
}

/** Check the list: every address complete; ≥1 Bill To and ≥1 Ship To; sellers ≥1 Remit To. */
export function checkLocations(locs: Loc[], opts: { seller?: boolean; buyer?: boolean } = { buyer: true }) {
  if (!locs.length) throw new OnboardingError("Add an address", "INVALID");
  locs.forEach((l, i) => {
    if (!l.line1?.trim() || !l.country) throw new OnboardingError(`Address ${i + 1}: add the country and street`, "INVALID");
  });
  if (opts.buyer !== false && !locs.some((l) => l.billTo)) throw new OnboardingError("Tick Bill To on at least one address", "INVALID");
  if (opts.buyer !== false && !locs.some((l) => l.shipTo)) throw new OnboardingError("Tick Ship To / Work Location on at least one address", "INVALID");
  if (opts.seller && !locs.some((l) => l.remitTo)) throw new OnboardingError("Tick Remit To on at least one address — it's where payments go", "INVALID");
}

/** Replace the company's address list: update by id, create new ones (own site each), remove the rest. */
export async function saveCompanyLocations(companyId: string, locs: Loc[], opts: { seller?: boolean; buyer?: boolean } = { buyer: true }): Promise<SavedLoc[]> {
  checkLocations(locs, opts);
  const existing = await companyLocations(companyId);
  const kept = new Set<string>();
  const out: SavedLoc[] = [];
  for (const l of locs) {
    const own = l.id ? existing.find((e) => e.id === l.id) : undefined;
    if (own) {
      const a = await prisma.address.update({ where: { id: own.id }, data: addrData(l), select: SELECT });
      kept.add(own.id);
      out.push(toLoc(a));
    } else {
      const site = await prisma.site.create({ data: { company_id: companyId, name: l.city?.trim() || "Location" }, select: { id: true } });
      const a = await prisma.address.create({ data: { site_id: site.id, ...addrData(l) }, select: SELECT });
      out.push(toLoc(a));
    }
  }
  for (const e of existing.filter((x) => !kept.has(x.id))) {
    await prisma.address.delete({ where: { id: e.id } });
    // The site goes too when nothing else uses it.
    const site = await prisma.site.findUnique({ where: { id: e.siteId }, select: { _count: { select: { addresses: true, people: true, requesterWorkSites: true } } } });
    if (site && !site._count.addresses && !site._count.people && !site._count.requesterWorkSites) await prisma.site.delete({ where: { id: e.siteId } }).catch(() => {});
  }
  return out;
}

/** Is this company a seller (any approved member who provides services)? */
export async function isSellerCompany(companyId: string): Promise<boolean> {
  return (await prisma.companyMembership.count({ where: { company_id: companyId, status: "APPROVED", person: { is_service_provider: true } } })) > 0;
}
