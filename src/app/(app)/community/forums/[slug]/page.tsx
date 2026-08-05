import Link from "next/link";
import { notFound } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { getBoard } from "@/lib/forums";
import { relativeDay } from "@/lib/relative-day";
import { ForumComposer } from "@/components/community/ForumComposer";

/** One board: its threads, newest activity first, plus the composer (WS2-C). */
export default async function BoardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await guardPage("authenticated");
  const { slug } = await params;
  const board = await getBoard(slug);
  if (!board) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header>
        <Link
          href="/community/forums"
          className="text-[13.5px] font-semibold text-ink-2 hover:text-magenta"
        >
          ← All forums
        </Link>
        <h1 className="mt-2 font-display text-[26px] font-bold tracking-[-0.5px]">
          {board.title}
        </h1>
        {board.description && (
          <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-2">
            {board.description}
          </p>
        )}
      </header>

      {board.threads.length === 0 ? (
        <div className="rounded-brand border border-dashed border-line px-4 py-8 text-center">
          <p className="text-[15px] font-semibold">No questions here yet.</p>
          <p className="mx-auto mt-1 max-w-md text-[13.5px] leading-relaxed text-ink-2">
            Someone has to go first. A question with real detail gets a real
            answer — and both earn Credits once the ledger is on.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line rounded-brand border border-line bg-white">
          {board.threads.map((t) => (
            <li key={t.id}>
              <Link
                href={`/community/forums/thread/${t.id}`}
                className="group flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold group-hover:text-magenta">
                    {t.title}
                  </p>
                  <p className="mt-0.5 text-[13px] text-ink-2">
                    {t.author.name} · {relativeDay(t.lastPostAt)}
                  </p>
                </div>
                <span className="shrink-0 text-[13px] text-ink-2">
                  {t.replyCount} {t.replyCount === 1 ? "reply" : "replies"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <ForumComposer mode="thread" boardSlug={board.slug} />
    </div>
  );
}
