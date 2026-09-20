import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { getForumsHome } from "@/lib/forums";
import { PageTabs } from "@/components/casing/PageTabs";
import { tabSequenceFor } from "@/lib/nav";
import { connectTabs } from "@/lib/connect-tabs";
import { getSessionViewer } from "@/lib/session";
import { unreadCount } from "@/lib/messages";
import { ForumRooms } from "@/components/community/ForumRooms";

/**
 * ── ⚠⚠ FORUMS — ACTIVITY LEADS, ROOMS GO IN THE RAIL (`P2-J3-E558` WS-B) ───
 *
 * ⚠ The viewer is in many rooms and most are empty. A page that lists them all
 * is a wall of empty rooms.
 *
 * ⚠⚠⚠ `ForumThread` HAS ZERO ROWS, SO THIS PAGE SHIPS ENTIRELY UNEXERCISED, AND
 * THAT IS THE DESIGNED STATE — NOT A BUG AND NOT A REASON TO SEED.
 * ⚠ Fabricated forum activity is the `E564` defect (demo data leaking onto a
 * real surface), and a seeded thread carries an AUTHOR, which makes it worse
 * here than anywhere else: it puts words in a real member's mouth.
 * ⚠ The rail still lists the rooms, so the page is never blank — it says *the
 * rooms exist and nothing has been asked yet*, which is true.
 */
export default async function ForumsPage() {
  await guardPage("authenticated");
  const viewer = await getSessionViewer();
  const unread = viewer ? await unreadCount(viewer) : 0;
  const home = viewer
    ? await getForumsHome(viewer)
    : { noReplies: [], unweighed: [], recent: [], rooms: [], teaches: false };

  /* ⚠⚠ THE HOUSE EMPTY-STATE PATTERN: when BOTH groups are empty the two panels
     COLLAPSE INTO ONE, rather than rendering two empty boxes. Two bordered
     boxes with nothing in them read as something that failed to load. */
  const bothEmpty = home.noReplies.length === 0 && home.unweighed.length === 0;

  return (
    <>
      <PageTabs
        eyebrow="CONNECT"
        sequence={tabSequenceFor("/connect")}
        tabs={connectTabs(viewer, unread)}
        current="/community/forums"
      />
      <div className="mx-auto max-w-5xl">
        <header className="mb-5">
          <h1 className="font-display text-[26px] font-bold tracking-[-0.5px]">Forums</h1>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
          <div className="space-y-6">
            {/* ── 1 · IN PATHS YOU TEACH ─────────────────────────────────────
                ⚠ Rendered only for a path INSTRUCTOR. Somebody who teaches
                nothing should not be shown an empty instructor panel. */}
            {home.teaches && (
              <section className="space-y-3">
                <h2 className="font-display text-[17px] font-bold">In Paths You Teach</h2>

                {bothEmpty ? (
                  <div className="rounded-brand border border-line bg-white p-5">
                    <p className="text-[14px] leading-relaxed text-ink-2">
                      Nobody has asked anything in your paths yet. When they do,
                      unanswered questions show here first.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* ⚠⚠ UNANSWERED MEANS ZERO REPLIES. Literally that — no
                        instructor qualifier (Scott, 2026-09-17). */}
                    {home.noReplies.length > 0 && (
                      <ThreadGroup
                        heading="No Replies Yet"
                        threads={home.noReplies}
                        action="Answer"
                      />
                    )}
                    {/* ⚠ Replies exist and NONE are the viewer's. `Confirm` is
                        the load-bearing one: without it the only way to endorse
                        a correct answer is to re-answer it, which is noise, and
                        instructors stop reviewing. */}
                    {home.unweighed.length > 0 && (
                      <ThreadGroup
                        heading="Answered by Someone Else — You Haven't Weighed In"
                        threads={home.unweighed}
                        action="Add to It"
                        confirmable
                      />
                    )}
                  </>
                )}
              </section>
            )}

            {/* ── 2 · RECENT IN YOUR FORUMS ─────────────────────────────── */}
            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-bold">Recent in Your Forums</h2>
              {home.recent.length === 0 ? (
                <p className="text-[14px] leading-relaxed text-ink-2">
                  Nothing has been posted in your rooms yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {home.recent.map((t) => (
                    <Link
                      key={t.id}
                      href={`/community/forums/thread/${t.id}`}
                      className="block rounded-brand border border-line bg-white p-4 transition-colors hover:border-magenta"
                    >
                      <p className="text-[15px] font-bold">{t.title}</p>
                      {/* ⚠ EACH LABELLED WITH ITS ROOM — a thread out of its
                          room is a sentence with no subject. ⚠ `E433`: the room
                          and the count are facts, so ink. */}
                      <p className="mt-0.5 text-[13px] text-ink-2">
                        {t.boardTitle} · {t.replies}{" "}
                        {t.replies === 1 ? "reply" : "replies"}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside>
            <ForumRooms rooms={home.rooms} />
          </aside>
        </div>
      </div>
    </>
  );
}

function ThreadGroup({
  heading,
  threads,
  action,
  confirmable = false,
}: {
  heading: string;
  threads: { id: string; title: string; boardTitle: string; replies: number }[];
  action: string;
  confirmable?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[13px] font-bold text-ink-2">{heading}</p>
      {threads.map((t) => (
        <div
          key={t.id}
          className="pm-member-row flex flex-wrap items-center gap-3 rounded-brand border border-line bg-white p-4"
        >
          <div className="min-w-[180px] flex-1">
            <p className="text-[15px] font-bold">{t.title}</p>
            <p className="mt-0.5 text-[13px] text-ink-2">{t.boardTitle}</p>
          </div>
          <div className="pm-member-row-actions flex flex-wrap items-center gap-2">
            {/* ⚠ `Confirm` IS A REAL PERSISTED ACTION, behind
                `instructor_confirmed_*` — a SEPARATE signal from the asker's
                `marked_helpful_*`. It lives on the thread, where the answer is. */}
            {confirmable && (
              <Link
                href={`/community/forums/thread/${t.id}#confirm`}
                className="rounded-full border-[1.5px] border-line px-4 py-1.5 text-[13.5px] font-bold text-ink transition-colors hover:border-magenta hover:text-magenta"
              >
                Confirm
              </Link>
            )}
            <Link
              href={`/community/forums/thread/${t.id}`}
              className="rounded-full bg-magenta px-4 py-1.5 text-[13.5px] font-bold text-white transition-colors hover:bg-magenta-dark"
            >
              {action}
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
