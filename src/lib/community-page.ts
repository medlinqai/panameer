import { memberVisibleWhere } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getColleagueRoster } from "@/lib/colleague-roster";
import { profileIdsByPersonId } from "@/lib/provider-rates";
import { formatPlace } from "@/lib/location";
import type { Viewer } from "@/lib/access";

export type ColleagueCard = {
  connectionId: string;
  userId: string;
  personId: string;
  name: string;
  title: string | null;
  company: string | null;
  companyId: string | null;
  photoUrl: string | null;
  location: string | null;
  profileId: string | null;
  buySide: boolean;
};

export type InvitedCard = {
  id: string;
  name: string | null;
  email: string;
  sentAt: Date;
  sentToday: boolean;
};

function formatWhere(city: string | null, state: string | null): string | null {
  return formatPlace(city, state);
}

export async function getCommunityPage(viewer: Viewer): Promise<{
  colleagues: ColleagueCard[];
  invited: InvitedCard[];
}> {
  const roster = await getColleagueRoster(viewer);
  const personIds = roster.map((r) => r.personId);

  const [profileIds, places] = await Promise.all([
    profileIdsByPersonId(personIds),
    personIds.length
      ? prisma.person.findMany({
          where: { id: { in: personIds }, ...memberVisibleWhere() },
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
    companyId: r.companyId,
    name: r.name,
    photoUrl: r.photoUrl,
    location: whereById.get(r.personId) ?? null,
    profileId: profileIds.get(r.personId) ?? null,
    buySide: r.buySide,
  }));

  const me = await prisma.person.findFirst({
    where: { user_id: viewer.userId },
    select: { id: true },
  });

  const now = new Date().getTime();
  const invited: InvitedCard[] = me
    ? (
        await prisma.colleagueInvite.findMany({
          where: {
            inviter_person_id: me.id,
            status: "PENDING",
            expires_at: { gt: new Date() },
          },
          orderBy: { created_at: "desc" },
          select: {
            id: true,
            invitee_email: true,
            invitee_first_name: true,
            invitee_last_name: true,
            created_at: true,
            last_sent_at: true,
          },
        })
      ).map((i) => ({
        id: i.id,
        name:
          `${i.invitee_first_name ?? ""} ${i.invitee_last_name ?? ""}`.trim() || null,
        email: i.invitee_email,
        sentAt: i.last_sent_at ?? i.created_at,
        sentToday: now - (i.last_sent_at ?? i.created_at).getTime() < 86_400_000,
      }))
    : [];

  return { colleagues, invited };
}
