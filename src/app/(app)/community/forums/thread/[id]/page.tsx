import Link from "next/link";
import { notFound } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { getThread, viewerPersonId } from "@/lib/forums";
import { relativeDay } from "@/lib/relative-day";
import { Avatar } from "@/components/Avatar";
import { ForumComposer } from "@/components/community/ForumComposer";
import { communityIdentityGaps } from "@/lib/community-identity";
import { HelpfulButton } from "@/components/community/HelpfulButton";

/** One thread: the question, every reply oldest-first, and the reply box. */
export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const gate = await guardPage("authenticated");
  const { id } = await params;
  /*
    The viewer's own Person id decides whether the "this answered my question"
    button is rendered per reply. ⚠ RENDERING ONLY — `markHelpful` re-checks both
    rules from the session, so the button's absence is a courtesy and not the
    boundary.
  */
  const thread = await getThread(id, await viewerPersonId(gate));

  /* ⚠ THE COMPOSER'S MIRROR (`P1-ALL-E033`). Reading the thread is untouched. */
  const identityGaps = await communityIdentityGaps(gate.userId);
  if (!thread) notFound();

  const entries = [
    {
      id: thread.id,
      body: thread.body,
      createdAt: thread.createdAt,
      author: thread.author,
      opening: true,
      markedHelpfulAt: null as string | null,
      canMarkHelpful: false,
    },
    ...thread.posts.map((p) => ({ ...p, opening: false })),
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <Link
          href={`/community/forums/${thread.board.slug}`}
          className="text-[13.5px] font-semibold text-ink-2 hover:text-magenta"
        >
          ← {thread.board.title}
        </Link>
        <h1 className="mt-2 font-display text-[24px] font-bold tracking-[-0.4px]">
          {thread.title}
        </h1>
      </header>

      <div className="space-y-3">
        {entries.map((e) => (
          <article
            key={e.id}
            className={
              "rounded-brand border bg-white p-5 " +
              (e.opening ? "border-magenta/25" : "border-line")
            }
          >
            <div className="flex items-center gap-2.5">
              <Avatar
                firstName={e.author.firstName}
                lastName={e.author.lastName}
                photoUrl={e.author.photoUrl}
                size={32}
              />
              <div className="min-w-0">
                <p className="text-[14px] font-bold">{e.author.name}</p>
                <p className="text-[12.5px] text-ink-2">
                  {e.author.title ? `${e.author.title} · ` : ""}
                  {relativeDay(e.createdAt)}
                </p>
              </div>
            </div>
            {/* Author-written prose. Newlines preserved; rendered as TEXT, never
                as markup — this is user input on a page other users read. */}
            <p className="mt-3 whitespace-pre-line text-[14.5px] leading-relaxed">
              {e.body}
            </p>

            {/*
              ⚠ THE MARK IS VISIBLE TO EVERYONE; THE BUTTON IS NOT.

              A reader needs to see which answer worked — that is the entire
              point of the signal. Only the person who asked gets the control,
              and never on their own reply.
            */}
            {(e.markedHelpfulAt || e.canMarkHelpful) && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {e.markedHelpfulAt && !e.canMarkHelpful && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/40 bg-emerald-50 px-3 py-1.5 text-[12.5px] font-semibold text-emerald-700">
                    ✓ Marked helpful by the person who asked
                  </span>
                )}
                {e.canMarkHelpful && (
                  <HelpfulButton postId={e.id} marked={Boolean(e.markedHelpfulAt)} />
                )}
              </div>
            )}
          </article>
        ))}
      </div>

      <ForumComposer mode="reply" threadId={thread.id} identityGaps={identityGaps} />
    </div>
  );
}
