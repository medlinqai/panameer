import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { outgoingRequests } from "@/lib/connections";
import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { PageTabs } from "@/components/casing/PageTabs";
import { tabSequenceFor } from "@/lib/nav";
import { connectTabs } from "@/lib/connect-tabs";
import { unreadCount } from "@/lib/messages";
import { getColleagueRoster } from "@/lib/colleague-roster";
import { ColleagueRoster } from "@/components/community/ColleagueRoster";
import { INVITE_LIMIT_PER_HOUR, INVITE_LIMIT_PER_DAY } from "@/lib/colleague-invite";

export default async function ColleaguesPage() {
  await guardPage("authenticated");
  const viewer = await getSessionViewer();
  const unread = viewer ? await unreadCount(viewer) : 0;
  const rows = viewer ? await getColleagueRoster(viewer) : [];

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
        current="/community/colleagues"
      />
      <div className="mx-auto max-w-5xl">
        <header className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-display text-[26px] font-bold tracking-[-0.5px]">
            Colleagues
          </h1>
          {/* R-E012: the inviter could not see who they had invited. */}
          <Link
            href="/invite-colleague"
            className="text-[13px] font-bold text-ink-2 underline-offset-4 hover:text-magenta hover:underline"
          >
            Invitations{pendingCount > 0 ? ` (${pendingCount})` : ""} →
          </Link>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
          <ColleagueRoster
            rows={rows.map((r) => ({
              connectionId: r.connectionId,
              userId: r.userId,
              name: r.name,
              title: r.title,
              company: r.company,
              skillNames: r.skillNames,
              photoUrl: r.photoUrl,
              reason: r.reason,
              reasonKind: r.reasonKind,
              buySide: r.buySide,
              location: r.location,
              mutualCount: r.mutualCount,
              profileHref: r.profileHref,
            }))}
          />

          {}
          <aside className="space-y-3">
            <div className="rounded-brand border border-line bg-white p-5">
              <h2 className="font-display text-[15px] font-bold">Invite a Colleague</h2>
              {}
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
                Send someone an invitation from you by name. It is an invitation,
                not a connection — if they join, you still send a colleague
                request like anyone else.
              </p>
              <Link
                href="/invite-colleague"
                className="mt-3 inline-block rounded-full bg-magenta px-4 py-2 text-[13.5px] font-bold text-white transition-colors hover:bg-magenta-dark"
              >
                Invite a Colleague
              </Link>
              {}
              <p className="mt-3 text-[12.5px] leading-relaxed text-ink-2">
                Up to {INVITE_LIMIT_PER_HOUR} an hour and {INVITE_LIMIT_PER_DAY} a
                day.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
