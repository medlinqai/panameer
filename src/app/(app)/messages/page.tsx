import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageTabs } from "@/components/casing/PageTabs";
import { tabSequenceFor } from "@/lib/nav";
import { connectTabs } from "@/lib/connect-tabs";
import { Avatar } from "@/components/Avatar";
import { Composer } from "@/components/messages/Composer";
import {
  MAX_BODY,
  canMessage,
  getConversation,
  listConversations,
  markRead,
  unreadCount,
} from "@/lib/messages";

export const metadata = { title: "Messages · Panameer" };

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ with?: string }>;
}) {
  await guardPage("authenticated");
  const viewer = await getSessionViewer();
  const { with: withUserId } = await searchParams;

  const conversations = viewer ? await listConversations(viewer) : [];
  const unread = viewer ? await unreadCount(viewer) : 0;

  if (viewer && withUserId) await markRead(viewer, withUserId);

  const [thread, permission, other] = viewer && withUserId
    ? await Promise.all([
        getConversation(viewer, withUserId),
        canMessage(viewer, withUserId),
        prisma.person.findFirst({
          where: { user_id: withUserId },
          select: { first_name: true, last_name: true, title: true, photo_url: true },
        }),
      ])
    : [null, null, null];

  const otherName = other ? `${other.first_name} ${other.last_name}`.trim() : "This member";

  return (
    <>
      {/* E216 — the Community rail flyout's children are this section's tab row now. */}
      <PageTabs
        eyebrow="CONNECT" sequence={tabSequenceFor("/connect")}
        tabs={connectTabs(viewer, unread)}
        current="/messages"
      />
      <div className="mx-auto max-w-5xl">
        <header className="mb-4">
          {/* THE UNREAD COUNT LIVES IN THE TITLE LINE  */}
          <h1 className="font-display text-[26px] font-bold tracking-[-0.5px]">Messages</h1>
          <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-2">
            Direct conversations with the colleagues you have connected with.
            {unread > 0 && (
              <>
                {" "}
                <span className="font-semibold text-ink">
                  {unread} unread.
                </span>
              </>
            )}
          </p>
        </header>

        <div className="overflow-hidden rounded-brand border border-line bg-white">
          <div className="grid md:grid-cols-[280px_1fr]">
            {/* ---- Conversation list ------------------------------------ */}
            {/* HIDDEN ON MOBILE ONCE A CONVERSATION IS OPEN — see the header. */}
            <aside
              className={
                "border-b border-line md:border-b-0 md:border-r " +
                (withUserId ? "hidden md:block" : "")
              }
            >
              <div className="border-b border-line px-4 py-3">
                <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-ink-2">
                  Conversations
                </p>
              </div>
              {conversations.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-[14px] font-semibold">No conversations yet</p>
                  {/* THE EMPTY STATE NAMES THE PERMISSION, because "no */}
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
                    You can message the colleagues you have connected with.{" "}
                    <Link href="/community" className="font-semibold text-magenta hover:underline">
                      Find colleagues
                    </Link>
                    .
                  </p>
                </div>
              ) : (
                <ul>
                  {conversations.map((c) => {
                    const active = c.otherUserId === withUserId;
                    return (
                      <li key={c.otherUserId}>
                        <Link
                          href={`/messages?with=${c.otherUserId}`}
                          className={
                            "flex min-h-[44px] items-center gap-3 border-b border-line px-4 py-3 transition-colors " +
                            (active ? "bg-magenta/[0.06]" : "hover:bg-ink-2/[0.04]")
                          }
                        >
                          <Avatar
                            firstName={c.name.split(" ")[0] ?? ""}
                            lastName={c.name.split(" ").slice(1).join(" ")}
                            photoUrl={c.photoUrl}
                            size={36}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-[14px] font-bold">{c.name}</span>
                              {/* ZERO RENDERS NOTHING — never a "0" pip. */}
                              {c.unread > 0 && (
                                <span className="ml-auto grid h-[18px] min-w-[18px] shrink-0 place-items-center rounded-full bg-magenta px-1 text-[11px] font-bold text-white">
                                  {c.unread}
                                </span>
                              )}
                            </span>
                            <span className="mt-0.5 block truncate text-[12.5px] text-ink-2">
                              {c.lastBody}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </aside>

            {/* ---- Conversation ----------------------------------------- */}
            <section className="flex min-h-[320px] flex-col">
              {!withUserId ? (
                <div className="flex flex-1 items-center justify-center px-6 py-10 text-center">
                  <div className="max-w-md">
                    <p className="text-[15px] font-semibold">Pick a conversation</p>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">
                      Messages are between colleagues — people who accepted your
                      connection request, or whose request you accepted.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                    <Link
                      href="/messages"
                      className="text-[13px] font-semibold text-ink-2 hover:text-magenta md:hidden"
                    >
                      ‹ All
                    </Link>
                    <p className="text-[14px] font-bold">{otherName}</p>
                    {other?.title && (
                      <p className="truncate text-[12.5px] text-ink-2">{other.title}</p>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 px-4 py-4">
                    {(thread ?? []).length === 0 ? (
                      <p className="py-6 text-center text-[13.5px] text-ink-2">
                        No messages yet. Say the first thing.
                      </p>
                    ) : (
                      (thread ?? []).map((m) => {
                        const mine = m.from_user_id === viewer?.userId;
                        return (
                          <div
                            key={m.id}
                            className={"flex " + (mine ? "justify-end" : "justify-start")}
                          >
                            <p
                              className={
                                "max-w-[80%] whitespace-pre-wrap rounded-brand px-3 py-2 text-[14px] leading-relaxed " +
                                (mine ? "bg-magenta text-white" : "bg-ink-2/[0.07] text-ink")
                              }
                            >
                              {m.body}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="px-4 pb-4">
                    {permission?.ok ? (
                      <Composer toUserId={withUserId} maxLength={MAX_BODY} />
                    ) : (
                      // THE REASON RENDERS WHERE THE COMPOSER WOULD BE. This
                      <p className="rounded-brand border border-dashed border-line px-4 py-3 text-[13.5px] leading-relaxed text-ink-2">
                        {permission?.message}
                      </p>
                    )}
                    {/* SAID PLAINLY, so a conversation that does not move on */}
                    <p className="mt-2 text-[12px] text-ink-2">
                      New messages appear when you refresh or come back to this page.
                    </p>
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
