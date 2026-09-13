import { Layers, FolderTree, Wrench } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getProviderFieldTree, getSkillProviderCounts } from "@/lib/catalog";
import { TileRow } from "@/components/console/ConsolePage";
import { CatalogTree, CatalogEditBar, type CatalogNode } from "@/components/console/CatalogTree";
import { CatalogCard } from "@/components/console/CatalogCard";

export const dynamic = "force-dynamic";

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
export default async function Page() {
  const [roles, skillCount, pillarCount, skillProviders] = await Promise.all([
    getProviderFieldTree(),
    prisma.skill.count(),
    prisma.pillar.count(),
    getSkillProviderCounts(),
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
            icon: <Layers className="h-[19px] w-[19px]" aria-hidden />,
          },
          {
            label: "Domains",
            value: domainPairs,
            tone: "amber",
            icon: <FolderTree className="h-[19px] w-[19px]" aria-hidden />,
          },
          {
            label: "Skills",
            value: skillCount,
            tone: "emerald",
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
      <CatalogCard title={`Roles > Domains > Skills (${skillCount})`}>
        <CatalogTree nodes={nodes} emptyLabel="The service catalog is empty." toolbar />
      </CatalogCard>
      <CatalogEditBar sticky />
    </div>
  );
}
