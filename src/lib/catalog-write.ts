import { formatSkillName } from "@/lib/skill-match";
import { prisma } from "@/lib/prisma";
import { activeCatalogId } from "@/lib/catalog";

export type WriteResult =
  | { ok: true; id: string; message: string }
  | { ok: false; error: string; links?: number };

const refuse = (error: string, links?: number): WriteResult => ({
  ok: false,
  error,
  links,
});

/* ── LINK COUNTS — READ THIS BEFORE OFFERING DELETE ───────────────────────── */

/** How many people/requests point at this skill. Shown in the UI, pre-action. */
export async function skillLinks(id: string) {
  const [providers, requests, jobs] = await Promise.all([
    prisma.providerSkill.count({ where: { skill_id: id } }),
    prisma.workRequestSkill.count({ where: { skill_id: id } }),
    prisma.jobSkill.count({ where: { skill_id: id } }),
  ]);
  return { providers, requests, jobs, total: providers + requests + jobs };
}

/** How many people/requests point at this specialization. */
export async function specializationLinks(id: string) {
  const [providers, requests, projects, assessments] = await Promise.all([
    prisma.providerProfileSpecialization.count({ where: { specialization_id: id } }),
    prisma.workRequestSpecialization.count({ where: { specialization_id: id } }),
    prisma.project.count({ where: { industry_specialization_id: id } }),
    prisma.assessment.count({ where: { industry_specialization_id: id } }),
  ]);
  return {
    providers,
    requests,
    projects,
    assessments,
    total: providers + requests + projects + assessments,
  };
}

/* ── SPECIALIZATIONS ──────────────────────────────────────────────────────── */

export type SpecKind = "PRODUCT" | "METHODOLOGY" | "INDUSTRY";

export async function addSpecialization(rawName: string, kind: SpecKind): Promise<WriteResult> {
  const name = formatSkillName(rawName);
  const catalogId = await activeCatalogId();
  if (!catalogId) return refuse("There is no service catalog to add to.");

  const existing = await prisma.specialization.findFirst({
    where: { catalog_id: catalogId, name: { equals: name, mode: "insensitive" } },
    select: { id: true, name: true, status: true },
  });
  if (existing) {
    return refuse(
      existing.status === "RETIRED"
        ? `"${existing.name}" already exists but is retired — reactivate it instead of adding a duplicate.`
        : `"${existing.name}" is already in the catalog.`
    );
  }

  const row = await prisma.specialization.create({
    data: { catalog_id: catalogId, name, kind, sort_order: 900, origin: "ADMIN" },
    select: { id: true, name: true },
  });
  return { ok: true, id: row.id, message: `Added "${row.name}".` };
}

export async function renameSpecialization(id: string, rawName: string): Promise<WriteResult> {
  const name = formatSkillName(rawName);
  const row = await prisma.specialization.findUnique({
    where: { id },
    select: { id: true, catalog_id: true, name: true },
  });
  if (!row) return refuse("That specialization no longer exists.");

  const clash = await prisma.specialization.findFirst({
    where: {
      catalog_id: row.catalog_id,
      name: { equals: name, mode: "insensitive" },
      NOT: { id },
    },
    select: { name: true },
  });
  if (clash) return refuse(`"${clash.name}" already exists.`);

  await prisma.specialization.update({ where: { id }, data: { name } });
  return { ok: true, id, message: `Renamed to "${name}".` };
}

export async function setSpecializationKind(id: string, kind: SpecKind): Promise<WriteResult> {
  const row = await prisma.specialization.findUnique({ where: { id }, select: { name: true } });
  if (!row) return refuse("That specialization no longer exists.");
  await prisma.specialization.update({ where: { id }, data: { kind } });
  return { ok: true, id, message: `Moved "${row.name}" to ${kind}.` };
}

/* ── SKILLS ───────────────────────────────────────────────────────────────── */

export async function addSkill(
  rawName: string,
  roleTypeId: string,
  pillarId: string
): Promise<WriteResult> {
  const name = formatSkillName(rawName);
  const catalogId = await activeCatalogId();
  if (!catalogId) return refuse("There is no service catalog to add to.");

  const existing = await prisma.skill.findFirst({
    where: {
      catalog_id: catalogId,
      role_type_id: roleTypeId,
      pillar_id: pillarId,
      name: { equals: name, mode: "insensitive" },
    },
    select: { name: true, status: true },
  });
  if (existing) {
    return refuse(
      existing.status === "RETIRED"
        ? `"${existing.name}" already exists in this domain but is retired — reactivate it.`
        : `"${existing.name}" is already in this domain.`
    );
  }

  const row = await prisma.skill.create({
    data: {
      catalog_id: catalogId,
      role_type_id: roleTypeId,
      pillar_id: pillarId,
      name,
      origin: "ADMIN",
      visible_to_members: false,
    },
    select: { id: true, name: true },
  });
  return {
    ok: true,
    id: row.id,
    message: `Added "${row.name}". It is hidden from members until you show it.`,
  };
}

