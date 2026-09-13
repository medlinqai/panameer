import { prisma } from "@/lib/prisma";

/**
 * THE CATALOG WRITE PATH (`P1-A1.5-E481`).
 *
 * > **SCOTT, on RDS:** *"There is no way to add/delete/update a Role, Domain, or
 * > Skill…which would be the point of the page, no? Mostly, this should be
 * > editing."*
 * > **On Specializations:** *"Only the ADMIN should add/update/delete."*
 *
 * ⚠⚠ EVERY MUTATION IN THIS FILE OBEYS THREE RULES. They are enforced here, in
 * one place, rather than remembered at each call site.
 *
 * ── TRAP 1 · A RENAME IS AN `UPDATE`. NEVER DELETE-AND-CREATE. ──────────────
 *
 * ⚠ `seed-taxonomy.ts:294`, verbatim: *"Renaming the row keeps its id, so every
 * provider who picked the skill keeps it. The alternative — let the old name
 * retire and the new one appear — reads identically in the catalog and silently
 * takes the selection away."*
 * ⚠⚠ THERE IS NO EXCEPTION. A rename that changes an id is a data-loss bug that
 * looks like a successful save. Every rename below is `prisma.*.update`, and
 * there is no code path in this file that creates a row to satisfy a rename.
 *
 * ── TRAP 2 · THE SEED MUST NOT EAT WHAT AN ADMIN ADDS. ──────────────────────
 *
 * ⚠ Answered by Part A and VERIFIED before this file shipped: every `add` sets
 * `origin: "ADMIN"`, and `seed-taxonomy.ts`'s retirement pass may delete
 * `origin: SEED` rows only. ⚠ PROVEN, not assumed — an ADMIN row was inserted,
 * a full `seed:catalog` was run, and the row survived with its id intact.
 *
 * ── TRAP 3 · NOTHING IS EVER SILENTLY CASCADED. ────────────────────────────
 *
 * ⚠ INACTIVATE is always allowed and always safe: it sets `status: RETIRED` and
 * touches NO links, so everyone who already picked the row keeps it.
 * ⚠⚠ DELETE IS REFUSED WHENEVER THE LINK COUNT IS NON-ZERO, and the refusal
 * carries the count. NOT behind a confirm dialog, NOT behind a checkbox — there
 * is no parameter on any function here that forces a cascade, because the
 * safest possible confirm dialog is still a way to lose somebody's profile.
 * ⚠ The UI reads `linkCounts()` and shows the number BEFORE the admin acts.
 */

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
    /* ⚠ `SetNull`, NOT cascade — deleting would blank the field rather than
       destroy the row. It still counts: an assessment silently losing its
       industry is the same class of loss, just quieter. */
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

export async function addSpecialization(name: string, kind: SpecKind): Promise<WriteResult> {
  const catalog = await prisma.serviceCatalog.findFirst({ select: { id: true } });
  if (!catalog) return refuse("There is no service catalog to add to.");

  /* ⚠ DEDUPED CASE-INSENSITIVELY, like the provider add-on-the-fly path — two
     rows differing only in case are two rows a picker offers twice. */
  const existing = await prisma.specialization.findFirst({
    where: { catalog_id: catalog.id, name: { equals: name, mode: "insensitive" } },
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
    /* ⚠⚠ `origin: ADMIN` IS LOAD-BEARING, NOT BOOKKEEPING. Without it the row
       defaults to SEED and the next reseed is entitled to delete it. */
    data: { catalog_id: catalog.id, name, kind, sort_order: 900, origin: "ADMIN" },
    select: { id: true, name: true },
  });
  return { ok: true, id: row.id, message: `Added "${row.name}".` };
}

export async function renameSpecialization(id: string, name: string): Promise<WriteResult> {
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

  /* ⚠⚠ TRAP 1 — AN UPDATE. The id is unchanged, so every
     ProviderProfileSpecialization pointing at it still points at it. */
  await prisma.specialization.update({ where: { id }, data: { name } });
  return { ok: true, id, message: `Renamed to "${name}".` };
}

