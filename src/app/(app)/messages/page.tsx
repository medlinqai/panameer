import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";
import { Composer } from "@/components/messages/Composer";
import { ConversationList } from "@/components/messages/ConversationList";
import {
  MAX_BODY,
  canMessage,
  getConversation,
  listConversations,
  markRead,
  profileHrefFor,
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
          select: { first_name: true, last_name: true, title: true, photo_url: true, providerProfile: { select: { id: true } } },
        }),
      ])
    : [null, null, null];

  const otherName = other ? `${other.first_name} ${other.last_name}`.trim() : "This member";
  const otherHref = profileHrefFor(other?.providerProfile);

  return (
    <>
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
              {conversations.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-[14px] font-semibold">No conversations yet</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
                    You can message the colleagues you have connected with.{" "}
                    <Link href="/community" className="font-semibold text-magenta hover:underline">
                      Find colleagues
                    </Link>
                    .
                  </p>
                </div>
              ) : (
                <ConversationList
                  active={withUserId ?? null}
                  rows={conversations.map((c) => ({ otherUserId: c.otherUserId, name: c.name, photoUrl: c.photoUrl, lastBody: c.lastBody, lastAt: c.lastAt.toISOString(), unread: c.unread, profileHref: c.profileHref }))}
                />
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
                    {otherHref ? (
                      <Link href={otherHref} data-thread-profile className="flex min-w-0 items-center gap-2.5 hover:underline">
                        <Avatar firstName={other?.first_name ?? ""} lastName={other?.last_name ?? ""} photoUrl={other?.photo_url ?? null} size={36} />
                        <span className="min-w-0">
                          <span className="block truncate text-[14px] font-bold">{otherName}</span>
                          {other?.title && <span className="block truncate text-[12.5px] text-ink-2">{other.title} · opens profile</span>}
                        </span>
                      </Link>
                    ) : (
                      <span className="flex min-w-0 items-center gap-2.5">
                        <Avatar firstName={other?.first_name ?? ""} lastName={other?.last_name ?? ""} photoUrl={other?.photo_url ?? null} size={36} />
                        <span className="min-w-0">
                          <span className="block truncate text-[14px] font-bold">{otherName}</span>
                          {other?.title && <span className="block truncate text-[12.5px] text-ink-2">{other.title}</span>}
                        </span>
                      </span>
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
                            <div
                              className={
                                "max-w-[80%] whitespace-pre-wrap rounded-brand px-3 py-2 text-[14px] leading-relaxed " +
                                (mine ? "bg-magenta text-white" : "bg-ink-2/[0.07] text-ink")
                              }
                            >
                              {m.image_path && (
                                <a href={`/api/messages/image/${m.id}`} target="_blank" rel="noreferrer" data-message-image className="mb-1 block">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={`/api/messages/image/${m.id}`} alt="Image in message" loading="lazy" className="max-h-[260px] max-w-full rounded-[6px] bg-white object-contain" />
                                </a>
                              )}
                              {m.body}
                            </div>
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
                      Press Enter to send, Shift+Enter for a new line. New messages appear when you refresh or come back to this page.
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
