import { prisma } from "@/lib/prisma";
import {
  EMPLOYER_LOCK_COPY,
  getMaskedProfile,
  needlesFrom,
  scrub,
  yearRange,
  type MaskedProfile,
} from "@/lib/masked-profile";

export type NamedExtras = {
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  employers: {
    id: string;
    name: string | null;
    roleTitle: string | null;
    dates: string | null;
    lines: { id: string; roleTitle: string | null; dates: string | null; industry: string | null }[];
  }[];
};

export type NamedProfile = MaskedProfile & { named: NamedExtras };

export async function getNamedProfile(
  profileId: string
): Promise<NamedProfile | null> {
  const base = await getMaskedProfile(profileId);
  if (!base) return null;

  const row = await prisma.providerProfile.findFirst({
    where: { id: profileId, public_name_at: { not: null } },
    select: {
      person: {
        select: { first_name: true, last_name: true, photo_url: true },
      },
      employers: {
        select: {
          id: true,
          name: true,
          role_title: true,
          start_date: true,
          end_date: true,
          is_current: true,
          projects: {
            select: {
              id: true,
              name: true,
              role_title: true,
              client_name: true,
              client_visibility: true,
              start_date: true,
              end_date: true,
              is_current: true,
              industry: { select: { name: true } },
            },
          },
        },
        orderBy: [{ is_current: "desc" }, { start_date: "desc" }],
      },
      projects: { select: { client_name: true } },
    },
  });
  if (!row) return null;

  const clientNeedles = needlesFrom([
    ...row.employers.flatMap((e) => e.projects.map((pr) => pr.client_name)),
    ...row.projects.map((pr) => pr.client_name),
  ]);

  const overview = await prisma.providerProfile.findUnique({
    where: { id: profileId },
    select: { overview: true },
  });

  return {
    ...base,
    summary: scrub(overview?.overview, clientNeedles),
    named: {
      firstName: row.person.first_name ?? "",
      lastName: row.person.last_name ?? "",
      photoUrl: row.person.photo_url,
      employers: row.employers.map((e) => ({
        id: e.id,
        name: e.name,
        roleTitle: scrub(e.role_title, clientNeedles),
        dates: yearRange(e.start_date, e.end_date, e.is_current),
        lines: e.projects.map((pr) => ({
          id: pr.id,
          roleTitle: scrub(pr.role_title ?? pr.name, clientNeedles),
          dates: yearRange(pr.start_date, pr.end_date, pr.is_current),
          industry: pr.industry?.name ?? null,
        })),
      })),
    },
  };
}

export { EMPLOYER_LOCK_COPY };