/**
 * ⚠⚠ THE `kind` EDIT IS THE REPAIR PATH FOR THE HARD-CODED `PRODUCT` BUG.
 *
 * `lib/onboarding.ts`'s add-on-the-fly path creates every provider-typed
 * specialization as `kind: "PRODUCT"`, whatever it actually is — which is how
 * an industry or a methodology ends up filed under Products & Platforms. ⚠ This
 * is how it gets moved back, and it is needed on day one.
 * ⚠ THE ROW KEEPS ITS ID, so nobody loses the selection in the move.
 */
export async function setSpecializationKind(id: string, kind: SpecKind): Promise<WriteResult> {
  const row = await prisma.specialization.findUnique({ where: { id }, select: { name: true } });
  if (!row) return refuse("That specialization no longer exists.");
  await prisma.specialization.update({ where: { id }, data: { kind } });
  return { ok: true, id, message: `Moved "${row.name}" to ${kind}.` };
}

/* ── SKILLS ───────────────────────────────────────────────────────────────── */

export async function addSkill(
  name: string,
  roleTypeId: string,
  pillarId: string
): Promise<WriteResult> {
  const catalog = await prisma.serviceCatalog.findFirst({ select: { id: true } });
  if (!catalog) return refuse("There is no service catalog to add to.");

  const existing = await prisma.skill.findFirst({
    where: {
      catalog_id: catalog.id,
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
      catalog_id: catalog.id,
      role_type_id: roleTypeId,
      pillar_id: pillarId,
      name,
      /* ⚠⚠ See addSpecialization — this is what the seed reads. */
      origin: "ADMIN",
    },
    select: { id: true, name: true },
  });
  return { ok: true, id: row.id, message: `Added "${row.name}".` };
}

export async function renameSkill(id: string, name: string): Promise<WriteResult> {
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

  /* ⚠⚠ TRAP 1 — AN UPDATE. Every ProviderSkill keeps pointing at this id. */
  await prisma.skill.update({ where: { id }, data: { name } });
  return { ok: true, id, message: `Renamed to "${name}".` };
}

/**
 * Move a skill to a different (role, domain) pair — ⚠ THE COMMON CASE.
 *
 * ⚠⚠ A MOVE IS AN UPDATE TOO. The obvious wrong implementation is "create it in
 * the new domain, retire it in the old one", which reads identically in the
 * catalog and takes every provider's selection away. The id does not change.
 */
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

/**
 * ⚠ RENAME ONLY. Adding or retiring a domain is a catalog-STRUCTURE change and
 * is deliberately out of scope: `Pillar` carries no `status` column (Part A left
 * it alone on purpose), so there is nothing to retire it into.
 */
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

/**
 * ⚠⚠ RENAME ONLY, AND THE REASON IS THE BLAST RADIUS. Five rows, each
 * referenced by `ProviderProfile.role_type_id`, `WorkRequest`, `Package` and
 * `Project`. Retiring one would strand every profile built on it.
 */
export async function renameRoleType(id: string, display: string): Promise<WriteResult> {
  const row = await prisma.roleType.findUnique({ where: { id }, select: { id: true } });
  if (!row) return refuse("That role no longer exists.");
  const clash = await prisma.roleType.findFirst({
    where: { display: { equals: display, mode: "insensitive" }, NOT: { id } },
    select: { display: true },
  });
  if (clash) return refuse(`"${clash.display}" already exists.`);
  /* ⚠ `display` ONLY. `name` and `code` are what the seed matches on, and
     renaming either would make the next reseed treat this as a new role. */
  await prisma.roleType.update({ where: { id }, data: { display } });
  return { ok: true, id, message: `Renamed to "${display}".` };
}

/* ── STATUS AND DELETE ────────────────────────────────────────────────────── */

/**
 * ⚠ ALWAYS ALLOWED, ALWAYS SAFE. Sets the status and touches NO links, so a
 * provider who already picked the row keeps it and simply stops being offered
 * it. This is the answer to every "can I remove this?" that has links.
 */
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

/**
 * ⚠⚠ DELETE ONLY AT ZERO LINKS. THERE IS NO FORCE PARAMETER, BY DESIGN.
 *
 * ⚠ A caller cannot opt into a cascade, because a confirm dialog is not consent
 * from the PROVIDER whose profile would lose a row. The refusal carries the
 * count so the UI can say exactly what is in the way and offer Inactivate.
 */
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
