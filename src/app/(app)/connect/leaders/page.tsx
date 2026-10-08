import Link from "next/link";
import { Avatar } from "@/components/Avatar";
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
  const [me, board, network] = await Promise.all([
    growthScore(personId, "month"),
    growthBoard(tab.window),
    tab.key === "network" ? myNetwork(personId) : Promise.resolve([]),
  ]);
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
      <div className="mx-auto w-full max-w-3xl">
        {}
        <h1 className="mb-1 font-display text-[26px] font-bold tracking-[-0.5px]">
          Leaders
        </h1>
        <p className="mb-5 text-[14px] text-ink-2">Who&apos;s growing Panameer — invitations sent and colleagues who joined.</p>

        {/* ── your score ─────────────────────────────────────────────── */}
        <section className="rounded-brand border border-line bg-white px-[18px] py-4">
          {}
          <h2 className="font-display text-[15px] font-bold">How Your Score Adds Up</h2>

          <div className="mt-3 flex flex-col border-t border-line pt-1">
            {}
            <ScoreRow
              label="Invited"
              count={me.invited}
              each={GROWTH_WEIGHTS.INVITED}
            />
            <ScoreRow label="Joined" count={me.joined} each={GROWTH_WEIGHTS.JOINED} />
            {}
            {}
            <div className="py-2 text-[13.5px]">
              <span className="text-ink-2">Became Active</span>
              <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-3">
                Not measured yet &middot; {GROWTH_WEIGHTS.ACTIVE_BONUS} points each
                once it is
              </span>
            </div>

            {}
            <div className="mt-1 flex items-baseline justify-between border-t border-line pt-2.5">
              <span className="text-[13.5px] font-bold text-ink">Your Score</span>
              <span className="font-display text-[20px] font-bold tabular-nums text-ink">
                {me.points}
              </span>
            </div>
          </div>
        </section>

        {}
        {/* ── invite ─────────────────────────────────────────────────── */}
        <section className="mt-3.5 rounded-brand border border-line bg-white px-[18px] py-4">
          <h2 className="font-display text-[15px] font-bold">Invite Someone</h2>
          <p className="mt-1 text-[13.5px] text-ink-2">
            A colleague who joins is worth {GROWTH_WEIGHTS.JOINED} points. Sending
            an invitation is worth {GROWTH_WEIGHTS.INVITED}.
          </p>
          {}
          {}
        </section>

        {/* ── the board ──────────────────────────────────────────────── */}
        {}
        {}
        <h2 className="mt-6 font-display text-[17px] font-bold">Leaderboard</h2>
        <nav aria-label="Leaderboard" className="mt-2 flex gap-1.5 border-b border-line">
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
              <ul className="flex flex-col rounded-brand border border-line bg-white px-[18px]">
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
          <section className="mt-3.5 rounded-brand border border-line bg-white px-[18px] py-1">
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
                      (r.personId === personId ? "bg-magenta/[0.04] font-bold" : "")
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
      </div>
    </>
  );
}

/** One counted row and its arithmetic. THE POINTS LINE IS DERIVED FROM THE */
function ScoreRow({ label, count, each }: { label: string; count: number; each: number }) {
  return (
    <div className="flex items-center justify-between gap-2.5 py-2 text-[13.5px]">
      <span className="text-ink-2">{label}</span>
      <span className="flex-none tabular-nums">
        <span className="text-ink-3">
          {count} &times; {each} ={" "}
        </span>
        <b>{count * each}</b>
      </span>
    </div>
  );
}
