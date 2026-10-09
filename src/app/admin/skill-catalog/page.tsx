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
import { NEW_SKILL_WHERE, hiddenSameLetterNames, waitingTermCounts } from "@/lib/catalog-review";
import { formatSkillName, sameLetters } from "@/lib/skill-match";
import { getSkillAreas } from "@/lib/skill-area-store";
import { SkillCatalogList, type ListSkill, type Pair, type ReviewCard } from "@/components/console/SkillCatalogList";

// To Review: tidy capitals and common abbreviations for the "Add as" name.
const ABBR: Record<string, string> = { mgt: "Management", mgmt: "Management", mngt: "Management", admin: "Administration", acct: "Accounting", rpt: "Reporting", rpts: "Reports", dev: "Development", config: "Configuration" };
const tidy = (s: string) => formatSkillName(s.split(/(\s+)/).map((w) => ABBR[w.toLowerCase()] ?? w).join(""));
const toks = (s: string) => s.toLowerCase().replace(/\([^)]*\)/g, " ").split(/[^a-z0-9]+/).filter(Boolean);
// "mgt" ~ "management": same first letter and its letters appear in order.
const abbrevOf = (a: string, b: string) => a.length >= 3 && a[0] === b[0] && [...a].every(((i) => (ch: string) => (i = b.indexOf(ch, i) + 1) > 0)(0));
const tokenMatch = (a: string, b: string) => a === b || (a.length >= 4 && b.startsWith(a)) || (b.length >= 4 && a.startsWith(b)) || abbrevOf(a, b) || abbrevOf(b, a);
function similarity(a: string, b: string) {
  const ta = toks(a), tb = toks(b);
  if (!ta.length || !tb.length) return 0;
  return ta.filter((x) => tb.some((y) => tokenMatch(x, y))).length / Math.max(ta.length, tb.length);
}

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; claimed?: string; q?: string; role?: string; domain?: string; status?: string; tab?: string; sub?: string; area?: string; st?: string; page?: string }>;
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
      merged_into_id: true, rejected_at: true, review_pending: true, area: true,
    },
  });
  const toSkill = (s: (typeof skills)[number]): CatalogSkill => ({
    id: s.id,
    name: formatSkillName(s.name),
    hidden: !s.visible_to_members,
    retired: s.status === "RETIRED",
    added: s.origin === "ADMIN",
    members: skillProviders.get(s.id) ?? 0,
    aliases: s.aliases.length ? s.aliases.join(" · ") : undefined,
    aliasList: s.aliases,
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
      skills: skills.filter((s) => s.role_type_id === r.id && s.pillar_id === d.id && !s.review_pending).map(toSkill),
    })),
  }));
  const waiting = skills.filter((s) => (s.pillar_id === null || s.review_pending) && !s.merged_into_id && !s.rejected_at && s.status === NEW_SKILL_WHERE.status);
  // Best-guess domain for each new skill: the domain its claimers use most for their other skills.
  const claims = await prisma.providerSkill.findMany({ where: { skill_id: { in: waiting.map((s) => s.id) } }, select: { skill_id: true, provider_profile_id: true } });
  const theirs = await prisma.providerSkill.findMany({
    where: { provider_profile_id: { in: [...new Set(claims.map((c) => c.provider_profile_id))] }, skill: { pillar_id: { not: null } } },
    select: { provider_profile_id: true, skill: { select: { role_type_id: true, pillar_id: true } } },
  });
  const guessOf = (skillId: string) => {
    const who = new Set(claims.filter((c) => c.skill_id === skillId).map((c) => c.provider_profile_id));
    const tally = new Map<string, number>();
    for (const t of theirs) if (who.has(t.provider_profile_id)) { const k = `${t.skill.role_type_id}:${t.skill.pillar_id}`; tally.set(k, (tally.get(k) ?? 0) + 1); }
    return [...tally].sort((a, b) => b[1] - a[1])[0]?.[0];
  };
  const hiddenSame = await hiddenSameLetterNames();
  // Compare shows real people per term (test accounts excluded), highest first.
  const people = new Map((await waitingTermCounts()).map((t) => [t.id, t.people]));
  const unassigned = waiting.map((s) => ({
    ...toSkill(s),
    guess: s.pillar_id ? `${s.role_type_id}:${s.pillar_id}` : guessOf(s.id),
    hiddenMatch: hiddenSame.get(sameLetters(s.name)),
    members: people.get(s.id) ?? 0,
  })).sort((a, b) => b.members - a.members || a.name.localeCompare(b.name));
  const specRows = await prisma.specialization.findMany({
    where: { OR: [{ status: "ACTIVE" }, { status: "SUGGESTED", origin: "PROVIDER" }] },
    orderBy: { name: "asc" },
    select: { id: true, name: true, kind: true, status: true, aliases: true, _count: { select: { providerProfiles: true } } },
  });
  const toSpec = (x: (typeof specRows)[number]) => ({ id: x.id, name: x.name, kind: x.kind, members: x._count.providerProfiles, aliasList: x.aliases });

  // The one-list view (default): live and hidden catalog skills, plus the To Review cards.
  const pairs: Pair[] = roles.flatMap((r) => r.domains.map((d) => ({ roleTypeId: r.id, pillarId: d.id, role: r.display || r.name, domain: d.name })));
  const pairLabel = new Map(pairs.map((p) => [`${p.roleTypeId}:${p.pillarId}`, p]));
  const listRows: ListSkill[] = skills
    .filter((s) => s.status === "ACTIVE" && !s.merged_into_id && !s.rejected_at && s.pillar_id && !s.review_pending)
    .map((s) => {
      const at = pairLabel.get(`${s.role_type_id}:${s.pillar_id}`);
      return { id: s.id, name: s.name, aliases: s.aliases, roleTypeId: s.role_type_id, pillarId: s.pillar_id, role: at?.role ?? "—", domain: at?.domain ?? "—", area: s.area, members: skillProviders.get(s.id) ?? 0, hidden: !s.visible_to_members, isNew: s.origin === "PROVIDER" };
    });
  const reviewCards: ReviewCard[] = unassigned.map((u) => {
    const guess = u.guess ?? null;
    const g = guess ? pairLabel.get(guess) : null;
    const ranked = listRows
      .map((r) => ({ r, score: sameLetters(r.name) === sameLetters(u.name) ? 2 : similarity(u.name, r.name) + (r.aliases.some((a) => sameLetters(a) === sameLetters(u.name)) ? 1.5 : 0) }))
      .filter((x) => x.score >= 0.5)
      .sort((a, b) => b.score - a.score || Number(b.r.pillarId === g?.pillarId) - Number(a.r.pillarId === g?.pillarId) || b.r.members - a.r.members);
    const best = ranked[0];
    return {
      id: u.id,
      typed: u.name,
      members: u.members,
      place: g ? `${g.role} › ${g.domain}` : null,
      guess,
      addAs: tidy(u.name),
      closest: best ? { id: best.r.id, name: best.r.name, domain: best.r.domain, members: best.r.members, same: best.score >= 1 } : null,
    };
  });

  // EVERY TILE OPENS A LISTING
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

  // WS-6's drill-in: every domain in one role, ranked by DISTINCT providers
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

  const customTypes = await prisma.serviceType.count({ where: { is_baseline: false, reviewed_at: null, merged_into_id: null } });
  // A DRILL-IN TAKES OVER THE PAGE
  const isDrillIn = !!view || !!claimedRole;
  if (!isDrillIn && sp.view !== "tree")
    return (
      <div className="mx-auto w-full max-w-6xl">
        <p className="mb-3 text-[13px]"><a href="/admin/skill-catalog/service-types" className="font-bold text-magenta-dark underline underline-offset-4">Service Types{customTypes ? ` · ${customTypes} to review` : ""} →</a></p>
        <SkillCatalogList
          rows={listRows}
          pairs={pairs}
          review={reviewCards}
          specReviewCount={specRows.filter((x) => x.status === "SUGGESTED").length}
          initial={{ tab: sp.tab, q: sp.q, role: sp.role, domain: sp.domain, area: sp.area, st: sp.st, page: sp.page }}
          areas={await getSkillAreas()}
        />
      </div>
    );

  // — ONE LINK COLOUR ON THE PAGE. `BackLink` does NOT render here
  const clearLink = (
    <BackLink href="/admin/skill-catalog" label="the Catalog" />
  );

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/* THE "Catalog Details" CARD IS GONE; THE TILES STAYED */}
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

      {/* THE CATALOG MOVES INTO THE CONSOLE'S LISTING SLOT */}
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
        // DEFAULT 25, NOT 7 . 7 exists on Users to reveal the footer
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
        <SkillCatalogTree
          roles={treeRoles}
          unassigned={unassigned}
          destinations={flatPairs}
          initial={{ q: sp.q, role: sp.role, domain: sp.domain, status: sp.status, tab: sp.tab, sub: sp.sub }}
          specs={specRows.filter((x) => x.status === "ACTIVE").map(toSpec)}
          newSpecs={specRows.filter((x) => x.status === "SUGGESTED").map((x) => ({ ...toSpec(x), members: people.get(x.id) ?? 0 })).sort((a, b) => b.members - a.members)}
        />
      )}
      {/* `E481` — the bar returns, live. See the note on the Specializations page. */}
      {/* THE LOOSE "Add a skill…" BAR IS GONE . It never asked which role */}

      {/* THE OLD EDIT BAR */}

      {/* THE FOOTER STOPS BEING A TREND AND BECOMES "MOST CLAIMED" */}
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