export async function renameSkill(id: string, rawName: string): Promise<WriteResult> {
  const name = formatSkillName(rawName);
  const row = await prisma.skill.findUnique({
    where: { id },
    select: { catalog_id: true, role_type_id: true, pillar_id: true },
  });
  if (!row) return refuse("That skill no longer exists.");

  const clash = await prisma.skill.findFirst({
    where: {
      catalog_id: row.catalog_id,
      role_type_id: row.role_type_id,
      pillar_id: row.pillar_id,
      name: { equals: name, mode: "insensitive" },
      NOT: { id },
    },
    select: { name: true },
  });
  if (clash) return refuse(`"${clash.name}" already exists in this domain.`);

  await prisma.skill.update({ where: { id }, data: { name } });
  return { ok: true, id, message: `Renamed to "${name}".` };
}

export async function moveSkill(
  id: string,
  roleTypeId: string,
  pillarId: string
): Promise<WriteResult> {
  const row = await prisma.skill.findUnique({
    where: { id },
    select: { name: true, catalog_id: true },
  });
  if (!row) return refuse("That skill no longer exists.");

  const clash = await prisma.skill.findFirst({
    where: {
      catalog_id: row.catalog_id,
      role_type_id: roleTypeId,
      pillar_id: pillarId,
      name: { equals: row.name, mode: "insensitive" },
      NOT: { id },
    },
    select: { name: true },
  });
  if (clash) {
    return refuse(
      `"${clash.name}" already exists in the destination domain. Merging two ` +
        `skills is not built — retire one instead.`
    );
  }

  await prisma.skill.update({
    where: { id },
    data: { role_type_id: roleTypeId, pillar_id: pillarId },
  });
  return { ok: true, id, message: `Moved "${row.name}".` };
}

/* ── DOMAIN AND ROLE — RENAME ONLY ───────────────────────────────────────── */

export async function setSkillVisibility(id: string, visible: boolean): Promise<WriteResult> {
  const row = await prisma.skill.findUnique({ where: { id }, select: { name: true } });
  if (!row) return refuse("That skill no longer exists.");
  await prisma.skill.update({ where: { id }, data: { visible_to_members: visible } });
  return {
    ok: true,
    id,
    message: visible ? `"${row.name}" is now shown to members.` : `"${row.name}" is hidden from members.`,
  };
}

export async function renamePillar(id: string, name: string): Promise<WriteResult> {
  const row = await prisma.pillar.findUnique({ where: { id }, select: { catalog_id: true } });
  if (!row) return refuse("That domain no longer exists.");
  const clash = await prisma.pillar.findFirst({
    where: { catalog_id: row.catalog_id, name: { equals: name, mode: "insensitive" }, NOT: { id } },
    select: { name: true },
  });
  if (clash) return refuse(`"${clash.name}" already exists.`);
  await prisma.pillar.update({ where: { id }, data: { name } });
  return { ok: true, id, message: `Renamed to "${name}".` };
}

export async function renameRoleType(id: string, display: string): Promise<WriteResult> {
  const row = await prisma.roleType.findUnique({ where: { id }, select: { id: true } });
  if (!row) return refuse("That role no longer exists.");
  const clash = await prisma.roleType.findFirst({
    where: { display: { equals: display, mode: "insensitive" }, NOT: { id } },
    select: { display: true },
  });
  if (clash) return refuse(`"${clash.display}" already exists.`);
  await prisma.roleType.update({ where: { id }, data: { display } });
  return { ok: true, id, message: `Renamed to "${display}".` };
}

/* ── STATUS AND DELETE ────────────────────────────────────────────────────── */

export async function setStatus(
  table: "skill" | "specialization",
  id: string,
  status: "ACTIVE" | "RETIRED"
): Promise<WriteResult> {
  if (table === "skill") {
    const row = await prisma.skill.findUnique({ where: { id }, select: { name: true } });
    if (!row) return refuse("That skill no longer exists.");
    await prisma.skill.update({ where: { id }, data: { status } });
    return {
      ok: true,
      id,
      message: status === "RETIRED" ? `Retired "${row.name}".` : `Reactivated "${row.name}".`,
    };
  }
  const row = await prisma.specialization.findUnique({ where: { id }, select: { name: true } });
  if (!row) return refuse("That specialization no longer exists.");
  await prisma.specialization.update({ where: { id }, data: { status } });
  return {
    ok: true,
    id,
    message: status === "RETIRED" ? `Retired "${row.name}".` : `Reactivated "${row.name}".`,
  };
}

