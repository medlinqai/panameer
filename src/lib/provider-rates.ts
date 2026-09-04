import { prisma } from "@/lib/prisma";
import { rateDisplay, type RateFields } from "@/lib/rate-display";

/**
 * PUBLISHED RATES, BY PERSON — the read behind the WS-0 display rule (`E374`).
 *
 * ⚠⚠ WHY THIS IS A SEPARATE FILE FROM `lib/rate-display.ts`. That module is
 * PURE and therefore safe for a client component to import. The moment a prisma
 * import lands in it, `prisma -> pg -> node:dns` follows any `"use client"`
 * component that touches it into the browser bundle and the BUILD fails — and
 * `tsc` does NOT catch that class of break, only `npm run build` does. It has
 * bitten this project before (`EmployersStep` dragging `lib/employers.ts`), so
 * the rule and its query are deliberately in different modules.
 *
 * ⚠ THE RULE ITSELF IS NOT DUPLICATED HERE — this calls `rateDisplay`. One
 * rule, one place, asserted once.
 *
 * ⚠ NOT SCOPED TO `marketplaceVisibleWhere()`, AND THAT IS DELIBERATE: the
 * caller has already decided who it is showing (your own mentors, a search hit
 * you can already see). Re-filtering here would silently blank the rate of
 * somebody the caller is legitimately rendering, which reads as "no rate
 * published" — a lie. Visibility is the caller's gate; this only formats.
 */
/**
 * ⚠ TWO FACTS FROM ONE READ, AND THE SECOND IS NOT PADDING. `PersonCard` carries
 * `personId` and `userId` but NOT the ProviderProfile id — and `/providers/[id]`
 * resolves on `ProviderProfile.id` (`lib/providers.ts:18`, `where: { id }`),
 * verified rather than assumed. So a member row cannot link to a profile without
 * this. Fetching it alongside the rate costs nothing; a second query would.
 * ⚠ `profileId` IS NULL-ABLE BY ABSENCE: a member with no provider profile is
 * simply not in the map, and the caller renders their name unlinked rather than
 * a link to a 404.
 */
export type ProviderCardFacts = { rate: string | null; profileId: string };

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

  /* ⚠ A PERSON WITH NO ProviderProfile AT ALL IS ABSENT FROM THE MAP, not
     mapped to a zero. The caller renders the honest line for both that and a
     profile with no published rate — they are the same fact to a reader. */
  return out;
}
