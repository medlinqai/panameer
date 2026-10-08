import Link from "next/link";
import { notFound } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { getBoard } from "@/lib/forums";
import { relativeDay } from "@/lib/relative-day";
import { Avatar } from "@/components/Avatar";
import { ForumComposer } from "@/components/community/ForumComposer";
import { GroupJoin } from "@/components/community/GroupJoin";
import { GROUP_OFFER_COPY } from "@/lib/group-membership";
import { communityIdentityGaps } from "@/lib/community-identity";
import { BackLink } from "@/components/console/BackLink";

/** One board: its threads, newest activity first, plus the composer (WS2-C). */
export default async function BoardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const gate = await guardPage("authenticated");
  const { slug } = await params;
  const board = await getBoard(slug, gate);
  if (!board) notFound();

  const identityGaps = await communityIdentityGaps(gate.userId);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header>
        {}
        {board.learningPath ? (
          <BackLink href={`/learn/${board.learningPath.slug}`} label={board.learningPath.title} />
        ) : (
          <BackLink href="/connect/groups" label="Groups" />
        )}
        <h1 className="mt-2 font-display text-[26px] font-bold tracking-[-0.5px]">
          {board.title}
        </h1>
        {board.description && (
          <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-2">
            {board.description}
          </p>
        )}

        {/* WHAT THIS GROUP IS, AND WHAT IT OFFERS YOU */}
        <div className="mt-4 border-t border-line py-5">
          <p className="text-[13px] text-ink-2">
            {board.memberCount} {board.memberCount === 1 ? "member" : "members"}
            {board.owner ? ` · Run by ${board.owner.name}` : ""}
          </p>
          <div className="mt-3">
            <GroupJoin
              boardId={board.id}
              offer={board.offer}
              copy={GROUP_OFFER_COPY[board.offer.kind]}
              canLeave={board.canLeave}
              pathSlug={board.learningPath?.slug ?? null}
            />
          </div>
        </div>
      </header>

      {board.threads.length === 0 ? (
        <div className="rounded-brand border border-dashed border-line px-4 py-8 text-center">
          <p className="text-[15px] font-semibold">No questions here yet.</p>
          {/* CREDITS COPY PARKED 2026-09-03 — AND THIS IS */}
          <p className="mx-auto mt-1 max-w-md text-[13.5px] leading-relaxed text-ink-2">
            Someone has to go first.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line rounded-brand border border-line bg-white">
          {board.threads.map((t) => (
            <li key={t.id}>
              <Link
                href={`/connect/groups/thread/${t.id}`}
                className="group flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4"
              >
                {/* NON-ANONYMITY ONLY WORKS IF IT IS VISIBLE */}
                <Avatar
                  firstName={t.author.firstName}
                  lastName={t.author.lastName}
                  photoUrl={t.author.photoUrl}
                  size={32}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold group-hover:text-magenta">
                    {t.title}
                  </p>
                  <p className="mt-0.5 text-[13px] text-ink-2">
                    {t.author.name}
                    {t.author.title ? ` · ${t.author.title}` : ""} ·{" "}
                    {relativeDay(t.lastPostAt)}
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

      <ForumComposer mode="thread" boardSlug={board.slug} identityGaps={identityGaps} />
    </div>
  );
}
