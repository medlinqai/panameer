import type { Prisma, WorkMode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { capabilityLine } from "@/lib/capabilities";
import { buyersSee } from "@/lib/rate-display";

// GT-E005: Shop › Services (behind taxonomy_v2) — providers with live rates, filtered by how they work (Mode),
// what they know (Process / Capability Domain) and the system (Vendor / Product).
export type ServicesQuery = { q?: string; mode?: string; process?: string; domain?: string; vendor?: string; product?: string };
const MODES = new Set(["IMPLEMENT", "SUPPORT", "OPERATE"]);

export async function listServiceProviders(f: ServicesQuery, opts: { includeTestPersonId?: string | null } = {}) {
  const capWhere: Prisma.ProviderCapabilityWhereInput = {
    ...(f.mode && MODES.has(f.mode) ? { mode: f.mode as WorkMode } : {}),
    ...(f.domain ? { domain_id: f.domain } : f.process ? { domain: { process: f.process } } : {}),
    ...(f.product ? { systemItem: { product_id: f.product } } : f.vendor ? { systemItem: { product: { vendor_id: f.vendor } } } : {}),
  };
  const filtered = Object.keys(capWhere).length > 0;
  const caps = await prisma.providerCapability.findMany({
    where: capWhere,
    include: { domain: { select: { id: true, process: true, name: true } }, knowledgeSkill: { select: { id: true, name: true } }, systemItem: { select: { id: true, name: true, product: { select: { name: true, vendor: { select: { name: true } } } } } }, workRole: { select: { id: true, name: true } } },
  });
  const byProfile = new Map<string, string[]>();
  for (const c of caps) byProfile.set(c.provider_profile_id, [...(byProfile.get(c.provider_profile_id) ?? []), capabilityLine(c)]);
  const term = f.q?.trim();
  const profiles = await prisma.providerProfile.findMany({
    where: {
      ...(filtered ? { id: { in: [...byProfile.keys()] } } : {}),
      person: { OR: [{ user: { is_test: false } }, ...(opts.includeTestPersonId ? [{ id: opts.includeTestPersonId }] : [])], ...(term ? { OR: [{ first_name: { contains: term, mode: "insensitive" } }, { last_name: { contains: term, mode: "insensitive" } }, { title: { contains: term, mode: "insensitive" } }] } : {}) },
    },
    select: { id: true, person: { select: { id: true, first_name: true, last_name: true, title: true, photo_url: true } } },
    take: 200,
  });
  const services = await prisma.providerService.findMany({ where: { provider_profile_id: { in: profiles.map((p) => p.id) }, active: true, published_at: { not: null }, rate_cents: { not: null } }, orderBy: { sort_order: "asc" }, select: { provider_profile_id: true, name: true, rate_cents: true, uom: true, expenses: true, hours_included: true } });
  return profiles
    .map((p) => ({
      profileId: p.id, name: `${p.person.first_name} ${p.person.last_name}`.trim(), title: p.person.title, photoUrl: p.person.photo_url,
      capabilities: [...new Set(byProfile.get(p.id) ?? [])].slice(0, 4),
      rates: services.filter((s) => s.provider_profile_id === p.id).map((s) => `${s.name} · ${buyersSee({ rateCents: s.rate_cents, unit: s.uom, expenses: s.expenses, hoursIncluded: s.hours_included })}`),
    }))
    .filter((p) => p.rates.length > 0);
}

/** Filter menus: only values some provider actually holds. */
export async function servicesFilterOptions() {
  const caps = await prisma.providerCapability.findMany({ select: { mode: true, domain: { select: { id: true, process: true, name: true } }, systemItem: { select: { product: { select: { id: true, name: true, vendor: { select: { id: true, name: true } } } } } } } });
  const uniq = <T,>(xs: T[], k: (x: T) => string) => [...new Map(xs.map((x) => [k(x), x])).values()];
  const domains = uniq(caps.flatMap((c) => (c.domain ? [c.domain] : [])), (d) => d.id).sort((a, b) => a.process.localeCompare(b.process) || a.name.localeCompare(b.name));
  const products = uniq(caps.flatMap((c) => (c.systemItem ? [c.systemItem.product] : [])), (p) => p.id);
  return { domains, processes: [...new Set(domains.map((d) => d.process))], products, vendors: uniq(products.map((p) => p.vendor), (v) => v.id) };
}
