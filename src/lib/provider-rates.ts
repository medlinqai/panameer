import { prisma } from "@/lib/prisma";
import { rateDisplay, type RateFields } from "@/lib/rate-display";

export type ProviderCardFacts = { rate: string | null; profileId: string };

export async function profileIdsByPersonId(
  personIds: string[]
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (personIds.length === 0) return out;

  const rows = await prisma.providerProfile.findMany({
    where: { person_id: { in: personIds } },
    select: { id: true, person_id: true },
  });

  for (const r of rows) out.set(r.person_id, r.id);
  return out;
}

export async function ratesByPersonId(
  personIds: string[]
): Promise<Map<string, ProviderCardFacts>> {
  const out = new Map<string, ProviderCardFacts>();
  if (personIds.length === 0) return out;

  const rows = await prisma.providerProfile.findMany({
    where: { person_id: { in: personIds } },
    select: {
      id: true,
      person_id: true,
      hourly_rate_cents: true,
      rate_min_cents: true,
      rate_max_cents: true,
      currency: true,
    },
  });

  for (const r of rows) {
    const fields: RateFields = {
      hourlyRateCents: r.hourly_rate_cents,
      rateMinCents: r.rate_min_cents,
      rateMaxCents: r.rate_max_cents,
      currency: r.currency,
    };
    out.set(r.person_id, { rate: rateDisplay(fields), profileId: r.id });
  }

  return out;
}
