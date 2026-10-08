import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { AccountHero, HERO_BTN, HERO_BTN_W } from "@/components/casing/AccountHero";
import { LeadersPodium } from "@/components/community/LeadersPodium";
import "@/components/community/community-page.css";
import { redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";
import { PageTabs } from "@/components/casing/PageTabs";
import { tabSequenceFor } from "@/lib/nav";
import { connectTabs } from "@/lib/connect-tabs";
import { unreadCount } from "@/lib/messages";
import {
  BOARD_MIN_SCORERS,
  GROWTH_WEIGHTS,
  growthBoard,
  growthScore,
  boardIsShown,
  movementFor,
  myNetwork,
  providerHrefs,
  type GrowthWindow,
} from "@/lib/growth-score";

const TABS: { key: string; label: string; window: GrowthWindow }[] = [
  { key: "month", label: "This Month", window: "month" },
  { key: "all", label: "All Time", window: "all" },
  { key: "network", label: "People I Brought In", window: "all" },
];

export const metadata = { title: "Leaders · Panameer" };

// Connect › Leaders (2026-10-08): how your score adds up + the leaderboard. The network graphic lives on Connections.
export default async function LeadersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await guardPage("authenticated");
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fconnect%2Fleaders");

  const person = await prisma.person.findFirst({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) redirect("/connect/community");
  const personId = person.id;

  const { tab: rawTab } = await searchParams;
  const tab = TABS.find((t) => t.key === rawTab) ?? TABS[0];

  const unread = await unreadCount(viewer);
  const [me, board, network, monthBoard] = await Promise.all([
    growthScore(personId, "month"),
    growthBoard(tab.window),
    tab.key === "network" ? myNetwork(personId) : Promise.resolve([]),
    tab.window === "month" ? Promise.resolve(null) : growthBoard("month"),
  ]);
  // The hero is always about this month.
  const month = monthBoard ?? board;
  const myRow = month.find((r) => r.personId === personId) ?? null;
  const myRank = myRow && me.points > 0 ? myRow.rank : null;
  const leader = month[0];
  const next = myRank ? month.find((r) => r.rank === myRank - 1) : null;
  const runnerUp = month.find((r) => r.personId !== personId && r.rank > (myRank ?? 0));
  const say = !myRank ? (
    <>No points yet this month — invite a colleague to get on the board.</>
  ) : myRank === 1 ? (
    <>You&apos;re <b className="text-ink">#1 this month</b>{runnerUp ? <>, {me.points - runnerUp.points} points ahead of {runnerUp.name}</> : null}. Every colleague who joins from your invite adds <b className="text-ink">{GROWTH_WEIGHTS.JOINED} points</b>.</>
  ) : (
    <>You&apos;re <b className="text-ink">#{myRank}</b>, {((next ?? leader)?.points ?? 0) - me.points} points behind {(next ?? leader)?.name}. Every colleague who joins from your invite adds <b className="text-ink">{GROWTH_WEIGHTS.JOINED} points</b>.</>
  );
  const movement = tab.key === "month" ? await movementFor(board) : null;
  const hrefs = await providerHrefs(board.map((r) => r.personId));

  const showBoard = boardIsShown(board);

  return (
    <>
      {}
      {}
      <PageTabs
        wrap
        eyebrow="CONNECT"
        sequence={tabSequenceFor("/connect")}
        tabs={connectTabs(viewer, unread)}
        current="/connect/leaders"
      />
      <div className="mx-auto w-full max-w-[1010px]">
        <AccountHero
          testId="leaders-hero"
          picture={<LeadersPodium top={month.slice(0, 3)} viewerId={personId} scorers={month.length} viewerRank={myRank} />}
          eyebrow="Leaders"
          title="Who's Growing the Community"
          kpis={[
            { value: myRank ? `#${myRank}` : "—", label: "YOUR RANK" },
            { value: me.points, label: "POINTS THIS MONTH" },
            { value: me.joined, label: "JOINED FROM YOU" },
          ]}
          paragraph={say}
          actions={
            <>
              <Link href="/invite-colleague" className={HERO_BTN}>Invite a Colleague</Link>
              <Link href="/connect/connections" className={HERO_BTN_W}>See My Connections</Link>
            </>
          }
        />

        {/* Health lower layout: Leaderboard left, How Your Score Adds Up right, one rule between (one column on phone). */}
        <div className="grid md:grid-cols-2">
          <section data-leaderboard className="min-w-0 py-6 md:pr-7">
            <h2 className="text-[22px] font-bold">
              Leaderboard <small className="ml-1.5 text-[12px] font-medium text-ink-3">{board.length} {board.length === 1 ? "member" : "members"}</small>
            </h2>
            <nav aria-label="Leaderboard" className="mt-1 flex gap-1.5 border-b border-line">
              {TABS.map((t) => (
                <Link
                  key={t.key}
                  href={t.key === "month" ? "/connect/leaders" : `/connect/leaders?tab=${t.key}`}
                  aria-current={t.key === tab.key ? "page" : undefined}
                  className={
                    "-mb-px border-b-2 px-3 py-2 text-[13.5px] font-bold transition-colors " +
                    (t.key === tab.key
                      ? "border-magenta text-magenta"
                      : "border-transparent text-ink-2 hover:text-ink")
                  }
                >
                  {t.label}
                </Link>
              ))}
            </nav>

            {tab.key === "network" ? (
              // MY NETWORK — INVITATIONS, NOT SCORES
              <section className="mt-3.5">
                {network.length === 0 ? (
                  <p className="text-[13px] text-ink-3">
                    You haven&rsquo;t invited anyone yet. Everyone you invite appears
                    here, whether or not they join.
                  </p>
                ) : (
                  <ul className="flex flex-col">
                    {network.map((n) => (
                      <li
                        key={n.id}
                        className="flex items-center justify-between gap-2.5 border-t border-line py-2.5 text-[13.5px] first:border-t-0"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">
                            {n.name ?? n.email}
                          </span>
                          {n.name && (
                            <span className="block truncate text-[12px] text-ink-3">
                              {n.email}
                            </span>
                          )}
                        </span>
                        {/* Green for joined, ink for pending — never red. A */}
                        <span
                          className={
                            "flex-none text-[12.5px] font-bold " +
                            (n.joinedAt ? "text-emerald-600" : "text-ink-3")
                          }
                        >
                          {n.joinedAt ? "Joined" : "Invited"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : showBoard ? (
              <section className="mt-1">
                <ol className="flex flex-col">
                  {board.map((r) => {
                    const href = hrefs.get(r.personId);
                    const mv = movement?.get(r.personId);
                    return (
                      <li
                        key={r.personId}
                        className={
                          "flex items-center justify-between gap-2.5 border-t border-line py-2.5 text-[13.5px] first:border-t-0 " +
                          // YOUR ROW IS ALWAYS VISIBLE AND HIGHLIGHTED (WS-B 3).
                          (r.personId === personId ? "border-l-[3px] border-l-magenta bg-bg-soft pl-2 font-bold" : "")
                        }
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span className="w-7 flex-none tabular-nums text-ink-3">
                            #{r.rank}
                          </span>
                          <Avatar
                            firstName={r.name.split(" ")[0] ?? ""}
                            lastName={r.name.split(" ").slice(1).join(" ")}
                            photoUrl={r.photoUrl}
                            size={28}
                          />
                          <span className="min-w-0">
                            {/* A LINK ONLY WHERE THERE IS SOMEWHERE TO GO. A ranked */}
                            {href ? (
                              <Link href={href} className="block truncate hover:underline">
                                {r.name}
                              </Link>
                            ) : (
                              <span className="block truncate">{r.name}</span>
                            )}
                            <span className="block truncate text-[12px] text-ink-3">
                              {r.invited} invited &middot; {r.joined} joined
                            </span>
                          </span>
                        </span>
                        <span className="flex flex-none items-center gap-2.5">
                          {/* MOVEMENT: `null` IS `NEW`, NOT A DASH. Somebody who */}
                          {movement && (
                            <span
                              className={
                                "w-10 text-right text-[12px] font-bold tabular-nums " +
                                (mv?.delta == null
                                  ? "text-ink-3"
                                  : mv.delta > 0
                                    ? "text-emerald-600"
                                    : mv.delta < 0
                                      ? "text-ink-2"
                                      : "text-ink-3")
                              }
                              aria-label={
                                mv?.delta == null
                                  ? "New this month"
                                  : mv.delta === 0
                                    ? "No change since last month"
                                    : `${Math.abs(mv.delta)} ${mv.delta > 0 ? "up" : "down"} since last month`
                              }
                            >
                              {mv?.delta == null
                                ? "NEW"
                                : mv.delta === 0
                                  ? "—"
                                  : `${mv.delta > 0 ? "\u25b2" : "\u25bc"}${Math.abs(mv.delta)}`}
                            </span>
                          )}
                          <span className="w-10 text-right tabular-nums">{r.points}</span>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ) : (
              <p className="mt-3.5 text-[13px] text-ink-3">
                {/* RULING 6, SAID OUT LOUD RATHER THAN RENDERED AS AN EMPTY BOX. */}
                The board appears once {BOARD_MIN_SCORERS} members have a score
                {tab.key === "month" ? " this month" : ""}.
              </p>
            )}
          </section>
          <section data-score-adds-up className="min-w-0 border-t border-line py-6 md:border-l md:border-t-0 md:pl-7">
            <h2 className="text-[22px] font-bold">
              How Your Score Adds Up <small className="ml-1.5 text-[12px] font-medium text-ink-3">this month</small>
            </h2>
            <div className="mt-2 flex flex-col">
              <ScoreRow label="Invited" count={me.invited} each={GROWTH_WEIGHTS.INVITED} />
              <ScoreRow label="Joined" count={me.joined} each={GROWTH_WEIGHTS.JOINED} />
              <div className="flex items-center justify-between gap-2.5 border-b border-line py-2.5 text-[13.5px]">
                <span className="text-ink-2">
                  Became Active <em className="not-italic text-ink-3">· not measured yet · {GROWTH_WEIGHTS.ACTIVE_BONUS} each once it is</em>
                </span>
                <span className="tabular-nums text-ink-3">—</span>
              </div>
              <div className="flex items-baseline justify-between pt-3">
                <span className="text-[14px] font-bold">Your Score</span>
                <span className="text-[22px] font-bold tabular-nums">{me.points}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

/** One counted row and its arithmetic. THE POINTS LINE IS DERIVED FROM THE */
function ScoreRow({ label, count, each }: { label: string; count: number; each: number }) {
  return (
    <div className="flex items-center justify-between gap-2.5 border-b border-line py-2.5 text-[13.5px]">
      <span className="text-ink-2">
        {label} <em className="not-italic text-ink-3">· {count} &times; {each}</em>
      </span>
      <b className="flex-none tabular-nums">{count * each}</b>
    </div>
  );
}
