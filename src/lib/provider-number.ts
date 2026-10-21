import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";

// AN-E001: Provider Number — P-1001, P-1002… in join order, unique, never reused (a high-water mark in platform_settings).
const KEY = "provider_number_last";

async function nextNumber(): Promise<number> {
  // Seed the mark once from the highest number already given (or 1000).
  const have = await prisma.platformSetting.findUnique({ where: { key: KEY } });
  if (!have) {
    const top = await prisma.providerProfile.findMany({ where: { provider_number: { not: null } }, select: { provider_number: true } });
    const max = top.reduce((m, r) => Math.max(m, Number(r.provider_number!.replace(/\D/g, "")) || 0), 1000);
    await prisma.platformSetting.create({ data: { key: KEY, value: max } }).catch(() => null);
  }
  // Atomic increment — two callers never get the same number.
  const rows = await prisma.$queryRaw<{ value: unknown }[]>`UPDATE platform_settings SET value = to_jsonb((value #>> '{}')::int + 1), updated_at = now() WHERE key = ${KEY} RETURNING value`;
  return Number(rows[0]?.value);
}

/** The profile's number, given now if it has none. */
export async function ensureProviderNumber(profileId: string): Promise<string> {
  const p = await prisma.providerProfile.findUnique({ where: { id: profileId }, select: { provider_number: true } });
  if (p?.provider_number) return p.provider_number;
  const n = `P-${await nextNumber()}`;
  const moved = await prisma.providerProfile.updateMany({ where: { id: profileId, provider_number: null }, data: { provider_number: n } });
  if (moved.count) return n;
  return (await prisma.providerProfile.findUniqueOrThrow({ where: { id: profileId }, select: { provider_number: true } })).provider_number!;
}

/** Numbers for many profiles at once (missing ones are given now). */
export async function providerNumbers(profileIds: string[]): Promise<Map<string, string>> {
  const rows = await prisma.providerProfile.findMany({ where: { id: { in: profileIds } }, select: { id: true, provider_number: true } });
  const out = new Map<string, string>();
  for (const r of rows) out.set(r.id, r.provider_number ?? (await ensureProviderNumber(r.id)));
  return out;
}

// DB-E010: names, photos and companies show once a Work Order is Released (not merely issued).
const REVEALED = ["RELEASED" as const, "ACTIVE" as const, "ON_HOLD" as const, "CLOSED" as const, "FINALLY_CLOSED" as const];

// ── AN-E002: one rule — a buyer sees a provider's identity (PII) only once a Work Order exists between them ────────
/** For each provider: may this viewer see who they are? The provider themself, an admin, a colleague in the
 *  provider's own company, or a viewer whose company has a Released Work Order with the provider. */
export async function identityVisibleTo(viewer: Viewer | null, providerPersonIds: string[]): Promise<Set<string>> {
  const ids = [...new Set(providerPersonIds)].filter(Boolean);
  if (!viewer || !ids.length) return new Set();
  if (viewer.isSystemAdmin || viewer.isAdmin) return new Set(ids);
  const me = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true, company_id: true, company: { select: { p_account_id: true } } } });
  if (!me) return new Set();
  const [colleagues, orders] = await Promise.all([
    prisma.person.findMany({ where: { id: { in: ids }, company_id: me.company_id }, select: { id: true } }),
    prisma.workOrder.findMany({ where: { provider_person_id: { in: ids }, status: { in: REVEALED }, OR: [{ buyer_person_id: me.id }, { p_account_id: me.company.p_account_id }] }, distinct: ["provider_person_id"], select: { provider_person_id: true } }),
  ]);
  return new Set([...ids.filter((id) => id === me.id), ...colleagues.map((c) => c.id), ...orders.map((o) => o.provider_person_id)]);
}

export async function buyerCanSeeIdentity(viewer: Viewer | null, providerPersonId: string): Promise<boolean> {
  return (await identityVisibleTo(viewer, [providerPersonId])).has(providerPersonId);
}

export const providerLabel = (number: string | null | undefined) => `Provider ${number ?? "P-…"}`;

/** AN-E004: the provider's name as this buyer may see it — real once a Work Order exists between them, else "Provider P-…".
 *  For notifications and other places that know the buyer person, not a session. */
export async function providerNameForBuyer(buyerPersonId: string, providerPersonId: string, realName: string): Promise<string> {
  const [buyer, provider] = await Promise.all([
    prisma.person.findUnique({ where: { id: buyerPersonId }, select: { company_id: true, company: { select: { p_account_id: true } } } }),
    prisma.person.findUnique({ where: { id: providerPersonId }, select: { company_id: true, providerProfile: { select: { id: true } } } }),
  ]);
  if (!provider?.providerProfile) return realName;
  if (buyer && buyer.company_id === provider.company_id) return realName;
  const order = buyer ? await prisma.workOrder.findFirst({ where: { provider_person_id: providerPersonId, status: { in: REVEALED }, OR: [{ buyer_person_id: buyerPersonId }, { p_account_id: buyer.company.p_account_id }] }, select: { id: true } }) : null;
  return order ? realName : providerLabel(await ensureProviderNumber(provider.providerProfile.id));
}
