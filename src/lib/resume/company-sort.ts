import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normCompany, type FoundCompany } from "@/lib/resume/company-list";

// The member sorts the companies their résumé named: Employer · Project client · Remove (Scott 2026-10-05).
export type SortChoice = "EMPLOYER" | "PROJECT" | "REMOVE";
export type SortRow = FoundCompany & {
  current: "EMPLOYER" | "PROJECT" | null;
  preselect: SortChoice | null;
  projectEmployerId: string | null;
};
export type SortState = { importId: string; rows: SortRow[]; employers: { id: string; name: string }[] };

export const INDEPENDENT = "independent";

async function rowsOf(profileId: string) {
  const [employers, projects] = await Promise.all([
    prisma.employer.findMany({ where: { provider_profile_id: profileId }, select: { id: true, name: true } }),
    prisma.project.findMany({ where: { provider_profile_id: profileId }, select: { id: true, name: true, client_name: true, employer_id: true } }),
  ]);
  return { employers, projects };
}

const projectFor = <T extends { client_name: string; name: string }>(projects: T[], key: string): T[] =>
  projects.filter((p) => normCompany(p.client_name) === key || (!p.client_name && normCompany(p.name) === key));

/** The latest import's list, each row marked with what the profile holds for it now. */
export async function companySortState(profileId: string): Promise<SortState | null> {
  const imp = await prisma.profileImport.findFirst({
    where: { provider_profile_id: profileId, status: "PARSED", company_list: { not: Prisma.DbNull } },
    orderBy: { created_at: "desc" },
    select: { id: true, company_list: true },
  });
  const list = (imp?.company_list as unknown as FoundCompany[] | null) ?? [];
  if (!imp || list.length === 0) return null;
  const { employers, projects } = await rowsOf(profileId);
  const rows = list.map((c): SortRow => {
    const key = normCompany(c.name);
    const isEmployer = employers.some((e) => normCompany(e.name) === key);
    const proj = projectFor(projects, key);
    const current = isEmployer ? "EMPLOYER" : proj.length ? "PROJECT" : null;
    return { ...c, current, preselect: current ?? c.guess, projectEmployerId: proj[0]?.employer_id ?? null };
  });
  return { importId: imp.id, rows, employers: employers.filter((e) => e.name).map((e) => ({ id: e.id, name: e.name! })) };
}

export type SortInput = { name: string; choice: SortChoice | null; employer?: string | null };

/**
 * Writes the member's choices. Employer → a Work History job; Project client → a project under the
 * chosen employer (id, or the name of a row marked Employer in this batch, or "independent");
 * Remove → the rows for that company are deleted. Untouched rows are left alone.
 */
export async function applyCompanySort(profileId: string, input: SortInput[]) {
  const state = await companySortState(profileId);
  if (!state) return { employers: 0, projects: 0, removed: 0 };
  const byKey = new Map(state.rows.map((r) => [normCompany(r.name), r]));
  const picks = input.filter((i) => i.choice && byKey.has(normCompany(i.name)));
  const out = { employers: 0, projects: 0, removed: 0 };

  await prisma.$transaction(async (tx) => {
    const employers = await tx.employer.findMany({ where: { provider_profile_id: profileId }, select: { id: true, name: true } });
    const projects = await tx.project.findMany({ where: { provider_profile_id: profileId }, select: { id: true, name: true, client_name: true, employer_id: true } });
    const empIdByKey = new Map(employers.map((e) => [normCompany(e.name), e.id]));

    // 1. Employers first, so projects in the same batch can sit under them.
    for (const p of picks.filter((x) => x.choice === "EMPLOYER")) {
      const key = normCompany(p.name);
      const row = byKey.get(key)!;
      if (!empIdByKey.has(key)) {
        const e = await tx.employer.create({
          data: {
            provider_profile_id: profileId,
            name: row.name.slice(0, 200),
            role_title: row.title?.slice(0, 200) ?? null,
            start_date: row.startDate ? new Date(row.startDate) : null,
            end_date: row.endDate ? new Date(row.endDate) : null,
          },
          select: { id: true },
        });
        empIdByKey.set(key, e.id);
        out.employers++;
      }
      // It was read as a project client; as an employer, the unattached project for it goes.
      const ids = projectFor(projects, key).filter((pr) => !pr.employer_id).map((pr) => pr.id);
      if (ids.length) await tx.project.deleteMany({ where: { id: { in: ids }, provider_profile_id: profileId } });
    }

    const ownEmployer = (ref: string | null | undefined): string | null => {
      if (!ref || ref === INDEPENDENT) return null;
      if (employers.some((e) => e.id === ref)) return ref;
      return empIdByKey.get(normCompany(ref)) ?? null;
    };

    // 2. Project clients.
    for (const p of picks.filter((x) => x.choice === "PROJECT")) {
      const key = normCompany(p.name);
      const row = byKey.get(key)!;
      const employerId = ownEmployer(p.employer);
      const existing = projectFor(projects, key);
      if (existing.length) {
        await tx.project.updateMany({ where: { id: { in: existing.map((e) => e.id) }, provider_profile_id: profileId }, data: { employer_id: employerId } });
      } else {
        await tx.project.create({
          data: {
            provider_profile_id: profileId,
            employer_id: employerId,
            name: (row.detail || row.name).slice(0, 200),
            client_name: row.name.slice(0, 200),
            start_date: row.startDate ? new Date(row.startDate) : null,
            end_date: row.endDate ? new Date(row.endDate) : null,
          },
        });
        out.projects++;
      }
      // It was read as an employer; as a client, that employer row goes (its projects stay, unattached).
      const asEmployer = employers.find((e) => normCompany(e.name) === key && e.id !== employerId);
      if (asEmployer) await tx.employer.delete({ where: { id: asEmployer.id } });
    }

    // 3. Remove: the member's own rows for that company.
    for (const p of picks.filter((x) => x.choice === "REMOVE")) {
      const key = normCompany(p.name);
      const pIds = projectFor(projects, key).map((x) => x.id);
      const eIds = employers.filter((e) => normCompany(e.name) === key).map((e) => e.id);
      if (pIds.length) out.removed += (await tx.project.deleteMany({ where: { id: { in: pIds }, provider_profile_id: profileId } })).count;
      if (eIds.length) out.removed += (await tx.employer.deleteMany({ where: { id: { in: eIds }, provider_profile_id: profileId } })).count;
    }
  });
  return out;
}
