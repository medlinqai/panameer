import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// VR-E001 (Scott 10-17): ONE rule for "buyers can see me". Visible = nothing missing, status ACTIVE, not switched off.
// Required: title · photo · phone · an address (their own work address or any of their company's) · a skill or a kind of
// work · a live rate or a live Service Product. Not required (search/score only): role_id, the old rate columns, industries.
export type Missing = { key: "title" | "photo" | "phone" | "address" | "skill" | "offer"; label: string; href: string };
const FIX: Record<Missing["key"], Omit<Missing, "key">> = {
  title: { label: "Title", href: "/join/provider/register" },
  photo: { label: "Photo", href: "/join/provider/register" },
  phone: { label: "Phone", href: "/join/provider/register" },
  address: { label: "Where you work", href: "/company/addresses" },
  skill: { label: "A skill or kind of work", href: "/join/provider/register" },
  offer: { label: "A rate or a product", href: "/catalog/create" },
};

/** Profiles with a live rate (published, priced, on) or a live Service Product. */
export async function liveSellerIds(among?: string[]): Promise<string[]> {
  const scope = among ? { provider_profile_id: { in: among } } : {};
  const [rates, products] = await Promise.all([
    prisma.providerService.findMany({ where: { ...scope, active: true, published_at: { not: null }, rate_cents: { not: null } }, distinct: ["provider_profile_id"], select: { provider_profile_id: true } }),
    prisma.serviceProduct.findMany({ where: { ...scope, status: "PUBLISHED", offered: true }, distinct: ["provider_profile_id"], select: { provider_profile_id: true } }),
  ]);
  return [...new Set([...rates, ...products].map((r) => r.provider_profile_id))];
}

const hasAddress: Prisma.PersonWhereInput = { OR: [{ site: { addresses: { some: {} } } }, { company: { sites: { some: { addresses: { some: {} } } } } }] };
const hasWork: Prisma.ProviderProfileWhereInput = { OR: [{ skills: { some: {} } }, { roles: { some: {} } }, { role_id: { not: null } }, { capabilities: { some: {} } }] };

/** The required set as a filter (status / switch / test filters are the caller's). */
export function requiredWhere(liveIds: string[], opts: { photo?: boolean } = {}): Prisma.ProviderProfileWhereInput {
  return {
    AND: [
      { id: { in: liveIds } },
      hasWork,
      { person: { AND: [{ title: { not: null } }, { NOT: { title: "" } }, ...(opts.photo === false ? [] : [{ photo_url: { not: null } }]), { phone: { not: null } }, { NOT: { phone: "" } }, hasAddress] } },
    ],
  };
}

/** Prisma filter for providers buyers can see (listings, search). Test accounts see test accounts. */
export async function marketplaceWhere(viewerIsTest = false, opts: { photo?: boolean } = {}) {
  return {
    status: "ACTIVE" as const,
    paused_at: null,
    person: { user: { is_active: true, ...(viewerIsTest ? {} : { is_test: false }) } } as Prisma.PersonWhereInput,
    ...requiredWhere(await liveSellerIds(), opts),
  };
}

/** Which of these profiles buyers can see — batched (two reads for any number of profiles). */
export async function visibleIds(profileIds: string[]): Promise<Set<string>> {
  if (!profileIds.length) return new Set();
  const live = await liveSellerIds(profileIds);
  const rows = await prisma.providerProfile.findMany({ where: { id: { in: profileIds }, status: "ACTIVE", paused_at: null, ...requiredWhere(live) }, select: { id: true } });
  return new Set(rows.map((r) => r.id));
}

export async function isVisible(profileId: string): Promise<boolean> {
  return (await visibleIds([profileId])).has(profileId);
}

/** What still stops buyers seeing this profile, each with the page that fixes it (empty = nothing missing). */
export async function missingForBuyers(profileId: string): Promise<Missing[]> {
  const p = await prisma.providerProfile.findUnique({
    where: { id: profileId },
    select: {
      role_id: true,
      _count: { select: { skills: true, roles: true, capabilities: true } },
      person: { select: { title: true, photo_url: true, phone: true, site: { select: { _count: { select: { addresses: true } } } }, company: { select: { sites: { select: { _count: { select: { addresses: true } } } } } } } },
    },
  });
  if (!p) return [];
  const out: Missing["key"][] = [];
  if (!p.person.title?.trim()) out.push("title");
  if (!p.person.photo_url) out.push("photo");
  if (!p.person.phone?.trim()) out.push("phone");
  if (!(p.person.site?._count.addresses || p.person.company?.sites.some((s) => s._count.addresses))) out.push("address");
  if (!(p._count.skills || p._count.roles || p._count.capabilities || p.role_id)) out.push("skill");
  if (!(await liveSellerIds([profileId])).length) out.push("offer");
  return out.map((key) => ({ key, ...FIX[key] }));
}

/** Enable My Catalog checks the same rule — except the offer, which Enable itself is about to publish. */
export async function missingBeforeEnable(profileId: string): Promise<Missing[]> {
  return (await missingForBuyers(profileId)).filter((m) => m.key !== "offer");
}
