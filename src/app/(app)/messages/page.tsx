import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageTabs } from "@/components/casing/PageTabs";
import { PAGE_TABS, tabSequenceFor } from "@/lib/nav";

/**
 * MESSAGES (PHASE 2 / WS2-B) — a SCAFFOLD, not a messaging system.
 *
 * WHAT I FOUND, stated plainly because the brief asks: there is no messaging
 * infrastructure in this codebase at all. No Conversation, Thread or Message
 * model in the schema; no /api/messages route; nothing in src/lib that sends or
 * reads one. The only message-shaped columns are the coordinator invite's note
 * and the recommendation request's covering note — both one-way email bodies,
 * not conversations.
 *
 * So this is the two-pane shape with honest empty states and NOTHING that
 * pretends to send. The composer is visibly disabled rather than absent: the
 * shape is the useful thing to establish now, and a box that accepted text and
 * dropped it would be worse than no box.
 *
 * TWO THINGS AROUND IT ARE ALREADY REAL, and the page says so rather than
 * leaving someone wondering what the switch they toggled was for:
 * `available_for_messages` (the persona menu's "Online for messages") and the
 * `message.received` notification category with its per-channel preferences.
 * Both are live and both will drive this surface when it exists.
 *
 * The messaging model and its delivery are their own follow-up.
 */
export const metadata = { title: "Messages · Panameer" };

export default async function MessagesPage() {
  await guardPage("authenticated");
  const viewer = await getSessionViewer();

  /*
    One real read: whether this person is currently marked reachable. It is the
    only fact about messaging the database actually knows, and surfacing it here
    closes the loop on a toggle that otherwise had no visible consequence
    anywhere in the product.
  */
  const profile = viewer
    ? await prisma.providerProfile.findFirst({
        where: { person: { user_id: viewer.userId } },
        select: { available_for_messages: true },
      })
    : null;

  return (
    <>
      {/* E216 — the Community rail flyout's children are this section's tab row now. */}
      <PageTabs
        sequence={tabSequenceFor("/community")} tabs={PAGE_TABS["/community"]} current="/messages" />
      <div className="mx-auto max-w-5xl">
      <header className="mb-4">
        <h1 className="font-display text-[26px] font-bold tracking-[-0.5px]">
          Messages
        </h1>
        <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          Direct conversations with buyers and the people you work with.
        </p>
      </header>

      <div className="overflow-hidden rounded-brand border border-line bg-white">
        <div className="grid md:grid-cols-[280px_1fr]">
          {/* ---- Conversation list -------------------------------------- */}
          <aside className="border-b border-line md:border-b-0 md:border-r">
            <div className="border-b border-line px-4 py-3">
              <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-ink-2">
                Conversations
              </p>
            </div>
            <div className="px-4 py-8 text-center">
              <p className="text-[14px] font-semibold">No conversations yet</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
                When a buyer opens a conversation with you, it appears here.
              </p>
            </div>
          </aside>

          {/* ---- Thread pane -------------------------------------------- */}
          <section className="flex min-h-[320px] flex-col">
            <div className="flex flex-1 items-center justify-center px-6 py-10 text-center">
              <div className="max-w-md">
                <p className="text-[15px] font-semibold">
                  Messaging isn&apos;t switched on yet
                </p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">
                  This is the shape of it — the list on the left, the
                  conversation on the right. Sending is a separate build;
                  nothing typed here would go anywhere, so the box below is
                  turned off rather than pretending.
                </p>
              </div>
            </div>

            {/*
              A DISABLED COMPOSER, not a missing one. The shape is what this
              workstream establishes, and a box that swallowed a message would
              be worse than no box at all.
            */}
            <div className="border-t border-line p-3">
              <div className="flex items-center gap-2 rounded-full border border-line bg-canvas px-4 py-2.5">
                <input
                  disabled
                  placeholder="Messaging isn't available yet"
                  aria-label="Message (unavailable)"
                  className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink-2/70"
                />
                <button
                  type="button"
                  disabled
                  className="shrink-0 rounded-full bg-magenta px-4 py-1.5 text-[13.5px] font-bold text-white opacity-40"
                >
                  Send
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ---- What IS live around it -------------------------------------- */}
      <section className="mt-4 rounded-brand border border-dashed border-line p-5">
        <h2 className="font-display text-[15px] font-bold">
          What&apos;s Already Working
        </h2>
        <ul className="mt-2 space-y-2 text-[14px] leading-relaxed text-ink-2">
          {profile && (
            <li>
              You are currently marked{" "}
              <b className="text-ink">
                {profile.available_for_messages ? "online" : "offline"}
              </b>{" "}
              for messages — the switch in your account menu. Buyers will see
              this when conversations open.
            </li>
          )}
          <li>
            Your{" "}
            <Link
              href="/settings/notifications"
              className="font-semibold text-magenta hover:underline"
            >
              notification settings
            </Link>{" "}
            already cover new messages, per channel. Those preferences are saved
            and will be honoured from the day this goes live.
          </li>
        </ul>
      </section>
    </div>
    </>
  );
}
