import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { listBoards } from "@/lib/forums";
import { relativeDay } from "@/lib/relative-day";
import { PageTabs } from "@/components/casing/PageTabs";
import { PAGE_TABS } from "@/lib/nav";

/**
 * FORUMS — the board list (PHASE 2 / WS2-C). REAL, not a scaffold.
 *
 * Three Prisma models behind it (ForumBoard / ForumThread / ForumPost), real
 * reads and real writes. A forum with a fake thread list is worse than no
 * forum, and the models were small enough that stubbing them would have cost
 * more explanation than building them.
 *
 * BOARDS ARE SEEDED, NOT USER-CREATED. A forum whose sections anyone can add
 * fragments before it has enough people to fill the first four. The four map to
 * what this marketplace is about rather than to a generic template, and
 * `listBoards` upserts them on read so there is no seed command to forget.
 */
export const metadata = { title: "Forums · Panameer" };

export default async function ForumsPage() {
  await guardPage("authenticated");
  const boards = await listBoards();

  return (
    <>
      {/* E216 — the Community rail flyout's children are this section's tab row now. */}
      <PageTabs tabs={PAGE_TABS["/community"]} current="/community/forums" />
      <div className="mx-auto max-w-4xl">
      <header className="mb-5">
        <h1 className="font-display text-[26px] font-bold tracking-[-0.5px]">
          Forums
        </h1>
        <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          Ask questions, answer them, and be seen doing it. The people who answer
          are the people buyers remember.
        </p>
      </header>

      <div className="space-y-3">
        {boards.map((b) => (
          <Link
            key={b.slug}
            href={`/community/forums/${b.slug}`}
            className="group flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-brand border border-line bg-white p-5 transition-colors hover:border-magenta/40"
          >
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-[17px] font-bold group-hover:text-magenta">
                {b.title}
              </h2>
              {b.description && (
                <p className="mt-1 text-[14px] leading-relaxed text-ink-2">
                  {b.description}
                </p>
              )}
              {/*
                The latest thread, when there is one. An empty board says so
                rather than showing a blank line — "no questions yet" is an
                invitation, a gap is a bug.
              */}
              <p className="mt-2 text-[13px] text-ink-2">
                {b.latest ? (
                  <>
                    Latest: <b className="text-ink">{b.latest.title}</b> ·{" "}
                    {relativeDay(b.latest.at)}
                  </>
                ) : (
                  "No questions yet — be the first."
                )}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-black/[0.05] px-3 py-1 text-[12.5px] font-bold text-ink-2">
              {b.threadCount} {b.threadCount === 1 ? "thread" : "threads"}
            </span>
          </Link>
        ))}
      </div>
    </div>
    </>
  );
}
