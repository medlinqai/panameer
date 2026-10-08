import { prisma } from "@/lib/prisma";
import { outgoingRequests } from "@/lib/connections";
import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { PageTabs } from "@/components/casing/PageTabs";
import { tabSequenceFor } from "@/lib/nav";
import { connectTabs } from "@/lib/connect-tabs";
import { unreadCount } from "@/lib/messages";
import { connectionsView, parseFilters, appliedChips } from "@/lib/connections-filter";
import { getProviderFieldTree } from "@/lib/catalog";
import { ConnectionsControls } from "@/components/community/ConnectionsControls";
import { ConnectionsHero } from "@/components/community/CommunityHero";
import { getCommunityHero } from "@/lib/community-hero";
import { getCommunityWeb } from "@/lib/community-web";
import { levelStandingFor } from "@/lib/levels";
import "@/components/community/community-web.css";
import type { PickerTree } from "@/components/console/SkillTreePicker";
import { ColleagueRoster } from "@/components/community/ColleagueRoster";

export default async function ConnectionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await guardPage("authenticated");
  const viewer = await getSessionViewer();
  const unread = viewer ? await unreadCount(viewer) : 0;
  const f = parseFilters(await searchParams);
  const views = viewer ? await prisma.connectionView.findMany({ where: { user_id: viewer.userId }, orderBy: { created_at: "asc" }, select: { id: true, name: true, query: true } }) : [];
  const view = viewer ? await connectionsView(viewer, f, views.map((v) => v.query)) : null;
  const [fieldTree, skills] = await Promise.all([
    getProviderFieldTree(),
    prisma.skill.findMany({ where: { status: "ACTIVE", visible_to_members: true, pillar_id: { not: null }, review_pending: false, merged_into_id: null }, orderBy: { name: "asc" }, select: { id: true, name: true, role_type_id: true, pillar_id: true } }),
  ]);
  const tree: PickerTree = fieldTree.map((r) => ({
    id: r.id,
    label: r.display || r.name,
    domains: r.domains
      .map((d) => ({ id: d.id, name: d.name, skills: skills.filter((s) => s.role_type_id === r.id && s.pillar_id === d.id).map((s) => ({ id: s.id, name: s.name })) }))
      .filter((d) => d.skills.length),
  }));
  const skillName = new Map(skills.map((s) => [s.id, s.name]));
  const rows = view?.rows ?? [];

  const me = viewer
    ? await prisma.person.findFirst({ where: { user_id: viewer.userId }, select: { id: true } })
    : null;
  const [requests, invites] = viewer
    ? await Promise.all([
        outgoingRequests(viewer),
        me
          ? prisma.colleagueInvite.count({
              where: { inviter_person_id: me.id, status: "PENDING", expires_at: { gt: new Date() } },
            })
          : 0,
      ])
    : [[], 0];
  const pendingCount = requests.length + invites;
  const [web, hero, standing] = viewer
    ? await Promise.all([getCommunityWeb(viewer), getCommunityHero(viewer), me ? levelStandingFor(me.id) : null])
    : [null, null, null];
  if (!web) return null;

  return (
    <>
      {}
      <PageTabs
        wrap
        eyebrow="CONNECT"
        sequence={tabSequenceFor("/connect")}
        tabs={connectTabs(viewer, unread)}
        current="/connect/connections"
      />
      <div className="mx-auto max-w-5xl">
        <h1 className="sr-only">Connections</h1>
        <ConnectionsHero web={web} hero={hero} standing={standing} invitations={pendingCount} />
        <div className="mt-6 min-w-0 space-y-4">
          <ConnectionsControls
            f={f}
            total={view?.total ?? 0}
            chipCounts={view?.chipCounts ?? {}}
            invites={view?.invites ?? { in: 0, out: 0 }}
            applied={appliedChips(f, (id) => skillName.get(id))}
            tree={tree}
            views={views.map((v, i) => ({ ...v, count: view?.savedCounts[i] ?? 0 }))}
          />
          <ColleagueRoster
            bare
            rows={rows.map((r) => ({
              connectionId: r.connectionId,
              userId: r.userId,
              name: r.name,
              title: r.title,
              company: r.company,
              companyId: r.companyId,
              skillNames: [...r.skillNames.values()],
              photoUrl: r.photoUrl,
              reason: r.why.how,
              reasonKind: "date" as const,
              buySide: r.buySide,
              location: r.location,
              mutualCount: 0,
              profileHref: r.profileHref,
              tags: r.why.tags,
              how: r.why.how,
              matched: r.why.skill,
            }))}
          />
        </div>
      </div>
    </>
  );
}