export async function hardDelete(
  table: "skill" | "specialization",
  id: string
): Promise<WriteResult> {
  const links =
    table === "skill" ? await skillLinks(id) : await specializationLinks(id);

  if (links.total > 0) {
    return refuse(
      `Can't delete — ${links.total} ${links.total === 1 ? "record points" : "records point"} ` +
        `at this row (${links.providers} provider${links.providers === 1 ? "" : "s"}). ` +
        `Retire it instead: everyone who already picked it keeps it, and nobody is offered it again.`,
      links.total
    );
  }

  if (table === "skill") {
    const row = await prisma.skill.findUnique({ where: { id }, select: { name: true } });
    if (!row) return refuse("That skill no longer exists.");
    await prisma.skill.delete({ where: { id } });
    return { ok: true, id, message: `Deleted "${row.name}".` };
  }
  const row = await prisma.specialization.findUnique({ where: { id }, select: { name: true } });
  if (!row) return refuse("That specialization no longer exists.");
  await prisma.specialization.delete({ where: { id } });
  return { ok: true, id, message: `Deleted "${row.name}".` };
}

// THE SUGGESTION QUEUE

export type Suggestion = {
  id: string;
  name: string;
  /** `SUGGESTED` = waiting · `RETIRED` = already rejected, still accumulating. */
  status: "SUGGESTED" | "RETIRED";
  askedBy: number;
  /** Who asked, newest first — the queue's "Provider - Company" column. */
  providers: { name: string; company: string | null }[];
  postedAt: Date;
};

/** The queue, ORDERED BY HOW MANY PEOPLE ASKED, NOT BY DATE. */
export async function suggestionQueue(): Promise<Suggestion[]> {
  // REJECTED ROWS STAY IN THE QUEUE, MARKED. The brief: *"Reject keeps the
  const rows = await prisma.specialization.findMany({
    where: {
      origin: "PROVIDER",
      status: { in: ["SUGGESTED", "RETIRED"] },
    },
    select: {
      id: true,
      name: true,
      status: true,
      created_at: true,
      providerProfiles: {
        select: {
          created_at: true,
          providerProfile: {
            select: {
              person: {
                select: {
                  first_name: true,
                  last_name: true,
                  company: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { created_at: "desc" },
      },
    },
  });

  return rows
    .map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status as "SUGGESTED" | "RETIRED",
      askedBy: r.providerProfiles.length,
      providers: r.providerProfiles.map((l) => ({
        name:
          `${l.providerProfile.person.first_name ?? ""} ${l.providerProfile.person.last_name ?? ""}`.trim() ||
          "(unnamed)",
        company: l.providerProfile.person.company?.name ?? null,
      })),
      postedAt: r.created_at,
    }))
    // MOST-ASKED FIRST; a tie goes to whoever has waited longest. Anything
    .sort(
      (a, b) =>
        Number(b.status === "SUGGESTED") - Number(a.status === "SUGGESTED") ||
        b.askedBy - a.askedBy ||
        a.postedAt.getTime() - b.postedAt.getTime()
    );
}

/** PROMOTE — THE ADMIN CHOOSES THE KIND. THAT IS THE WHOLE POINT. */
export async function promoteSuggestion(id: string, kind: SpecKind): Promise<WriteResult> {
  const row = await prisma.specialization.findUnique({
    where: { id },
    select: { name: true, status: true, catalog_id: true },
  });
  if (!row) return refuse("That suggestion no longer exists.");
  // A REJECTED ROW CAN STILL BE PROMOTED — that is the point of keeping it.
  if (row.status === "ACTIVE") return refuse(`"${row.name}" is already live.`);

  // A SUGGESTION THAT DUPLICATES A LIVE ROW IS A MERGE, NOT A PROMOTE, and
  const clash = await prisma.specialization.findFirst({
    where: {
      catalog_id: row.catalog_id,
      name: { equals: row.name, mode: "insensitive" },
      status: "ACTIVE",
      NOT: { id },
    },
    select: { name: true },
  });
  if (clash) {
    return refuse(
      `"${clash.name}" is already live. Promoting this would create a second ` +
        `row with the same name — reject the suggestion instead.`
    );
  }

  const links = await prisma.providerProfileSpecialization.count({
    where: { specialization_id: id },
  });
  await prisma.specialization.update({ where: { id }, data: { status: "ACTIVE", kind } });
  return {
    ok: true,
    id,
    message:
      `Promoted "${row.name}" to ${kind}. ` +
      `${links} provider${links === 1 ? "" : "s"} already had it and keep it.`,
  };
}

/** REJECT KEEPS THE RECORD. The same suggestion arriving five more times is */
export async function rejectSuggestion(id: string): Promise<WriteResult> {
  const row = await prisma.specialization.findUnique({
    where: { id },
    select: { name: true, status: true },
  });
  if (!row) return refuse("That suggestion no longer exists.");
  if (row.status !== "SUGGESTED") return refuse(`"${row.name}" is not waiting in the queue.`);
  // it survive, which is what lets a re-asked term climb back up the queue.
  await prisma.specialization.update({ where: { id }, data: { status: "RETIRED" } });
  return {
    ok: true,
    id,
    message: `Rejected "${row.name}". The record is kept — if it is asked for again it comes back up the queue.`,
  };
}
