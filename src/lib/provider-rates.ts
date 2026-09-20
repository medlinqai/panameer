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

/**
 * ── ⚠⚠⚠ THE SAME LINK, WITHOUT ASKING FOR THE RATE (`P2-J3-E591` WS-C 7) ──
 *
 * ⚠⚠ SCOTT, 2026-09-20: *"I do nto think providers should see other provider's
 * rates."* — *"Not on a colleague card, not on a team roster, not in a tooltip,
 * not in an aria-label, and not in the JSON the page ships to the client. A
 * rate omitted from the render but present in the payload is still disclosed —
 * omit it from the query."*
 *
 * ⚠ MEASURED AT `E591` WS-B: `ConnectHome.tsx` called `ratesByPersonId` THREE
 * TIMES and read only `.profileId` off the result. ⚠⚠ NO RATE STRING EVER
 * REACHED THE DOM — but the rate columns were read on every render of
 * `/community`, and the formatted string sat in a map one prop away from being
 * rendered. ⚠ *"Currently clean but fragile"* is not a state to leave a rule in.
 *
 * ⚠⚠ THIS IS THE WHOLE FIX: callers that want the profile LINK now ask for the
 * link. `ratesByPersonId` is UNTOUCHED and still correct for the surfaces that
 * legitimately show a rate — this is not a narrowing of that function, it is a
 * second, smaller question that most callers were only ever asking by accident.
 *
 * ⚠ ABSENCE MEANS NO PROVIDER PROFILE, exactly as above: the caller renders the
 * name unlinked rather than a link to a 404.
 */
export async function profileIdsByPersonId(
  personIds: string[]
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (personIds.length === 0) return out;

  const rows = await prisma.providerProfile.findMany({
    where: { person_id: { in: personIds } },
    /* ⚠⚠ TWO COLUMNS. Adding a rate field here re-creates the exact defect this
       function exists to remove, and `check:community-page` fails the build. */
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

  /* ⚠ A PERSON WITH NO ProviderProfile AT ALL IS ABSENT FROM THE MAP, not
     mapped to a zero. The caller renders the honest line for both that and a
     profile with no published rate — they are the same fact to a reader. */
  return out;
}
