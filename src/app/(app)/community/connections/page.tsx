import Link from "next/link";
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
import { ConnectionsControls, SavedViews } from "@/components/community/ConnectionsControls";
import type { PickerTree } from "@/components/console/SkillTreePicker";
import { ColleagueRoster } from "@/components/community/ColleagueRoster";
import { INVITE_LIMIT_PER_HOUR, INVITE_LIMIT_PER_DAY } from "@/lib/colleague-invite";

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

  return (
    <>
      {}
      <PageTabs
        wrap
        eyebrow="CONNECT"
        sequence={tabSequenceFor("/connect")}
        tabs={connectTabs(viewer, unread)}
        current="/community/connections"
      />
      <div className="mx-auto max-w-5xl">
        <header className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-display text-[26px] font-bold tracking-[-0.5px]">
            Connections
          </h1>
          {/* R-E012: the inviter could not see who they had invited. */}
          <Link
            href="/invite-colleague"
            className="text-[13px] font-bold text-ink-2 underline-offset-4 hover:text-magenta hover:underline"
          >
            Invitations{pendingCount > 0 ? ` (${pendingCount})` : ""} →
          </Link>
        </header>

        <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="min-w-0 space-y-4 lg:col-start-2 lg:row-start-1">
            <ConnectionsControls
              f={f}
              total={view?.total ?? 0}
              chipCounts={view?.chipCounts ?? {}}
              invites={view?.invites ?? { in: 0, out: 0 }}
              applied={appliedChips(f, (id) => skillName.get(id))}
              tree={tree}
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

          {}
          <aside className="space-y-3 lg:col-start-1 lg:row-start-1">
            <SavedViews views={views.map((v, i) => ({ ...v, count: view?.savedCounts[i] ?? 0 }))} />
            <div className="border-t border-line py-5">
              <h2 className="font-display text-[15px] font-bold">Invite a Colleague</h2>
              {}
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
                Send someone an invitation from you by name. It is an invitation,
                not a connection — if they join, you still send a colleague
                request like anyone else.
              </p>
              <Link
                href="/invite-colleague"
                className="mt-3 inline-block bg-ink px-4 py-2 text-[13.5px] font-semibold text-surface transition-colors hover:bg-ink-hover"
              >
                Invite a Colleague
              </Link>
              {}
              <p className="mt-3 text-[12.5px] leading-relaxed text-ink-2">
                Up to {INVITE_LIMIT_PER_HOUR} an hour and {INVITE_LIMIT_PER_DAY} a
                day.
              </p>
            </div>
            {/* Moved from the avatar menu (Scott 2026-10-05): both Connect actions live here. */}
            <div className="border-t border-line py-5" data-request-recommendation>
              <h2 className="font-display text-[15px] font-bold">Request a Recommendation</h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
                Ask someone you&apos;ve worked with to vouch for you. It shows on your profile once they write it.
              </p>
              <Link
                href="/recommendations"
                className="mt-3 inline-block border border-ink bg-surface px-4 py-2 text-[13.5px] font-semibold text-ink transition-colors hover:bg-surface-hover"
              >
                Request a Recommendation
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
