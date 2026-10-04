import { Layers, FolderTree, Wrench } from "lucide-react";
import { prisma } from "@/lib/prisma";

const ADMIN_ROLE_PAREN: Record<string, string> = {
  APPLICATION_SPECIFIC: "Functional Consultant",
  TECHNOLOGY_SPECIFIC: "Technical Consultant",
};
import {
  getProviderFieldTree,
  getSkillProviderCounts,
  getRoleClaims,
  getRoleDomainProviderCounts,
  providersCell,
} from "@/lib/catalog";
import { TileRow, Listing, VolumeFooter } from "@/components/console/ConsolePage";
import {
  SkillCatalogTree,
  type CatalogRole,
  type CatalogSkill,
} from "@/components/console/SkillCatalogTree";
import { RDS_DOMAIN_MARKS, RDS_ROLE_MARKS } from "@/lib/catalog-marks";
import { BackLink } from "@/components/console/BackLink";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; claimed?: string }>;
}) {
  const sp = await searchParams;
  const view =
    sp.view === "roles" || sp.view === "domains" || sp.view === "skills" ? sp.view : null;
  const claimed = sp.claimed ?? null;

  const [roles, skillCount, pillarCount, skillProviders, roleClaims, domainProviders] =
    await Promise.all([
      getProviderFieldTree({ includeRetired: true, includeAllCatalogs: true }),
      prisma.skill.count(),
      prisma.pillar.count(),
      getSkillProviderCounts(),
      getRoleClaims(),
      getRoleDomainProviderCounts(),
    ]);

  const domainPairs = roles.reduce((n, r) => n + r.domains.length, 0);

  const flatPairs = roles.flatMap((r) =>
    r.domains.map((d) => ({
      roleTypeId: r.id,
      pillarId: d.id,
      label: `${r.display || r.name} › ${d.name}`,
    }))
  );

  const skills = await prisma.skill.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, role_type_id: true, pillar_id: true,
      status: true, origin: true, aliases: true, visible_to_members: true,
    },
  });
  const toSkill = (s: (typeof skills)[number]): CatalogSkill => ({
    id: s.id,
    name: s.name,
    hidden: !s.visible_to_members,
    retired: s.status === "RETIRED",
    added: s.origin === "ADMIN",
    members: skillProviders.get(s.id) ?? 0,
    aliases: s.aliases.length ? s.aliases.join(" · ") : undefined,
  });

  // Paren labels are admin-page only (E820); registration/profile/search keep the short label.
  const treeRoles: CatalogRole[] = roles.map((r) => ({
    id: r.id,
    label: r.display || r.name,
    paren: ADMIN_ROLE_PAREN[r.code],
    mark: RDS_ROLE_MARKS[r.code] ?? null,
    domains: r.domains.map((d) => ({
      id: d.id,
      name: d.name,
      mark: RDS_DOMAIN_MARKS[d.code] ?? null,
      skills: skills.filter((s) => s.role_type_id === r.id && s.pillar_id === d.id).map(toSkill),
    })),
  }));
  const unassigned = skills.filter((s) => s.pillar_id === null).map(toSkill);

  /*
    ── ⚠ EVERY TILE OPENS A LISTING (`P1-A1.5-E463`) ──────────────────────────

    **SCOTT, on both pages:** *"the tiles do not link to lists of their
    contents."*

    ⚠ THE DRILL-IN REPLACES THE TREE IN THE LISTING SLOT — it does not sit
    beside it. The console template is `tiles → ONE listing → footer`, and two
    data containers stacked is what WS-4 just finished removing.
    ⚠⚠ THAT IS ALSO WHAT KEEPS ONE SEARCH BOX ON THE PAGE: the tree's toolbar
    and the listing's own box are mutually exclusive because only one of them
    ever renders.
  */
  const flat = roles.flatMap((r) =>
    r.domains.map((d) => ({ role: r.display || r.name, roleId: r.id, domain: d, }))
  );

  const roleRows = roles.map((r) => [
    r.display || r.name,
    `${r.domains.length}`,
    `${r.domains.reduce((n, d) => n + d.skillCount, 0)}`,
  ]);
  const roleMeta = roles.map((r) => ({
    text: (r.display || r.name).toLowerCase(),
    sort: [
      r.display || r.name,
      r.domains.length,
      r.domains.reduce((n, d) => n + d.skillCount, 0),
    ] as (string | number | null)[],
  }));

  const domainRows = flat.map((f) => [f.domain.name, f.role, `${f.domain.skillCount}`]);
  const domainMeta = flat.map((f) => ({
    text: `${f.domain.name} ${f.role}`.toLowerCase(),
    sort: [f.domain.name, f.role, f.domain.skillCount] as (string | number | null)[],
  }));

  /* One lookup for the skills listing's Domain and Role columns — the tree
     already holds both, so this re-reads nothing. */
  const placeOf = new Map<string, { role: string; domain: string }>();
  for (const f of flat) placeOf.set(`${f.roleId}::${f.domain.id}`, { role: f.role, domain: f.domain.name });

  const skillRows = skills.map((s) => {
    const at = placeOf.get(`${s.role_type_id}::${s.pillar_id}`);
    return [s.name, at?.domain ?? "—", at?.role ?? "—", providersCell(skillProviders.get(s.id))];
  });
  const skillMeta = skills.map((s) => {
    const at = placeOf.get(`${s.role_type_id}::${s.pillar_id}`);
    return {
      text: `${s.name} ${at?.domain ?? ""} ${at?.role ?? ""}`.toLowerCase(),
      sort: [s.name, at?.domain ?? null, at?.role ?? null, skillProviders.get(s.id) ?? 0] as (
        | string
        | number
        | null
      )[],
    };
  });

  /* ⚠ WS-6's drill-in: every domain in one role, ranked by DISTINCT providers,
     ⚠⚠ ZEROES INCLUDED AT THE BOTTOM — a domain nobody has claimed is the most
     actionable row on the page, and dropping it would hide exactly that. */
  const claimedRole = claimed ? roles.find((r) => r.id === claimed) ?? null : null;
  const rankedDomains = claimedRole
    ? claimedRole.domains
        .map((d) => ({
          name: d.name,
          providers: domainProviders.get(`${claimedRole.id}::${d.id}`) ?? 0,
          skills: d.skillCount,
        }))
        .sort((a, b) => b.providers - a.providers || a.name.localeCompare(b.name))
    : [];

  /*
    ── ⚠⚠ A DRILL-IN TAKES OVER THE PAGE (`P1-A1.5-E485`) ────────────────────

    > **SCOTT, 2026-09-13:** *"none of these link to reports"*

    ⚠⚠ THEY DO LINK, AND THEY ALWAYS DID. The bug is WHERE THE RESULT APPEARS:
    the footer tiles sit at the bottom of a long page and the ranked listing
    rendered in the page BODY, above them — outside the viewport being looked at.
    Nothing visibly happened, so the tile read as dead.

    ⚠ THE BRIEF'S PREMISE WAS HALF RIGHT, AND THE HALF IT MISSED IS THE CAUSE.
    It says to hide the tree and the tile row *"as `?view=` already does"*.
    ⚠⚠ MEASURED: `?view=` HID THE TREE AND NOTHING ELSE. The tile row and the
    footer strip rendered on EVERY drill-in, so `?claimed=` put its listing
    between two strips instead of replacing them — and `?view=` had the same
    flaw, just less visibly because its tiles are at the top.

    ⚠ SO ONE FLAG COVERS BOTH, and both drill-ins now behave identically: tiles
    out, tree out, footer out, the listing IS the page. Same shape as the Users
    page's `?stage=` drill-in, which is the pattern Scott approved.
    ⚠ ZEROES STAY, AT THE BOTTOM — `E465b`'s rule holds: a category nobody has
    claimed is the most actionable row on the page. Moving the listing does not
    filter it.
  */
  const isDrillIn = !!view || !!claimedRole;

  /*
    ⚠ `E486` — ONE LINK COLOUR ON THE PAGE. `BackLink` does NOT render here
    (reported: the brief expected it to), so this is the catalog's own back
    affordance and it takes the same `--color-magenta-ink` token rather than
    saturated `#d72cd6`. ⚠ SUPERSEDED, quoted not deleted: `text-magenta`.
    ⚠ IT STAYS IN THE LISTING'S `action` SLOT, not above the title — the card
    header is where it already sits and `E485` says to keep it wired as-is.
  */
  const clearLink = (
    <BackLink href="/admin/skill-catalog" label="the Catalog" />
  );

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/*
        ── ⚠⚠ THE "Catalog Details" CARD IS GONE; THE TILES STAYED (`E461`) ────

        **SCOTT:** *"not sure what that Catalog details card is. REMOVE IT."* and,
        next breath, *"the tiles are in the old format. Please convert to the new
        format on users."*

        ⚠ THOSE TWO READ TOGETHER, BECAUSE THE TILES LIVED INSIDE THE CARD.
        "Remove the card" means the WRAPPER — the `<section>`, the
        `<h2>Catalog Details</h2>` and the paragraph *"The service vocabulary
        every provider profile, package and work request is built from."* — not
        the numbers.
        ⚠ THREE ACROSS, NOT FIVE. The row is not padded out to fill the grid.
        ⚠ `hint` IS DROPPED (S-1): the Learn tile is two lines and a third undoes
        the "thinner" this is copying.
      */}
      {!isDrillIn && (
      <TileRow
        tiles={[
          {
            label: "Roles",
            value: roles.length,
            tone: "neutral",
            href: "/admin/skill-catalog?view=roles",
            icon: <Layers className="h-[19px] w-[19px]" aria-hidden />,
          },
          {
            label: "Domains",
            value: domainPairs,
            tone: "amber",
            href: "/admin/skill-catalog?view=domains",
            icon: <FolderTree className="h-[19px] w-[19px]" aria-hidden />,
          },
          {
            label: "Skills",
            value: skillCount,
            tone: "emerald",
            href: "/admin/skill-catalog?view=skills",
            icon: <Wrench className="h-[19px] w-[19px]" aria-hidden />,
          },
        ]}
      />
      )}
      {!isDrillIn && (
      <p className="mt-2 mb-6 text-[12.5px] text-ink-2">
        {domainPairs} role-domain pairs across {pillarCount} distinct domains —
        five vendor suites sit under both Application-Specific and
        Technology-Specific, so they are counted once per role. The tree below
        shows the same {domainPairs}.
      </p>
      )}

      {/*
        ── ⚠ THE CATALOG MOVES INTO THE CONSOLE'S LISTING SLOT (`E470`) ────────

        **SCOTT:** *"The grid is at the bottom of the page. All of the
        specializations should occur within this grid...then be expandable."* and
        *"i forgot to mention this on the RDS page as well, but it applies."*

        The console template is `tiles → ONE listing → footer`, and this page put
        its real data in a floating accordion outside that slot.
        ⚠ THE ROWS STAY EXPANDABLE — the hierarchy is not flattened.
        ⚠ RDS HAS NO STUB TO REMOVE: measured, this page never called `SpecPage`,
        so there is no empty grid and no `TBD` row here. Container change only.
      */}
      {view === "roles" && (
        <Listing
          title={`Roles (${roles.length})`}
          columns={["Role", "Domains", "Skills"]}
          rows={roleRows}
          rowMeta={roleMeta}
          searchPlaceholder={`Search ${roles.length} roles`}
          sortable
          action={clearLink}
          empty="No roles in the catalog."
        />
      )}

      {view === "domains" && (
        <Listing
          title={`Domains (${domainPairs})`}
          columns={["Domain", "Role", "Skills"]}
          rows={domainRows}
          rowMeta={domainMeta}
          searchPlaceholder={`Search ${domainPairs} role-domain pairs`}
          sortable
          pageSize={25}
          action={clearLink}
          empty="No domains in the catalog."
        />
      )}

      {view === "skills" && (
        /* ⚠ DEFAULT 25, NOT 7 (`E463`). 7 exists on Users to reveal the footer
           tiles below it; this page has no such fold and 7 of 710 is 102 pages. */
        <Listing
          title={`Skills (${skillCount})`}
          columns={["Skill", "Domain", "Role", "Providers"]}
          rows={skillRows}
          rowMeta={skillMeta}
          searchPlaceholder={`Search ${skillCount} skills across every role and domain`}
          sortable
          pageSize={25}
          action={clearLink}
          empty="No skills in the catalog."
        />
      )}

      {claimedRole && (
        <Listing
          title={`Most claimed — ${claimedRole.display || claimedRole.name}`}
          columns={["Domain", "Providers", "Skills"]}
          rows={rankedDomains.map((d) => [
            d.name,
            d.providers ? `${d.providers}` : "—",
            `${d.skills}`,
          ])}
          rowMeta={rankedDomains.map((d) => ({
            text: d.name.toLowerCase(),
            sort: [d.name, d.providers, d.skills] as (string | number | null)[],
          }))}
          searchPlaceholder={`Search ${rankedDomains.length} domains`}
          sortable
          action={clearLink}
          empty="This role has no domains."
        />
      )}

      {!view && !claimedRole && (
        <SkillCatalogTree roles={treeRoles} unassigned={unassigned} destinations={flatPairs} />
      )}
      {/* ⚠ `E481` — the bar returns, live. See the note on the Specializations page. */}
      {/*
        THE LOOSE "Add a skill…" BAR IS GONE (`E817`). It never asked which role
        or domain the skill belonged to, so every skill added through it landed
        unattached — which is exactly where the Unassigned group's orphans came
        from. The add buttons on the headers know both.
        Superseded, quoted not deleted:
        //   {!isDrillIn && <CatalogAddBar table="skill" label="skill" />}
      */}

      {/*
        ── ⚠ THE OLD EDIT BAR, SUPERSEDED (`P1-A1.5-E479`) ────────────────────

        > **SCOTT, 2026-09-13, on the bar:** *"What does this mean?"*

        ⚠ SUPERSEDED, quoted not deleted (`E164`): `<CatalogEditBar sticky />` — a
        sticky footer reading *"Editing this catalog needs write endpoints that
        aren't built yet — it's read-only for now"* beside a dead Save button.

        ⚠⚠ THIS IS THE THIRD INSTANCE OF A PATTERN SCOTT HAS DELETED TWICE
        ALREADY — the `TBD / metric to be defined` tiles (`E470c`) and the
        explanatory paragraph (`E457`). A page that explains why part of itself
        does not work is a page apologising for itself, and these two pages are
        ones he is considering showing buyers.
        ⚠⚠ THE COMPONENT IS NOT DELETED. Part 3 brings it back with a Save that
        works; `E164`, and it is five lines. Only the call site goes.
      */}

      {/*
        ── ⚠⚠ THE FOOTER STOPS BEING A TREND AND BECOMES "MOST CLAIMED" ───────
        (`P1-A1.5-E465b`)

        **SCOTT, 2026-09-13:** *"Use each card to give an idea of how many users
        are aligned with each cat or which categories have the most users...some
        way to see what RDS are most popular with our user base."*

        ⚠ SUPERSEDED, quoted not deleted (`E164`) — chat's earlier prescription:
        *"REMOVE IT. A catalog is not a transaction stream… 27 rows that change a
        handful of times a year have no 90-day trend worth drawing."*
        ⚠⚠ THE DIAGNOSIS WAS RIGHT AND THE PRESCRIPTION WAS WRONG. The problem is
        the X AXIS. Volume over TIME is meaningless for a catalog; volume over
        CATEGORY is the most useful thing on the page.

        ⚠⚠ FIXED CATALOG ORDER — `getRoleClaims` returns roles by `sort_order`
        and this does NOT re-sort by count. A strip that rearranges itself
        between page loads destroys the muscle memory that makes a footer
        scannable, and the numbers sit side by side anyway. THE RANKING LIVES
        INSIDE THE DRILL-IN.
      */}
      {!isDrillIn && (
      <>
      <VolumeFooter
        title="Most claimed"
        tiles={roleClaims.map((c) => ({
          label: c.label,
          value: c.providers || undefined,
          href: `/admin/skill-catalog?claimed=${c.key}`,
          hint: c.top
            ? `top: ${c.top.name} (${c.top.providers})`
            : "nobody has claimed this role yet",
        }))}
      />
      <p className="mt-2 text-[12.5px] text-ink-2">
        DISTINCT providers, not skill selections — someone holding twelve Oracle
        skills is one person. ⚠ A provider working across two roles counts in
        both, so these do not sum to the provider total.
      </p>
      </>
      )}
    </div>
  );
}
