import type { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

/**
 * Seeds the provider taxonomy from the AUTHORITATIVE Service Catalog
 * (`prisma/seed-data/service-catalog.json`, generated from Scott's
 * "Service Catalog.xlsx") — brief_R.
 *
 * Shape is three levels: **Role → Domain → Skill**, plus a cross-cutting
 * **Specializations** vocabulary. Mapped onto the existing models as:
 *
 *   Role   → `RoleType`        (5: Application- / Technology- / Project- /
 *                               Operations-Specific, then AI-Specialist)
 *   Domain → `Pillar`          (28, unique names)
 *   Skill  → `Skill(role_type_id, pillar_id)` — a skill belongs to the PAIR
 *
 * Everything here is REFERENCE data — global, not PAccount-scoped. Fully
 * idempotent: every write is an upsert keyed on a natural unique, and the
 * retirement pass below is safe to re-run.
 *
 * ⚠ THIS SEED CAN TAKE THINGS AWAY (brief_reseed_expanded_catalog, 2026-08-07).
 * The expanded catalog restructures the enterprise side rather than adding to
 * it, so the retirement pass is no longer a formality that cleans up strays from
 * an older seed — it is the mechanism by which a provider loses a skill. Four
 * passes stand between a catalog edit and that outcome, in this order:
 *
 *   1. RENAME    — a row respelled in place keeps its id and its providers.
 *   2. REHOME    — same role, same name, new domain: move the row, don't recreate it.
 *   3. MERGE     — two old rows collapsing into one: re-point the links.
 *   4. GUARD     — count what is still going to be lost, and refuse past a limit.
 *
 * Whatever survives all four is genuinely gone from the catalog, and the counts
 * returned below say exactly what it cost.
 *
 * SUPERSEDES the brief_B/brief_P ERP taxonomy that was seeded from
 * `erp-catalog.json`. That file is left in place as history; nothing reads it.
 */

type CatalogJson = {
  _source?: string;
  _note?: string;
  roles: {
    name: string;
    /**
     * The picker label (E229). Now carried by EVERY role in the expanded
     * catalog — "Application-Specific Roles", "AI-Specialist Roles" — so the
     * five read as one convention instead of four bare nouns and one outlier.
     *
     * Still optional, and the fallback below still appends " Roles", so a role
     * added to the JSON without one is labelled sensibly rather than silently
     * differently. An explicit `display` always wins.
     */
    display?: string;
    domains: { name: string; skills: string[] }[];
  }[];
  specializations: string[];
};

export type TaxonomyCounts = {
  roles: number;
  domains: number;
  skills: number;
  specializations: number;
  regions: number;
  engagementTypes: number;
  applications: number;
  /** Non-role entries filtered out of the source catalog (E072). */
  excludedRoleTypes: number;

  /* --- what the reseed found already there ------------------------------- */
  before: { roles: number; domains: number; skills: number; customSkills: number };

  /* --- what it MOVED rather than replaced -------------------------------- */
  /** Domain rows relabelled in place, keeping their id and their providers. */
  renamedDomains: string[];
  /** Skill rows relabelled in place — spelling only. */
  renamedSkills: string[];
  /** Skills that kept their name and role but changed domain. Links preserved. */
  rehomedSkills: number;
  /** Links re-pointed off a retiring row onto a surviving one of the same name. */
  mergedSkillLinks: number;

  /* --- what it retired --------------------------------------------------- */
  retiredSkills: number;
  retiredSkillNames: string[];
  retiredPillars: number;
  retiredPillarNames: string[];
  retiredRoleTypes: number;

  /* --- what that cost ---------------------------------------------------- */
  orphanedProviderSkills: number;
  orphanedWorkRequestSkills: number;
  /** "Role :: Skill — n link(s)", so a loss is readable and not just counted. */
  orphanedSkillDetail: string[];
  /** Providers whose chosen DOMAIN split and no longer exists (pillar_id → null). */
  providersDetachedFromDomain: number;
  workRequestsDetachedFromDomain: number;
};

/** The single catalog row everything hangs off. */
const CATALOG = {
  code: "PANAMEER_V1",
  name: "Panameer Service Catalog V1",
  description:
    "Authoritative provider taxonomy: Role → Domain → Skill, plus Specializations.",
};

/**
 * Typos in the source xlsx (brief_R). Scott is fixing the spreadsheet; until a
 * regenerated JSON lands, correct them here so the app never shows them.
 * Keyed on the exact source string.
 */
const TYPO_FIXES: Record<string, string> = {
  "Acounting Hub": "Accounting Hub",
  "Accouting Hub": "Accounting Hub",
  "Planning & Budgetting": "Planning & Budgeting",
  "Enterprise Business Suite ()EBS)": "Enterprise Business Suite (EBS)",
};

const fixTypo = (s: string) => TYPO_FIXES[s] ?? s;

/**
 * Role types in the source file that are NOT roles.
 *
 * ⚠ NOW EMPTY — "Project-Specific" was REINSTATED as a fourth Role at Scott's
 * instruction (E163). It had been excluded under E072 on the grounds that its
 * one domain, "Project Execution", carries eight entries that are JOB TITLES
 * rather than capabilities — Project Manager, Technical Architect, Technical
 * Lead, Business Architect, Testing Specialist, Support Specialist, Change Mgt
 * Specialist, Program Management — and the profile already records a title as
 * `Employer.role_title`.
 *
 * That reasoning still describes the DATA, so reinstating the role also
 * reinstates eight titles into the skills axis. Flagged, not silently
 * swallowed: if the intent is a Project-Specific role without title-shaped
 * skills, the fix is in the source spreadsheet that generates
 * service-catalog.json, not here.
 *
 * The mechanism stays so the next non-role can be excluded without rebuilding
 * it — the seed's retirement pass reads this set on every run.
 */
const NON_ROLE_TYPES = new Set<string>([]);

/** Stable code from a display name: "Finance & Accounting" → FINANCE_ACCOUNTING. */
function toCode(name: string): string {
  return name
    .toUpperCase()
    .replace(/&/g, " ")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Display order for the Role → Domain picker (E013: keep the ERP-heavy areas
 * prominent). Anything unlisted falls to the default and sorts by name.
 */
/*
  FIVE ROLES, ERP FIRST — E228 resolved (brief_reseed_expanded_catalog).

  This list was briefly AI-first, on the reading that the CWR deck's step 1 leads
  with AI. That contradicted E013, which pinned the ERP core first, and BOTH
  pickers — provider onboarding and Create Work Request — read this one order, so
  the two moved together and one of them was always wrong. Application-Specific
  leads; AI-Specialist, which is the newest and narrowest of the five, is last.

  The order matches the JSON's own role order, so the file reads the way the
  picker renders.
*/
const ROLE_SORT: Record<string, number> = {
  "Application-Specific": 10,
  "Technology-Specific": 20,
  "Project-Specific": 30,
  "Operations-Specific": 40,
  "AI-Specialist": 50,
};

/*
  THE 28 DOMAINS OF THE EXPANDED CATALOG, in the delivered file's order.

  Domain names are now unique across roles — the old catalog reused "Finance &
  Accounting" and "Supply Chain Management" under two roles apiece — so one flat
  table orders every branch without the roles competing. Only a role's own
  domains ever render, so the numbering is contiguous rather than banded.
*/
const DOMAIN_SORT: Record<string, number> = {
  // Application-Specific — the ERP core leads, in process order.
  "Financials (Record-to-Report)": 10,
  "Procurement (Source-to-Pay)": 11,
  "Project Management": 12,
  "Supply Chain Management": 13,
  "Human Capital Management": 14,
  "Customer Experience": 15,
  "Enterprise Performance Management": 16,
  "Risk & Compliance": 17,
  // Technology-Specific
  "Extensions & Development": 20,
  Integrations: 21,
  "Data & Conversion": 22,
  "Reporting & Analytics": 23,
  "Security & Administration": 24,
  "Quality & Testing": 25,
  // Project-Specific
  "Delivery Leadership": 30,
  "Architecture & Design": 31,
  "Testing & Support": 32,
  "Change & Enablement": 33,
  // Operations-Specific
  "Finance Operations": 40,
  "Procurement Operations": 41,
  "Supply Chain Operations": 42,
  "HR Operations": 43,
  "Project Operations": 44,
  // AI-Specialist
  "Core Technical & Development": 50,
  "Creative & Content Generation": 51,
  "Data Support & Services": 52,
  "AI Governance & Trust": 53,
  "AI Consulting & Enablement": 54,
};

/**
 * DOMAINS THAT WERE RENAMED, NOT REPLACED (brief_reseed_expanded_catalog).
 *
 * The expanded catalog restructures the enterprise side, and most of that is
 * genuine structural change: "Finance & Accounting" SPLITS into Financials /
 * Procurement / Project Management, "Development & IT" splits into six. A split
 * cannot be migrated — there is no single successor to point a provider at — so
 * those domains retire and the providers who picked them re-pick.
 *
 * These three are different: same domain, new label. Renaming the row keeps its
 * id, so a provider who chose "Human Resources & Training" is still in Human
 * Capital Management afterwards. Upserting the new name instead would create a
 * second row and retire the first out from under them — the same trap the
 * specialization renames below already document.
 */
const DOMAIN_RENAMES: Record<string, string> = {
  "Human Resources & Training": "Human Capital Management",
  "Customer Relationship Management": "Customer Experience",
  "Enterprise Performance Mgt": "Enterprise Performance Management",
};

/**
 * SKILLS THAT WERE RENAMED, NOT REPLACED.
 *
 * Renaming the row keeps its id, so every provider who picked the skill keeps
 * it. The alternative — let the old name retire and the new one appear — reads
 * identically in the catalog and silently takes the selection away.
 *
 * Two kinds live here, and the difference is worth keeping straight:
 *
 *   SPELLING — spacing, punctuation, an expanded abbreviation, a plural. Same
 *   words. Safe to apply without asking; the first six were added with the
 *   expanded catalog itself.
 *
 *   MEANING — the catalog changed the WORDS: "Supplier Qualifications" →
 *   "Supplier Qualification Management", the job title "Prompt Engineer" → the
 *   capability "Prompt Engineering". Each is a claim about what the catalog
 *   means, so these were reported rather than assumed, and added on Scott's
 *   instruction (brief_catalog_renames_and_dev_banner WS-A).
 *
 * `role` SCOPES A RENAME TO ONE ROLE, and "Project Manager" is why it exists.
 * The name sits under Project-Specific / Delivery Leadership, where it survives
 * untouched, AND under Operations-Specific, where the expanded catalog calls it
 * "Project Manager (PPM)". An unscoped rename would catch both, leaving
 * Project-Specific holding a PPM title it never had — and, because that name is
 * not in its branch of the catalog, retiring it on the same run.
 */
const SKILL_RENAMES: { from: string; to: string; role?: string }[] = [
  /* --- spelling ---------------------------------------------------------- */
  { from: "Purchasing/Purchase Orders", to: "Purchasing / Purchase Orders" },
  { from: "Sourcing/Negotiations", to: "Sourcing / Negotiations" },
  { from: "Absence Mgt", to: "Absence Management" },
  { from: "Warehouse Mgt", to: "Warehouse Management" },
  { from: "PL SQL Specialist", to: "PL/SQL Specialist" },
  { from: "Grant Management", to: "Grants Management" },
  /* --- meaning (WS-A) ---------------------------------------------------- */
  { from: "Supplier Qualifications", to: "Supplier Qualification Management" },
  { from: "Prompt Engineer", to: "Prompt Engineering" },
  { from: "AI Data Annotation & Labeling", to: "Data Annotation & Labeling" },
  { from: "Project Manager", to: "Project Manager (PPM)", role: "Operations-Specific" },
];

/**
 * How many provider/Work-Request selections may be dropped before the reseed
 * refuses to run (brief_reseed_expanded_catalog).
 *
 * A structural reseed is allowed to retire rows — that is what it is for — but
 * "retire a domain" and "silently delete two hundred people's skills" look
 * identical from inside this function. The guard runs AFTER the rehome and merge
 * passes have saved everything that can be saved, so the number it tests is the
 * true, irreducible loss. Raise it deliberately with CATALOG_ORPHAN_LIMIT once
 * the report has been read.
 */
const ORPHAN_LIMIT = Number(process.env.CATALOG_ORPHAN_LIMIT ?? 50);

/**
 * Specialization grouping. The xlsx is a flat list; these buckets drive the
 * picker's section headings. Anything unlisted defaults to PRODUCT.
 */
const METHODOLOGIES = new Set([
  "Procure-to-Pay",
  "Record-to-Report",
  "Order-to-Cash",
  "Hire-to-Fire",
  "Source-to-Pay",
  "Putaway-to-Issue", // E104
]);
const INDUSTRIES = new Set([
  "Public Sector & Government",
  "Healthcare & Life Sciences",
  "Financial Services & Fintech",
  "Energy, Utilities, & Resources",
  "Education Services",
  "Consumer Products & Retail",
  "Technology, Media, & Telecommunications",
  "Real Estate & Infrastructure",
  "Transportation, Travel, & Logistics",
  "Industry Products & Manufacturing",
  // Superseded names, kept in the set so a row that has not yet been renamed is
  // still bucketed as an INDUSTRY rather than silently falling through to
  // PRODUCT while the rename pass runs.
  "Federal Government",
  "State & Local Government",
  "Healthcare",
  "Financial Services",
  "Energy Services",
  "Retail",
  "Information Technology Services",
]);

/**
 * E104/E105 — vocabulary the xlsx doesn't carry yet.
 *
 * The catalog JSON is GENERATED from Scott's spreadsheet, so editing it would be
 * overwritten by the next export. These additions live in the seed source, per
 * the brief, and are appended after the generated list.
 */
const EXTRA_SPECIALIZATIONS = [
  "Putaway-to-Issue", //                          E104, Processes & Methodologies
  "Technology, Media, & Telecommunications", //   E105, Industries ↓
  "Real Estate & Infrastructure",
  "Transportation, Travel, & Logistics",
  "Industry Products & Manufacturing",
  "Energy, Utilities, & Resources",
  "Consumer Products & Retail",
];

/**
 * E105 — renames, applied to the EXISTING rows rather than created alongside
 * them. A rename must not orphan the providers who already picked the old name,
 * so the row keeps its id and only its label changes.
 *
 * The two Government entries MERGE into one. That is not a rename: two rows
 * become one, and any provider who picked both must end up with a single link
 * rather than a duplicate-key error.
 */
const SPECIALIZATION_RENAMES: Record<string, string> = {
  Healthcare: "Healthcare & Life Sciences",
  "Financial Services": "Financial Services & Fintech",
  "Energy Services": "Energy, Utilities, & Resources",
  Retail: "Consumer Products & Retail",
  "Information Technology Services": "Technology, Media, & Telecommunications",
  "Federal Government": "Public Sector & Government",
};
/** Merged INTO `Public Sector & Government`, then deleted. */
const SPECIALIZATION_MERGES: Record<string, string> = {
  "State & Local Government": "Public Sector & Government",
};

function specializationKind(name: string): "PRODUCT" | "METHODOLOGY" | "INDUSTRY" {
  if (METHODOLOGIES.has(name)) return "METHODOLOGY";
  if (INDUSTRIES.has(name)) return "INDUSTRY";
  return "PRODUCT";
}

export async function seedTaxonomy(
  prisma: PrismaClient
): Promise<TaxonomyCounts> {
  const file = path.resolve(__dirname, "seed-data", "service-catalog.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as CatalogJson;
  // E072 — drop non-role "roles" before anything downstream sees them, so the
  // picker, the skills tree and the retirement pass all agree.
  const data: CatalogJson = {
    ...raw,
    roles: raw.roles.filter((r) => !NON_ROLE_TYPES.has(fixTypo(r.name.trim()))),
  };
  const excludedRoleTypes = raw.roles.length - data.roles.length;

  // Read BEFORE anything is written, so the report can state before→after rather
  // than after→after. A structural reseed is exactly the case where "it ran" is
  // not the same information as "here is what it changed".
  const before = {
    roles: await prisma.roleType.count(),
    domains: await prisma.pillar.count(),
    skills: await prisma.skill.count({ where: { is_custom: false } }),
    customSkills: await prisma.skill.count({ where: { is_custom: true } }),
  };

  // --- Catalog -------------------------------------------------------------
  const catalog = await prisma.serviceCatalog.upsert({
    where: { code: CATALOG.code },
    update: { name: CATALOG.name, description: CATALOG.description },
    create: CATALOG,
  });

  // --- Roles (RoleType) ----------------------------------------------------
  const roleIdByName = new Map<string, string>();
  for (const role of data.roles) {
    const code = toCode(role.name);
    /*
      THE DECK PUTS "ROLES" ON EVERY CARD — "Application-Specific Roles",
      "AI-Specialist Roles". The old derivation did the opposite: it STRIPPED
      "-Specific" and rendered a bare "Application", so the role step read as
      four nouns where the design reads as four roles. An explicit display in
      the catalog still wins; otherwise the suffix is added, not removed.
    */
    const display = role.display ?? `${role.name} Roles`;
    const row = await prisma.roleType.upsert({
      where: { code },
      update: {
        name: role.name,
        display,
        sort_order: ROLE_SORT[role.name] ?? 100,
      },
      create: {
        code,
        name: role.name,
        display,
        sort_order: ROLE_SORT[role.name] ?? 100,
      },
    });
    roleIdByName.set(role.name, row.id);
  }

  // --- Domain renames, BEFORE the upsert -----------------------------------
  /*
    Same ordering rule as the specializations further down, for the same reason:
    rename first and the row keeps its id and its providers; upsert first and you
    get two rows, one of which is then retired with people attached to it.

    The `code` moves with the name — it is derived from it, and leaving
    HUMAN_RESOURCES_TRAINING on a row labelled "Human Capital Management" would
    make the next reseed create a second row for the new code.
  */
  const renamedDomains: string[] = [];
  for (const [from, to] of Object.entries(DOMAIN_RENAMES)) {
    const existing = await prisma.pillar.findFirst({
      where: { catalog_id: catalog.id, name: from },
      select: { id: true },
    });
    if (!existing) continue; // already renamed on an earlier run
    const clash = await prisma.pillar.findFirst({
      where: { catalog_id: catalog.id, code: toCode(to) },
      select: { id: true },
    });
    if (clash && clash.id !== existing.id) continue;
    await prisma.pillar.update({
      where: { id: existing.id },
      data: { name: to, code: toCode(to) },
    });
    renamedDomains.push(`${from} → ${to}`);
  }

  // --- Domains (Pillar) — distinct names, shared across roles ---------------
  const domainNames = [
    ...new Set(data.roles.flatMap((r) => r.domains.map((d) => d.name))),
  ];
  const domainIdByName = new Map<string, string>();
  for (const name of domainNames) {
    const code = toCode(name);
    const row = await prisma.pillar.upsert({
      where: { catalog_id_code: { catalog_id: catalog.id, code } },
      update: { name, sort_order: DOMAIN_SORT[name] ?? 100 },
      create: {
        catalog_id: catalog.id,
        code,
        name,
        sort_order: DOMAIN_SORT[name] ?? 100,
      },
    });
    domainIdByName.set(name, row.id);
  }

  // --- Skill renames, BEFORE the upsert ------------------------------------
  // Spelling only (see SKILL_RENAMES). Renaming in place keeps the row id, so
  // the rehome pass below then treats it as an existing skill that moved domain
  // rather than as one name retiring and a near-identical one appearing.
  const renamedSkills: string[] = [];
  for (const { from, to, role } of SKILL_RENAMES) {
    /*
      A `role` that names nothing THROWS rather than quietly matching every row.
      Getting the role wrong turns a scoped rename into a blanket one, which is
      the exact failure the scope was added to prevent — a silent no-op would
      hide it until a provider noticed a missing skill.
    */
    let scopedRoleId: string | undefined;
    if (role) {
      scopedRoleId = roleIdByName.get(role);
      if (!scopedRoleId) {
        throw new Error(
          `SKILL_RENAMES: "${from}" → "${to}" is scoped to role "${role}", which is ` +
            `not in the catalog. Fix the role name or drop the scope.`
        );
      }
    }

    const rows = await prisma.skill.findMany({
      where: {
        catalog_id: catalog.id,
        name: from,
        is_custom: false,
        ...(scopedRoleId ? { role_type_id: scopedRoleId } : {}),
      },
      select: { id: true, role_type_id: true, pillar_id: true },
    });
    for (const row of rows) {
      const clash = await prisma.skill.findFirst({
        where: {
          catalog_id: catalog.id,
          role_type_id: row.role_type_id,
          pillar_id: row.pillar_id,
          name: to,
        },
        select: { id: true },
      });
      // The new name is already sitting in this exact slot — renaming would hit
      // the (catalog, role, domain, name) unique. Leave it; the merge pass will
      // fold this row's links into that one.
      if (clash && clash.id !== row.id) continue;
      await prisma.skill.update({ where: { id: row.id }, data: { name: to } });
      renamedSkills.push(`${from} → ${to}`);
    }
  }

  // --- Skills, keyed on the (Role, Domain, name) triple ---------------------
  // "Project Manager" exists under two different (role, domain) pairs, so the
  // name alone is NOT a key — see the note on Skill's @@unique in schema.prisma.
  const keptSkillIds = new Set<string>();
  /** roleTypeId||name → the surviving skill id, for the merge pass below. */
  const keptByRoleAndName = new Map<string, string>();
  let skillCount = 0;
  let rehomedSkills = 0;

  for (const role of data.roles) {
    const roleTypeId = roleIdByName.get(role.name)!;
    for (const domain of role.domains) {
      const pillarId = domainIdByName.get(domain.name)!;
      for (const rawName of domain.skills) {
        const name = fixTypo(rawName);

        let id: string | null = null;
        const exact = await prisma.skill.findUnique({
          where: {
            catalog_id_role_type_id_pillar_id_name: {
              catalog_id: catalog.id,
              role_type_id: roleTypeId,
              pillar_id: pillarId,
              name,
            },
          },
          select: { id: true },
        });

        if (exact) {
          id = exact.id;
        } else {
          /*
            REHOME BEFORE CREATE — the whole point of this reseed's migration
            note. The expanded catalog moves 57 skills to a different domain
            under the SAME role: "Payables" leaves "Finance & Accounting" for
            "Financials (Record-to-Report)", "Requisitions" for "Procurement
            (Source-to-Pay)". A plain upsert on the triple treats each of those
            as a brand-new skill, and the retirement pass then deletes the old
            row — taking every provider who had picked it.

            Matching on (role, name) and MOVING the row keeps the id, so the
            selection survives a change that, from the provider's side, is
            nothing more than the catalog reorganising its own headings.

            Same ROLE only. "Project Manager" retires from Operations-Specific
            and exists under Project-Specific; moving the row across would leave
            an Operations provider holding a skill that no longer renders inside
            their own role, which is a worse outcome than losing it cleanly.
          */
          const moved = await prisma.skill.findFirst({
            where: {
              catalog_id: catalog.id,
              role_type_id: roleTypeId,
              name,
              is_custom: false,
              NOT: { pillar_id: pillarId },
            },
            select: { id: true },
          });
          if (moved) {
            await prisma.skill.update({
              where: { id: moved.id },
              data: { pillar_id: pillarId },
            });
            id = moved.id;
            rehomedSkills++;
          } else {
            const created = await prisma.skill.create({
              data: {
                catalog_id: catalog.id,
                role_type_id: roleTypeId,
                pillar_id: pillarId,
                name,
              },
              select: { id: true },
            });
            id = created.id;
          }
        }

        keptSkillIds.add(id);
        keptByRoleAndName.set(`${roleTypeId}||${name}`, id);
        skillCount++;
      }
    }
  }

  // --- Specializations ------------------------------------------------------
  /*
    E105 — RENAME BEFORE UPSERT, in that order.

    Renaming an existing row keeps its id, so every provider who already picked
    "Healthcare" still has it and simply sees the new label. Doing it the other
    way — upserting the new names first — would create a second row and leave
    those providers attached to the old one, which then gets retired underneath
    them.
  */
  for (const [from, to] of Object.entries(SPECIALIZATION_RENAMES)) {
    const existing = await prisma.specialization.findFirst({
      where: { catalog_id: catalog.id, name: from },
      select: { id: true },
    });
    if (!existing) continue;
    const clash = await prisma.specialization.findFirst({
      where: { catalog_id: catalog.id, name: to },
      select: { id: true },
    });
    // Already renamed on a previous run, and a row with the new name exists —
    // nothing to do rather than a unique-constraint failure.
    if (clash && clash.id !== existing.id) continue;
    await prisma.specialization.update({
      where: { id: existing.id },
      data: { name: to },
    });
  }

  /*
    The Government MERGE. Two rows become one, so provider links have to be
    MOVED, not recreated: a provider who picked both Federal and State & Local
    would otherwise hit the (profile, specialization) unique. Move what can move,
    drop what would duplicate, then delete the emptied row.
  */
  for (const [from, into] of Object.entries(SPECIALIZATION_MERGES)) {
    const src = await prisma.specialization.findFirst({
      where: { catalog_id: catalog.id, name: from },
      select: { id: true },
    });
    const dst = await prisma.specialization.findFirst({
      where: { catalog_id: catalog.id, name: into },
      select: { id: true },
    });
    if (!src || !dst || src.id === dst.id) continue;
    const links = await prisma.providerProfileSpecialization.findMany({
      where: { specialization_id: src.id },
      select: { id: true, provider_profile_id: true },
    });
    for (const link of links) {
      const already = await prisma.providerProfileSpecialization.findFirst({
        where: {
          provider_profile_id: link.provider_profile_id,
          specialization_id: dst.id,
        },
        select: { id: true },
      });
      if (already) {
        await prisma.providerProfileSpecialization.delete({ where: { id: link.id } });
      } else {
        await prisma.providerProfileSpecialization.update({
          where: { id: link.id },
          data: { specialization_id: dst.id },
        });
      }
    }
    await prisma.specialization.delete({ where: { id: src.id } });
  }

  const allSpecializations = [
    ...data.specializations.map(fixTypo),
    ...EXTRA_SPECIALIZATIONS,
  ]
    // The renames above mean the generated list still holds superseded labels;
    // map them forward so this pass doesn't recreate what it just renamed.
    .map((n) => SPECIALIZATION_RENAMES[n] ?? SPECIALIZATION_MERGES[n] ?? n)
    .filter((n, i, arr) => arr.indexOf(n) === i);

  for (const [i, raw] of allSpecializations.entries()) {
    const name = raw;
    await prisma.specialization.upsert({
      where: { catalog_id_name: { catalog_id: catalog.id, name } },
      update: { kind: specializationKind(name), sort_order: i },
      create: {
        catalog_id: catalog.id,
        name,
        kind: specializationKind(name),
        sort_order: i,
      },
    });
  }

  // --- Retire everything NOT in the authoritative catalog -------------------
  // brief_R says steps 7–8 must render EXACTLY this catalog, so stale rows from
  // the previous ERP seed (and the provisional brief_Q "AI" pillar, and the 5th
  // "Techno-Functional" role that is absent from Scott's xlsx) have to go.
  //
  // Provider selections pointing at a retired skill are removed FIRST: the FK
  // cascades anyway, but doing it explicitly means the count is reportable
  // rather than silent — a provider losing a skill should be visible.
  const staleSkills = await prisma.skill.findMany({
    where: {
      id: { notIn: [...keptSkillIds] },
      // Provider-authored skills (brief_S / E031) are NOT stale — they were
      // never in the JSON and re-seeding must not delete a provider's data.
      is_custom: false,
    },
    select: { id: true, name: true, role_type_id: true },
  });
  const staleSkillIds = staleSkills.map((s) => s.id);

  /*
    MERGE WHAT CAN BE MERGED, before counting anything as lost.

    A stale row whose (role, name) is ALSO the name of a surviving row is a
    duplicate, not a retirement — the old catalog listed "Prompt Engineer" under
    two AI domains, so the rehome pass could only move one of them and the other
    is left over. Re-point its links at the survivor instead of deleting them.
    The (profile, skill) and (request, skill) uniques mean a provider who held
    both copies has to end up with one link, not two.
  */
  let mergedSkillLinks = 0;
  for (const stale of staleSkills) {
    const target = keptByRoleAndName.get(`${stale.role_type_id}||${stale.name}`);
    if (!target) continue;

    const psLinks = await prisma.providerSkill.findMany({
      where: { skill_id: stale.id },
      select: { id: true, provider_profile_id: true },
    });
    for (const link of psLinks) {
      const already = await prisma.providerSkill.findFirst({
        where: { provider_profile_id: link.provider_profile_id, skill_id: target },
        select: { id: true },
      });
      if (already) {
        await prisma.providerSkill.delete({ where: { id: link.id } });
      } else {
        await prisma.providerSkill.update({
          where: { id: link.id },
          data: { skill_id: target },
        });
        mergedSkillLinks++;
      }
    }

    const wrLinks = await prisma.workRequestSkill.findMany({
      where: { skill_id: stale.id },
      select: { id: true, work_request_id: true },
    });
    for (const link of wrLinks) {
      const already = await prisma.workRequestSkill.findFirst({
        where: { work_request_id: link.work_request_id, skill_id: target },
        select: { id: true },
      });
      if (already) {
        await prisma.workRequestSkill.delete({ where: { id: link.id } });
      } else {
        await prisma.workRequestSkill.update({
          where: { id: link.id },
          data: { skill_id: target },
        });
        mergedSkillLinks++;
      }
    }
  }

  /*
    COUNT THE LOSS, THEN DECIDE WHETHER TO TAKE IT.

    Everything salvageable has now been salvaged — renamed, rehomed or merged —
    so whatever links remain on a stale row are genuinely losing their skill. The
    guard runs here, before the first delete: a reseed that would wipe more than
    ORPHAN_LIMIT selections stops and says what it was about to do rather than
    doing it and reporting the number afterwards.
  */
  const doomedProviderLinks = staleSkillIds.length
    ? await prisma.providerSkill.findMany({
        where: { skill_id: { in: staleSkillIds } },
        select: {
          skill: { select: { name: true, roleType: { select: { name: true } } } },
          providerProfile: {
            select: { person: { select: { user: { select: { email: true } } } } },
          },
        },
      })
    : [];
  const orphanedWorkRequestSkills = staleSkillIds.length
    ? await prisma.workRequestSkill.count({ where: { skill_id: { in: staleSkillIds } } })
    : 0;
  const orphanedProviderSkills = doomedProviderLinks.length;

  const byLostSkill = new Map<string, number>();
  for (const l of doomedProviderLinks) {
    const key = `${l.skill.roleType?.name ?? "(no role)"} :: ${l.skill.name}`;
    byLostSkill.set(key, (byLostSkill.get(key) ?? 0) + 1);
  }
  const orphanedSkillDetail = [...byLostSkill.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([k, n]) => `${k} — ${n} provider link(s)`);

  const totalOrphans = orphanedProviderSkills + orphanedWorkRequestSkills;
  if (totalOrphans > ORPHAN_LIMIT) {
    const owners = [
      ...new Set(
        doomedProviderLinks.map((l) => l.providerProfile.person.user?.email ?? "(no login)")
      ),
    ].sort();
    throw new Error(
      [
        `Catalog reseed STOPPED — it would drop ${totalOrphans} selection(s), over the ` +
          `limit of ${ORPHAN_LIMIT}.`,
        "",
        `  provider-skill links:      ${orphanedProviderSkills}`,
        `  work-request-skill links:  ${orphanedWorkRequestSkills}`,
        "",
        "Skills about to lose their links:",
        ...orphanedSkillDetail.map((d) => `  ${d}`),
        "",
        `Accounts affected (${owners.length}):`,
        ...owners.map((o) => `  ${o}`),
        "",
        "Nothing has been deleted. The renames and domain moves above ARE applied and",
        "are safe to leave — re-running is idempotent. Either add the missing entries to",
        "SKILL_RENAMES / DOMAIN_RENAMES so the selections survive, or accept the loss by",
        `re-running with CATALOG_ORPHAN_LIMIT=${totalOrphans}.`,
      ].join("\n")
    );
  }

  if (staleSkillIds.length > 0) {
    await prisma.providerSkill.deleteMany({
      where: { skill_id: { in: staleSkillIds } },
    });
    await prisma.workRequestSkill.deleteMany({
      where: { skill_id: { in: staleSkillIds } },
    });
  }
  const retiredSkillNames = staleSkills.map((s) => s.name).sort();
  const retiredSkills = (
    await prisma.skill.deleteMany({ where: { id: { in: staleSkillIds } } })
  ).count;

  // SkillTags belonged to the old ERP seed only; nothing reads them now.
  await prisma.skillTag.deleteMany({});

  const keptPillarIds = [...domainIdByName.values()];
  /*
    A retiring DOMAIN detaches more than its skills. ProviderProfile.pillar_id and
    WorkRequest.pillar_id are both onDelete: SetNull, so the delete below silently
    blanks "the domain I work in" on everyone who picked one of the split domains.
    Counted here, while the rows still point somewhere, because after the delete
    there is nothing left to count — a null is indistinguishable from never having
    chosen.

    NOT guarded by ORPHAN_LIMIT, and deliberately: a split domain has no successor
    to migrate to, so this loss is the reseed's whole purpose rather than an
    accident it should refuse. It is reported loudly instead.
  */
  const doomedPillars = await prisma.pillar.findMany({
    where: { id: { notIn: keptPillarIds } },
    select: { id: true, name: true },
  });
  const doomedPillarIds = doomedPillars.map((p) => p.id);
  const retiredPillarNames = doomedPillars.map((p) => p.name).sort();
  const providersDetachedFromDomain = doomedPillarIds.length
    ? await prisma.providerProfile.count({ where: { pillar_id: { in: doomedPillarIds } } })
    : 0;
  const workRequestsDetachedFromDomain = doomedPillarIds.length
    ? await prisma.workRequest.count({ where: { pillar_id: { in: doomedPillarIds } } })
    : 0;

  // Offerings/Applications hang off pillars and cascade with them.
  const retiredPillars = (
    await prisma.pillar.deleteMany({ where: { id: { notIn: keptPillarIds } } })
  ).count;

  const keptRoleTypeIds = [...roleIdByName.values()];
  // A RoleType referenced by a WorkRequest can't be deleted; detach nothing and
  // let the delete skip those. Only unreferenced strays disappear.
  const strayRoleTypes = await prisma.roleType.findMany({
    where: {
      id: { notIn: keptRoleTypeIds },
      skills: { none: {} },
      workRequests: { none: {} },
      providerProfiles: { none: {} },
    },
    select: { id: true, name: true },
  });
  const retiredRoleTypes = strayRoleTypes.length
    ? (
        await prisma.roleType.deleteMany({
          where: { id: { in: strayRoleTypes.map((r) => r.id) } },
        })
      ).count
    : 0;

  // --- Regions + engagement types (NOT part of the provider taxonomy) -------
  // These are separate reference lookups still consumed by Settings and the
  // Work Request wizard, so brief_R's catalog replacement must not take them
  // out with it. Sourced from the older ERP file, which remains their home.
  const legacy = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "seed-data", "erp-catalog.json"), "utf8")
  ) as {
    regions: { name: string; desc?: string }[];
    engagementTypes: { code: string; name: string; detail?: string }[];
    applicationHierarchy: { application: string; appGroup?: string }[];
    nonOracleApplications: string[];
  };

  for (const r of legacy.regions) {
    await prisma.region.upsert({
      where: { name: r.name },
      update: { description: r.desc ?? null },
      create: { name: r.name, description: r.desc ?? null },
    });
  }
  /**
   * Tools / applications vocabulary (brief_project_model_v2).
   *
   * These rows already existed in the ERP source file but were never loaded,
   * so `applications` was empty and the project modal's tools multi-select had
   * nothing to offer. Seeded OFFERING-LESS on purpose: they are a flat picker
   * vocabulary, and hanging them off a pillar would put them into the
   * Role → Domain → Skill tree, which is a different axis.
   *
   * NOT an expansion of the taxonomy — every name here comes from the
   * committed catalog file.
   */
  const appNames = new Map<string, string | null>();
  for (const row of legacy.applicationHierarchy ?? []) {
    const name = fixTypo((row.application ?? "").trim());
    if (name) appNames.set(name.toLowerCase(), row.appGroup?.trim() || null);
  }
  for (const name of legacy.nonOracleApplications ?? []) {
    const n = fixTypo((name ?? "").trim());
    if (n && !appNames.has(n.toLowerCase())) appNames.set(n.toLowerCase(), null);
  }
  let applicationCount = 0;
  for (const [key, appGroup] of appNames) {
    const display = fixTypo(
      (legacy.applicationHierarchy ?? []).find(
        (r) => r.application?.trim().toLowerCase() === key
      )?.application?.trim() ??
        (legacy.nonOracleApplications ?? []).find(
          (n) => n.trim().toLowerCase() === key
        )?.trim() ??
        key
    );
    const existing = await prisma.application.findFirst({
      where: { name: { equals: display, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) {
      await prisma.application.update({
        where: { id: existing.id },
        data: { app_group: appGroup },
      });
    } else {
      await prisma.application.create({
        data: { name: display, app_group: appGroup, is_custom: false },
      });
    }
    applicationCount++;
  }

  for (const e of legacy.engagementTypes) {
    await prisma.engagementType.upsert({
      where: { code: e.code },
      update: { name: e.name, detail: e.detail ?? null },
      create: { code: e.code, name: e.name, detail: e.detail ?? null },
    });
  }

  return {
    roles: roleIdByName.size,
    domains: domainIdByName.size,
    skills: skillCount,
    specializations: data.specializations.length,
    regions: legacy.regions.length,
    engagementTypes: legacy.engagementTypes.length,
    applications: applicationCount,
    excludedRoleTypes,
    before,
    renamedDomains,
    renamedSkills,
    rehomedSkills,
    mergedSkillLinks,
    retiredSkills,
    retiredSkillNames,
    retiredPillars,
    retiredPillarNames,
    retiredRoleTypes,
    orphanedProviderSkills,
    orphanedWorkRequestSkills,
    orphanedSkillDetail,
    providersDetachedFromDomain,
    workRequestsDetachedFromDomain,
  };
}
