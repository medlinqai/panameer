import Link from "next/link";
import { Layers, FolderTree, Wrench } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  getProviderFieldTree,
  getSkillProviderCounts,
  getRoleClaims,
  getRoleDomainProviderCounts,
} from "@/lib/catalog";
import { TileRow, Listing, VolumeFooter } from "@/components/console/ConsolePage";
import { CatalogTree, CatalogEditBar, type CatalogNode } from "@/components/console/CatalogTree";
import { CatalogCard } from "@/components/console/CatalogCard";

export const dynamic = "force-dynamic";

/** `—` never `0`: an unclaimed row is honest, and the most actionable one here. */
const providersCell = (n: number | undefined) => (n ? `${n} providers` : "—");

/**
 * Roles > Domains > Skills (WS6 / E016) on the Medlinq catalog UX.
 *
 * REAL DATA — this is one of the few admin surfaces with a full dataset behind
 * it. The previous version was a flat read-only dump of pillars and offerings;
 * the hierarchy is what makes 700-odd skills navigable, which is exactly why
 * Medlinq's service catalog is shaped this way.
 *
 * ── ⚠ BUILT AS IF A BUYER WILL SEE IT (`P1-A1.5-E461`) ──────────────────────
 *
 * **SCOTT:** *"This is one of those pages we might want to expose to both
 * sides...so it might be better prettied up."* ⚠⚠ THAT IS NOT LICENCE TO EXPOSE
 * IT — the route stays under `/admin` and stays admin-gated. Exposing it is its
 * own decision.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; claimed?: string }>;
}) {
  const sp = await searchParams;
  /* ⚠ WHITELIST, NOT PASS-THROUGH — an unknown `?view=` falls back to the tree
     rather than rendering an empty listing that looks broken. */
  const view =
    sp.view === "roles" || sp.view === "domains" || sp.view === "skills" ? sp.view : null;
  const claimed = sp.claimed ?? null;

  const [roles, skillCount, pillarCount, skillProviders, roleClaims, domainProviders] =
    await Promise.all([
      getProviderFieldTree(),
      prisma.skill.count(),
      prisma.pillar.count(),
      getSkillProviderCounts(),
      getRoleClaims(),
      getRoleDomainProviderCounts(),
    ]);

  /*
    ── ⚠⚠ THE DOMAINS NUMBER: 24 vs 29, BOTH ON SCREEN (`E462`) ───────────────

    The tile said **24** (`prisma.pillar.count()` — distinct `Pillar` rows) while
    the accordion below it summed to **29** (5+6+4+9+5), because
    `getProviderFieldTree()` groups by `(role_type_id, pillar_id)` — role-domain
    PAIRS, not pillars. Two numbers, one screen, no agreement.

    ⚠⚠ THE GAP IS EXACTLY THE FIVE VENDOR SUITES THAT SIT UNDER TWO ROLES —
    Oracle Fusion Cloud, Oracle E-Business Suite, PeopleSoft, Workday and
    Salesforce each appear under Application-Specific AND Technology-Specific.
    One Pillar row, two roles. 24 + 5 = 29.

    ⚠ THIS IS THE CATALOG WORKING AS DESIGNED, not a data fault: `Oracle Fusion
    Cloud → General Ledger` (functional) and `Oracle Fusion Cloud → Visual
    Builder` (technical) are genuinely different branches.

    ⚠ SO THE TILE COUNTS WHAT THE TREE SHOWS — the 29 pairs — and the two agree.
    ⚠⚠ THE TREE IS NOT DEDUPLICATED TO MATCH THE TILE. Collapsing the five suites
    into one row each destroys the functional/technical split, which is
    load-bearing. `pillarCount` is still read, and the caption names both numbers
    so the 24 is not lost.
  */
  const domainPairs = roles.reduce((n, r) => n + r.domains.length, 0);

  const nodes: CatalogNode[] = await Promise.all(
    roles.map(async (r) => ({
      id: r.id,
      label: r.display || r.name,
      meta: `${r.domains.length} domains`,
      children: r.domains.map((d) => ({
        id: `${r.id}-${d.id}`,
        label: d.name,
        meta: `${d.skillCount} skills`,
        // Skills load with the page: the whole catalog is a few hundred rows,
        // and a fetch-on-expand would add a spinner to every click for no gain.
        children: [] as CatalogNode[],
      })),
    }))
  );

  // Fill the leaf level in one query rather than per-domain.
  const skills = await prisma.skill.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, role_type_id: true, pillar_id: true, is_custom: true },
  });
  for (const role of nodes) {
    for (const domain of role.children ?? []) {
      const [roleId, pillarId] = domain.id.split("-").length > 1
        ? [role.id, domain.id.slice(role.id.length + 1)]
        : [role.id, ""];
      domain.children = skills
        .filter((s) => s.role_type_id === roleId && s.pillar_id === pillarId)
        .map((s) => ({
          id: s.id,
          label: s.name,
          /* ⚠ `N providers` (S-3) — DISTINCT people, never link rows. Zero
             renders as an em-dash: nobody has claimed it, which is honest. */
          meta: skillProviders.get(s.id) ? `${skillProviders.get(s.id)} providers` : "—",
          /* ⚠ `E470b` — the provider-typed rows the admin is meant to review. */
          custom: s.is_custom,
        }));
    }
  }

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

  const clearLink = (
    <Link href="/admin/skill-catalog" className="text-[13px] font-bold text-magenta">
      ← Back to the catalog
    </Link>
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
      <p className="mt-2 mb-6 text-[12.5px] text-ink-2">
        {domainPairs} role-domain pairs across {pillarCount} distinct domains —
        five vendor suites sit under both Application-Specific and
        Technology-Specific, so they are counted once per role. The tree below
        shows the same {domainPairs}.
      </p>

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
        <CatalogCard title={`Roles > Domains > Skills (${skillCount})`}>
          <CatalogTree
            nodes={nodes}
            emptyLabel="The service catalog is empty."
            toolbar
            /* ⚠ THE REAL COUNT FROM THE SAME QUERY THE TILE USES — not a
               hard-coded 710, which goes stale the next time a skill lands. */
            searchPlaceholder={`Search ${skillCount} skills across every role and domain`}
            leafLabel="skills"
            groupLabel="domains"
          />
        </CatalogCard>
      )}
      <CatalogEditBar sticky />

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
    </div>
  );
}
