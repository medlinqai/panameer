import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageTabs } from "@/components/casing/PageTabs";
import { tabSequenceFor } from "@/lib/nav";
import { connectTabs } from "@/lib/connect-tabs";
import { unreadCount } from "@/lib/messages";
import { Avatar } from "@/components/Avatar";
import { ConnectControls } from "@/components/community/ConnectControls";
import { ConnectionsControls } from "@/components/community/ConnectionsControls";
import { membersView, parseFilters, appliedChips } from "@/lib/connections-filter";
import { getProviderFieldTree } from "@/lib/catalog";
import type { PickerTree } from "@/components/console/SkillTreePicker";

export const metadata = { title: "Community · Panameer" };

// Connect › Community (2026-10-08): people on Panameer you're not connected to yet — search, chips, best match first.
export default async function CommunityPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await guardPage("authenticated");
  const viewer = await getSessionViewer();
  if (!viewer) return null;
  const f = parseFilters(await searchParams);
  const [unread, view, fieldTree, skills] = await Promise.all([
    unreadCount(viewer),
    membersView(viewer, f),
    getProviderFieldTree(),
    prisma.skill.findMany({ where: { status: "ACTIVE", visible_to_members: true, pillar_id: { not: null }, review_pending: false, merged_into_id: null }, orderBy: { name: "asc" }, select: { id: true, name: true, role_type_id: true, pillar_id: true } }),
  ]);
  const tree: PickerTree = fieldTree.map((r) => ({
    id: r.id,
    label: r.display || r.name,
    domains: r.domains.map((d) => ({ id: d.id, name: d.name, skills: skills.filter((s) => s.role_type_id === r.id && s.pillar_id === d.id).map((s) => ({ id: s.id, name: s.name })) })).filter((d) => d.skills.length),
  }));
  const skillName = new Map(skills.map((s) => [s.id, s.name]));

  return (
    <>
      <PageTabs wrap eyebrow="CONNECT" sequence={tabSequenceFor("/connect")} tabs={connectTabs(viewer, unread)} current="/connect/community" />
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-4 font-display text-[26px] font-bold tracking-[-0.5px]">Community</h1>
        <ConnectionsControls
          scope="members"
          f={f}
          total={view.rows.length}
          chipCounts={view.chipCounts}
          invites={{ in: 0, out: 0 }}
          applied={appliedChips(f, (id) => skillName.get(id))}
          tree={tree}
          options={view.options}
        />
        {view.rows.length === 0 ? (
          <p className="mt-8 text-center text-[14px] text-ink-2">No one matches yet. Try fewer filters.</p>
        ) : (
          <ul data-member-cards className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {view.rows.slice(0, 60).map((p) => {
              const [first, ...rest] = p.name.split(" ");
              return (
                <li key={p.userId} data-member={p.userId} className="flex flex-col border border-line bg-white p-4">
                  <div className="flex items-start gap-3">
                    <Avatar firstName={first ?? ""} lastName={rest.join(" ")} photoUrl={p.photoUrl} size={48} />
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold">{p.name}</p>
                      <p className="truncate text-[12.5px] text-ink-2">{[p.title, p.company].filter(Boolean).join(" · ") || "Member"}</p>
                    </div>
                  </div>
                  <p className="mt-2.5 text-[12.5px] font-semibold text-ink-2">{p.whyLine}</p>
                  {p.skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.skills.map((s) => <span key={s} className="border border-line px-1.5 py-0.5 text-[11.5px]">{s}</span>)}
                    </div>
                  )}
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                    <ConnectControls
                      toUserId={p.userId}
                      part="colleague"
                      relation={p.pending ? "PENDING" : null}
                      incomingConnectionId={p.rel.has("invin") ? p.connectionId : null}
                    />
                    {p.profileHref ? (
                      <Link href={p.profileHref} className="border border-ink px-3.5 py-1.5 text-[13px] font-semibold hover:bg-black/[0.04]">View Profile</Link>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {view.rows.length > 60 && <p className="mt-3 text-[12.5px] text-ink-2">Showing the 60 best matches — search or filter to narrow it down.</p>}
      </div>
    </>
  );
}
