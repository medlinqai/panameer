import { prisma } from "@/lib/prisma";

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
