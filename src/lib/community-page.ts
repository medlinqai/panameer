import { prisma } from "@/lib/prisma";
import { getColleagueRoster } from "@/lib/colleague-roster";
import { profileIdsByPersonId } from "@/lib/provider-rates";
import { formatPlace } from "@/lib/location";
import type { Viewer } from "@/lib/access";

/**
 * ── ⚠⚠ THE COMMUNITY PAGE'S READ (`P2-J3-E591` WS-C) ──────────────────────
 *
 * ⚠⚠⚠ NO RATE. NOT ONE FIELD, NOT ANYWHERE. Scott, 2026-09-20: *"I do nto think
 * providers should see other provider's rates."* — *"not on a colleague card,
 * not on a team roster, not in a tooltip, not in an aria-label, not in the JSON
 * the page ships to the client… omit it from the query."*
 * ⚠ `check:community-page` fails the build if the word appears on this path.
 *
 * ⚠ It composes reads that already exist rather than adding a second way to ask
 * the same question: `getColleagueRoster` is the richer first-degree read and
 * already carries `reason`, `buySide` and `connectedAt`.
 */

export type ColleagueCard = {
  connectionId: string;
  userId: string;
  personId: string;
  name: string;
  /** ⚠⚠ THEIR OWN TITLE, VERBATIM. A person's title is DATA and is never
   *  re-cased (`E568`) — and it is never invented when absent. */
  title: string | null;
  company: string | null;
  photoUrl: string | null;
  /** ⚠ `"Chicago, Illinois"` or null. Null renders nothing, never "Unknown". */
  location: string | null;
  /** ⚠ Absent when they have no provider profile — the card is then unlinked
   *  rather than linking to a 404. */
  profileId: string | null;
  buySide: boolean;
};

export type InvitedCard = {
  id: string;
  /** ⚠ May be null — `invitee_first_name` is optional on the model. */
  name: string | null;
  email: string;
  sentAt: Date;
};

/**
 * ⚠⚠ WHERE A PERSON IS, AND IT IS THREE HOPS AWAY. `Person` HAS NO LOCATION
 * COLUMNS — it is `Person.site_id → Site.addresses → Address{city,state,…}`.
 * ⚠ `Employer.city` and `ProviderProfile.location_country` are NOT this: the
 * first is where a past job was, the second is a preference. Neither answers
 * *"where is this person"*, and using one because it is closer to hand is how a
 * card ends up stating a fact nobody entered.
 */
/*
  ⚠⚠ IT DELEGATES TO THE SHARED HELPER (`E591` rider). ⚠ SUPERSEDED, quoted not
  deleted (`E164`) — this file's own copy, which rendered the stored value
  verbatim and so printed `saint augustine, FL` on a real card:
  //   const clean = (v: string | null) =>
  //     v && v.trim() && v.trim().toLowerCase() !== "null" ? v.trim() : null;
  //   const parts = [clean(city), clean(state)].filter(Boolean);
  //   return parts.length ? parts.join(", ") : null;
  ⚠⚠⚠ ONE HELPER, TWO PAGES — so a city cannot render one way here and another
  way in buyer search, which is exactly what was happening.
*/
function formatWhere(city: string | null, state: string | null): string | null {
  return formatPlace(city, state);
}

export async function getCommunityPage(viewer: Viewer): Promise<{
  colleagues: ColleagueCard[];
  invited: InvitedCard[];
}> {
  const roster = await getColleagueRoster(viewer);
  const personIds = roster.map((r) => r.personId);

  /*
    ⚠⚠ TWO READS, NEITHER OF WHICH TOUCHES A RATE COLUMN.
    ⚠ `profileIdsByPersonId` is `E591` WS-C's replacement for `ratesByPersonId`
    — the same profile link, without asking for the money.
  */
  const [profileIds, places] = await Promise.all([
    profileIdsByPersonId(personIds),
    personIds.length
      ? prisma.person.findMany({
          where: { id: { in: personIds } },
          select: {
            id: true,
            site: {
              select: {
                addresses: { select: { city: true, state: true }, take: 1 },
              },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  const whereById = new Map(
    places.map((p) => [
      p.id,
      formatWhere(p.site?.addresses[0]?.city ?? null, p.site?.addresses[0]?.state ?? null),
    ])
  );

  const colleagues: ColleagueCard[] = roster.map((r) => ({
    connectionId: r.connectionId,
    userId: r.userId,
    personId: r.personId,
    title: r.title,
    company: r.company,
    name: r.name,
    photoUrl: r.photoUrl,
    location: whereById.get(r.personId) ?? null,
    profileId: profileIds.get(r.personId) ?? null,
    buySide: r.buySide,
  }));

  /*
    ── ⚠⚠ THE INVITATIONS, AND WHY THE DATE FILTER IS HERE TOO ──────────────

    ⚠⚠⚠ `ColleagueInviteStatus` HAS AN `EXPIRED` VALUE AND NOTHING EVER WRITES
    IT (measured 2026-09-20). ⚠ So `status: "PENDING"` alone would list
    invitations that lapsed weeks ago as if they were still in flight, and the
    card would offer `Nudge` on a dead row.
    ⚠ The same rule as `community-web.ts` — deliberately the same, because two
    surfaces on one page disagreeing about who is invited is worse than either
    being wrong alone.
    ⚠⚠ THE SEED WRITES ONE LAPSED ROW ON PURPOSE so this is exercised rather
    than asserted.
  */
  const me = await prisma.person.findFirst({
    where: { user_id: viewer.userId },
    select: { id: true },
  });

  const invited: InvitedCard[] = me
    ? (
        await prisma.colleagueInvite.findMany({
          where: {
            inviter_person_id: me.id,
            status: "PENDING",
            expires_at: { gt: new Date() },
          },
          orderBy: { created_at: "desc" },
          /* ⚠⚠ NAME, EMAIL AND WHEN IT WAS SENT. NOTHING ELSE — there is no
             title, no location and no photo on an invitation, and the card must
             not imply a profile that does not exist. */
          select: {
            id: true,
            invitee_email: true,
            invitee_first_name: true,
            invitee_last_name: true,
            created_at: true,
          },
        })
      ).map((i) => ({
        id: i.id,
        name:
          `${i.invitee_first_name ?? ""} ${i.invitee_last_name ?? ""}`.trim() || null,
        email: i.invitee_email,
        sentAt: i.created_at,
      }))
    : [];

  return { colleagues, invited };
}
