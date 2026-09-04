import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageTabs } from "@/components/casing/PageTabs";
import { PAGE_TABS, tabSequenceFor } from "@/lib/nav";
import { Avatar } from "@/components/Avatar";
import { Composer } from "@/components/messages/Composer";
import {
  MAX_BODY,
  tabsWithUnread,
  canMessage,
  getConversation,
  listConversations,
  markRead,
  unreadCount,
} from "@/lib/messages";

/**
 * MESSAGES (`P1-ALL-E379`) — the scaffold, made real.
 *
 * SCOTT, 2026-09-04: *"build one!"*
 *
 * ⚠ SUPERSEDED, QUOTED NOT DELETED. This page's header used to open: *"MESSAGES
 * (PHASE 2 / WS2-B) — a SCAFFOLD, not a messaging system... there is no
 * messaging infrastructure in this codebase at all. No Conversation, Thread or
 * Message model in the schema; no /api/messages route; nothing in src/lib that
 * sends or reads one."* Every clause of that was true and is now false. The
 * disabled composer it described — *"a box that accepted text and dropped it
 * would be worse than no box"* — was the right call at the time and is what this
 * brief replaces.
 *
 * ── ⚠⚠ THE SHAPE: A LIST THAT OPENS A CONVERSATION, VIA `?with=` ──────────
 *
 * REPORTED AS A CHOICE, because the brief left it open. Two panes on desktop —
 * the shape the scaffold already established and the one people expect — but
 * the OPEN CONVERSATION IS A URL, not client state. Three reasons:
 *   · It matches `/community`'s `?q=` search, shipped one brief ago. One
 *     pattern for "the page is showing a narrower thing".
 *   · A conversation survives a bookmark, a refresh and the back button, and
 *     can be linked to. Client state loses all four.
 *   · It keeps the page a SERVER COMPONENT, so `canMessage`, `getConversation`
 *     and `markRead` never cross to the browser. Only the composer is a client.
 * ⚠ ON MOBILE the conversation REPLACES the list rather than sitting under it —
 * two stacked panes on a phone makes the reply box the second screenful.
 *
 * ⚠ NO REALTIME, NO POLLING, NO SOCKET, and the page SAYS SO rather than
 * looking broken. Messages appear on navigation and refresh.
 *
 * ⚠ OPENING A CONVERSATION IS THE ONLY THING THAT MARKS IT READ. Nothing else
 * calls `markRead` — not the list, not the badge.
 */
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
  /* ⚠ The badge counts EVERY unread, not just this conversation's — it is the
     tab's number, and the tab is visible from all five community pages. */
  const unread = viewer ? await unreadCount(viewer) : 0;

  /*
    ⚠ THE READ HAPPENS BEFORE THE FETCH, so the conversation renders already
    marked rather than showing its own unread pips for one frame. It is scoped
    to the recipient's rows inside `markRead` — a sender can never mark their
    own message read.
  */
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
        sequence={tabSequenceFor("/community")}
        tabs={tabsWithUnread(PAGE_TABS["/community"], unread)}
        current="/messages"
      />
      <div className="mx-auto max-w-5xl">
        <header className="mb-4">
          <h1 className="font-display text-[26px] font-bold tracking-[-0.5px]">Messages</h1>
          <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-2">
            Direct conversations with the colleagues you have connected with.
          </p>
        </header>

        <div className="overflow-hidden rounded-brand border border-line bg-white">
          <div className="grid md:grid-cols-[280px_1fr]">
            {/* ---- Conversation list ------------------------------------ */}
            {/* ⚠ HIDDEN ON MOBILE ONCE A CONVERSATION IS OPEN — see the header. */}
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
                  {/* ⚠ THE EMPTY STATE NAMES THE PERMISSION, because "no
                      conversations" without it reads as a broken feature. */}
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
                              {/* ⚠ ZERO RENDERS NOTHING — never a "0" pip. */}
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
                      /* ⚠⚠ THE REASON RENDERS WHERE THE COMPOSER WOULD BE. This
                         is the whole point of `canMessage` returning a reason
                         rather than a boolean — somebody who types four
                         paragraphs and THEN learns they cannot send has been
                         actively misled. The string is the lib's, not this
                         component's. */
                      <p className="rounded-brand border border-dashed border-line px-4 py-3 text-[13.5px] leading-relaxed text-ink-2">
                        {permission?.message}
                      </p>
                    )}
                    {/* ⚠ SAID PLAINLY, so a conversation that does not move on
                        its own does not read as broken. */}
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
