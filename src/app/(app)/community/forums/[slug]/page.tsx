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
  /* ⚠ THE VIEWER IS PASSED AS OF `P1-J3-E383` — a PATH board is closed to
     people who are neither enrolled nor teaching, and `getBoard` returns null
     for them, which this page already turns into a 404. The four general boards
     ignore it. */
  const board = await getBoard(slug, gate);
  if (!board) notFound();

  /* ⚠ THE COMPOSER'S MIRROR (`P1-ALL-E033`) — the same function the write path
     refuses with, so the two cannot disagree. Reading this page is untouched. */
  const identityGaps = await communityIdentityGaps(gate.userId);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header>
        {/*
          ⚠ ONE CONDITIONAL, NOT A NEW LAYOUT (`P1-ALL-E381` WS-2).

          A PATH BOARD BREADCRUMBS TO ITS PATH. `E383` kept path boards OUT of
          `/community/forums` on purpose — twelve mostly-empty rooms beside four
          that can fill is the fragmentation `forums.ts` warns about — so a link
          back to that index was a dead end: the visitor arrives at a list their
          board is not in.
          ⚠ THE FOUR GENERAL BOARDS KEEP THEIRS EXACTLY AS IT WAS.
        */}
        {board.learningPath ? (
          <BackLink href={`/learn/${board.learningPath.slug}`} label={board.learningPath.title} />
        ) : (
          <BackLink href="/community/forums" label="Groups" />
        )}
        <h1 className="mt-2 font-display text-[26px] font-bold tracking-[-0.5px]">
          {board.title}
        </h1>
        {board.description && (
          <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-2">
            {board.description}
          </p>
        )}

        {/*
          ── ⚠⚠⚠ WHAT THIS GROUP IS, AND WHAT IT OFFERS YOU (`P2-A3-E612`) ──

          ⚠ Every figure here is counted and scoped: `memberCount` is `ACTIVE`
          membership rows for THIS board. ⚠⚠ It has a writer now — before this
          brief *"Groups You Joined"* would have been a dash, because joining did
          not exist as a concept.
          ⚠⚠ THE OWNER IS A NAME AND NOTHING MORE (`E572`, reaffirmed
          2026-09-23): **ownership is not authority for access.** All four
          general groups are ownerless, which is exactly why they are `OPEN`.
        */}
        <div className="mt-4 rounded-brand border border-line bg-white p-5">
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
          {/* ⚠⚠ CREDITS COPY PARKED 2026-09-03 (`P1-ALL-E375`) — AND THIS IS
              THE ONE PLACE WHERE PARKING CREDITS COST A NON-CREDITS SENTENCE.
              REPORTED, NOT PAPERED OVER.

              The Credits promise was welded mid-sentence by an em-dash, so the
              clause could not be lifted out without REWRITING the sentence —
              and nothing here gets to invent copy. So ONE COMPLETE SENTENCE was
              removed rather than edited, preserved verbatim for a one-paste
              restore: *"A question with real detail gets a real answer — and
              both earn Credits once the ledger is on."*

              ⚠ *"Someone has to go first."* IS UNTOUCHED and still carries the
              empty state on its own. If Scott wants the lost half back without
              the Credits clause, that is a copy decision for him, not a
              silent rewrite here. */}
          <p className="mx-auto mt-1 max-w-md text-[13.5px] leading-relaxed text-ink-2">
            Someone has to go first.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line rounded-brand border border-line bg-white">
          {board.threads.map((t) => (
            <li key={t.id}>
              <Link
                href={`/community/forums/thread/${t.id}`}
                className="group flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4"
              >
                {/*
                  ── ⚠⚠ NON-ANONYMITY ONLY WORKS IF IT IS VISIBLE (`P1-ALL-E033`)

                  ⚠ A rule that COLLECTS a photo and does not SHOW it buys
                  nothing. The thread PAGE already rendered all three — avatar,
                  name and job title — but this LIST rendered the name alone:
                  *"{t.author.name} · {relativeDay(t.lastPostAt)}"*, quoted here
                  because it is what changed. So the board, which is where most
                  people decide whether a thread is worth opening, was the one
                  surface where the author was still just a string.

                  ⚠ THE DATA WAS ALREADY THERE — `authorView` in `lib/forums.ts`
                  has carried `photoUrl` and `title` all along; nothing was
                  added to the query.

                  ⚠ NO BADGE, NO SCORE, NO POST COUNT, NO VERIFIED TICK. Facts
                  about who wrote it, nothing more. `mentorState` exists and is
                  deliberately not used here.
                */}
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
